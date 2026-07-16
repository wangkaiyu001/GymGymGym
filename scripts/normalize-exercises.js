const fs = require('fs');
const path = require('path');

const SOURCE_NAME = 'hasaneyldrm/exercises-dataset';
const SOURCE_REPO = 'https://github.com/hasaneyldrm/exercises-dataset';
const DEFAULT_SOURCE = path.join(process.cwd(), 'external/exercises-dataset/data/exercises.json');
const DEFAULT_OUTPUT = path.join(process.cwd(), 'dist/exercises.normalized.json');

const bodyPartZh = {
  back: '背部',
  cardio: '有氧',
  chest: '胸部',
  'lower arms': '手臂',
  lower_arms: '手臂',
  'lower legs': '腿部',
  lower_legs: '腿部',
  neck: '颈部',
  shoulders: '肩部',
  'upper arms': '手臂',
  upper_arms: '手臂',
  'upper legs': '腿部',
  upper_legs: '腿部',
  waist: '核心',
};

const equipmentZh = {
  assisted: '辅助器械',
  band: '弹力带',
  barbell: '杠铃',
  'body weight': '自重',
  'bosu ball': '波速球',
  cable: '绳索',
  dumbbell: '哑铃',
  'elliptical machine': '椭圆机',
  'ez barbell': 'EZ 杠',
  hammer: '锤式器械',
  kettlebell: '壶铃',
  'leverage machine': '固定器械',
  lever: '固定器械',
  'medicine ball': '药球',
  'olympic barbell': '奥杆',
  'resistance band': '弹力带',
  roller: '滚轴',
  rope: '绳索',
  'skierg machine': '滑雪机',
  'sled machine': '雪橇机',
  'smith machine': '史密斯机',
  'stability ball': '瑜伽球',
  'stationary bike': '单车',
  'stepmill machine': '登阶机',
  tire: '轮胎',
  'trap bar': '六角杠',
  'upper body ergometer': '上肢功率车',
  weighted: '负重',
  'wheel roller': '健腹轮',
};

const targetZh = {
  abductors: '髋外展肌',
  abs: '腹肌',
  adductors: '内收肌',
  biceps: '肱二头肌',
  calves: '小腿',
  'cardiovascular system': '心肺系统',
  delts: '三角肌',
  forearms: '前臂',
  glutes: '臀肌',
  hamstrings: '腘绳肌',
  lats: '背阔肌',
  'levator scapulae': '肩胛提肌',
  pectorals: '胸肌',
  quads: '股四头肌',
  'serratus anterior': '前锯肌',
  spine: '竖脊肌',
  traps: '斜方肌',
  triceps: '肱三头肌',
  'upper back': '上背部',
};

function parseArgs(argv) {
  const args = {
    sourcePath: DEFAULT_SOURCE,
    outputPath: DEFAULT_OUTPUT,
    mediaBaseUrl: '',
    pretty: true,
  };
  const positionals = [];

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--media-base-url') {
      args.mediaBaseUrl = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals[0]) args.sourcePath = path.resolve(positionals[0]);
  if (positionals[1]) args.outputPath = path.resolve(positionals[1]);
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/normalize-exercises.js [source] [output] [--media-base-url URL] [--compact]

Default source: ${DEFAULT_SOURCE}
Default output: ${DEFAULT_OUTPUT}

The source should be hasaneyldrm/exercises-dataset data/exercises.json.`);
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function languageValue(value, language) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[language] || value.en || '';
}

function languageSteps(value, language) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== 'object') return [];
  return asArray(value[language] || value.en);
}

function buildMedia(relativePath, mediaBaseUrl) {
  if (!relativePath) return '';
  if (!mediaBaseUrl) return relativePath;
  return `${mediaBaseUrl.replace(/\/$/, '')}/${relativePath.replace(/^\//, '')}`;
}

function normalizeId(id) {
  if (!id) throw new Error('Exercise item is missing id');
  return `exdb_${String(id).trim()}`;
}

function normalize(item, options) {
  const sourceId = String(item.id || item._id || item.source_id || '').trim();
  const bodyPart = item.body_part || item.bodyPart || item.category || '';
  const equipment = item.equipment || '';
  const target = item.target || '';
  const zhSteps = languageSteps(item.instruction_steps, 'zh');
  const enSteps = languageSteps(item.instruction_steps, 'en');
  const zhInstruction = languageValue(item.instructions, 'zh');
  const enInstruction = languageValue(item.instructions, 'en');

  return {
    _id: normalizeId(sourceId),
    source: SOURCE_NAME,
    source_repo: SOURCE_REPO,
    source_id: sourceId,
    name: item.name || '',
    name_zh: item.name_zh || item.name || '',
    aliases_zh: asArray(item.aliases_zh),
    category: item.category || bodyPart,
    body_part: bodyPart,
    body_part_zh: bodyPartZh[bodyPart] || bodyPart,
    equipment,
    equipment_zh: equipmentZh[equipment] || equipment,
    target,
    target_zh: targetZh[target] || target,
    muscle_group: asArray(item.muscle_group || item.muscleGroup),
    secondary_muscles: asArray(item.secondary_muscles || item.secondaryMuscles),
    instructions: zhInstruction || enInstruction,
    instructions_en: enInstruction,
    instruction_steps: zhSteps.length ? zhSteps : enSteps,
    instruction_steps_en: enSteps,
    media: {
      image: buildMedia(item.image || '', options.mediaBaseUrl),
      gif: buildMedia(item.gif_url || item.gifUrl || '', options.mediaBaseUrl),
      media_id: item.media_id || '',
      attribution: item.attribution || '© Gym visual — https://gymvisual.com/',
      license_note: 'Media is not MIT licensed. Keep attribution and confirm Gym visual terms before public reuse.',
    },
    image: buildMedia(item.image || '', options.mediaBaseUrl),
    gif_url: buildMedia(item.gif_url || item.gifUrl || '', options.mediaBaseUrl),
    attribution: item.attribution || '© Gym visual — https://gymvisual.com/',
    media_id: item.media_id || '',
    is_common: false,
    is_custom: false,
    raw: {
      created_at: item.created_at || '',
    },
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function readSource(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('Source file must contain a JSON array');
  }
  return parsed;
}

function summarize(items) {
  const summary = {
    total: items.length,
    body_parts: {},
    equipment: {},
  };
  for (const item of items) {
    summary.body_parts[item.body_part_zh] = (summary.body_parts[item.body_part_zh] || 0) + 1;
    summary.equipment[item.equipment_zh] = (summary.equipment[item.equipment_zh] || 0) + 1;
  }
  return summary;
}

function main() {
  const args = parseArgs(process.argv);
  const source = readSource(args.sourcePath);
  const normalized = source.map((item) => normalize(item, args));
  const duplicate = normalized.find((item, index) => normalized.findIndex((other) => other._id === item._id) !== index);
  if (duplicate) throw new Error(`Duplicate normalized _id: ${duplicate._id}`);

  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
  fs.writeFileSync(args.outputPath, JSON.stringify(normalized, null, args.pretty ? 2 : 0));

  const summary = summarize(normalized);
  console.log(`Wrote ${summary.total} exercises to ${args.outputPath}`);
  console.log(`Body parts: ${Object.keys(summary.body_parts).length}; equipment types: ${Object.keys(summary.equipment).length}`);
  console.log('Media note: images/GIFs require Gym visual attribution and separate license review before public reuse.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    console.error('Usage: node scripts/normalize-exercises.js [source exercises.json] [output]');
    process.exit(1);
  }
}

module.exports = {
  normalize,
  summarize,
};
