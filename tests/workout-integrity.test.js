const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dbSource = fs.readFileSync(path.join(root, 'miniprogram/utils/db.js'), 'utf8');
const trainingSource = fs.readFileSync(path.join(root, 'miniprogram/pages/training/training.js'), 'utf8');
const profileSource = fs.readFileSync(path.join(root, 'miniprogram/pages/profile/profile.js'), 'utf8');
const statsSource = fs.readFileSync(path.join(root, 'cloudfunctions/recalculateStats/index.js'), 'utf8');

assert.equal(dbSource.includes("where: { status: 'completed' }"), true, 'Recent sessions must exclude drafts');
assert.equal(trainingSource.includes('请至少填写一组重量或次数'), true, 'Workout save must reject empty sets');
assert.equal(statsSource.includes("session.status === 'completed'"), true, 'Stats must only include completed sessions');
assert.equal(statsSource.includes('completedSets.reduce'), true, 'Stats aggregation must use completed sets');
assert.equal(profileSource.includes('completedSessionIds'), true, 'Profile fallback must exclude draft sets');
assert.equal(profileSource.includes('listAllSessions(1000)'), true, 'Backup must include draft sessions consistently');
assert.equal(trainingSource.includes('discardWorkout()'), true, 'User must be able to delete a cloud draft');
assert.equal(dbSource.includes("deleteOwnedDocument('workout_sessions'"), true, 'Session deletion must enforce ownership');

console.log('workout-integrity tests passed');
