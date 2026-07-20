const fs = require('fs');
const path = require('path');
const ci = require('miniprogram-ci');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const appid = config.appid;
const privateKeyPath = process.env.MINIPROGRAM_PRIVATE_KEY_PATH;
const env = process.env.WECHAT_CLOUD_ENV;

if (!privateKeyPath || !fs.existsSync(privateKeyPath)) throw new Error('Missing MINIPROGRAM_PRIVATE_KEY_PATH');
if (!env) throw new Error('Missing WECHAT_CLOUD_ENV');

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: root,
  privateKeyPath,
  ignores: ['node_modules/**/*', 'external/**/*', 'dist/**/*', '.git/**/*'],
});

async function main() {
  for (const name of ['getUserContext', 'recalculateStats']) {
    console.log(`Uploading cloud function ${name} to ${env}...`);
    const result = await ci.cloud.uploadFunction({
      project,
      env,
      name,
      path: path.join(root, 'cloudfunctions', name),
      remoteNpmInstall: true,
    });
    console.log(name, result);
  }
}

main().catch((error) => {
  console.error(error && (error.stack || error.message) ? (error.stack || error.message) : error);
  process.exit(1);
});
