const fs = require('fs');
const path = require('path');

console.log('动作库导入脚本占位：');
console.log('1. 先运行 node scripts/normalize-exercises.js <exercises.json>');
console.log('2. 再用 CloudBase 控制台、MCP 或数据库 SDK 分批导入 dist/exercises.normalized.json 到 exercises 集合。');
console.log('3. 本脚本暂不写入云端，避免在未确认权限规则前误覆盖动作库。');

const inputPath = process.argv[2] || path.join(process.cwd(), 'dist/exercises.normalized.json');
if (fs.existsSync(inputPath)) {
  const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log(`待导入动作数：${rows.length}`);
} else {
  console.log(`未找到标准化文件：${inputPath}`);
}
