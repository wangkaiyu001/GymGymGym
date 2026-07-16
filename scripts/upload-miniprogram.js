const fs = require('fs');
const path = require('path');
const ci = require('miniprogram-ci');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const appid = config.appid;
const privateKeyPath = process.env.MINIPROGRAM_PRIVATE_KEY_PATH;
const version = process.env.MINIPROGRAM_VERSION || require(path.join(root, 'package.json')).version;
const desc = process.env.MINIPROGRAM_DESC || 'GymGymGym automated upload';

if (!/^wx[0-9a-f]{16}$/.test(appid || '')) throw new Error('Invalid Mini Program AppID in project.config.json');
if (!privateKeyPath) throw new Error('Set MINIPROGRAM_PRIVATE_KEY_PATH to the upload key outside the repository');
if (!fs.existsSync(privateKeyPath)) throw new Error(`Private key not found: ${privateKeyPath}`);

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: root,
  privateKeyPath,
  ignores: [
    'node_modules/**/*',
    'external/**/*',
    'dist/**/*',
    'tests/**/*',
    'docs/**/*',
    '.git/**/*',
    '.codex/**/*',
    '.agents/**/*',
  ],
});

ci.upload({
  project,
  version,
  desc,
  setting: {
    es6: true,
    es7: true,
    minify: true,
    codeProtect: false,
    autoPrefixWXSS: true,
  },
  onProgressUpdate: console.log,
}).then((result) => {
  console.log('Mini Program upload completed.');
  console.log(JSON.stringify(result, null, 2));
}).catch((error) => {
  console.error('Mini Program upload failed.');
  const errorText = String(error && (error.stack || error.message) ? (error.stack || error.message) : error);
  if (errorText.includes('invalid ip')) {
    const match = errorText.match(/invalid ip:\s*([0-9.]+)/);
    console.error(`Add ${match ? match[1] : 'the current public IP'} to the WeChat Mini Program CI IP allowlist, then retry.`);
  }
  console.error(errorText);
  process.exit(1);
});
