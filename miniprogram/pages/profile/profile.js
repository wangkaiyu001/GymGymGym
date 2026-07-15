const { listExerciseStats, listRecentSessions } = require('../../utils/db');

function dateText(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  } catch (error) {
    return '';
  }
}

Page({
  data: {
    stats: [],
    summary: {
      totalSessions: 0,
      totalSets: 0,
      totalReps: 0,
      totalVolume: 0,
    },
  },

  onShow() {
    this.load();
  },

  async load() {
    wx.showLoading({ title: '加载中' });
    try {
      const [stats, sessions] = await Promise.all([listExerciseStats(), listRecentSessions(100)]);
      const mapped = stats.map((item) => Object.assign({}, item, {
        last_performed_at_text: dateText(item.last_performed_at),
      }));
      const summary = mapped.reduce((acc, item) => {
        acc.totalSets += Number(item.total_sets) || 0;
        acc.totalReps += Number(item.total_reps) || 0;
        acc.totalVolume += Number(item.total_volume_kg) || 0;
        return acc;
      }, { totalSessions: sessions.length, totalSets: 0, totalReps: 0, totalVolume: 0 });
      summary.totalVolume = Math.round(summary.totalVolume);
      this.setData({ stats: mapped, summary });
    } finally {
      wx.hideLoading();
    }
  },

  async recalculate() {
    wx.showLoading({ title: '重算中' });
    try {
      await wx.cloud.callFunction({ name: 'recalculateStats', data: {} });
      await this.load();
      wx.showToast({ title: '已重算', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '重算失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },
});
