const ENV_ID = 'code-realtime-d7gbuxrbze297e600';

const GOAL_OPTIONS = [
  { value: 'hypertrophy', label: '增肌' },
  { value: 'strength', label: '力量突破' },
  { value: 'fat_loss', label: '减脂' },
  { value: 'maintenance', label: '维稳巩固' },
  { value: 'recovery', label: '恢复活动' }
];

const LOCATION_OPTIONS = [
  { value: 'gym', label: '健身房' },
  { value: 'home', label: '家里' },
  { value: 'hotel', label: '酒店' },
  { value: 'outdoor', label: '户外' }
];

const ENERGY_OPTIONS = [
  { value: 'low', label: '状态一般' },
  { value: 'normal', label: '正常发挥' },
  { value: 'high', label: '今天很猛' }
];

const INTENT_OPTIONS = [
  { value: 'breakthrough', label: '突破 PR' },
  { value: 'maintain', label: '维稳巩固' },
  { value: 'deload', label: '减量恢复' },
  { value: 'technique', label: '技术打磨' }
];

const BODY_PART_OPTIONS = ['胸部', '背部', '腿部', '肩部', '手臂', '核心', '全身'];
const EQUIPMENT_OPTIONS = ['杠铃', '哑铃', '绳索', '固定器械', '自重', '弹力带'];

module.exports = {
  ENV_ID,
  GOAL_OPTIONS,
  LOCATION_OPTIONS,
  ENERGY_OPTIONS,
  INTENT_OPTIONS,
  BODY_PART_OPTIONS,
  EQUIPMENT_OPTIONS,
};
