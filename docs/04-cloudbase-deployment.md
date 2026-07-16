# CloudBase 部署说明

## 1. 环境

```text
Env ID: code-realtime-d7gbuxrbze297e600
Env Name: code-realtime
Region: ap-shanghai
```

## 2. CLI / Codex Toolkit 状态

本机已安装 CloudBase CLI：

```bash
tcb --version
# CloudBase CLI 3.5.0
```

已执行：

```bash
tcb env use code-realtime-d7gbuxrbze297e600
```

Codex / CloudBase AI Toolkit 侧参考文档：

```text
https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/ide-setup/openai-codex-cli
```

如需检查本机 MCP / mcporter 配置，可执行：

```bash
npx mcporter list | grep cloudbase
npx mcporter describe cloudbase --all-parameters
```

当前项目已经在 `cloudbaserc.json` 中固定目标环境 ID，脚本和小程序端也显式使用
`code-realtime-d7gbuxrbze297e600`，避免误操作到其他环境。

如果出现以下提示，说明本机登录态已失效，需要重新登录后再执行部署或数据库写入：

```text
No valid identity information, please use cloudbase login to login
```

重新登录：

```bash
tcb login
tcb env use code-realtime-d7gbuxrbze297e600
```

### 2.1 当前登录态说明

此前 Codex 已验证过云函数部署状态；但最近一次再次尝试运行：

```bash
tcb env use code-realtime-d7gbuxrbze297e600
tcb fn list --json
```

时出现过登录态失效提示。因此，只要后续 CLI 提示 `No valid identity information`，先由用户执行
`tcb login`，再继续部署或验证即可。该登录操作需要用户在浏览器中完成授权，不能由代码仓库替代。

## 3. 部署云函数

先查看帮助：

```bash
tcb fn deploy --help
```

部署：

```bash
tcb env use code-realtime-d7gbuxrbze297e600
tcb fn deploy getUserContext
tcb fn deploy recalculateStats
```

验证：

```bash
tcb fn list --env-id code-realtime-d7gbuxrbze297e600
```

此前 Codex 部署验证记录：2026-07-16（Asia/Shanghai）。以下函数均显示过 `Deployment completed`：

- `getUserContext`，运行时 `Nodejs18.15`
- `recalculateStats`，运行时 `Nodejs18.15`

说明：最近新增的“根据今天场景推荐动作”能力在小程序端完成，不依赖新增云函数；如果只是验证该功能，
不需要重新部署云函数。

## 4. 数据库集合

建议创建集合：

```text
users
exercises
workout_sessions
workout_blocks
workout_sets
exercise_stats
user_goals
```

数据库安全规则见：

```text
database/security-rules.json
```

可用脚本通过 upsert 系统 marker 文档的方式懒创建集合。脚本不会删除或覆盖训练数据；默认是 dry-run：

```bash
npm run setup:db -- --dry-run
npm run setup:db -- --apply
```

## 5. 导入完整动作库

```bash
git clone https://github.com/hasaneyldrm/exercises-dataset external/exercises-dataset
npm run normalize:exercises
npm run import:exercises -- --dry-run
npm run import:exercises -- --apply --limit 5
npm run import:exercises -- --apply
```

说明：

- `normalize-exercises.js` 默认读取 `external/exercises-dataset/data/exercises.json`，输出 `dist/exercises.normalized.json`。
- `import-exercises.js` 默认 dry-run；只有传入 `--apply` 才会通过 `tcb db nosql execute` 按 `_id` upsert 到 `exercises` 集合。
- 建议先 `--apply --limit 5` 小批量验证，再导入全量。
- `external/` 和 `dist/` 已加入 `.gitignore`，不会提交上游仓库和生成数据。
- 如果暂不导入，可先使用小程序内置 seed 数据继续开发。

验证示例：

```bash
tcb db nosql execute --command '[{"TableName":"exercises","CommandType":"QUERY","Command":"{\"find\":\"exercises\",\"filter\":{\"source\":\"hasaneyldrm/exercises-dataset\"},\"limit\":5}"}]' --json
```

媒体版权注意：`exercises-dataset` 的图片/GIF 来自 Gym visual，不属于 MIT 授权范围。私用时保留 attribution；公开发布或商业使用前需确认授权。

## 6. 微信开发者工具

用户必须执行：

1. 安装微信开发者工具。
2. 创建/准备微信小程序 AppID。
3. 把 `project.config.json` 中的 `appid` 从 `touristappid` 改为真实 AppID。
4. 在微信开发者工具中打开本仓库根目录。
5. 在云开发控制台确认小程序已绑定环境 `code-realtime-d7gbuxrbze297e600`。

## 7. 最后上线

由于该项目是私人使用，不建议发布到公开小程序广场之前投入过多审核适配。可先通过体验版/开发版给两个人使用。

上线前最后确认：

1. `project.config.json` 的 `appid` 已替换为真实小程序 AppID。
2. 微信开发者工具中的云开发环境为 `code-realtime-d7gbuxrbze297e600`。
3. 数据库安全规则已按 `database/security-rules.json` 配置。
4. 两个真实微信用户分别扫码测试，只能看到自己的训练、目标和档案。
