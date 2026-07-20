# GymGymGym

私人健身记录微信小程序，面向 2 人使用：一句话生成可执行的训练计划，在训练中快速修正重量和次数，训练后只看近期摘要与 PR。

## 当前定位

- 平台：微信小程序 + 腾讯云开发 CloudBase
- 当前小程序环境：`cloudbase-d7g16mc3f74e58a55`（微信小程序后台原生云开发）
- 旧迁移来源：`code-realtime-d7gbuxrbze297e600`
- 用户规模：仅本人和伴侣，优先简单、稳定、可维护
- 数据策略：动作库作为基础数据，训练日志和个人档案使用自有数据模型

## 功能范围

### V0.2 聚焦版

1. 今日训练
   - 打开即自动生成推荐训练计划
   - 用一句自然语言说明部位、器材、状态和训练时长
   - 根据历史训练提示各部位距上次训练的间隔天数
   - 自动给出动作、组数、次数、RPE 和历史参考重量
   - 选择过去日期即可补录历史训练
   - 开始后聚焦记录实际重量、次数和 RPE
2. 动作库
   - 搜索动作
   - 按部位、器械筛选
   - 查看动作说明
   - 分页浏览完整 1324 个动作
   - 显示开源动作示范图和动作说明
   - 图片由 CloudBase 静态托管提供，保留 Gym visual attribution
3. 个人档案
   - 展示近 7 天 / 近 30 天训练次数、有效组数、次数和容量
   - 展示 PR 关注 Top 3，快速看到当前强项动作
4. 我的习惯
   - 昵称、训练经验、主要目标、常用器材和常用场地

### 已进入 V0.2 的训练记录增强

- 动作库支持收藏常用动作；选择训练动作时会先展示收藏动作，并在搜索结果中置顶。
- 训练页会根据当天场景推荐动作，可一键加入普通训练块。

- 最近训练支持“一键复制”：带入上次训练块、动作、重量、次数、RPE、热身/力竭标记，再按今天实际情况微调后保存为新训练。
- 最近训练支持按“全部 / 同目标 / 同场所 / 同目标+场所”筛选，方便从更接近今天场景的历史训练复制。
- 训练详情支持编辑已保存组：可修改重量、次数、RPE、热身/力竭，并触发个人档案统计重算。
- 训练详情支持删除误录组或整个训练块：删除后自动重算统计，并清理已经不存在的动作统计。
- 个人档案新增近期训练摘要和 PR 关注卡片，便于快速复盘最近训练密度和当前强项。
- 目标页支持结构化目标管理，例如“卧推 100kg”“每周训练 3 次”，并区分进行中与已完成。
- 新增训练数据会显式写入 `user_openid`，同时保留 CloudBase 自动 `_openid`，便于安全规则和后续迁移。
- 更新和删除训练/目标时会同时校验文档 ID 与当前 OpenID；数据库写规则只允许 `_openid == auth.openid`，统计集合仅由云函数写入。

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
│   ├── import-exercises.js
│   └── setup-cloudbase-db.js
├── database/                    # 数据库规则与集合说明
├── docs/                        # 需求、设计、开发与部署文档
├── cloudbaserc.json             # CloudBase CLI 配置
└── project.config.json          # 微信开发者工具配置模板
```

## 本地开发准备

1. 安装微信开发者工具。
2. 使用微信开发者工具打开本仓库根目录。
3. 项目已配置微信小程序 AppID `wxe5658bb09f7c33f9`。
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

6. 初始化数据库集合（默认 dry-run，不会写入线上）：

```bash
npm run setup:db -- --dry-run
npm run setup:db -- --apply
```

7. 导入动作库数据（默认 dry-run，不会写入线上）：

```bash
git clone https://github.com/hasaneyldrm/exercises-dataset external/exercises-dataset
npm run normalize:exercises
npm run import:exercises -- --dry-run
npm run import:exercises -- --apply
```

如需先验证云端写入，可小批量导入：

```bash
npm run import:exercises -- --apply --limit 5
```

如果暂时不导入完整动作库，小程序会使用内置的小样本动作数据用于开发验证。`external/` 和 `dist/` 已加入 `.gitignore`，不会提交 294M 的上游仓库和生成数据。

## 本地校验

```bash
npm run check
npm test
git diff --check
```

`npm run check` 会检查小程序页面文件、云函数文件和 JSON 配置是否齐全；`npm test` 会验证档案时间窗口、部位提醒以及数据权限边界。

## 上传微信小程序代码

项目使用微信官方 `miniprogram-ci` 上传，私钥必须保留在仓库外：

```bash
MINIPROGRAM_PRIVATE_KEY_PATH=/absolute/path/private.<appid>.key \
MINIPROGRAM_VERSION=0.1.0 \
MINIPROGRAM_DESC="GymGymGym MVP" \
npm run upload:miniprogram
```

不要把上传私钥复制到项目目录或提交 GitHub。

## 当前部署备注

- CloudBase CLI 已安装并识别为 `3.5.0`。
- `cloudbaserc.json`、`miniprogram/app.js` 均已固定环境 `code-realtime-d7gbuxrbze297e600`。
- 如果执行 CloudBase 命令时提示 `No valid identity information`，说明本机 CLI 登录态过期，需要先运行：

```bash
tcb login
tcb env use code-realtime-d7gbuxrbze297e600
```

- 最近新增的场景化动作推荐在小程序端实现，不需要新增云函数。
- 2026-07-16 已通过 CloudBase MCP 将 `getUserContext` 和 `recalculateStats` 当前代码部署到线上并确认 `Active`。
- 7 个数据库集合均已存在，线上安全规则已更新为仓库中的 `CUSTOM` 最小权限规则并回读验证。
- 当前仓库与 `origin/main` 同步，本地结构检查、统计/提醒/权限测试以及脚本 dry-run 均已通过。
- 微信小程序 `0.1.0` 已于 2026-07-16 23:19 通过官方 `miniprogram-ci` 上传成功。
- V0.2 已将 1324 张动作示范图上传至 CloudBase 静态托管，并重新导入完整动作数据。
- 微信小程序 V0.2 开发版本已于 2026-07-18 22:43 上传成功。
- 当前小程序 AppID 仍需在 CloudBase「环境设置 → 小程序关联」中完成关联，否则真机会提示非法 env/云函数不可用。
- 微信小程序 AppID 已配置为 `wxe5658bb09f7c33f9`；上传私钥保留在仓库外，不会提交 GitHub。

## 文档

- [产品需求定义](docs/01-requirements.md)
- [信息架构与交互设计](docs/02-ux-visual-design.md)
- [技术方案](docs/03-technical-design.md)
- [CloudBase 部署说明](docs/04-cloudbase-deployment.md)
- [验收清单](docs/05-acceptance-checklist.md)
- [产品路线图](docs/06-product-roadmap.md)
- [手动验收流程](docs/07-manual-test-plan.md)
- [用户交接说明](docs/08-user-handoff.md)
- [V0.2 聚焦版重构](docs/09-v02-focused-redesign.md)

## 版权说明

动作基础数据参考 `hasaneyldrm/exercises-dataset`。其代码、数据结构和说明文本为 MIT；图片/GIF 媒体来自 Gym visual，需保留 attribution，商业或公开复用前请确认授权。
