const seedExercises = require('../data/seed-exercises');
const { calcSetMetrics } = require('./stats');

function database() {
  return wx.cloud.database();
}

function now() {
  return new Date();
}

function currentOpenid() {
  try {
    const app = getApp();
    return app && app.globalData && app.globalData.userContext
      ? app.globalData.userContext.openid || ''
      : '';
  } catch (error) {
    return '';
  }
}

function withOwnership(data) {
  const openid = currentOpenid();
  if (!openid) throw new Error('Missing authenticated user context');
  if (data.user_openid && data.user_openid !== openid) {
    throw new Error('Cannot write data for another user');
  }
  if (data.user_openid) return data;
  return Object.assign({}, data, { user_openid: openid });
}

function ownedWhere(db, conditions) {
  const openid = currentOpenid();
  if (!openid) throw new Error('Missing authenticated user context');
  const ownerCondition = {
    _or: [
      { _openid: openid },
      { user_openid: openid },
    ],
  };
  return conditions ? Object.assign({}, conditions, ownerCondition) : ownerCondition;
}

function ownedDocumentQuery(collectionName, documentId) {
  if (!documentId) throw new Error('Missing document id');
  const db = database();
  return db.collection(collectionName).where(ownedWhere(db, { _id: documentId }));
}

async function updateOwnedDocument(collectionName, documentId, patch) {
  const result = await ownedDocumentQuery(collectionName, documentId).update({ data: patch });
  if (!result || Number(result.stats && result.stats.updated) < 1) {
    throw new Error(`${collectionName} document not found or not owned by current user`);
  }
  return result;
}

async function deleteOwnedDocument(collectionName, documentId) {
  const result = await ownedDocumentQuery(collectionName, documentId).remove();
  if (!result || Number(result.stats && result.stats.removed) < 1) {
    throw new Error(`${collectionName} document not found or not owned by current user`);
  }
  return result;
}

