const {
  GOAL_OPTIONS,
  LOCATION_OPTIONS,
  BODY_PART_OPTIONS,
  EQUIPMENT_OPTIONS,
} = require('../../utils/constants');
const { formatDate, toNumber } = require('../../utils/format');
const {
  getUserContext,
  createSession,
  updateSession,
  addBlock,
  addSet,
  listRecentSessions,
} = require('../../utils/db');

function makeSet(exercise, roundIndex, exerciseOrder, localIndex) {
  return {
    local_id: `${exercise._id}-${Date.now()}-${localIndex}`,
    set_index_local: localIndex,
    exercise_id: exercise._id,
    exercise_name: exercise.name_zh || exercise.name,
    round_index: roundIndex,
    exercise_order_in_block: exerciseOrder,
    weight_kg: '',
    reps: '',
    rpe: '',
    is_warmup: false,
    is_failure: false,
  };
}

Page({
  data: {
    user: null,
    sessionId: '',
    blocks: [],
    recentSessions: [],
    pickerVisible: false,
    pendingBlockType: 'single',
    pendingExercises: [],
    form: {
      title: '今日训练',
      date: formatDate(),
      location: LOCATION_OPTIONS[0].value,
      goal_type: GOAL_OPTIONS[0].value,
      focus_body_parts: [],
      available_equipment: [],
      note: '',
    },
    goalOptions: GOAL_OPTIONS,
    locationOptions: LOCATION_OPTIONS,
    goalLabels: GOAL_OPTIONS.map((item) => item.label),
    locationLabels: LOCATION_OPTIONS.map((item) => item.label),
    goalIndex: 0,
    locationIndex: 0,
    bodyPartOptions: BODY_PART_OPTIONS,
    equipmentOptions: EQUIPMENT_OPTIONS,
  },

  onLoad() {
    this.bootstrap();
  },

  onShow() {
    this.loadRecentSessions();
  },

  async bootstrap() {
    try {
      const context = await getUserContext();
      getApp().globalData.userContext = context;
      this.setData({ user: context.user });
    } catch (error) {
      wx.showToast({ title: '云函数未部署', icon: 'none' });
      console.error(error);
    }
    this.loadRecentSessions();
  },

  async loadRecentSessions() {
    try {
      const recentSessions = await listRecentSessions(5);
      this.setData({ recentSessions });
    } catch (error) {
      console.warn('读取最近训练失败', error);
    }
  },

  onFormInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  onLocationChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      locationIndex: index,
      'form.location': LOCATION_OPTIONS[index].value,
    });
  },

  onGoalChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      goalIndex: index,
      'form.goal_type': GOAL_OPTIONS[index].value,
    });
  },

  toggleListValue(listKey, value) {
    const list = this.data.form[listKey];
    const next = list.indexOf(value) >= 0 ? list.filter((item) => item !== value) : list.concat(value);
    this.setData({ [`form.${listKey}`]: next });
  },

  toggleBodyPart(event) {
    this.toggleListValue('focus_body_parts', event.currentTarget.dataset.value);
  },

  toggleEquipment(event) {
    this.toggleListValue('available_equipment', event.currentTarget.dataset.value);
  },

  async ensureSession() {
    if (this.data.sessionId) return this.data.sessionId;
    wx.showLoading({ title: '创建中' });
    try {
      const form = this.data.form;
      const sessionId = await createSession({
        date: form.date,
        title: form.title || '今日训练',
        location: form.location,
        goal_type: form.goal_type,
        mode: 'manual',
        intent: {
          focus_body_parts: form.focus_body_parts,
          available_equipment: form.available_equipment,
          energy_level: 'normal',
          time_limit_min: null,
          note: form.note,
        },
        notes: form.note,
      });
      this.setData({ sessionId });
      wx.showToast({ title: '已开始', icon: 'success' });
      return sessionId;
    } catch (error) {
      wx.showToast({ title: '创建失败', icon: 'none' });
      console.error(error);
      return '';
    } finally {
      wx.hideLoading();
    }
  },

  openPicker(event) {
    const type = event.currentTarget.dataset.type || 'single';
    this.setData({
      pendingBlockType: type,
      pendingExercises: [],
      pickerVisible: true,
    });
    if (type === 'superset') {
      wx.showToast({ title: '请选择超级组第1个动作', icon: 'none' });
    }
  },

  closePicker() {
    this.setData({ pickerVisible: false, pendingExercises: [] });
  },

  onExerciseSelected(event) {
    const exercise = event.detail.exercise;
    const pending = this.data.pendingExercises.concat(exercise);
    if (this.data.pendingBlockType === 'superset' && pending.length < 2) {
      this.setData({ pendingExercises: pending });
      wx.showToast({ title: '再选1个动作组成超级组', icon: 'none' });
      return;
    }
    this.createLocalBlock(pending);
  },

  createLocalBlock(exercises) {
    const blockIndex = this.data.blocks.length;
    const type = this.data.pendingBlockType;
    const sets = exercises.map((exercise, index) => makeSet(exercise, 1, index + 1, index));
    const title = type === 'superset'
      ? exercises.map((item) => item.name_zh || item.name).join(' + ')
      : (exercises[0].name_zh || exercises[0].name);
    const block = {
      local_id: `block-${Date.now()}`,
      order: blockIndex + 1,
      type,
      title,
      exercises,
      sets,
    };
    this.setData({
      blocks: this.data.blocks.concat(block),
      pickerVisible: false,
      pendingExercises: [],
    });
  },

  addRound(event) {
    const blockIndex = Number(event.currentTarget.dataset.index);
    const blocks = this.data.blocks.slice();
    const block = blocks[blockIndex];
    const roundIndex = Math.max.apply(null, block.sets.map((set) => set.round_index)) + 1;
    const newSets = block.exercises.map((exercise, index) => makeSet(exercise, roundIndex, index + 1, block.sets.length + index));
    block.sets = block.sets.concat(newSets);
    blocks[blockIndex] = block;
    this.setData({ blocks });
  },

  onSetInput(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setIndex = Number(event.currentTarget.dataset.setIndex);
    const key = event.currentTarget.dataset.key;
    const blocks = this.data.blocks.slice();
    const set = blocks[blockIndex].sets.find((item) => item.set_index_local === setIndex);
    set[key] = event.detail.value;
    this.setData({ blocks });
  },

  toggleSetFlag(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setIndex = Number(event.currentTarget.dataset.setIndex);
    const key = event.currentTarget.dataset.key;
    const blocks = this.data.blocks.slice();
    const set = blocks[blockIndex].sets.find((item) => item.set_index_local === setIndex);
    set[key] = !set[key];
    this.setData({ blocks });
  },

  async saveWorkout() {
    const sessionId = await this.ensureSession();
    if (!sessionId) return;
    wx.showLoading({ title: '保存中' });
    try {
      for (let i = 0; i < this.data.blocks.length; i += 1) {
        const block = this.data.blocks[i];
        const blockId = await addBlock({
          session_id: sessionId,
          order: block.order,
          type: block.type,
          title: block.title,
          exercise_ids: block.exercises.map((item) => item._id),
          rest_seconds_between_rounds: 90,
          notes: '',
        });
        for (let j = 0; j < block.sets.length; j += 1) {
          const set = block.sets[j];
          await addSet({
            session_id: sessionId,
            block_id: blockId,
            exercise_id: set.exercise_id,
            block_type: block.type,
            round_index: set.round_index,
            exercise_order_in_block: set.exercise_order_in_block,
            set_index: j + 1,
            weight_kg: toNumber(set.weight_kg, 0),
            reps: toNumber(set.reps, 0),
            rpe: toNumber(set.rpe, 0),
            is_warmup: set.is_warmup,
            is_failure: set.is_failure,
            rest_seconds_after: null,
            notes: '',
          });
        }
      }
      await updateSession(sessionId, {
        status: 'completed',
        ended_at: new Date(),
      });
      try {
        await wx.cloud.callFunction({ name: 'recalculateStats', data: {} });
      } catch (error) {
        console.warn('统计重算失败，可稍后手动重试', error);
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      this.setData({ sessionId: '', blocks: [] });
      this.loadRecentSessions();
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },

  goSessionDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/session-detail/session-detail?id=${id}` });
  },
});
