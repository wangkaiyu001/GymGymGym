const { aggregateSets } = require('./stats');

const PERIODS = [
  { key: 'week', days: 7, label: '近 7 天' },
  { key: 'month', days: 30, label: '近 30 天' },
];

function parseDate(value) {
  if (!value) return null;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  const date = parseDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWithinDays(value, days, now) {
  const date = parseDate(value);
  if (!date) return false;
  const end = startOfDay(now);
  end.setDate(end.getDate() + 1);
  const start = startOfDay(now);
  start.setDate(start.getDate() - days + 1);
  return date >= start && date < end;
}

function buildPeriodSummary(sessions, sets, now) {
  const sessionDates = sessions.reduce((acc, item) => {
    if (item._id) acc[item._id] = item.date || item.created_at || item.updated_at;
    return acc;
  }, {});

  return PERIODS.map((period) => {
    const periodSessions = sessions.filter((item) => (
      isWithinDays(item.date || item.created_at || item.updated_at, period.days, now)
    ));
    const periodSets = sets.filter((item) => {
      if (item.is_warmup) return false;
      const performedAt = sessionDates[item.session_id] || item.created_at || item.updated_at;
      return isWithinDays(performedAt, period.days, now);
    });
    const summary = aggregateSets(periodSets);
    return {
      key: period.key,
      label: period.label,
      sessions: periodSessions.length,
      sets: summary.total_sets,
      reps: summary.total_reps,
      volume: Math.round(Number(summary.total_volume_kg) || 0),
    };
  });
}

function buildPrHighlights(stats) {
  return stats
    .filter((item) => (Number(item.max_weight_kg) || 0) > 0 || (Number(item.estimated_1rm_kg) || 0) > 0)
    .map((item) => {
      const oneRm = Number(item.estimated_1rm_kg) || 0;
      const maxWeight = Number(item.max_weight_kg) || 0;
      return Object.assign({}, item, {
        pr_score: oneRm || maxWeight,
        pr_metric: oneRm > 0 ? `${oneRm} kg 估算1RM` : `${maxWeight} kg 最大重量`,
        pr_subtitle: maxWeight > 0 ? `最大重量 ${maxWeight} kg` : `最近 ${item.display_last_performed}`,
      });
    })
    .sort((a, b) => b.pr_score - a.pr_score)
    .slice(0, 3);
}

module.exports = {
  buildPeriodSummary,
  buildPrHighlights,
  isWithinDays,
};