async function listOwnedDocuments(collectionName, options) {
  const config = options || {};
  const db = database();
  const requestedLimit = Math.max(1, Number(config.limit) || 20);
  const pageSize = Math.min(20, requestedLimit);
  const items = [];
  while (items.length < requestedLimit) {
    let query = db.collection(collectionName).where(ownedWhere(db, config.where));
    if (config.orderBy) query = query.orderBy(config.orderBy, config.order || 'desc');
    const result = await query.skip(items.length).limit(Math.min(pageSize, requestedLimit - items.length)).get();
    const page = result.data || [];
    items.push(...page);
    if (page.length < pageSize) break;
  }
  return items;
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

async function listExercisesByIds(ids) {
  const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  try {
    const db = database();
    const _ = db.command;
    const result = await db.collection('exercises')
      .where({ _id: _.in(uniqueIds.slice(0, 50)) })
      .limit(50)
      .get();
    if (result.data && result.data.length > 0) return result.data;
  } catch (error) {
    console.warn('读取收藏动作失败，使用内置动作兜底', error);
  }
  return seedExercises.filter((item) => uniqueIds.indexOf(item._id) >= 0 || uniqueIds.indexOf(item.source_id) >= 0);
}

async function listRecommendedExercises(context) {
  const query = context || {};
  const bodyParts = query.focus_body_parts || [];
  const equipmentList = query.available_equipment || [];
  const preferredIds = query.preferred_ids || [];
  const limit = query.limit || 8;
  const hasBodyFilter = bodyParts.length > 0;
  const hasEquipmentFilter = equipmentList.length > 0;

  function scoreExercise(item) {
    let score = 0;
    const bodyPart = item.body_part_zh || '';
    const equipment = item.equipment_zh || '';
    const target = `${item.target || ''} ${item.target_zh || ''} ${(item.muscle_group || []).join(' ')}`.toLowerCase();

    if (preferredIds.indexOf(item._id) >= 0 || preferredIds.indexOf(item.source_id) >= 0) score += 40;
    if (item.is_common) score += 8;
    if (!hasBodyFilter || bodyParts.some((part) => bodyPart.indexOf(part) >= 0 || target.indexOf(part.toLowerCase()) >= 0)) score += 30;
    if (!hasEquipmentFilter || equipmentList.some((equipmentName) => equipment.indexOf(equipmentName) >= 0)) score += 20;
    if (query.training_intent === 'breakthrough' && item.difficulty !== 'beginner') score += 6;
    if ((query.training_intent === 'deload' || query.energy_level === 'low') && item.difficulty !== 'advanced') score += 6;
    if (query.training_intent === 'technique' && item.difficulty !== 'advanced') score += 4;
    return score;
  }

  function filterAndRank(items) {
    return items
      .map((item) => Object.assign({}, item, { recommend_score: scoreExercise(item) }))
      .filter((item) => item.recommend_score >= 20)
      .sort((a, b) => b.recommend_score - a.recommend_score)
      .slice(0, limit);
  }

  try {
    const db = database();
    const _ = db.command;
    const conditions = [];
    if (hasBodyFilter) {
      conditions.push(_.or(bodyParts.map((part) => ({
        body_part_zh: db.RegExp({ regexp: part, options: 'i' }),
      }))));
    }
    if (hasEquipmentFilter) {
      conditions.push(_.or(equipmentList.map((equipmentName) => ({
        equipment_zh: db.RegExp({ regexp: equipmentName, options: 'i' }),
      }))));
    }
    const result = conditions.length > 0
      ? await db.collection('exercises').where(_.and(conditions)).limit(80).get()
      : await db.collection('exercises').limit(80).get();
    const favoriteItems = preferredIds.length > 0 ? await listExercisesByIds(preferredIds) : [];
    const itemMap = {};
    (result.data || []).concat(favoriteItems).forEach((item) => {
      if (item && item._id) itemMap[item._id] = item;
    });
    const ranked = filterAndRank(Object.keys(itemMap).map((id) => itemMap[id]));
    if (ranked.length > 0) return ranked;
  } catch (error) {
    console.warn('读取推荐动作失败，使用内置动作兜底', error);
  }

  return filterAndRank(seedExercises);
}

async function getFavoriteExerciseIds(openid) {
  if (!openid) return [];
  try {
    const result = await database().collection('users').doc(openid).get();
    const user = result.data || {};
    return Array.isArray(user.favorite_exercise_ids) ? user.favorite_exercise_ids : [];
  } catch (error) {
    return [];
  }
}

async function saveFavoriteExerciseIds(openid, ids) {
  if (!openid) throw new Error('Missing openid');
  const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
  return saveUserProfile(openid, { favorite_exercise_ids: uniqueIds });
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
  const data = withOwnership(Object.assign({}, payload, {
    status: 'draft',
    started_at: time,
    created_at: time,
    updated_at: time,
  }));
  const result = await database().collection('workout_sessions').add({ data });
  return result._id;
}

async function updateSession(sessionId, patch) {
  return updateOwnedDocument('workout_sessions', sessionId, Object.assign({}, patch, { updated_at: now() }));
}

async function addBlock(payload) {
  const time = now();
  const result = await database().collection('workout_blocks').add({
    data: withOwnership(Object.assign({}, payload, { created_at: time, updated_at: time })),
  });
  return result._id;
}

async function updateBlock(blockId, patch) {
  return updateOwnedDocument('workout_blocks', blockId, Object.assign({}, patch, { updated_at: now() }));
}

async function deleteBlock(blockId) {
  return deleteOwnedDocument('workout_blocks', blockId);
}

async function addSet(payload) {
  const time = now();
  const metrics = calcSetMetrics(payload.weight_kg, payload.reps);
  const result = await database().collection('workout_sets').add({
    data: withOwnership(Object.assign({}, payload, metrics, { created_at: time, updated_at: time })),
  });
  return result._id;
}

async function updateSet(setId, patch) {
  const metrics = Object.prototype.hasOwnProperty.call(patch, 'weight_kg') || Object.prototype.hasOwnProperty.call(patch, 'reps')
    ? calcSetMetrics(patch.weight_kg, patch.reps)
    : {};
  return updateOwnedDocument('workout_sets', setId, Object.assign({}, patch, metrics, { updated_at: now() }));
}

async function deleteSet(setId) {
  return deleteOwnedDocument('workout_sets', setId);
}

async function getSessionBundle(sessionId) {
  const db = database();
  const [sessionResult, blocks, sets] = await Promise.all([
    db.collection('workout_sessions').where(ownedWhere(db, { _id: sessionId })).limit(1).get(),
    db.collection('workout_blocks').where(ownedWhere(db, { session_id: sessionId })).orderBy('order', 'asc').get(),
    db.collection('workout_sets').where(ownedWhere(db, { session_id: sessionId })).orderBy('created_at', 'asc').get(),
  ]);
  return {
    session: sessionResult.data && sessionResult.data[0],
    blocks: blocks.data,
    sets: sets.data,
  };
}

async function listRecentSessions(limit) {
  return listOwnedDocuments('workout_sessions', {
    where: { status: 'completed' },
    orderBy: 'date',
    order: 'desc',
    limit: limit || 10,
  });
}

async function listAllSessions(limit) {
  return listOwnedDocuments('workout_sessions', {
    orderBy: 'date',
    order: 'desc',
    limit: limit || 1000,
  });
}

async function listExerciseStats() {
  try {
    return await listOwnedDocuments('exercise_stats', {
      orderBy: 'updated_at',
      order: 'desc',
      limit: 100,
    });
  } catch (error) {
    return [];
  }
}

async function listWorkoutSets(limit) {
  try {
    return await listOwnedDocuments('workout_sets', {
      orderBy: 'created_at',
      order: 'desc',
      limit: limit || 500,
    });
  } catch (error) {
    return [];
  }
}

async function listUserGoals(limit) {
  return listOwnedDocuments('user_goals', {
    orderBy: 'created_at',
    order: 'desc',
    limit: limit || 20,
  });
}

async function listWorkoutBlocks(limit) {
  return listOwnedDocuments('workout_blocks', {
    orderBy: 'created_at',
    order: 'desc',
    limit: limit || 500,
  });
}

async function addUserGoal(payload) {
  const time = now();
  const result = await database().collection('user_goals').add({
    data: withOwnership(Object.assign({}, payload, {
      status: payload.status || 'active',
      created_at: time,
      updated_at: time,
    })),
  });
  return result._id;
}

async function updateUserGoal(goalId, patch) {
  return updateOwnedDocument('user_goals', goalId, Object.assign({}, patch, { updated_at: now() }));
}

async function deleteUserGoal(goalId) {
  return deleteOwnedDocument('user_goals', goalId);
}

async function saveUserProfile(openid, data) {
  const authenticatedOpenid = currentOpenid();
  if (!authenticatedOpenid || openid !== authenticatedOpenid) {
    throw new Error('Cannot save another user profile');
  }
  const time = now();
  let existing = {};
  try {
    const result = await database().collection('users').doc(openid).get();
    existing = result.data || {};
  } catch (error) {
    existing = {};
  }
  return database().collection('users').doc(openid).set({
    data: Object.assign({}, existing, data, {
      _id: openid,
      openid,
      created_at: existing.created_at || time,
      updated_at: time,
    }),
  });
}

module.exports = {
  database,
  getUserContext,
  listExercises,
  listExercisesByIds,
  listRecommendedExercises,
  getFavoriteExerciseIds,
  saveFavoriteExerciseIds,
  getExerciseById,
  createSession,
  updateSession,
  addBlock,
  updateBlock,
  deleteBlock,
  addSet,
  updateSet,
  deleteSet,
  getSessionBundle,
  listRecentSessions,
  listAllSessions,
  listExerciseStats,
  listWorkoutSets,
  listWorkoutBlocks,
  listUserGoals,
  addUserGoal,
  updateUserGoal,
  deleteUserGoal,
  saveUserProfile,
};
