const { getSessionBundle, getExerciseById } = require('../../utils/db');

Page({
  data: {
    id: '',
    session: {},
    blocks: [],
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
    if (options.id) this.load(options.id);
  },

  async load(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const bundle = await getSessionBundle(id);
      const names = {};
      for (let i = 0; i < bundle.sets.length; i += 1) {
        const exerciseId = bundle.sets[i].exercise_id;
        if (!names[exerciseId]) {
          const exercise = await getExerciseById(exerciseId);
          names[exerciseId] = exercise ? (exercise.name_zh || exercise.name) : exerciseId;
        }
      }
      const blocks = bundle.blocks.map((block) => Object.assign({}, block, {
        sets: bundle.sets
          .filter((set) => set.block_id === block._id)
          .map((set) => Object.assign({}, set, { exercise_name: names[set.exercise_id] })),
      }));
      this.setData({ session: bundle.session || {}, blocks });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },
});
