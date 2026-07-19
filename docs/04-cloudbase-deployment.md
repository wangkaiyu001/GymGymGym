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

2026-07-16 19:33（Asia/Shanghai）已修复本机 `cloudbase-mcp` 运行包，并通过 MCP 确认：

- 环境 `code-realtime-d7gbuxrbze297e600` 状态为 `NORMAL`，运行后端为 NoSQL。
- MCP 登录状态为 `READY` 且已经绑定目标环境；CLI 的旧登录态失效不再阻塞 MCP 管理操作。

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

最新部署验证记录：2026-07-16 19:33（Asia/Shanghai）。以下函数已通过 CloudBase MCP 更新代码并再次确认 `Status: Active`：

- `getUserContext`，运行时 `Nodejs18.15`
- `recalculateStats`，运行时 `Nodejs18.15`

2026-07-16 19:57 又部署了 `recalculateStats` 的完整训练过滤逻辑，并回读线上 `CodeInfo` 确认包含 `completedSessionIds` / `completedSets`，状态为 `Active`。

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

当前规则要点：

- `workout_sessions`、`workout_blocks`、`workout_sets`、`user_goals` 创建时要求 `request.data.user_openid == auth.openid`，更新/删除时要求 `_openid == auth.openid`。
- `exercise_stats` 禁止小程序客户端写入，由 `recalculateStats` 云函数维护。
- 不要把写规则改回包含 `!doc._openid` 的宽松形式，否则新文档所有权约束可能被绕过。

2026-07-16 已通过 CloudBase MCP 完成线上检查与配置：

- 7 个集合全部存在：`users`、`exercises`、`workout_sessions`、`workout_blocks`、`workout_sets`、`exercise_stats`、`user_goals`。
- `exercises` 线上记录数为 1325（其中包含 1324 条动作数据和 1 条集合 marker）。
- 7 个集合均已从 `PRIVATE` 更新为与 `database/security-rules.json` 对应的 `CUSTOM` 规则，并通过 `queryPermissions` 回读验证。
- CloudBase 提示规则传播可能需要约 2–5 分钟；真机首次写入若暂时出现 `DATABASE_PERMISSION_DENIED`，等待传播后用相同操作重试，不要放宽规则。

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
3. `project.config.json` 已配置 AppID `wxe5658bb09f7c33f9`。
4. 在微信开发者工具中打开本仓库根目录。
5. 在云开发控制台确认小程序已绑定环境 `code-realtime-d7gbuxrbze297e600`。

## 7. 最后上线

由于该项目是私人使用，不建议发布到公开小程序广场之前投入过多审核适配。可先通过体验版/开发版给两个人使用。

上线前最后确认：

1. `project.config.json` 的 AppID 为 `wxe5658bb09f7c33f9`。
2. 微信开发者工具中的云开发环境为 `code-realtime-d7gbuxrbze297e600`。
3. 数据库安全规则已按 `database/security-rules.json` 配置。
4. 两个真实微信用户分别扫码测试，只能看到自己的训练、目标和档案。

### 7.2 小程序关联（必须）

真机没有进入任何云函数日志，CloudBase 官方文档确认：独立 CloudBase 环境必须在「环境配置 → 安全配置 → 小程序关联」中绑定当前 AppID。未关联时 `wx.cloud.init` 会报非法 env，随后云函数、数据库和存储全部失败。

请关联：

```text
wxe5658bb09f7c33f9
```

V0.2 已在启动页增加明确错误提示；关联完成前，云函数请求不会进入函数执行日志。

### 7.1 官方 CI 上传

本机未安装微信开发者工具时，可使用仓库内的 `scripts/upload-miniprogram.js` 和微信官方 `miniprogram-ci`：

```bash
MINIPROGRAM_PRIVATE_KEY_PATH=/absolute/path/private.wxe5658bb09f7c33f9.key \
MINIPROGRAM_VERSION=0.1.0 \
MINIPROGRAM_DESC="GymGymGym MVP" \
npm run upload:miniprogram
```

密钥路径只通过环境变量传入，不写入源码和 Git 历史。

首次上传如果返回 `invalid ip`，需要在微信公众平台的小程序开发设置中，把命令输出的当前公网 IP 加入“代码上传 IP 白名单”后重试。2026-07-16 本机首次尝试识别到的公网 IP 为 `116.6.206.132`。

2026-07-16 23:19（Asia/Shanghai）已通过微信官方 `miniprogram-ci` 成功上传：

- AppID：`wxe5658bb09f7c33f9`
- 版本：`0.1.0`
- 描述：`GymGymGym MVP 2026-07-16`
- 完整包大小：127,841 bytes
- 上传结果：`Mini Program upload completed`

2026-07-18 22:43 已成功上传 V0.2 聚焦版：

- 版本：`0.2.0`
- 描述：`GymGymGym focused training V0.2`
- 完整包大小：96,681 bytes
- 上传结果：`Mini Program upload completed`
