const assert = require('node:assert/strict');
const { buildPeriodSummary, buildPrHighlights, isWithinDays } = require('../miniprogram/utils/profile-stats');

const now = new Date(2026, 6, 16, 12, 0, 0);

assert.equal(isWithinDays('2026-07-10', 7, now), true);
assert.equal(isWithinDays('2026-07-09', 7, now), false);
assert.equal(isWithinDays('2026-07-17', 7, now), false);

const sessions = [
  { _id: 'today', date: '2026-07-16' },
  { _id: 'week-edge', date: '2026-07-10' },
  { _id: 'month-only', date: '2026-06-20' },
  { _id: 'old', date: '2026-06-15' },
];
const sets = [
  { session_id: 'today', weight_kg: 100, reps: 5, volume_kg: 500 },
  { session_id: 'today', weight_kg: 20, reps: 10, volume_kg: 200, is_warmup: true },
  { session_id: 'week-edge', weight_kg: 50, reps: 10, volume_kg: 500 },
  { session_id: 'month-only', weight_kg: 40, reps: 10, volume_kg: 400 },
  { session_id: 'old', weight_kg: 30, reps: 10, volume_kg: 300 },
];

assert.deepEqual(buildPeriodSummary(sessions, sets, now), [
  { key: 'week', label: '近 7 天', sessions: 2, sets: 2, reps: 15, volume: 1000 },
  { key: 'month', label: '近 30 天', sessions: 3, sets: 3, reps: 25, volume: 1400 },
]);

const highlights = buildPrHighlights([
  { _id: 'bench', display_name: '卧推', display_last_performed: '2026-07-16', max_weight_kg: 80, estimated_1rm_kg: 100 },
  { _id: 'squat', display_name: '深蹲', display_last_performed: '2026-07-15', max_weight_kg: 120, estimated_1rm_kg: 130 },
  { _id: 'curl', display_name: '弯举', display_last_performed: '2026-07-12', max_weight_kg: 20, estimated_1rm_kg: 25 },
  { _id: 'deadlift', display_name: '硬拉', display_last_performed: '2026-07-11', max_weight_kg: 140, estimated_1rm_kg: 150 },
  { _id: 'bodyweight', display_name: '俯卧撑', display_last_performed: '2026-07-10', max_weight_kg: 0, estimated_1rm_kg: 0 },
]);

assert.deepEqual(highlights.map((item) => item._id), ['deadlift', 'squat', 'bench']);
assert.equal(highlights[0].pr_metric, '150 kg 估算1RM');

console.log('profile-stats tests passed');
