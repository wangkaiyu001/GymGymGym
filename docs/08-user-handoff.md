# GymGymGym 用户交接说明

## 当前项目状态

代码仓库：

```text
https://github.com/wangkaiyu001/GymGymGym
```

本地目录：

```text
/Users/bytedance/Documents/GymGymGym
```

CloudBase 环境：

```text
环境名称：code-realtime
环境 ID：code-realtime-d7gbuxrbze297e600
```

当前版本已经具备私人使用 MVP 的基础能力：

- 记录训练场景。
- 添加普通组和超级组。
- 保存重量、次数、RPE、热身、力竭。
- 查看动作库。
- 收藏常用动作，并在训练记录时优先选择。
- 生成个人动作档案。
- 保存用户目标和常用器材。
- 从最近训练复制一份新的训练模板。
- 在训练详情中修改训练标题、日期、场所、目标和备注。
- 在训练详情中修正或删除误录的训练组/训练块。

## 常见修正流程

### 收藏常用动作

1. 打开“动作库”。
2. 搜索或筛选你常用的动作。
3. 点击动作卡片右侧“收藏”。
4. 回到“训练”页添加动作时，动作选择器会优先展示“常用收藏”。


### 复制上次训练

1. 打开“训练”。
2. 在“最近训练”里点击某条记录的“复制”。
3. 根据今天情况调整训练标题、场景、重量、次数或 RPE。
4. 点击“保存并结束训练”。

复制会创建新的训练记录，不会覆盖原来的历史训练。

### 修正误录数据

1. 在“训练”页点击最近训练的“详情”。
2. 如果标题、日期、场所、目标或备注录错，在“训练信息”里修改并点击“保存训练信息”。
3. 如果某一组录错，直接修改重量、次数、RPE 或热身/力竭状态。
4. 点击该组右侧“保存”。
5. 如需删除误录数据，点击该组“删除”；如整块都录错，点击训练块右侧“删除块”。
6. 修改或删除组数据后系统会尝试自动重算档案统计；如果网络异常，可稍后到“档案”页手动点击“重算”。

## 已导入的动作库

基础动作数据来自：

```text
hasaneyldrm/exercises-dataset
```

已标准化并导入 CloudBase `exercises` 集合。最近一次验证记录数为 1324。

注意：动作库中的图片/GIF 来自 Gym visual，不属于 MIT 授权范围。私人使用时保留 attribution；公开发布或商业使用前需要确认授权。

## 日常使用方式

1. 打开微信开发者工具。
2. 打开项目目录：

```text
/Users/bytedance/Documents/GymGymGym
```

3. 编译并预览。
4. 手机扫码体验。

## 每次开发后建议同步

```bash
npm run check
git diff --check
git status --short
git add README.md docs miniprogram cloudfunctions database scripts package.json cloudbaserc.json project.config.json sitemap.json
git commit -m "Describe your change"
git push origin main
```

不要提交：

- `external/`
- `dist/`
- 上游动作库媒体文件
- 任何 CloudBase 密钥或个人凭证

## 用户本人必须完成的事项

1. 将 `/Users/bytedance/Documents/GymGymGym/project.config.json` 中的：

```json
"appid": "touristappid"
```

替换成真实微信小程序 AppID。

2. 用微信开发者工具打开：

```text
/Users/bytedance/Documents/GymGymGym
```

3. 确认小程序绑定 CloudBase 环境：

```text
code-realtime-d7gbuxrbze297e600
```

4. 在 CloudBase 控制台配置或确认数据库安全规则，参考：

```text
/Users/bytedance/Documents/GymGymGym/database/security-rules.json
```

5. 用真实手机完成一次端到端训练记录测试。

6. 若后续公开发布或商业使用，确认 Gym visual 媒体授权。
