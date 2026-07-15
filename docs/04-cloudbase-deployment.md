# CloudBase 部署说明

## 1. 环境

```text
Env ID: code-realtime-d7gbuxrbze297e600
Env Name: code-realtime
Region: ap-shanghai
```

## 2. CLI 状态

本机已安装 CloudBase CLI：

```bash
tcb --version
# CloudBase CLI 3.5.0
```

已执行：

```bash
tcb env use code-realtime-d7gbuxrbze297e600
```

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

## 5. 导入完整动作库

```bash
node scripts/normalize-exercises.js /path/to/exercises-dataset/data/exercises.json dist/exercises.normalized.json
node scripts/import-exercises.js dist/exercises.normalized.json
```

说明：

- `import-exercises.js` 当前只做导入前检查和数量提示，避免在未确认数据库权限前误覆盖线上动作库。
- 实际批量导入可使用 CloudBase 控制台、MCP 或后续补充的数据库 SDK 批处理脚本。
- 如果暂不导入，可先使用小程序内置 seed 数据继续开发。

## 6. 微信开发者工具

用户必须执行：

1. 安装微信开发者工具。
2. 创建/准备微信小程序 AppID。
3. 把 `project.config.json` 中的 `appid` 从 `touristappid` 改为真实 AppID。
4. 在微信开发者工具中打开本仓库根目录。
5. 在云开发控制台确认小程序已绑定环境 `code-realtime-d7gbuxrbze297e600`。

## 7. 最后上线

由于该项目是私人使用，不建议发布到公开小程序广场之前投入过多审核适配。可先通过体验版/开发版给两个人使用。
