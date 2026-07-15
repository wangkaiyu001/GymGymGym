const { GOAL_OPTIONS, LOCATION_OPTIONS, EQUIPMENT_OPTIONS } = require('../../utils/constants');
const { getUserContext, saveUserProfile } = require('../../utils/db');

const LEVEL_OPTIONS = [
  { value: 'beginner', label: '新手' },
  { value: 'intermediate', label: '有经验' },
  { value: 'advanced', label: '进阶' },
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
    levelLabels: LEVEL_OPTIONS.map((item) => item.label),
    goalLabels: GOAL_OPTIONS.map((item) => item.label),
    locationLabels: LOCATION_OPTIONS.map((item) => item.label),
    equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, []),
    levelIndex: 0,
    goalIndex: 0,
    locationIndex: 0,
  },

  onLoad() {
    this.load();
  },

  async load() {
    try {
      const context = await getUserContext();
      const profile = Object.assign({}, this.data.profile, context.user || {});
      this.setData({
        openid: context.openid,
        profile,
        levelIndex: indexOfValue(LEVEL_OPTIONS, profile.training_level),
        goalIndex: indexOfValue(GOAL_OPTIONS, profile.default_goal),
        locationIndex: indexOfValue(LOCATION_OPTIONS, profile.default_location),
        equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, profile.available_equipment_home),
      });
    } catch (error) {
      wx.showToast({ title: '读取用户失败', icon: 'none' });
    }
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`profile.${key}`]: event.detail.value });
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

  toggleEquipment(event) {
    const value = event.currentTarget.dataset.value;
    const list = this.data.profile.available_equipment_home;
    const next = list.indexOf(value) >= 0 ? list.filter((item) => item !== value) : list.concat(value);
    this.setData({
      'profile.available_equipment_home': next,
      equipmentOptions: mapSelectableOptions(EQUIPMENT_OPTIONS, next),
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
});
