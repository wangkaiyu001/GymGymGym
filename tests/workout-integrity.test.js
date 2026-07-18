const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dbSource = fs.readFileSync(path.join(root, 'miniprogram/utils/db.js'), 'utf8');
const trainingSource = fs.readFileSync(path.join(root, 'miniprogram/pages/training/training.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(root, 'miniprogram/pages/session-detail/session-detail.js'), 'utf8');
const statsSource = fs.readFileSync(path.join(root, 'cloudfunctions/recalculateStats/index.js'), 'utf8');

assert.equal(dbSource.includes("where: { status: 'completed' }"), true, 'Recent sessions must exclude drafts');
assert.equal(trainingSource.includes('请至少记录一组次数'), true, 'Workout save must reject empty sets');
assert.equal(statsSource.includes("session.status === 'completed'"), true, 'Stats must only include completed sessions');
assert.equal(statsSource.includes('completedSets.reduce'), true, 'Stats aggregation must use completed sets');
assert.equal(trainingSource.includes('discardWorkout()'), true, 'User must be able to delete a cloud draft');
assert.equal(trainingSource.includes('restoreDraft()'), true, 'Latest cloud draft must be restorable');
assert.equal(trainingSource.includes('remote_id: set._id'), true, 'Restored sets must retain remote ids to avoid duplicates');
assert.equal(trainingSource.includes('await updateSet(set.remote_id, payload)'), true, 'Edited restored sets must update their remote documents');
assert.equal(dbSource.includes("deleteOwnedDocument('workout_sessions'"), true, 'Session deletion must enforce ownership');
assert.equal(dbSource.includes("where: { status: 'draft' }"), true, 'Draft lookup must explicitly filter status');
assert.equal(detailSource.includes("status: 'draft', ended_at: null"), true, 'Deleting the final block must remove the session from completed history');

console.log('workout-integrity tests passed');
