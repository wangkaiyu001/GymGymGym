const { BODY_PART_OPTIONS, EQUIPMENT_OPTIONS } = require('../../utils/constants');
const { getUserContext, listExercises } = require('../../utils/db');

const MEDIA_BASE_URL = 'https://code-realtime-d7gbuxrbze297e600-1419519222.tcloudbaseapp.com/exercise-media/images';

function imageUrlFor(item) {
  if (!item.image) return '';
  const name = String(item.image).split('/').pop();
  return `${MEDIA_BASE_URL}/${name}`;
}

function mapExercise(item) {
  return Object.assign({}, item, {
    display_name: item.name_zh || item.name,
    display_body_part: item.body_part_zh || item.body_part,
    display_equipment: item.equipment_zh || item.equipment,
    first_step: item.instruction_steps && item.instruction_steps[0] ? item.instruction_steps[0] : '',
    image_url: imageUrlFor(item),
  });
}

Page({
  data: {
    keyword: '',
    bodyPart: '',
    equipment: '',
    items: [],
    page: 0,
    hasMore: true,
    isLoading: false,
    bodyPartOptions: BODY_PART_OPTIONS,
    equipmentOptions: EQUIPMENT_OPTIONS,
  },

  onLoad() { this.bootstrap(); },

  async bootstrap() {
    try {
      if (!getApp().globalData.userContext) getApp().globalData.userContext = await getUserContext();
    } catch (error) {
      console.warn('云开发身份尚未就绪，先展示内置动作', error);
    }
    this.reload();
  },

  onReachBottom() { this.loadMore(); },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reload(), 250);
  },

  selectBodyPart(event) {
    this.setData({ bodyPart: event.currentTarget.dataset.value || '' });
    this.reload();
  },

  selectEquipment(event) {
    this.setData({ equipment: event.currentTarget.dataset.value || '' });
    this.reload();
  },

  reload() {
    this.setData({ page: 0, items: [], hasMore: true });
    this.loadMore();
  },

  async loadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.setData({ isLoading: true });
    try {
      const pageSize = 30;
      const rows = await listExercises({
        keyword: this.data.keyword,
        bodyPart: this.data.bodyPart,
        equipment: this.data.equipment,
        page: this.data.page,
        pageSize,
      });
      const mapped = rows.map(mapExercise);
      this.setData({
        items: this.data.items.concat(mapped),
        page: this.data.page + 1,
        hasMore: rows.length === pageSize,
      });
    } catch (error) {
      wx.showToast({ title: '动作加载失败', icon: 'none' });
      console.error(error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  showDetail(event) {
    const item = this.data.items.find((exercise) => exercise._id === event.currentTarget.dataset.id);
    if (!item) return;
    wx.showModal({
      title: item.display_name,
      content: `${item.display_body_part} · ${item.display_equipment}\n\n${(item.instruction_steps || []).join('\n')}`,
      showCancel: false,
    });
  },
});
