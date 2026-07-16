const {
  GOAL_OPTIONS,
  LOCATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  BODY_PART_OPTIONS,
} = require('../../utils/constants');
const {
  addUserGoal,
  deleteUserGoal,
  getUserContext,
  listUserGoals,
  saveUserProfile,
  updateUserGoal,
} = require('../../utils/db');
const { toNumber } = require('../../utils/format');

const LEVEL_OPTIONS = [
  { value: 'beginner', label: '新手' },
  { value: 'intermediate', label: '有经验' },
  { value: 'advanced', label: '进阶' },
];

const METRIC_OPTIONS = [
  { value: 'weight_kg', label: '目标重量 kg', unit: 'kg' },
  { value: 'estimated_1rm_kg', label: '目标估算1RM kg', unit: 'kg' },
  { value: 'weekly_sessions', label: '每周训练次数', unit: '次/周' },
  { value: 'body_weight_kg', label: '目标体重 kg', unit: 'kg' },
  { value: 'free_text', label: '自定义指标', unit: '' },
];

function mapSelectableOptions(options, selected) {
  const selectedList = selected || [];
  return options.map((label) => ({
    label,
    value: label,
    selected: selectedList.indexOf(label) >= 0,
  }));
}

function indexOfValue(options, value) {
  const index = options.findIndex((item) => item.value === value);
  return index >= 0 ? index : 0;
}

function labelOf(options, value) {
  const item = options.find((option) => option.value === value);
  return item ? item.label : value;
}

function emptyGoalForm() {
  return {
    title: '',
    goal_type: GOAL_OPTIONS[0].value,
    description: '',
    exercise_name: '',
    metric_type: METRIC_OPTIONS[0].value,
    target_value: '',
    target_date: '',
    focus_body_parts: [],
  };
}

function mapGoalForView(item) {
  const metricType = item.target_metrics && item.target_metrics.metric_type;
  const targetValue = item.target_metrics && item.target_metrics.target_value;
  const metric = METRIC_OPTIONS.find((option) => option.value === metricType);
  const metricText = targetValue === undefined || targetValue === null || targetValue === ''
    ? ''
    : `${targetValue}${metric && metric.unit ? ` ${metric.unit}` : ''}`;
  return Object.assign({}, item, {
    goal_type_label: labelOf(GOAL_OPTIONS, item.goal_type),
    status_label: item.status === 'done' ? '已完成' : '进行中',
    metric_text: metricText,
    metric_label: metric ? metric.label : '目标指标',
    focus_text: (item.focus_body_parts || []).join(' · '),
    target_date_text: item.target_date || '未设截止日期',
  });
}

