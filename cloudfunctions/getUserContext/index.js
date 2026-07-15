const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
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
