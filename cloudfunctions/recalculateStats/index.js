const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100;

async function getAll(collectionName, where) {
  const countResult = await db.collection(collectionName).where(where).count();
  const total = countResult.total || 0;
  const batchTimes = Math.ceil(total / MAX_LIMIT);
  const tasks = [];
  for (let i = 0; i < batchTimes; i += 1) {
    tasks.push(db.collection(collectionName).where(where).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get());
  }
  const results = await Promise.all(tasks);
  return results.reduce((acc, result) => acc.concat(result.data || []), []);
}

function calcMetrics(set) {
  const weight = Number(set.weight_kg) || 0;
  const reps = Number(set.reps) || 0;
  const volume = Number(set.volume_kg) || weight * reps;
  const estimated = Number(set.estimated_1rm_kg) || (weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0);
  return { weight, reps, volume, estimated };
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const ownerCondition = {
    _or: [
      { _openid: OPENID },
      { user_openid: OPENID },
    ],
  };
  const sets = await getAll('workout_sets', Object.assign({}, ownerCondition, {
    is_warmup: _.neq(true),
  }));
  const sessions = await getAll('workout_sessions', ownerCondition);

  const exerciseIds = Array.from(new Set(sets.map((set) => set.exercise_id).filter(Boolean)));
  const exerciseNames = {};
  for (let i = 0; i < exerciseIds.length; i += 1) {
    const exerciseId = exerciseIds[i];
    try {
      const result = await db.collection('exercises').doc(exerciseId).get();
      if (result.data) exerciseNames[exerciseId] = result.data.name_zh || result.data.name || exerciseId;
    } catch (error) {
      exerciseNames[exerciseId] = exerciseId;
    }
  }

  const sessionDate = sessions.reduce((acc, session) => {
    acc[session._id] = session.ended_at || session.date || session.updated_at || session.created_at;
    return acc;
  }, {});

  const grouped = sets.reduce((acc, set) => {
    if (!set.exercise_id) return acc;
    if (!acc[set.exercise_id]) {
      acc[set.exercise_id] = {
        _id: `${OPENID}_${set.exercise_id}`,
        user_openid: OPENID,
        exercise_id: set.exercise_id,
        exercise_name: exerciseNames[set.exercise_id] || set.exercise_id,
        session_ids: {},
        total_sets: 0,
        total_reps: 0,
        total_volume_kg: 0,
        max_weight_kg: 0,
        max_volume_kg: 0,
        estimated_1rm_kg: 0,
        last_performed_at: null,
        last_weight_kg: 0,
        last_reps: 0,
      };
    }
    const stat = acc[set.exercise_id];
    const metrics = calcMetrics(set);
    stat.session_ids[set.session_id] = true;
    stat.total_sets += 1;
    stat.total_reps += metrics.reps;
    stat.total_volume_kg += metrics.volume;
    stat.max_weight_kg = Math.max(stat.max_weight_kg, metrics.weight);
    stat.max_volume_kg = Math.max(stat.max_volume_kg, metrics.volume);
    stat.estimated_1rm_kg = Math.max(stat.estimated_1rm_kg, metrics.estimated);

    const performedAt = sessionDate[set.session_id] || set.updated_at || set.created_at;
    if (!stat.last_performed_at || new Date(performedAt) > new Date(stat.last_performed_at)) {
      stat.last_performed_at = performedAt;
      stat.last_weight_kg = metrics.weight;
      stat.last_reps = metrics.reps;
    }
    return acc;
  }, {});

  const stats = Object.values(grouped).map((item) => {
    const totalSessions = Object.keys(item.session_ids).length;
    delete item.session_ids;
    return Object.assign({}, item, {
      total_sessions: totalSessions,
      total_volume_kg: Math.round(item.total_volume_kg * 10) / 10,
      max_volume_kg: Math.round(item.max_volume_kg * 10) / 10,
      estimated_1rm_kg: Math.round(item.estimated_1rm_kg * 10) / 10,
      updated_at: new Date(),
    });
  });

  const currentStatIds = stats.reduce((acc, item) => {
    acc[item._id] = true;
    return acc;
  }, {});
  const oldStats = await getAll('exercise_stats', { user_openid: OPENID });
  for (let i = 0; i < oldStats.length; i += 1) {
    if (!currentStatIds[oldStats[i]._id]) {
      await db.collection('exercise_stats').doc(oldStats[i]._id).remove();
    }
  }

  for (let i = 0; i < stats.length; i += 1) {
    await db.collection('exercise_stats').doc(stats[i]._id).set({ data: stats[i] });
  }

  return {
    ok: true,
    openid: OPENID,
    set_count: sets.length,
    stat_count: stats.length,
  };
};
