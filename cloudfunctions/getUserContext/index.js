const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const REQUIRED_COLLECTIONS = ['users', 'exercises', 'workout_sessions', 'workout_blocks', 'workout_sets', 'exercise_stats'];

async function ensureCollections() {
  for (const name of REQUIRED_COLLECTIONS) {
    try {
      await db.createCollection(name);
    } catch (error) {
      const message = String(error.errMsg || error.message || error);
      if (!/exist|already|duplicate/i.test(message)) {
        try { await db.collection(name).limit(1).get(); } catch (readError) { throw error; }
      }
    }
  }
}

exports.main = async () => {
  await ensureCollections();
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const now = new Date();
  const users = db.collection('users');

  let user = null;
  try {
    const result = await users.doc(openid).get();
    user = result.data;
  } catch (error) {
    user = null;
  }

  if (!user) {
    user = {
      _id: openid,
      openid,
      nickname: '',
      role: 'unknown',
      training_level: 'intermediate',
      default_goal: 'hypertrophy',
      default_location: 'gym',
      available_equipment_home: [],
      favorite_exercise_ids: [],
      created_at: now,
      updated_at: now,
    };
    await users.doc(openid).set({ data: user });
  }

  return {
    openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || '',
    user,
  };
};
