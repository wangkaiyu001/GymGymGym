const { listExercises } = require('../../utils/db');

Component({
  properties: {
    visible: { type: Boolean, value: false },
  },

  data: {
    keyword: '',
    items: [],
  },

  observers: {
    visible(value) {
      if (value) this.load();
    },
  },

  methods: {
    noop() {},
    async load() {
      const items = await listExercises({ keyword: this.data.keyword });
      this.setData({ items });
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
      const exercise = this.data.items.find((item) => item._id === id);
      this.triggerEvent('select', { exercise });
    },
  },
});
