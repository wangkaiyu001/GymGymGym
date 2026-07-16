const {
  getUserContext,
  getSessionBundle,
  getExerciseById,
  updateSession,
  updateSet,
  deleteSet: removeWorkoutSet,
  deleteBlock: removeWorkoutBlock,
} = require('../../utils/db');
const { toNumber } = require('../../utils/format');
const { GOAL_OPTIONS, LOCATION_OPTIONS } = require('../../utils/constants');

function indexOfValue(options, value) {
  const index = options.findIndex((item) => item.value === value);
  return index >= 0 ? index : 0;
}

function findSet(blocks, blockIndex, setId) {
  const block = blocks[blockIndex];
  if (!block) return null;
  return block.sets.find((item) => item._id === setId) || null;
}

Page({
  data: {
    id: '',
    session: {},
    sessionForm: {
      title: '',
      date: '',
      location: '',
      goal_type: '',
      notes: '',
    },
    blocks: [],
    goalLabels: GOAL_OPTIONS.map((item) => item.label),
    locationLabels: LOCATION_OPTIONS.map((item) => item.label),
    goalIndex: 0,
    locationIndex: 0,
    isSavingSession: false,
    savingSetId: '',
    deletingId: '',
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
    if (options.id) this.load(options.id);
  },

  async load(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const app = getApp();
      if (!app.globalData.userContext) {
        const context = await getUserContext();
        app.globalData.userContext = context;
      }
      const bundle = await getSessionBundle(id);
      if (!bundle.session) throw new Error('Session not found or not owned by current user');
      const names = {};
      for (let i = 0; i < bundle.sets.length; i += 1) {
        const exerciseId = bundle.sets[i].exercise_id;
        if (!names[exerciseId]) {
          const exercise = await getExerciseById(exerciseId);
          names[exerciseId] = exercise ? (exercise.name_zh || exercise.name) : exerciseId;
        }
      }
      const blocks = bundle.blocks.map((block, blockIndex) => Object.assign({}, block, {
        block_index: blockIndex,
        display_type: block.type === 'superset' ? '超级组' : '普通组',
        sets: bundle.sets
          .filter((set) => set.block_id === block._id)
          .map((set) => Object.assign({}, set, { exercise_name: names[set.exercise_id] || set.exercise_id })),
      }));
      const session = bundle.session || {};
      session.display_title = session.title || '训练详情';
      this.setData({
        session,
        sessionForm: {
          title: session.title || '',
          date: session.date || '',
          location: session.location || LOCATION_OPTIONS[0].value,
          goal_type: session.goal_type || GOAL_OPTIONS[0].value,
          notes: session.notes || '',
        },
        goalIndex: indexOfValue(GOAL_OPTIONS, session.goal_type),
        locationIndex: indexOfValue(LOCATION_OPTIONS, session.location),
        blocks,
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },

  onSessionInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`sessionForm.${key}`]: event.detail.value });
  },

  onLocationChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      locationIndex: index,
      'sessionForm.location': LOCATION_OPTIONS[index].value,
    });
  },

  onGoalChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      goalIndex: index,
      'sessionForm.goal_type': GOAL_OPTIONS[index].value,
    });
  },

  async saveSession() {
    if (!this.data.id || this.data.isSavingSession) return;
    const form = this.data.sessionForm;
    this.setData({ isSavingSession: true });
    try {
      await updateSession(this.data.id, {
        title: form.title || '训练详情',
        date: form.date,
        location: form.location,
        goal_type: form.goal_type,
        notes: form.notes,
      });
      wx.showToast({ title: '训练信息已保存', icon: 'success' });
      this.load(this.data.id);
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ isSavingSession: false });
    }
  },

  onSetInput(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setId = event.currentTarget.dataset.setId;
    const key = event.currentTarget.dataset.key;
    const blocks = this.data.blocks.slice();
    const set = findSet(blocks, blockIndex, setId);
    if (!set) return;
    set[key] = event.detail.value;
    this.setData({ blocks });
  },

  toggleSetFlag(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setId = event.currentTarget.dataset.setId;
    const key = event.currentTarget.dataset.key;
    const blocks = this.data.blocks.slice();
    const set = findSet(blocks, blockIndex, setId);
    if (!set) return;
    set[key] = !set[key];
    this.setData({ blocks });
  },

  async saveSet(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setId = event.currentTarget.dataset.setId;
    const set = findSet(this.data.blocks, blockIndex, setId);
    if (!set || this.data.savingSetId) return;
    this.setData({ savingSetId: setId });
    try {
      await updateSet(setId, {
        weight_kg: toNumber(set.weight_kg, 0),
        reps: toNumber(set.reps, 0),
        rpe: toNumber(set.rpe, 0),
        is_warmup: Boolean(set.is_warmup),
        is_failure: Boolean(set.is_failure),
      });
      await this.recalculateStats();
      wx.showToast({ title: '已保存', icon: 'success' });
      this.load(this.data.id);
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ savingSetId: '' });
    }
  },

  async deleteSet(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setId = event.currentTarget.dataset.setId;
    const set = findSet(this.data.blocks, blockIndex, setId);
    if (!set || this.data.deletingId) return;
    const result = await new Promise((resolve) => {
      wx.showModal({
        title: '删除这一组？',
        content: `${set.exercise_name || '动作'} ${set.weight_kg || 0}kg × ${set.reps || 0} 将从档案统计中移除。`,
        confirmText: '删除',
        confirmColor: '#d92d20',
        success: resolve,
        fail: () => resolve({ confirm: false }),
      });
    });
    if (!result.confirm) return;
    this.setData({ deletingId: setId });
    try {
      await removeWorkoutSet(setId);
      await this.recalculateStats();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load(this.data.id);
    } catch (error) {
      wx.showToast({ title: '删除失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ deletingId: '' });
    }
  },

  async deleteBlock(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const block = this.data.blocks[blockIndex];
    if (!block || this.data.deletingId) return;
    const result = await new Promise((resolve) => {
      wx.showModal({
        title: '删除训练块？',
        content: `${block.title || '该训练块'} 下的 ${block.sets.length} 组都会被删除。`,
        confirmText: '删除',
        confirmColor: '#d92d20',
        success: resolve,
        fail: () => resolve({ confirm: false }),
      });
    });
    if (!result.confirm) return;
    this.setData({ deletingId: block._id });
    try {
      for (let i = 0; i < block.sets.length; i += 1) {
        await removeWorkoutSet(block.sets[i]._id);
      }
      await removeWorkoutBlock(block._id);
      if (this.data.blocks.length === 1) {
        await updateSession(this.data.id, { status: 'draft', ended_at: null });
      }
      await this.recalculateStats();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load(this.data.id);
    } catch (error) {
      wx.showToast({ title: '删除失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ deletingId: '' });
    }
  },

  async recalculateStats() {
    try {
      await wx.cloud.callFunction({ name: 'recalculateStats', data: {} });
    } catch (error) {
      console.warn('统计重算失败，可稍后在档案页手动重试', error);
    }
  },
});
