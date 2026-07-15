const { BODY_PART_OPTIONS, EQUIPMENT_OPTIONS } = require('../../utils/constants');
const { listExercises } = require('../../utils/db');

Page({
  data: {
    keyword: '',
    bodyPart: '',
    equipment: '',
    bodyPartOptions: BODY_PART_OPTIONS,
    equipmentOptions: EQUIPMENT_OPTIONS,
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
      this.setData({ items });
    } finally {
      wx.hideLoading();
    }
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), 250);
  },

  selectBodyPart(event) {
    this.setData({ bodyPart: event.currentTarget.dataset.value || '' });
    this.load();
  },

  selectEquipment(event) {
    this.setData({ equipment: event.currentTarget.dataset.value || '' });
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
