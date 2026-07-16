const {
  getFavoriteExerciseIds,
  getUserContext,
  listExercises,
  listExercisesByIds,
} = require('../../utils/db');

function mapExerciseForView(item, favoriteIds) {
  const isFavorite = favoriteIds.indexOf(item._id) >= 0;
  return Object.assign({}, item, {
    display_name: item.name_zh || item.name,
    display_body_part: item.body_part_zh || item.body_part,
    display_equipment: item.equipment_zh || item.equipment,
    is_favorite: isFavorite,
  });
}

function sortFavoritesFirst(items) {
  return items.slice().sort((a, b) => {
    if (a.is_favorite === b.is_favorite) return 0;
    return a.is_favorite ? -1 : 1;
  });
}

Component({
  properties: {
    visible: { type: Boolean, value: false },
  },

  data: {
    keyword: '',
    openid: '',
    favoriteExerciseIds: [],
    favoriteItems: [],
    items: [],
    hasVisibleItems: false,
  },

  observers: {
    visible(value) {
      if (value) this.bootstrap();
    },
  },

  methods: {
    noop() {},
    async bootstrap() {
      this.setData({ keyword: '' });
      let openid = this.data.openid;
      try {
        const app = getApp();
        const context = app.globalData && app.globalData.userContext
          ? app.globalData.userContext
          : await getUserContext();
        if (app.globalData) app.globalData.userContext = context;
        openid = context.openid || '';
      } catch (error) {
        console.warn('读取用户身份失败，收藏动作不可用', error);
      }

      let favoriteExerciseIds = [];
      if (openid) favoriteExerciseIds = await getFavoriteExerciseIds(openid);
      const favoriteItems = favoriteExerciseIds.length > 0
        ? (await listExercisesByIds(favoriteExerciseIds)).map((item) => mapExerciseForView(item, favoriteExerciseIds))
        : [];
      this.setData({ openid, favoriteExerciseIds, favoriteItems });
      this.load();
    },
    async load() {
      const items = await listExercises({ keyword: this.data.keyword });
      const mapped = items.map((item) => mapExerciseForView(item, this.data.favoriteExerciseIds));
      const visibleItems = this.data.keyword
        ? sortFavoritesFirst(mapped)
        : mapped.filter((item) => !item.is_favorite);
      this.setData({
        items: visibleItems,
        hasVisibleItems: visibleItems.length > 0 || (!this.data.keyword && this.data.favoriteItems.length > 0),
      });
    },
    onClose() {
      this.triggerEvent('close');
    },
    onKeywordInput(event) {
      this.setData({ keyword: event.detail.value });
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.load(), 250);
    },
    onSelect(event) {
      const id = event.currentTarget.dataset.id;
      const exercise = this.data.items.concat(this.data.favoriteItems).find((item) => item._id === id);
      this.triggerEvent('select', { exercise });
    },
  },
});
