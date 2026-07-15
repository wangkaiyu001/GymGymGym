const { BODY_PART_OPTIONS, EQUIPMENT_OPTIONS } = require('../../utils/constants');
const { listExercises } = require('../../utils/db');

Page({
  data: {
    keyword: '',
    bodyPart: '',
    equipment: '',
    bodyPartOptions: BODY_PART_OPTIONS.map((label) => ({ label, value: label, selected: false })),
    equipmentOptions: EQUIPMENT_OPTIONS.map((label) => ({ label, value: label, selected: false })),
    items: [],
  },

  onLoad() {
    this.load();
  },

  async load() {
    wx.showLoading({ title: '加载中' });
    try {
      const items = await listExercises({
        keyword: this.data.keyword,
        bodyPart: this.data.bodyPart,
        equipment: this.data.equipment,
      });
      this.setData({ items: items.map((item) => Object.assign({}, item, {
        display_name: item.name_zh || item.name,
        display_body_part: item.body_part_zh || item.body_part,
        display_equipment: item.equipment_zh || item.equipment,
        first_step: item.instruction_steps && item.instruction_steps.length ? item.instruction_steps[0] : '',
      })) });
    } finally {
      wx.hideLoading();
    }
  },

  getBodyPartOptions(selected) {
    return BODY_PART_OPTIONS.map((label) => ({
      label,
      value: label,
      selected: selected === label,
    }));
  },

  getEquipmentOptions(selected) {
    return EQUIPMENT_OPTIONS.map((label) => ({
      label,
      value: label,
      selected: selected === label,
    }));
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), 250);
  },

  selectBodyPart(event) {
    const bodyPart = event.currentTarget.dataset.value || '';
    this.setData({ bodyPart, bodyPartOptions: this.getBodyPartOptions(bodyPart) });
    this.load();
  },

  selectEquipment(event) {
    const equipment = event.currentTarget.dataset.value || '';
    this.setData({ equipment, equipmentOptions: this.getEquipmentOptions(equipment) });
    this.load();
  },

  showDetail(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((exercise) => exercise._id === id);
    const steps = (item.instruction_steps || []).join('\n');
    wx.showModal({
      title: item.name_zh || item.name,
      content: `${item.name}\n${item.body_part_zh || item.body_part} · ${item.equipment_zh || item.equipment}\n\n${steps}`,
      showCancel: false,
    });
  },
});
