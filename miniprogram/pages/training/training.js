const { formatDate, toNumber } = require('../../utils/format');
const { buildBodyPartReminders } = require('../../utils/training-reminders');
const { parseWorkoutPrompt, buildPlan } = require('../../utils/workout-planner');
const {
  getUserContext,
  getExerciseHistoryMap,
  listRecommendedExercises,
  listRecentSessions,
  getLatestDraftSession,
  getSessionBundle,
  getExerciseById,
  createSession,
  updateSession,
  deleteSession: removeWorkoutSession,
  addBlock,
  updateBlock,
  deleteBlock,
  addSet,
  updateSet,
  deleteSet,
} = require('../../utils/db');

function makeSet(exercise, index, prescription) {
  return {
    local_id: `${exercise._id}-${Date.now()}-${index}`,
    set_index_local: index,
    exercise_id: exercise._id,
    exercise_name: exercise.name_zh || exercise.name,
    round_index: index + 1,
    exercise_order_in_block: 1,
    weight_kg: prescription.weight_kg ? String(prescription.weight_kg) : '',
    reps: String(prescription.reps || 10),
    rpe: String(prescription.rpe || 7),
    is_warmup: false,
    is_failure: false,
  };
}

function createPlanBlock(item, blockIndex) {
  const sets = Array.from({ length: item.prescription.sets }, (_, index) => makeSet(item.exercise, index, item.prescription));
  return {
    local_id: `plan-${item.exercise._id}-${Date.now()}-${blockIndex}`,
    order: blockIndex + 1,
    block_index: blockIndex,
    type: 'single',
    title: item.exercise.name_zh || item.exercise.name,
    exercises: [item.exercise],
    plan_reason: item.reason,
    sets,
  };
}

function mapBlocks(blocks) {
  return blocks.map((block, blockIndex) => Object.assign({}, block, {
    block_index: blockIndex,
    sets: block.sets.map((set, setIndex) => Object.assign({}, set, {
      block_index: blockIndex,
      set_index_local: setIndex,
    })),
  }));
}

async function exerciseName(id) {
  const exercise = await getExerciseById(id);
  return exercise ? (exercise.name_zh || exercise.name || id) : id;
}

