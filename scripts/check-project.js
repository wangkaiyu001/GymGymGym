const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'README.md',
  'project.config.json',
  'cloudbaserc.json',
  'miniprogram/app.js',
  'miniprogram/app.json',
  'miniprogram/app.wxss',
  'miniprogram/pages/training/training.js',
  'miniprogram/pages/training/training.wxml',
  'miniprogram/pages/exercises/exercises.js',
  'miniprogram/pages/profile/profile.js',
  'miniprogram/pages/goals/goals.js',
  'cloudfunctions/getUserContext/index.js',
  'cloudfunctions/recalculateStats/index.js',
  'database/security-rules.json',
];

let failed = false;
for (const file of required) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

const appJson = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram/app.json'), 'utf8'));
for (const page of appJson.pages || []) {
  for (const ext of ['js', 'wxml', 'wxss', 'json']) {
    const file = path.join(root, 'miniprogram', `${page}.${ext}`);
    if (!fs.existsSync(file)) {
      console.error(`Missing page file: miniprogram/${page}.${ext}`);
      failed = true;
    }
  }
}

for (const jsonFile of ['project.config.json', 'cloudbaserc.json', 'sitemap.json', 'database/security-rules.json']) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, jsonFile), 'utf8'));
  } catch (error) {
    console.error(`Invalid JSON: ${jsonFile}`);
    console.error(error.message);
    failed = true;
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function assertRegisteredComponent(pageJsonFile, tagName, componentPath) {
  const json = readJson(pageJsonFile);
  const components = json.usingComponents || {};
  if (components[tagName] !== componentPath) {
    console.error(`Missing component registration in ${pageJsonFile}: ${tagName} -> ${componentPath}`);
    failed = true;
  }
}

assertRegisteredComponent('miniprogram/pages/training/training.json', 'empty-state', '/components/empty-state/empty-state');
assertRegisteredComponent('miniprogram/pages/training/training.json', 'exercise-picker', '/components/exercise-picker/exercise-picker');
assertRegisteredComponent('miniprogram/pages/exercises/exercises.json', 'empty-state', '/components/empty-state/empty-state');
assertRegisteredComponent('miniprogram/pages/profile/profile.json', 'empty-state', '/components/empty-state/empty-state');
assertRegisteredComponent('miniprogram/pages/session-detail/session-detail.json', 'empty-state', '/components/empty-state/empty-state');
assertRegisteredComponent('miniprogram/components/exercise-picker/exercise-picker.json', 'empty-state', '/components/empty-state/empty-state');

const riskyWxmlPattern = /{{[^}]*\.(indexOf|includes|map|filter|reduce)\(/;
const wxmlFiles = fs.readdirSync(path.join(root, 'miniprogram/pages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `miniprogram/pages/${entry.name}/${entry.name}.wxml`)
  .concat(['miniprogram/components/exercise-picker/exercise-picker.wxml']);
for (const file of wxmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  if (riskyWxmlPattern.test(content)) {
    console.error(`Risky WXML method call expression found: ${file}`);
    failed = true;
  }
}

const envId = readJson('cloudbaserc.json').envId;
const appJs = fs.readFileSync(path.join(root, 'miniprogram/app.js'), 'utf8');
if (!appJs.includes(`env: '${envId}'`) && !appJs.includes(`env: "${envId}"`)) {
  const envConst = appJs.match(/const\s+ENV_ID\s*=\s*['\"]([^'\"]+)['\"]/);
  if (!envConst || envConst[1] !== envId) {
    console.error(`CloudBase env mismatch: cloudbaserc.json uses ${envId}, but miniprogram/app.js does not.`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Project structure check passed.');
