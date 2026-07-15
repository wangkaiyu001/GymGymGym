const seedExercises = require('../data/seed-exercises');
const { calcSetMetrics } = require('./stats');

function database() {
  return wx.cloud.database();
}

function now() {
  return new Date();
}

async function callFunction(name, data) {
  const result = await wx.cloud.callFunction({ name, data: data || {} });
  return result.result;
}

async function getUserContext() {
  return callFunction('getUserContext');
}

async function listExercises(filters) {
  const query = filters || {};
  try {
    const db = database();
    const _ = db.command;
    const conditions = [];

    if (query.keyword) {
      const reg = db.RegExp({ regexp: query.keyword, options: 'i' });
      conditions.push(_.or([
        { name: reg },
        { name_zh: reg },
        { aliases_zh: reg },
        { target: reg },
      ]));
    }
    if (query.bodyPart) conditions.push({ body_part_zh: query.bodyPart });
    if (query.equipment) conditions.push({ equipment_zh: query.equipment });

    const collection = db.collection('exercises');
    const result = conditions.length > 0
      ? await collection.where(_.and(conditions)).limit(50).get()
      : await collection.limit(50).get();

    if (result.data && result.data.length > 0) return result.data;
  } catch (error) {
    console.warn('读取云端动作库失败，使用内置动作', error);
  }

  const keyword = (query.keyword || '').trim().toLowerCase();
  return seedExercises.filter((item) => {
    const matchKeyword = !keyword || [
      item.name,
      item.name_zh,
      item.target,
      ...(item.aliases_zh || []),
    ].join(' ').toLowerCase().includes(keyword);
    const matchBody = !query.bodyPart || item.body_part_zh === query.bodyPart;
    const matchEquipment = !query.equipment || item.equipment_zh === query.equipment;
    return matchKeyword && matchBody && matchEquipment;
  });
}

async function getExerciseById(id) {
  const fromSeed = seedExercises.find((item) => item._id === id || item.source_id === id);
  try {
    const result = await database().collection('exercises').doc(id).get();
    return result.data || fromSeed;
  } catch (error) {
    return fromSeed;
  }
}

async function createSession(payload) {
  const time = now();
  const data = Object.assign({}, payload, {
    status: 'draft',
    started_at: time,
    created_at: time,
    updated_at: time,
  });
  const result = await database().collection('workout_sessions').add({ data });
  return result._id;
}

async function updateSession(sessionId, patch) {
  return database().collection('workout_sessions').doc(sessionId).update({
    data: Object.assign({}, patch, { updated_at: now() }),
  });
}

async function addBlock(payload) {
  const time = now();
  const result = await database().collection('workout_blocks').add({
    data: Object.assign({}, payload, { created_at: time, updated_at: time }),
  });
  return result._id;
}

async function addSet(payload) {
  const time = now();
  const metrics = calcSetMetrics(payload.weight_kg, payload.reps);
  const result = await database().collection('workout_sets').add({
    data: Object.assign({}, payload, metrics, { created_at: time, updated_at: time }),
  });
  return result._id;
}

async function getSessionBundle(sessionId) {
  const db = database();
  const [session, blocks, sets] = await Promise.all([
    db.collection('workout_sessions').doc(sessionId).get(),
    db.collection('workout_blocks').where({ session_id: sessionId }).orderBy('order', 'asc').get(),
    db.collection('workout_sets').where({ session_id: sessionId }).orderBy('created_at', 'asc').get(),
  ]);
  return {
    session: session.data,
    blocks: blocks.data,
    sets: sets.data,
  };
}

async function listRecentSessions(limit) {
  const result = await database()
    .collection('workout_sessions')
    .orderBy('date', 'desc')
    .limit(limit || 10)
    .get();
  return result.data || [];
}

async function listExerciseStats() {
  try {
    const result = await database()
      .collection('exercise_stats')
      .orderBy('updated_at', 'desc')
      .limit(100)
      .get();
    return result.data || [];
  } catch (error) {
    return [];
  }
}

async function saveUserProfile(openid, data) {
  const time = now();
  return database().collection('users').doc(openid).set({
    data: Object.assign({}, data, { openid, updated_at: time }),
  });
}

module.exports = {
  database,
  getUserContext,
  listExercises,
  getExerciseById,
  createSession,
  updateSession,
  addBlock,
  addSet,
  getSessionBundle,
  listRecentSessions,
  listExerciseStats,
  saveUserProfile,
};
