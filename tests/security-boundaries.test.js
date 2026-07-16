const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rules = JSON.parse(fs.readFileSync(path.join(root, 'database/security-rules.json'), 'utf8'));
const ownedCollections = ['workout_sessions', 'workout_blocks', 'workout_sets', 'user_goals'];

ownedCollections.forEach((collection) => {
  assert.equal(rules[collection].create, 'request.data.user_openid == auth.openid');
  assert.equal(rules[collection].update, 'doc._openid == auth.openid');
  assert.equal(rules[collection].delete, 'doc._openid == auth.openid');
  assert.equal(JSON.stringify(rules[collection]).includes('!doc._openid'), false);
});
assert.equal(rules.exercise_stats.create, false);
assert.equal(rules.exercise_stats.update, false);
assert.equal(rules.exercise_stats.delete, false);
assert.equal(rules.exercises.read, true);

const dbSource = fs.readFileSync(path.join(root, 'miniprogram/utils/db.js'), 'utf8');
[
  "updateOwnedDocument('workout_sessions'",
  "updateOwnedDocument('workout_blocks'",
  "deleteOwnedDocument('workout_blocks'",
  "updateOwnedDocument('workout_sets'",
  "deleteOwnedDocument('workout_sets'",
  "updateOwnedDocument('user_goals'",
  "deleteOwnedDocument('user_goals'",
].forEach((snippet) => assert.equal(dbSource.includes(snippet), true, `Missing ownership boundary: ${snippet}`));

console.log('security-boundaries tests passed');
