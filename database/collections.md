# CloudBase 数据库集合

MVP 需要以下 CloudBase 文档数据库集合：

- `users`：用户资料，文档 ID 使用 OpenID；同时保存默认训练偏好和 `favorite_exercise_ids` 常用/收藏动作。
- `exercises`：动作库，初期可使用小程序内置 seed，后续导入完整开源数据。
- `workout_sessions`：一次训练的主记录。
- `workout_blocks`：训练块，用于表达普通组、超级组、循环组。
- `workout_sets`：每一组动作数据。
- `exercise_stats`：按动作聚合的个人档案统计。
- `user_goals`：后续扩展的多个目标记录。

> 注意：云函数和小程序写入不会自动创建所有集合。首次使用前建议在 CloudBase 控制台创建，或运行 `npm run setup:db -- --apply` 通过系统 marker 文档懒创建这些集合，并按 `database/security-rules.json` 配置权限。
