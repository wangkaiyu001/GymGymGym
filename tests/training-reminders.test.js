const assert = require('node:assert/strict');
const { buildBodyPartReminders, daysBetween } = require('../miniprogram/utils/training-reminders');

const now = new Date(2026, 6, 16, 12, 0, 0);
assert.equal(daysBetween('2026-07-16', now), 0);
assert.equal(daysBetween('2026-07-15', now), 1);
assert.equal(daysBetween('2026-07-10', now), 6);

const reminders = buildBodyPartReminders([
  { date: '2026-07-16', intent: { focus_body_parts: ['胸部'] } },
  { date: '2026-07-15', intent: { focus_body_parts: ['背部', '手臂'] } },
  { date: '2026-07-10', intent: { focus_body_parts: ['腿部'] } },
  { date: '2026-07-08', intent: { focus_body_parts: ['背部'] } },
], now);

assert.deepEqual(reminders.map((item) => [item.part, item.days, item.state]), [
  ['腿部', 6, 'ready'],
  ['背部', 1, 'recent'],
  ['手臂', 1, 'recent'],
  ['胸部', 0, 'today'],
]);

console.log('training-reminders tests passed');
