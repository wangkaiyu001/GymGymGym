# GymGymGym 技术方案

## 1. 技术栈

- 微信小程序原生框架。
- CloudBase 云开发。
- CloudBase 文档数据库。
- Node.js 云函数。
- CloudBase CLI：`tcb` 3.5.0。

## 2. CloudBase 环境

```text
Env Name: code-realtime
Env ID: code-realtime-d7gbuxrbze297e600
Region: ap-shanghai
```

## 3. 集合设计

### 3.1 `users`

```js
{
  _id: openid,
  openid,
  nickname,
  role: "owner" | "partner" | "unknown",
  gender,
  height_cm,
  body_weight_kg,
  training_level: "beginner" | "intermediate" | "advanced",
  default_goal: "hypertrophy" | "strength" | "fat_loss" | "maintenance" | "recovery",
  default_location: "home" | "gym" | "hotel" | "outdoor",
  available_equipment_home: string[],
  favorite_exercise_ids: string[],
  created_at,
  updated_at
}
```

### 3.2 `exercises`

```js
{
  _id,
  source,
  source_id,
  name,
  name_zh,
  aliases_zh,
  body_part,
  body_part_zh,
  equipment,
  equipment_zh,
  target,
  muscle_group,
  secondary_muscles,
  instructions,
  instruction_steps,
  image,
  gif_url,
  attribution,
  movement_pattern,
  difficulty,
  is_common,
  is_custom,
  created_at,
  updated_at
}
```

### 3.3 `workout_sessions`

```js
{
  _id,
  user_openid,
  date,
  title,
  location,
  goal_type,
  mode,
  status: "draft" | "completed",
  started_at,
  ended_at,
  duration_min,
  intent: {
    focus_body_parts,
    available_equipment,
    energy_level,
    time_limit_min,
    note
  },
  notes,
  created_at,
  updated_at
}
```

### 3.4 `workout_blocks`

```js
{
  _id,
  session_id,
  user_openid,
  order,
  type: "single" | "superset" | "circuit",
  title,
  exercise_ids,
  rest_seconds_between_rounds,
  notes,
  created_at,
  updated_at
}
```

### 3.5 `workout_sets`

```js
{
  _id,
  session_id,
  block_id,
  user_openid,
  exercise_id,
  block_type,
  round_index,
  exercise_order_in_block,
  set_index,
  weight_kg,
  reps,
  rpe,
  is_warmup,
  is_failure,
  rest_seconds_after,
  notes,
  volume_kg,
  estimated_1rm_kg,
  created_at,
  updated_at
}
```

### 3.6 `exercise_stats`

```js
{
  _id: `${openid}_${exercise_id}`,
  user_openid,
  exercise_id,
  total_sessions,
  total_sets,
  total_reps,
  total_volume_kg,
  max_weight_kg,
  max_volume_kg,
  estimated_1rm_kg,
  last_performed_at,
  last_weight_kg,
  last_reps,
  updated_at
}
```

### 3.7 `user_goals`

```js
{
  _id,
  user_openid,
  goal_type,
  title,
  description,
  focus_body_parts,
  target_metrics,
  status: "active" | "paused" | "done",
  created_at,
  updated_at
}
```

## 4. 权限模型

MVP 阶段建议：

- `exercises`：所有登录小程序用户可读，仅管理端可写。
- `users`：用户仅可读写自己的文档。
- `workout_sessions` / `workout_blocks` / `workout_sets` / `exercise_stats` / `user_goals`：用户仅可读写 `user_openid == auth.openid` 的文档。

CloudBase 安全规则见 `database/security-rules.json`。

## 5. 云函数

### 5.1 `getUserContext`

职责：

- 获取 `OPENID`。
- 初始化 `users` 文档。
- 返回用户资料。

### 5.2 `recalculateStats`

职责：

- 按当前 `OPENID` 读取 `workout_sets`。
- 过滤热身组。
- 按动作聚合统计。
- 写入 `exercise_stats`。
- 删除已经没有有效训练组支撑的旧 `exercise_stats`，避免删除训练后档案残留旧动作。

## 6. 前端数据访问策略

- 训练记录由小程序端直接写 CloudBase 数据库。
- 用户身份通过 `getUserContext` 获取。
- 个人档案优先读 `exercise_stats`，为空时小程序端基于最近 `workout_sets` 做轻量实时聚合，避免云函数未部署时完全无数据。
- 完整动作库未导入时使用 `miniprogram/data/seed-exercises.js`。
- 常用/收藏动作保存在 `users.favorite_exercise_ids`，动作库页负责增删收藏，训练动作选择器读取后展示“常用收藏”区并将收藏动作置顶。

写入约定：

- 小程序端直接新增训练数据时，CloudBase 会自动写入 `_openid`，同时在已获取用户上下文后显式写入 `user_openid`，安全规则兼容 `_openid == auth.openid` 与 `user_openid == auth.openid`。
- 云函数重算统计时补充 `user_openid`，便于后续跨端或管理端迁移。
- `users` 文档 ID 使用 OpenID；保存用户资料时需要保留已有 `created_at`、`role` 等字段。

训练记录 V0.2 行为：

- “动作库”页支持收藏/取消收藏动作，收藏列表写入用户文档，不额外增加集合复杂度。
- “训练”页动作选择器会读取收藏动作，在无搜索词时显示常用收藏区，搜索结果中收藏动作置顶。
- “训练”页根据当天 `intent`、想练部位、可用器材、身体状态和收藏动作在小程序端生成轻量动作推荐，不依赖额外后端服务。

- “训练”页最近训练支持复制，复制的是训练块结构和每组上次填写值；保存时会创建新的 session/block/set，不会修改旧训练。
- “训练”页会拉取最近 20 条训练作为本地候选，再按当前表单的 `goal_type`、`location` 做“同目标 / 同场所 / 同目标+场所”前端筛选，并展示前 5 条用于复制或查看详情。
- “训练详情”页支持编辑已保存训练的标题、日期、场所、目标和备注。
- “训练详情”页支持编辑已保存 set 的重量、次数、RPE、热身/力竭。
- “训练详情”页支持删除单个 set 或整个 block；删除 block 时先删除其下所有 set，再删除 block。
- 编辑或删除后调用 `recalculateStats`，保证个人档案跟随训练明细变化。

## 7. 数据导入策略

1. 下载或克隆 `hasaneyldrm/exercises-dataset`。
2. 使用 `scripts/normalize-exercises.js` 标准化字段并增加中文映射。
3. 使用 `scripts/import-exercises.js` 分批写入 CloudBase `exercises` 集合。

## 8. 风险

| 风险 | 处理 |
|---|---|
| 小程序 AppID 未配置 | 使用 `touristappid` 作为模板，最后由用户替换 |
| CloudBase 数据库集合未创建 | 首次写入自动创建或用户在控制台创建 |
| 完整动作库媒体版权 | 私用保留 attribution；公开发布前确认授权 |
| 统计与记录不一致 | 提供 `recalculateStats` 重算函数 |
