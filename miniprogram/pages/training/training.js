const {
  GOAL_OPTIONS,
  LOCATION_OPTIONS,
  BODY_PART_OPTIONS,
  EQUIPMENT_OPTIONS,
  ENERGY_OPTIONS,
  INTENT_OPTIONS,
} = require('../../utils/constants');
const { formatDate, toNumber } = require('../../utils/format');
const {
  getUserContext,
  createSession,
  updateSession,
  addBlock,
  addSet,
  listRecentSessions,
  getSessionBundle,
  getExerciseById,
  getFavoriteExerciseIds,
  listRecommendedExercises,
} = require('../../utils/db');

function indexOfValue(options, value) {
  const index = options.findIndex((item) => item.value === value);
  return index >= 0 ? index : 0;
}

function mapSelectableOptions(options, selected) {
  const selectedList = selected || [];
  return options.map((label) => ({
    label,
    value: label,
    selected: selectedList.indexOf(label) >= 0,
  }));
}

function buildIntent(form) {
  const timeLimit = String(form.time_limit_min || '').trim();
  return {
    focus_body_parts: form.focus_body_parts,
    available_equipment: form.available_equipment,
    training_intent: form.training_intent,
    energy_level: form.energy_level,
    time_limit_min: timeLimit ? toNumber(timeLimit, null) : null,
    note: form.note,
  };
}

function mapRecommendationForView(item, form, favoriteIds) {
  const reasons = [];
  const bodyPart = item.body_part_zh || '';
  const equipment = item.equipment_zh || '';
  if (favoriteIds.indexOf(item._id) >= 0 || favoriteIds.indexOf(item.source_id) >= 0) reasons.push('常用');
  if ((form.focus_body_parts || []).some((part) => bodyPart.indexOf(part) >= 0)) reasons.push(bodyPart);
  if ((form.available_equipment || []).some((name) => equipment.indexOf(name) >= 0)) reasons.push(equipment);
  if (form.training_intent === 'breakthrough') reasons.push('适合突破');
  if (form.training_intent === 'maintain') reasons.push('维稳');
  if (form.training_intent === 'deload') reasons.push('减量');
  if (form.training_intent === 'technique') reasons.push('技术打磨');
  return Object.assign({}, item, {
    display_name: item.name_zh || item.name,
    display_body_part: bodyPart || item.body_part,
    display_equipment: equipment || item.equipment,
    reason_text: reasons.slice(0, 3).join(' · ') || '根据当前场景推荐',
  });
}

function mapBlocksForView(blocks) {
  return blocks.map((block, blockIndex) => Object.assign({}, block, {
    block_index: blockIndex,
    sets: block.sets.map((set) => Object.assign({}, set, { block_index: blockIndex })),
  }));
}

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

async function getExerciseName(exerciseId) {
  const exercise = await getExerciseById(exerciseId);
  return exercise ? (exercise.name_zh || exercise.name || exerciseId) : exerciseId;
}

function makeCopiedSet(set, exerciseName, localIndex) {
  return {
    local_id: `copy-${set._id || set.exercise_id}-${Date.now()}-${localIndex}`,
    set_index_local: localIndex,
    exercise_id: set.exercise_id,
    exercise_name: exerciseName,
    round_index: set.round_index || 1,
    exercise_order_in_block: set.exercise_order_in_block || 1,
    weight_kg: String(set.weight_kg || ''),
    reps: String(set.reps || ''),
    rpe: set.rpe ? String(set.rpe) : '',
    is_warmup: Boolean(set.is_warmup),
    is_failure: Boolean(set.is_failure),
  };
}

