const { BODY_PART_OPTIONS, EQUIPMENT_OPTIONS } = require('../../utils/constants');
const {
  getFavoriteExerciseIds,
  getUserContext,
  listExercises,
  listExercisesByIds,
  saveFavoriteExerciseIds,
} = require('../../utils/db');

function mapExerciseForView(item, favoriteIds) {
  const isFavorite = favoriteIds.indexOf(item._id) >= 0;
  return Object.assign({}, item, {
    display_name: item.name_zh || item.name,
    display_body_part: item.body_part_zh || item.body_part,
    display_equipment: item.equipment_zh || item.equipment,
    first_step: item.instruction_steps && item.instruction_steps.length ? item.instruction_steps[0] : '',
    is_favorite: isFavorite,
    favorite_label: isFavorite ? '已收藏' : '收藏',
  });
}

function sortFavoritesFirst(items) {
  return items.slice().sort((a, b) => {
    if (a.is_favorite === b.is_favorite) return 0;
    return a.is_favorite ? -1 : 1;
  });
}

function textIncludes(value, keyword) {
  return String(value || '').toLowerCase().indexOf(keyword) >= 0;
}

function matchesFilters(item, filters) {
  const keyword = (filters.keyword || '').trim().toLowerCase();
  const matchKeyword = !keyword || [
    item.name,
    item.name_zh,
    item.target,
    item.target_zh,
    ...(item.aliases_zh || []),
  ].some((value) => textIncludes(value, keyword));
  const matchBodyPart = !filters.bodyPart || item.body_part_zh === filters.bodyPart;
  const matchEquipment = !filters.equipment || item.equipment_zh === filters.equipment;
  return matchKeyword && matchBodyPart && matchEquipment;
}

Page({
  data: {
    openid: '',
    keyword: '',
    bodyPart: '',
    equipment: '',
    showFavoritesOnly: false,
    favoriteExerciseIds: [],
    bodyPartOptions: BODY_PART_OPTIONS.map((label) => ({ label, value: label, selected: false })),
    equipmentOptions: EQUIPMENT_OPTIONS.map((label) => ({ label, value: label, selected: false })),
    items: [],
  },

  onLoad() {
    this.bootstrap();
  },

  onShow() {
    if (this.data.openid) this.loadFavoritesAndExercises();
  },

  async bootstrap() {
    try {
      const context = await getUserContext();
      getApp().globalData.userContext = context;
      this.setData({ openid: context.openid });
    } catch (error) {
      console.warn('读取用户身份失败，收藏功能暂不可用', error);
    }
    this.loadFavoritesAndExercises();
  },

  async loadFavoritesAndExercises() {
    let favoriteExerciseIds = this.data.favoriteExerciseIds;
    if (this.data.openid) favoriteExerciseIds = await getFavoriteExerciseIds(this.data.openid);
    this.setData({ favoriteExerciseIds });
    return this.load();
  },

  async load() {
    wx.showLoading({ title: '加载中' });
    try {
      const filters = {
        keyword: this.data.keyword,
        bodyPart: this.data.bodyPart,
        equipment: this.data.equipment,
      };
      const items = this.data.showFavoritesOnly
        ? (await listExercisesByIds(this.data.favoriteExerciseIds)).filter((item) => matchesFilters(item, filters))
        : await listExercises(filters);
      const mapped = items.map((item) => mapExerciseForView(item, this.data.favoriteExerciseIds));
      const filtered = this.data.showFavoritesOnly ? mapped.filter((item) => item.is_favorite) : mapped;
      this.setData({ items: sortFavoritesFirst(filtered) });
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

  toggleFavoritesOnly() {
    this.setData({ showFavoritesOnly: !this.data.showFavoritesOnly });
    this.load();
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

  async toggleFavorite(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    if (!this.data.openid) {
      wx.showToast({ title: '请先完成云端登录', icon: 'none' });
      return;
    }
    const current = this.data.favoriteExerciseIds;
    const isFavorite = current.indexOf(id) >= 0;
    const next = isFavorite ? current.filter((item) => item !== id) : current.concat(id);
    this.setData({ favoriteExerciseIds: next });
    this.applyFavoriteState(next);
    try {
      await saveFavoriteExerciseIds(this.data.openid, next);
      wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
    } catch (error) {
      this.setData({ favoriteExerciseIds: current });
      this.applyFavoriteState(current);
      wx.showToast({ title: '保存收藏失败', icon: 'none' });
      console.error(error);
    }
  },

  applyFavoriteState(favoriteExerciseIds) {
    if (this.data.showFavoritesOnly) {
      this.load();
      return;
    }
    const mapped = this.data.items.map((item) => mapExerciseForView(item, favoriteExerciseIds));
    this.setData({ items: sortFavoritesFirst(mapped) });
  },

  showDetail(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((exercise) => exercise._id === id);
    if (!item) return;
    const steps = (item.instruction_steps || []).join('\n');
    wx.showModal({
      title: item.name_zh || item.name,
      content: `${item.name}\n${item.body_part_zh || item.body_part} · ${item.equipment_zh || item.equipment}\n\n${steps}`,
      showCancel: false,
    });
  },
});
