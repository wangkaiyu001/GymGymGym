const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2] || path.join(process.cwd(), 'external/exercises-dataset/data/exercises.json');
const outputPath = process.argv[3] || path.join(process.cwd(), 'dist/exercises.normalized.json');

const bodyPartZh = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  upper_arms: '手臂',
  lower_arms: '手臂',
  upper_legs: '腿部',
  lower_legs: '腿部',
  waist: '核心',
  cardio: '有氧',
  neck: '颈部',
};

const equipmentZh = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  cable: '绳索',
  lever: '固定器械',
  'body weight': '自重',
  band: '弹力带',
  kettlebell: '壶铃',
  'smith machine': '史密斯机',
};

function normalize(item) {
  const id = item.id || item._id || item.source_id;
  const bodyPart = item.body_part || item.bodyPart || '';
  const equipment = item.equipment || '';
  return {
    _id: id,
    source: 'hasaneyldrm/exercises-dataset',
    source_id: id,
    name: item.name || '',
    name_zh: item.name_zh || '',
    aliases_zh: item.aliases_zh || [],
    body_part: bodyPart,
    body_part_zh: bodyPartZh[bodyPart] || bodyPart,
    equipment,
    equipment_zh: equipmentZh[equipment] || equipment,
    target: item.target || '',
    muscle_group: item.muscle_group || item.muscleGroup || [],
    secondary_muscles: item.secondary_muscles || item.secondaryMuscles || [],
    instructions: item.instructions || '',
    instruction_steps: item.instruction_steps || item.instructions || [],
    image: item.image || '',
    gif_url: item.gif_url || item.gifUrl || '',
    attribution: item.attribution || '',
    media_id: item.media_id || '',
    is_common: false,
    is_custom: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`);
  console.error('Usage: node scripts/normalize-exercises.js <source exercises.json> [output]');
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const normalized = source.map(normalize);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
console.log(`Wrote ${normalized.length} exercises to ${outputPath}`);
