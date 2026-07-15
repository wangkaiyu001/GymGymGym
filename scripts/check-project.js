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

if (failed) {
  process.exit(1);
}

console.log('Project structure check passed.');