Page({
  data: {
    user: {},
    sessionId: '',
    mode: 'planning',
    prompt: '',
    planDate: formatDate(),
    blocks: [],
    bodyPartReminders: [],
    recentSessions: [],
    isGenerating: false,
    isSaving: false,
    cloudError: '',
  },

  onLoad() { this.bootstrap(); },
  onShow() { this.loadRecent(); },

  async bootstrap() {
    try {
      const app = getApp();
      let context = app.globalData.userContext;
      if (!context) {
        for (let attempt = 0; attempt < 8 && !context; attempt += 1) {
          if (app.globalData.cloudReady === false) throw app.globalData.cloudError || new Error('CloudBase unavailable');
          await new Promise((resolve) => setTimeout(resolve, 250));
          context = app.globalData.userContext;
        }
      }
      if (!context) context = await getUserContext();
      getApp().globalData.userContext = context;
      this.setData({ user: context.user || {}, cloudError: '' });
      await Promise.all([this.restoreDraft(), this.loadRecent()]);
      if (!this.data.sessionId && this.data.blocks.length === 0) await this.generatePlan(true);
    } catch (error) {
      const message = String(error.errMsg || error.message || error);
      this.setData({ cloudError: message });
      wx.showModal({
        title: '云开发尚未关联',
        content: '请先在 CloudBase 环境设置中关联当前小程序 AppID。关联完成后重新打开小程序即可。',
        showCancel: false,
      });
      console.error(error);
    }
  },

  async loadRecent() {
    try {
      if (!getApp().globalData.userContext) return;
      const sessions = await listRecentSessions(10);
      this.setData({
        recentSessions: sessions.slice(0, 5),
        bodyPartReminders: buildBodyPartReminders(sessions),
      });
    } catch (error) {
      console.warn('读取最近训练失败', error);
    }
  },

  async generatePlan(silent) {
    if (this.data.isGenerating) return;
    this.setData({ isGenerating: true });
    if (!silent) wx.showLoading({ title: '正在生成' });
    try {
      const context = parseWorkoutPrompt(this.data.prompt, this.data.user);
      if (!context.focus_body_parts.length) {
        const ready = this.data.bodyPartReminders.find((item) => item.state === 'ready');
        context.focus_body_parts = ready ? [ready.part] : ['全身'];
      }
      const [exercises, history] = await Promise.all([
        listRecommendedExercises(Object.assign({}, context, { limit: 8 })),
        getExerciseHistoryMap(),
      ]);
      const plan = buildPlan(exercises, context, history);
      if (!plan.length) throw new Error('暂时没有找到合适动作');
      this.setData({
        blocks: mapBlocks(plan.map(createPlanBlock)),
        mode: 'planning',
      });
      if (!silent) wx.showToast({ title: '计划已更新', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '计划生成失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ isGenerating: false });
      if (!silent) wx.hideLoading();
    }
  },

  onPromptInput(event) { this.setData({ prompt: event.detail.value }); },
  onDateChange(event) { this.setData({ planDate: event.detail.value }); },

  async startWorkout() {
    if (!this.data.blocks.length) return '';
    if (!getApp().globalData.userContext) {
      wx.showToast({ title: '云开发尚未连接', icon: 'none' });
      return '';
    }
    try {
      let sessionId = this.data.sessionId;
      if (!sessionId) {
        sessionId = await createSession({
          date: this.data.planDate,
          title: this.data.planDate === formatDate() ? '今日训练' : `${this.data.planDate} 补录`,
          location: this.data.user.default_location || 'gym',
          goal_type: this.data.user.default_goal || 'maintenance',
          mode: this.data.planDate === formatDate() ? 'recommended' : 'history',
          intent: Object.assign(parseWorkoutPrompt(this.data.prompt, this.data.user), { note: this.data.prompt }),
          notes: this.data.prompt,
        });
      }
      this.setData({ sessionId, mode: 'training' });
      return sessionId;
    } catch (error) {
      wx.showToast({ title: '开始训练失败', icon: 'none' });
      console.error(error);
      return '';
    }
  },

  collapsePlan() { this.setData({ mode: 'planning' }); },

  addRound(event) {
    const blockIndex = Number(event.currentTarget.dataset.index);
    const blocks = this.data.blocks.slice();
    const block = blocks[blockIndex];
    const previous = block.sets[block.sets.length - 1] || {};
    block.sets.push(makeSet(block.exercises[0], block.sets.length, {
      weight_kg: previous.weight_kg,
      reps: previous.reps,
      rpe: previous.rpe,
    }));
    this.setData({ blocks: mapBlocks(blocks) });
  },

  deleteBlock(event) {
    const index = Number(event.currentTarget.dataset.index);
    const block = this.data.blocks[index];
    if (block && block.remote_id) {
      wx.showToast({ title: '已保存动作请在历史详情删除', icon: 'none' });
      return;
    }
    const blocks = this.data.blocks.slice();
    blocks.splice(index, 1);
    this.setData({ blocks: mapBlocks(blocks) });
  },

  onSetInput(event) {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const setIndex = Number(event.currentTarget.dataset.setIndex);
    const blocks = this.data.blocks.slice();
    blocks[blockIndex].sets[setIndex][event.currentTarget.dataset.key] = event.detail.value;
    this.setData({ blocks: mapBlocks(blocks) });
  },

  async saveWorkout() {
    if (this.data.isSaving) return;
    const hasValid = this.data.blocks.some((block) => block.sets.some((set) => Number(set.reps) > 0));
    if (!hasValid) {
      wx.showToast({ title: '请至少记录一组次数', icon: 'none' });
      return;
    }
    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存训练' });
    try {
      const sessionId = this.data.sessionId || await this.startWorkout();
      if (!sessionId) throw new Error('Unable to create workout session');
      const blocks = this.data.blocks.slice();
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        let blockId = block.remote_id;
        if (!blockId) {
          blockId = await addBlock({
            session_id: sessionId,
            order: i + 1,
            type: 'single',
            title: block.title,
            exercise_ids: [block.exercises[0]._id],
            rest_seconds_between_rounds: 90,
            notes: '',
          });
          block.remote_id = blockId;
        }
        for (let j = 0; j < block.sets.length; j += 1) {
          const set = block.sets[j];
          const payload = {
            session_id: sessionId,
            block_id: blockId,
            exercise_id: set.exercise_id,
            block_type: 'single',
            round_index: j + 1,
            exercise_order_in_block: 1,
            set_index: j + 1,
            weight_kg: toNumber(set.weight_kg, 0),
            reps: toNumber(set.reps, 0),
            rpe: toNumber(set.rpe, 0),
            is_warmup: false,
            is_failure: false,
            rest_seconds_after: null,
            notes: '',
          };
          if (set.remote_id) await updateSet(set.remote_id, payload);
          else set.remote_id = await addSet(payload);
        }
        await updateBlock(blockId, { title: block.title, exercise_ids: [block.exercises[0]._id] });
      }
      await updateSession(sessionId, {
        date: this.data.planDate,
        status: 'completed',
        ended_at: new Date(),
      });
      try { await wx.cloud.callFunction({ name: 'recalculateStats' }); } catch (error) { console.warn(error); }
      this.setData({ sessionId: '', blocks: [], prompt: '', planDate: formatDate(), mode: 'planning' });
      await this.loadRecent();
      await this.generatePlan(true);
      wx.showToast({ title: '训练已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ isSaving: false });
      wx.hideLoading();
    }
  },

  async restoreDraft() {
    try {
      const draft = await getLatestDraftSession();
      if (!draft) return;
      const bundle = await getSessionBundle(draft._id);
      const blocks = [];
      for (let i = 0; i < bundle.blocks.length; i += 1) {
        const remote = bundle.blocks[i];
        const id = (remote.exercise_ids || [])[0];
        const exercise = await getExerciseById(id);
        if (!exercise) continue;
        const sets = bundle.sets.filter((set) => set.block_id === remote._id).map((set, index) => ({
          local_id: `remote-${set._id}`,
          remote_id: set._id,
          set_index_local: index,
          exercise_id: id,
          exercise_name: exercise.name_zh || exercise.name,
          round_index: index + 1,
          exercise_order_in_block: 1,
          weight_kg: String(set.weight_kg || ''),
          reps: String(set.reps || ''),
          rpe: String(set.rpe || ''),
          is_warmup: false,
          is_failure: false,
        }));
        blocks.push({
          local_id: `remote-${remote._id}`,
          remote_id: remote._id,
          order: i + 1,
          type: 'single',
          title: remote.title,
          exercises: [exercise],
          sets,
        });
      }
      this.setData({
        sessionId: draft._id,
        planDate: draft.date || formatDate(),
        prompt: draft.notes || '',
        blocks: mapBlocks(blocks),
        mode: blocks.length ? 'training' : 'planning',
      });
    } catch (error) {
      console.warn('恢复草稿失败', error);
    }
  },

  discardWorkout() {
    wx.showModal({
      title: '放弃这次训练？',
      content: '已记录的草稿会被删除。',
      confirmText: '放弃',
      confirmColor: '#d92d20',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          if (this.data.sessionId) {
            const bundle = await getSessionBundle(this.data.sessionId);
            for (const set of bundle.sets) await deleteSet(set._id);
            for (const block of bundle.blocks) await deleteBlock(block._id);
            await removeWorkoutSession(this.data.sessionId);
          }
          this.setData({ sessionId: '', blocks: [], mode: 'planning' });
          await this.generatePlan(true);
        } catch (error) {
          wx.showToast({ title: '放弃失败', icon: 'none' });
        }
      },
    });
  },

  goSessionDetail(event) {
    wx.navigateTo({ url: `/pages/session-detail/session-detail?id=${event.currentTarget.dataset.id}` });
  },
});
