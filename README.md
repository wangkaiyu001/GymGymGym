# GymGymGym

私人健身记录微信小程序，面向 2 人使用：基于开源动作库 `hasaneyldrm/exercises-dataset`，记录每次训练、沉淀个人动作档案，并结合当天目标/场景辅助安排训练。

## 当前定位

- 平台：微信小程序 + 腾讯云开发 CloudBase
- 环境：`code-realtime-d7gbuxrbze297e600`
- 用户规模：仅本人和伴侣，优先简单、稳定、可维护
- 数据策略：动作库作为基础数据，训练日志和个人档案使用自有数据模型

## 功能范围

### MVP 当前实现

1. 今日训练
   - 创建训练
   - 记录训练目标、场地、器械、训练模式
   - 添加普通组或超级组动作块
   - 记录重量、次数、RPE、是否热身/力竭
2. 动作库
   - 搜索动作
   - 按部位、器械筛选
   - 查看动作说明
   - 查看动作说明
3. 个人档案
   - 汇总训练次数、总组数、总次数、总容量
   - 按动作展示最大重量、估算 1RM、最近训练
4. 目标/设置
   - 用户昵称、长期目标、常用器械、默认场地、训练水平

## 目录结构

```text
.
├── miniprogram/                 # 微信小程序源码
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── data/seed-exercises.js   # 小样本动作数据，完整数据通过脚本导入
│   ├── pages/
│   └── utils/
├── cloudfunctions/              # 云函数
│   ├── getUserContext/          # 获取 openid 并初始化用户
│   └── recalculateStats/        # 重新计算个人动作统计
├── scripts/                     # 数据准备脚本
│   ├── normalize-exercises.js
│   └── import-exercises.js
├── database/                    # 数据库规则与集合说明
├── docs/                        # 需求、设计、开发与部署文档
├── cloudbaserc.json             # CloudBase CLI 配置
└── project.config.json          # 微信开发者工具配置模板
```

## 本地开发准备

1. 安装微信开发者工具。
2. 使用微信开发者工具打开本仓库根目录。
3. 将 `project.config.json` 里的 `appid` 替换成你的小程序 AppID。
4. 确保 CloudBase 环境为：

```text
code-realtime-d7gbuxrbze297e600
```

5. 部署云函数：

```bash
tcb env use code-realtime-d7gbuxrbze297e600
tcb fn deploy getUserContext
tcb fn deploy recalculateStats
```

6. 导入动作库数据：

```bash
node scripts/normalize-exercises.js /path/to/exercises.json dist/exercises.normalized.json
node scripts/import-exercises.js dist/exercises.normalized.json
```

如果暂时不导入完整动作库，小程序会使用内置的小样本动作数据用于开发验证。

## 本地校验

```bash
npm run check
```

该命令会检查小程序页面文件、云函数文件和 JSON 配置是否齐全。

## 文档

- [产品需求定义](docs/01-requirements.md)
- [信息架构与交互设计](docs/02-ux-visual-design.md)
- [技术方案](docs/03-technical-design.md)
- [CloudBase 部署说明](docs/04-cloudbase-deployment.md)
- [验收清单](docs/05-acceptance-checklist.md)

## 版权说明

动作基础数据参考 `hasaneyldrm/exercises-dataset`。其代码、数据结构和说明文本为 MIT；图片/GIF 媒体来自 Gym visual，需保留 attribution，商业或公开复用前请确认授权。
