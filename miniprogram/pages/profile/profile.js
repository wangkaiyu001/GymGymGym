const { getUserContext, listExerciseStats, listRecentSessions, listWorkoutSets } = require('../../utils/db');
const { formatDate } = require('../../utils/format');
const { buildPeriodSummary, buildPrHighlights } = require('../../utils/profile-stats');

function dateText(value) {
  if (!value) return '-';
  try { return formatDate(value); } catch (error) { return '-'; }
}

Page({
  data: {
    periodSummary: [],
    prHighlights: [],
  },

  onShow() { this.load(); },

  async load() {
    wx.showLoading({ title: '加载中' });
    try {
      const app = getApp();
      if (!app.globalData.userContext) app.globalData.userContext = await getUserContext();
      const [stats, sessions, sets] = await Promise.all([
        listExerciseStats(),
        listRecentSessions(100),
        listWorkoutSets(500),
      ]);
      const completedIds = sessions.reduce((acc, session) => {
        acc[session._id] = true;
        return acc;
      }, {});
      const completedSets = sets.filter((set) => completedIds[set.session_id]);
      const mappedStats = stats.map((item) => Object.assign({}, item, {
        display_name: item.exercise_name || item.exercise_id,
        display_last_performed: dateText(item.last_performed_at),
      }));
      this.setData({
        periodSummary: buildPeriodSummary(sessions, completedSets),
        prHighlights: buildPrHighlights(mappedStats),
      });
    } catch (error) {
      wx.showToast({ title: '档案加载失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },
});
