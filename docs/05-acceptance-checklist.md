# GymGymGym 验收清单

## 1. 仓库

- [ ] GitHub remote 指向 `https://github.com/wangkaiyu001/GymGymGym.git`
- [ ] 所有代码和文档已 commit
- [ ] 所有代码和文档已 push

## 2. 小程序

- [ ] 微信开发者工具可以打开项目
- [ ] AppID 已替换为真实 AppID
- [ ] `wx.cloud.init` 使用 `code-realtime-d7gbuxrbze297e600`
- [ ] Tab 能正常切换
- [ ] 今日训练页能创建训练
- [ ] 能添加普通组
- [ ] 能添加超级组
- [ ] 能保存训练
- [ ] 动作库能搜索和筛选
- [ ] 个人档案能展示统计
- [ ] 目标设置能保存用户配置

## 3. CloudBase

- [ ] CLI 已登录
- [ ] 默认环境已切换
- [ ] 云函数 `getUserContext` 已部署
- [ ] 云函数 `recalculateStats` 已部署
- [ ] 数据库集合已创建或可自动创建
- [ ] 安全规则已配置

## 4. 数据

- [ ] seed 动作数据可用
- [ ] 完整动作库已可通过脚本标准化
- [ ] 完整动作库可导入 `exercises`
- [ ] 训练数据按用户隔离

## 5. 用户本人必须执行

- [ ] 提供真实微信小程序 AppID
- [ ] 在微信开发者工具导入项目
- [ ] 绑定小程序和 CloudBase 环境
- [ ] 如要公开发布，确认 Gym visual 媒体授权