Page({
  data: {
    user: null,
    sessionId: '',
    isStarting: false,
    isSaving: false,
    startDisabled: false,
    blocks: [],
    recentSessions: [],
    pickerVisible: false,
    pendingBlockType: 'single',
    pendingExercises: [],
    favoriteExerciseIds: [],
    recommendedExercises: [],
    form: {
      title: '今日训练',
      date: formatDate(),
      location: LOCATION_OPTIONS[0].value,
      goal_type: GOAL_OPTIONS[0].value,
      training_intent: INTENT_OPTIONS[0].value,
      energy_level: ENERGY_OPTIONS[1].value,
      time_limit_min: '',
      focus_body_parts: [],
      available_equipment: [],
      note: '',
    },
    goalOptions: GOAL_OPTIONS,
    locationOptions: LOCATION_OPTIONS,
    energyOptions: ENERGY_OPTIONS,
    intentOptions: INTENT_OPTIONS,
    goalLabels: GOAL_OPTIONS.map((item) => item.label),
    locationLabels: LOCATION_OPTIONS.map((item) => item.label),
    energyLabels: ENERGY_OPTIONS.map((item) => item.label),
    intentLabels: INTENT_OPTIONS.map((item) => item.label),
    goalIndex: 0,
    locationIndex: 0,
    energyIndex: 1,
    intentIndex: 0,
    bodyPartOptions: mapSelectableOptions(BODY_PART_OPTIONS, []),
    equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, []),
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
      const user = context.user || {};
      const favoriteExerciseIds = await getFavoriteExerciseIds(context.openid);
      const patch = { user, favoriteExerciseIds };
      if (user.default_goal) {
        patch['form.goal_type'] = user.default_goal;
        patch.goalIndex = indexOfValue(GOAL_OPTIONS, user.default_goal);
      }
      if (user.default_location) {
        patch['form.location'] = user.default_location;
        patch.locationIndex = indexOfValue(LOCATION_OPTIONS, user.default_location);
      }
      if (user.available_equipment_home && user.available_equipment_home.length > 0) {
        patch['form.available_equipment'] = user.available_equipment_home;
        patch.equipmentOptions = mapSelectableOptions(EQUIPMENT_OPTIONS, user.available_equipment_home);
      }
      this.setData(patch);
      this.loadRecommendations();
    } catch (error) {
      wx.showToast({ title: '云函数未部署', icon: 'none' });
      console.error(error);
    }
    this.loadRecentSessions();
  },

  async loadRecommendations() {
    try {
      const items = await listRecommendedExercises(Object.assign({}, buildIntent(this.data.form), {
        preferred_ids: this.data.favoriteExerciseIds,
        limit: 8,
      }));
      this.setData({
        recommendedExercises: items.map((item) => mapRecommendationForView(item, this.data.form, this.data.favoriteExerciseIds)),
      });
    } catch (error) {
      console.warn('生成推荐动作失败', error);
    }
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

  onIntentChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      intentIndex: index,
      'form.training_intent': INTENT_OPTIONS[index].value,
    });
    this.loadRecommendations();
  },

  onEnergyChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      energyIndex: index,
      'form.energy_level': ENERGY_OPTIONS[index].value,
    });
    this.loadRecommendations();
  },

  toggleListValue(listKey, value) {
    const list = this.data.form[listKey];
    const next = list.indexOf(value) >= 0 ? list.filter((item) => item !== value) : list.concat(value);
    const patch = { [`form.${listKey}`]: next };
    if (listKey === 'focus_body_parts') patch.bodyPartOptions = mapSelectableOptions(BODY_PART_OPTIONS, next);
    if (listKey === 'available_equipment') patch.equipmentOptions = mapSelectableOptions(EQUIPMENT_OPTIONS, next);
    this.setData(patch);
    this.loadRecommendations();
  },

  toggleBodyPart(event) {
    this.toggleListValue('focus_body_parts', event.currentTarget.dataset.value);
  },

  toggleEquipment(event) {
    this.toggleListValue('available_equipment', event.currentTarget.dataset.value);
  },

  async ensureSession() {
    if (this.data.sessionId) return this.data.sessionId;
    if (this.data.isStarting) return '';
    this.setData({ isStarting: true, startDisabled: true });
    wx.showLoading({ title: '创建中' });
    try {
      const form = this.data.form;
      const sessionId = await createSession({
        date: form.date,
        title: form.title || '今日训练',
        location: form.location,
        goal_type: form.goal_type,
        mode: 'manual',
        intent: buildIntent(form),
        notes: form.note,
      });
      this.setData({ sessionId, startDisabled: true });
      wx.showToast({ title: '已开始', icon: 'success' });
      return sessionId;
    } catch (error) {
      wx.showToast({ title: '创建失败', icon: 'none' });
      console.error(error);
      return '';
    } finally {
      this.setData({
        isStarting: false,
        startDisabled: Boolean(this.data.sessionId),
      });
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
      block_index: blockIndex,
      type,
      title,
      exercises,
      sets,
    };
    this.setData({
      blocks: mapBlocksForView(this.data.blocks.concat(block)),
      pickerVisible: false,
      pendingExercises: [],
    });
  },

  addRecommendedExercise(event) {
    const id = event.currentTarget.dataset.id;
    const exercise = this.data.recommendedExercises.find((item) => item._id === id);
    if (!exercise) return;
    this.setData({ pendingBlockType: 'single', pendingExercises: [] });
    this.createLocalBlock([exercise]);
    wx.showToast({ title: '已加入训练块', icon: 'success' });
  },

  deleteBlock(event) {
    const blockIndex = Number(event.currentTarget.dataset.index);
    const blocks = this.data.blocks.slice();
    const block = blocks[blockIndex];
    if (block.remote_id) {
      wx.showToast({ title: '已保存的训练块暂不支持删除', icon: 'none' });
      return;
    }
    blocks.splice(blockIndex, 1);
    const next = blocks.map((item, index) => Object.assign({}, item, { order: index + 1 }));
    this.setData({ blocks: mapBlocksForView(next) });
  },

  addRound(event) {
    const blockIndex = Number(event.currentTarget.dataset.index);
    const blocks = this.data.blocks.slice();
    const block = blocks[blockIndex];
    const roundIndex = Math.max.apply(null, block.sets.map((set) => set.round_index)) + 1;
    const newSets = block.exercises.map((exercise, index) => makeSet(exercise, roundIndex, index + 1, block.sets.length + index));
    block.sets = block.sets.concat(newSets);
    blocks[blockIndex] = block;
    this.setData({ blocks: mapBlocksForView(blocks) });
  },

  onSetInput(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setIndex = Number(event.currentTarget.dataset.setIndex);
    const key = event.currentTarget.dataset.key;
    const blocks = this.data.blocks.slice();
    const set = blocks[blockIndex].sets.find((item) => item.set_index_local === setIndex);
    set[key] = event.detail.value;
    this.setData({ blocks: mapBlocksForView(blocks) });
  },

  deleteSet(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setIndex = Number(event.currentTarget.dataset.setIndex);
    const blocks = this.data.blocks.slice();
    const block = blocks[blockIndex];
    const set = block.sets.find((item) => item.set_index_local === setIndex);
    if (set && set.remote_id) {
      wx.showToast({ title: '已保存的组暂不支持删除', icon: 'none' });
      return;
    }
    block.sets = block.sets.filter((item) => item.set_index_local !== setIndex);
    blocks[blockIndex] = block;
    this.setData({ blocks: mapBlocksForView(blocks) });
  },

  toggleSetFlag(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setIndex = Number(event.currentTarget.dataset.setIndex);
    const key = event.currentTarget.dataset.key;
    const blocks = this.data.blocks.slice();
    const set = blocks[blockIndex].sets.find((item) => item.set_index_local === setIndex);
    set[key] = !set[key];
    this.setData({ blocks: mapBlocksForView(blocks) });
  },

  async saveWorkout() {
    if (this.data.isSaving) return;
    if (this.data.blocks.length === 0) {
      wx.showToast({ title: '请先添加训练块', icon: 'none' });
      return;
    }
    this.setData({ isSaving: true });
    const sessionId = await this.ensureSession();
    if (!sessionId) {
      this.setData({ isSaving: false });
      return;
    }
    wx.showLoading({ title: '保存中' });
    try {
      const form = this.data.form;
      await updateSession(sessionId, {
        date: form.date,
        title: form.title || '今日训练',
        location: form.location,
        goal_type: form.goal_type,
        intent: buildIntent(form),
        notes: form.note,
      });
      const blocks = this.data.blocks.slice();
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        let blockId = block.remote_id;
        if (!blockId) {
          blockId = await addBlock({
            session_id: sessionId,
            order: block.order,
            type: block.type,
            title: block.title,
            exercise_ids: block.exercises.map((item) => item._id),
            rest_seconds_between_rounds: 90,
            notes: '',
          });
          block.remote_id = blockId;
          blocks[i] = block;
          this.setData({ blocks: mapBlocksForView(blocks) });
        }
        for (let j = 0; j < block.sets.length; j += 1) {
          const set = block.sets[j];
          if (set.remote_id) continue;
          const setId = await addSet({
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
          set.remote_id = setId;
          block.sets[j] = set;
          blocks[i] = block;
          this.setData({ blocks: mapBlocksForView(blocks) });
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
      this.setData({ sessionId: '', blocks: [], startDisabled: false });
      this.loadRecentSessions();
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ isSaving: false });
      wx.hideLoading();
    }
  },

  goSessionDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/session-detail/session-detail?id=${id}` });
  },

  async copyRecentSession(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    if (this.data.sessionId || this.data.blocks.length > 0) {
      const result = await new Promise((resolve) => {
        wx.showModal({
          title: '复制上次训练？',
          content: '当前未保存的训练块会被替换，请确认已经不需要它们。',
          confirmText: '替换',
          success: resolve,
          fail: () => resolve({ confirm: false }),
        });
      });
      if (!result.confirm) return;
    }

    wx.showLoading({ title: '复制中' });
    try {
      const bundle = await getSessionBundle(id);
      const nameMap = {};
      for (let i = 0; i < bundle.sets.length; i += 1) {
        const exerciseId = bundle.sets[i].exercise_id;
        if (!nameMap[exerciseId]) nameMap[exerciseId] = await getExerciseName(exerciseId);
      }
      const blocks = bundle.blocks.map((block, blockIndex) => {
        const sets = bundle.sets
          .filter((set) => set.block_id === block._id)
          .map((set, setIndex) => makeCopiedSet(set, nameMap[set.exercise_id] || set.exercise_id, setIndex));
        const exerciseIds = block.exercise_ids || Array.from(new Set(sets.map((set) => set.exercise_id)));
        return {
          local_id: `copy-block-${block._id}-${Date.now()}-${blockIndex}`,
          order: blockIndex + 1,
          block_index: blockIndex,
          type: block.type || 'single',
          title: block.title || exerciseIds.map((exerciseId) => nameMap[exerciseId] || exerciseId).join(' + '),
          exercises: exerciseIds.map((exerciseId) => ({
            _id: exerciseId,
            name: nameMap[exerciseId] || exerciseId,
            name_zh: nameMap[exerciseId] || exerciseId,
          })),
          sets,
        };
      });
      const sourceTitle = bundle.session && bundle.session.title ? bundle.session.title : '上次训练';
      this.setData({
        sessionId: '',
        startDisabled: false,
        blocks: mapBlocksForView(blocks),
        'form.title': `${sourceTitle}（复制）`,
        'form.date': formatDate(),
      });
      wx.showToast({ title: '已复制', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '复制失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },
});
