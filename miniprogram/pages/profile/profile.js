const {
  getExerciseById,
  getUserContext,
  listExerciseStats,
  listRecentSessions,
  listWorkoutSets,
} = require('../../utils/db');
const { formatDate } = require('../../utils/format');
const { aggregateSets } = require('../../utils/stats');
const { buildPeriodSummary, buildPrHighlights } = require('../../utils/profile-stats');

function dateText(value) {
  if (!value) return '';
  try {
    return formatDate(value);
  } catch (error) {
    return '';
  }
}

async function buildFallbackStats(sets) {
  const exerciseIds = Array.from(new Set(sets.map((item) => item.exercise_id).filter(Boolean)));
  const names = {};
  for (let i = 0; i < exerciseIds.length; i += 1) {
    const exercise = await getExerciseById(exerciseIds[i]);
    names[exerciseIds[i]] = exercise ? (exercise.name_zh || exercise.name) : exerciseIds[i];
  }
  return exerciseIds.map((exerciseId) => {
    const exerciseSets = sets.filter((item) => item.exercise_id === exerciseId);
    const summary = aggregateSets(exerciseSets);
    const sessionIds = exerciseSets.reduce((acc, item) => {
      if (item.session_id) acc[item.session_id] = true;
      return acc;
    }, {});
    const latest = exerciseSets[0] || {};
    return Object.assign({}, summary, {
      _id: `local_${exerciseId}`,
      exercise_id: exerciseId,
      exercise_name: names[exerciseId],
      total_sessions: Object.keys(sessionIds).length,
      total_volume_kg: Math.round(summary.total_volume_kg),
      max_volume_kg: Math.max.apply(null, exerciseSets.map((item) => (Number(item.weight_kg) || 0) * (Number(item.reps) || 0)).concat([0])),
      last_performed_at: latest.created_at || latest.updated_at || '',
      last_weight_kg: Number(latest.weight_kg) || 0,
      last_reps: Number(latest.reps) || 0,
    });
  }).filter((item) => item.total_sets > 0);
}

Page({
  data: {
    stats: [],
    periodSummary: [],
    prHighlights: [],
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
      const app = getApp();
      if (!app.globalData.userContext) {
        const context = await getUserContext();
        app.globalData.userContext = context;
      }
      const [cloudStats, sessions, sets] = await Promise.all([
        listExerciseStats(),
        listRecentSessions(100),
        listWorkoutSets(500),
      ]);
      const stats = cloudStats.length > 0 ? cloudStats : await buildFallbackStats(sets);
      const mapped = stats.map((item) => Object.assign({}, item, {
        display_name: item.exercise_name || item.exercise_id,
        display_last_performed: dateText(item.last_performed_at) || '-',
        last_performed_at_text: dateText(item.last_performed_at),
      }));
      const summary = mapped.reduce((acc, item) => {
        acc.totalSets += Number(item.total_sets) || 0;
        acc.totalReps += Number(item.total_reps) || 0;
        acc.totalVolume += Number(item.total_volume_kg) || 0;
        return acc;
      }, { totalSessions: sessions.length, totalSets: 0, totalReps: 0, totalVolume: 0 });
      summary.totalVolume = Math.round(summary.totalVolume);
      this.setData({
        stats: mapped,
        summary,
        periodSummary: buildPeriodSummary(sessions, sets),
        prHighlights: buildPrHighlights(mapped),
      });
    } catch (error) {
      wx.showToast({ title: '档案加载失败', icon: 'none' });
      console.error(error);
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