Page({
  data: {
    openid: '',
    profile: {
      nickname: '',
      training_level: LEVEL_OPTIONS[0].value,
      default_goal: GOAL_OPTIONS[0].value,
      default_location: LOCATION_OPTIONS[0].value,
      available_equipment_home: [],
      goal_note: '',
    },
    goals: [],
    activeGoals: [],
    doneGoals: [],
    goalForm: emptyGoalForm(),
    levelLabels: LEVEL_OPTIONS.map((item) => item.label),
    goalLabels: GOAL_OPTIONS.map((item) => item.label),
    locationLabels: LOCATION_OPTIONS.map((item) => item.label),
    metricLabels: METRIC_OPTIONS.map((item) => item.label),
    equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, []),
    bodyPartOptions: mapSelectableOptions(BODY_PART_OPTIONS, []),
    levelIndex: 0,
    goalIndex: 0,
    locationIndex: 0,
    newGoalTypeIndex: 0,
    metricIndex: 0,
    isSavingGoal: false,
    updatingGoalId: '',
  },

  onLoad() {
    this.load();
  },

  onShow() {
    if (this.data.openid) this.loadGoals();
  },

  async load() {
    try {
      const context = await getUserContext();
      getApp().globalData.userContext = context;
      const profile = Object.assign({}, this.data.profile, context.user || {});
      this.setData({
        openid: context.openid,
        profile,
        levelIndex: indexOfValue(LEVEL_OPTIONS, profile.training_level),
        goalIndex: indexOfValue(GOAL_OPTIONS, profile.default_goal),
        locationIndex: indexOfValue(LOCATION_OPTIONS, profile.default_location),
        equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, profile.available_equipment_home),
      });
      await this.loadGoals();
    } catch (error) {
      wx.showToast({ title: '读取用户失败', icon: 'none' });
      console.error(error);
    }
  },

  async loadGoals() {
    try {
      if (!getApp().globalData.userContext) return;
      const goals = (await listUserGoals(30)).map(mapGoalForView);
      this.setData({
        goals,
        activeGoals: goals.filter((item) => item.status !== 'done'),
        doneGoals: goals.filter((item) => item.status === 'done'),
      });
    } catch (error) {
      console.warn('读取具体目标失败', error);
    }
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`profile.${key}`]: event.detail.value });
  },

  onGoalFormInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`goalForm.${key}`]: event.detail.value });
  },

  onGoalDateChange(event) {
    this.setData({ 'goalForm.target_date': event.detail.value });
  },

  onLevelChange(event) {
    const index = Number(event.detail.value);
    this.setData({ levelIndex: index, 'profile.training_level': LEVEL_OPTIONS[index].value });
  },

  onGoalChange(event) {
    const index = Number(event.detail.value);
    this.setData({ goalIndex: index, 'profile.default_goal': GOAL_OPTIONS[index].value });
  },

  onLocationChange(event) {
    const index = Number(event.detail.value);
    this.setData({ locationIndex: index, 'profile.default_location': LOCATION_OPTIONS[index].value });
  },

  onNewGoalTypeChange(event) {
    const index = Number(event.detail.value);
    this.setData({ newGoalTypeIndex: index, 'goalForm.goal_type': GOAL_OPTIONS[index].value });
  },

  onMetricChange(event) {
    const index = Number(event.detail.value);
    this.setData({ metricIndex: index, 'goalForm.metric_type': METRIC_OPTIONS[index].value });
  },

  toggleEquipment(event) {
    const value = event.currentTarget.dataset.value;
    const list = this.data.profile.available_equipment_home;
    const next = list.indexOf(value) >= 0 ? list.filter((item) => item !== value) : list.concat(value);
    this.setData({
      'profile.available_equipment_home': next,
      equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, next),
    });
  },

  toggleGoalBodyPart(event) {
    const value = event.currentTarget.dataset.value;
    const list = this.data.goalForm.focus_body_parts;
    const next = list.indexOf(value) >= 0 ? list.filter((item) => item !== value) : list.concat(value);
    this.setData({
      'goalForm.focus_body_parts': next,
      bodyPartOptions: mapSelectableOptions(BODY_PART_OPTIONS, next),
    });
  },

  async save() {
    if (!this.data.openid) {
      wx.showToast({ title: '缺少用户身份', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '保存中' });
    try {
      await saveUserProfile(this.data.openid, this.data.profile);
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(error);
    } finally {
      wx.hideLoading();
    }
  },

  async addGoal() {
    const form = this.data.goalForm;
    const title = String(form.title || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写目标名称', icon: 'none' });
      return;
    }
    if (!this.data.openid || this.data.isSavingGoal) return;
    const rawTargetValue = String(form.target_value || '').trim();
    let targetValue = rawTargetValue;
    if (form.metric_type !== 'free_text') {
      targetValue = rawTargetValue ? toNumber(rawTargetValue, NaN) : '';
      if (rawTargetValue && !Number.isFinite(targetValue)) {
        wx.showToast({ title: '目标数值需为数字', icon: 'none' });
        return;
      }
    }
    this.setData({ isSavingGoal: true });
    wx.showLoading({ title: '创建目标' });
    try {
      await addUserGoal({
        goal_type: form.goal_type,
        title,
        description: String(form.description || '').trim(),
        exercise_name: String(form.exercise_name || '').trim(),
        focus_body_parts: form.focus_body_parts,
        target_date: form.target_date,
        target_metrics: {
          metric_type: form.metric_type,
          target_value: targetValue,
        },
        status: 'active',
      });
      this.setData({
        goalForm: emptyGoalForm(),
        newGoalTypeIndex: 0,
        metricIndex: 0,
        bodyPartOptions: mapSelectableOptions(BODY_PART_OPTIONS, []),
      });
      await this.loadGoals();
      wx.showToast({ title: '目标已创建', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '创建失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ isSavingGoal: false });
      wx.hideLoading();
    }
  },

  async toggleGoalStatus(event) {
    const id = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status === 'done' ? 'active' : 'done';
    if (!id || this.data.updatingGoalId) return;
    this.setData({ updatingGoalId: id });
    try {
      await updateUserGoal(id, {
        status,
        completed_at: status === 'done' ? new Date() : null,
      });
      await this.loadGoals();
      wx.showToast({ title: status === 'done' ? '目标已完成' : '目标已恢复', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '更新失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ updatingGoalId: '' });
    }
  },

  deleteGoal(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除目标',
      content: '删除后无法恢复，确认继续吗？',
      confirmColor: '#d92d20',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await deleteUserGoal(id);
          await this.loadGoals();
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (error) {
          wx.showToast({ title: '删除失败', icon: 'none' });
          console.error(error);
        }
      },
    });
  },
});
