const assert = require('node:assert/strict');
const { parseWorkoutPrompt, prescriptionFor, buildPlan } = require('../miniprogram/utils/workout-planner');

const parsed = parseWorkoutPrompt('今天练胸和肩，只有哑铃，状态很好，45分钟冲一下', {});
assert.deepEqual(parsed.focus_body_parts, ['胸部', '肩部']);
assert.deepEqual(parsed.available_equipment, ['哑铃']);
assert.equal(parsed.training_intent, 'breakthrough');
assert.equal(parsed.time_limit_min, 45);
assert.deepEqual(prescriptionFor(parsed, { last_weight_kg: 20, last_reps: 10 }), { sets: 4, reps: 10, weight_kg: 21, rpe: 8 });
assert.equal(buildPlan([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }], parsed, {}).length, 4);
console.log('workout-planner tests passed');
