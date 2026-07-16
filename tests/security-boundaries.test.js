const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rules = JSON.parse(fs.readFileSync(path.join(root, 'database/security-rules.json'), 'utf8'));
const ownedCollections = ['workout_sessions', 'workout_blocks', 'workout_sets', 'user_goals'];

ownedCollections.forEach((collection) => {
  assert.equal(rules[collection].write, 'doc._openid == auth.openid');
  assert.equal(rules[collection].write.includes('!doc._openid'), false);
});
assert.equal(rules.exercise_stats.write, false);

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
