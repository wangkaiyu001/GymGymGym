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
- 添加普通组和 2–4 动作超级组。
- 保存重量、次数、RPE、热身、力竭。
- 查看动作库。
- 收藏常用动作，并在训练记录时优先选择。
- 按今天想练部位、场地器材、身体状态和突破/维稳策略推荐动作。
- 在训练页查看各部位距上次训练的间隔天数。
- 生成个人动作档案。
- 在档案页查看近 7 天 / 近 30 天训练摘要和 PR 关注 Top 3。
- 在档案页导出个人训练数据 JSON 备份并通过微信保存或发送。
- 保存用户目标和常用器材。
- 创建多个具体健身目标，并标记完成、恢复或删除。
- 从最近训练复制一份新的训练模板。
- 按同目标、同场所或同目标+场所筛选最近训练，找到更适合复制的历史模板。
- 在训练详情中修改训练标题、日期、场所、目标和备注。
- 在训练详情中修正或删除误录的训练组/训练块。
- 空训练不能完成，仅开始但未完成的草稿不会污染最近训练和档案统计。
- 退出训练页后会自动恢复最近草稿，可继续保存或点击“放弃训练”彻底清理。

当前 Git 状态基线：

```text
分支：main
最近稳定基线：以 `git log --oneline -5` 和 GitHub `main` 分支为准
```

说明：如果本地后续又有新提交，请以 `git log --oneline -5` 和 GitHub 仓库页面为准。

## CloudBase 当前注意事项

- CloudBase CLI 已安装，版本为 `3.5.0`。
- 项目配置、脚本和小程序端均使用环境 `code-realtime-d7gbuxrbze297e600`。
- `getUserContext` 和 `recalculateStats` 此前已部署并验证过 `Deployment completed`。
- 2026-07-16 19:33 已通过 CloudBase MCP 再次上传两个函数当前代码，并确认两者均为 `Active`。
- 2026-07-16 19:57 已部署并回读确认 `recalculateStats` 只统计 completed 训练，草稿不会进入档案。
- 7 个数据库集合均已存在，安全权限已按仓库规则更新为 `CUSTOM` 并回读验证。
- 最近一次再次验证时，本机 CLI 出现过登录态失效提示：

```text
No valid identity information, please use cloudbase login to login
```

如果继续部署、查云函数或导入数据，请先执行：

```bash
tcb login
tcb env use code-realtime-d7gbuxrbze297e600
```

如果使用 Codex 中已经配置好的 CloudBase MCP，则当前认证状态为 `READY`，不必依赖 CLI 的旧登录态。

“根据今天场景推荐动作”是小程序端能力，不需要新增或重新部署云函数。

## 常见修正流程

### 收藏常用动作

1. 打开“动作库”。
2. 搜索或筛选你常用的动作。
3. 点击动作卡片右侧“收藏”。
4. 回到“训练”页添加动作时，动作选择器会优先展示“常用收藏”。


### 复制上次训练

1. 打开“训练”。
2. 在“最近训练”里按需要切换“全部 / 同目标 / 同场所 / 同目标+场所”。
3. 点击某条记录的“复制”。
4. 根据今天情况调整训练标题、场景、重量、次数或 RPE。
5. 点击“保存并结束训练”。

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

## 建议的端到端验收顺序

1. 保存一次“目标设置”。
2. 创建一个具体目标，例如“卧推 100kg”，测试标记完成和恢复。
3. 打开“动作库”，搜索动作并收藏 2-3 个常用动作。
4. 在动作库开启“只看收藏”，确认收藏结果正确。
5. 回到“训练”，填写今天想练部位、可用器材、策略和身体状态。
6. 检查“根据今天场景推荐”，点击一个推荐动作“加入”。
7. 检查“部位训练间隔”是否符合历史训练日期。
8. 添加一个普通组并记录重量、次数、RPE。
9. 添加一个 3 动作超级组并记录两轮。
10. 保存训练。
11. 从最近训练筛选一条同类记录并复制一份，修改重量后再保存。
12. 进入训练详情，编辑训练信息、编辑某一组、删除一组测试数据。
13. 打开“档案”，点击“重算”，确认最大重量、总组数和容量更新。
14. 确认档案页近 7 天 / 近 30 天摘要正确，PR 关注最多展示 3 个动作。
15. 导出一次 JSON 备份，确认文件包含训练、组明细、统计和目标。
16. 两个人分别扫码测试，确认只能看到自己的训练、目标和档案。
17. 用另一人的训练记录 ID 尝试打开详情，确认不能读取、修改或删除。

## 每次开发后建议同步

```bash
npm run check
npm test
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
