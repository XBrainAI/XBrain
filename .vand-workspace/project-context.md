# 项目知识（project-context）

> 本文件是 VAND 治理下的项目知识库：『吸收的既有规则』各节为原文全量收录，
> 自 init 起以原文效力生效（由 VAND 治理，与范式冲突处 VAND 优先）；
> 其余各节为草稿，确认后生效，供意图规格 Design 章节版本化引用。

## 构建 / 测试 / 运行命令

> 摘要（详情见下文吸收节原文）。均在仓库根执行；Windows + Git Bash / PowerShell。

- 安装 SPA 依赖：`cd query-system && npm install`（首次或依赖变更后）。
- 本地开发（SPA）：`npm run dev`（根，等价 `cd query-system && npm run dev`）。
- 生产构建：`npm run build`（根）→ 产出 `query-system/dist/`；预览 `cd query-system && npm run preview`（须先 build）。
- SPA 质量门：`cd query-system && npm run lint` → `npm run test`（vitest 一次性）。改 `query-system/src/` 后三者（含 build）全绿方可提交。
- 全站回归（静态层）：`npm run test:repo`（秒级只读，自动出报告 `tests/reports/latest.md`）；深层：`npm run test:repo:full`（含健康站一致性守卫 + SPA lint/test 棘轮基线 + dist 产物校验）。**任何 HTML/媒体/目录结构改动落地后必须 test:repo 全绿方可提交**；涉及 query-system/认证/部署配置时改跑 test:repo:full。
- 部署：`git push` → Netlify 自动 `npm run build` 并发布（publish="."）。
- 脚本生成页：`cd 健康/妈 && python generate_index.py` → 同步汇总报告派生统计 → `python check_consistency.py`（退出码 0 方可推送）；生活点滴：`python src/gen_life_record.py <YYYY>/<MMDD>`（单页）/ `gallery`（画廊重建）。
- 媒体入库：先 `python src/compress_media.py --dry-run <目录>` 预览再实压（输出恒为 H.264 CRF20+faststart）；iPhone `.heic` 须先用系统 Python 3.10（`C:/Users/km/AppData/Local/Programs/Python/Python310/python.exe`，含 pillow-heif）转 `.jpg`。pre-commit 钩子自动拒绝 HEVC 与 >100MB 文件。

## 架构与领域约定

> 摘要（详情见下文吸收节原文，以原文效力为准）。

- **仓库定位**：`home/` 是 XBrain 多子站点聚合部署仓库（Netlify，发布根=仓库根）。根 `index.html` 为门户卡片首页；子站点三类：A 纯静态 HTML、B React+Vite SPA（仅 `query-system` 参与根 build）、C 多级导航（由 `src/` 共享模板库生成，禁本地另存模板副本）。
- **query-system 数据管线**（最复杂子系统）：`rawData.ts`（内嵌 MD 字符串，核心分数唯一真源）→ `mdParser.ts` → `dataMerger.ts`（mergeAllData，extractBaseName 模糊合并）→ `filterEngine.ts` → 组件。学校深度报告走 `database/school_files/*.md` 运行时 fetch（`vite.config.ts` 三插件生成列表并复制进 dist）。已知缺陷见 `audit_report.md`（补录数据 FAIL 等），改解析逻辑前先读它。
- **品牌底座（不可妥协）**：CSS 变量色彩体系（--xb-deep/--xb-accent 等）、Noto Serif/Sans SC 字体、完整 XBrain Logo SVG（注入按 `brand/XBRAIN-LOGO-IP.md`，href="#top" + 首屏 id="top"，禁简化 SVG/胶囊形）。圆角层级 12/8/4px。
- **通用页面规范**：长文页用固定顶部章节导航（`brand/top-nav-template.html`）；页内锚点链接规范（in-doc-link 可点击、每章返回顶部、URL 带 #片段深链）；移动端优先（viewport、≥44px 触控、safe-area 避让、≥16px 字号）；灯箱禁 `body.overflow='hidden'`、遮罩 `touch-action:none`、箭头恒在屏内。
- **认证**：`brand/auth.js`（XBrainAuth v1.2，SHA-256+session+lockout），主站密码在 `auth.config.json`，子站各带 `auth.config.json`；勿改 auth.js。
- **敏感与纪律**：敏感/隐私文件不得入库（认证遮罩不保护直链）；dist/node_modules 禁提交；入库视频必须 H.264+faststart、单文件 ≤100MB；中文目录/空格文件名路径写原始字符；git 推送前 fetch 比对防分支引用碰撞（禁盲目 force push）。
- **生活点滴双生成器**：`src/gen_travelogue.py` 仅限 2026/0816 手搓原型；其余用 `src/gen_life_record.py`；手搓精修页（2026/0816、0823）禁止通用生成器重盖；媒体按文件名时间戳归章、文案忠实于事实。
- **grade-insight**：纯静态交互应用（无构建），localStorage 主存 + data.js 快照同步；分析禁直接比较原始分，必须三重归一（得分率/排名百分位/相对均分）。

## 领域术语表

| 术语 | 含义 |
|------|------|
| 门户首页 | 仓库根 `index.html`，卡片聚合入口 |
| 子站点 | 门户下的独立站点目录（A/B/C 三类，映射表见吸收节 §1.1） |
| 品牌底座 | 色彩+字体+Logo 三项不可妥协规范 |
| 数据管线 | rawData→mdParser→dataMerger→filterEngine→组件 的链路 |
| orphan 学校 | 仅出现在录取分数表但不在学校库的学校，由 dataMerger 推断批次 |
| 脚本生成页 | 由 `generate_*.py` 产出、禁止手改的 HTML（头部带 GENERATED 注释） |
| harness | 本仓库「命令流 + 范式 + 验证门」工程化作业框架（见吸收节 AGENTS.md） |
| 棘轮基线 | `tests/baseline.json` 存量债务记账：重构只许改善不许恶化，落地后须同步删 KNOWN_ISSUES 条目 |
| 手搓精修页 | 生活点滴中人工精修的记录页（2026/0816、0823），禁止生成器覆盖 |
| 意图规格 / Conductor | VAND 术语：规格驱动的任务载体 / 全栈编排工程师（见 `.vand/AGENTS.md`） |

## 吸收的既有规则：AGENTS.md

> 吸收时间 20260927-112616 · 处置：标准入口原位续存。
> 本节为原文全量收录（无损），自 init 起以原文效力由 VAND 治理；与 VAND 范式冲突之处，VAND 优先。

```text
# AGENTS.md — XBrain 多子站点聚合工程

> 本文件为 AI 代理（work 类工具）在本仓库开展 harness 工程化作业的统一指引。
> 阅读优先级：**本文件 > 子站 `AGENTS.md` > `README.md` > 各子站点 README**。两者冲突时以本文件为准。
> 各子站目录下有专属 `AGENTS.md`（query-system/健康/四季景点/采购与维护），补充该子站的特殊约束；本文件 §1 目录地图标注了其位置。
> 详细子站点开发模板（卡片、Logo 组件、流程图标识等）仍以 `README.md` 为权威参照。

---

## 0. 仓库定位（先读这一节）

- 本仓库 `home/` 是 **XBrain 多子站点聚合部署仓库**，部署于 Netlify，发布根为仓库根目录。
- 仓库根 `index.html` 是**门户首页**（纯静态），以卡片网格聚合各子站点入口。
- 子站点彼此独立，可为：纯静态 HTML（类型 A）、React+Vite SPA（类型 B）、多级导航（类型 C）。
- **`query-system/` 是唯一需要构建的 SPA 子站点**，由根 `package.json` 的 `build` 脚本编排。
- `query-system` 的本地辅助脚本（`publish.ps1`/`start.bat`/`ngrok.bat`，硬编码指向外部工作区 `ws_workbuddy\ws_study8\*`）已于 **2026-09 周期性重构删除**。在本仓库内作业时，**以根 `npm run build` + `git push` 触发 Netlify 自动部署为唯一权威流程**。

---

## 1. 架构总览与目录地图

```
home/
├── index.html              # 门户首页（卡片聚合入口，纯静态）
├── netlify.toml            # 部署配置：publish="."，含 query-system SPA 路由重定向
├── package.json            # 根级编排：build/dev → cd query-system
├── auth.config.json        # 主站认证配置（密码 xbrain2026，1 天会话，5 次锁定 15 分钟）
├── README.md               # 子站点开发指引（9 章，卡片/Logo/流程图模板的权威来源）
├── AGENTS.md               # 本文件
├── src/                    # ⭐ 共享模板库（单一来源）：类型 C 子站点 HTML 模板 + 生成器，引用规则见 src/README.md
├── .gitignore              # 含 node_modules/、dist/、__pycache__/ 等
│
├── brand/                  # 共享品牌资源
│   ├── logo/               # xbrain-logo.svg / xbrain-logo-alt.svg
│   ├── XBRAIN-LOGO-IP.md   # ⭐ Logo 组件 IP 规范（完整代码模板，单一来源，见 §6.7）
│   ├── auth.css            # 认证遮罩层样式
│   ├── auth.js             # XBrainAuth v1.2 共享认证模块（SHA-256 + session + lockout）
│   └── tests/              # logo 可见性测试页
│
├── query-system/           # 【类型 B】中考志愿填报查询系统（React 19 + Vite + TS）
│   ├── AGENTS.md           # ⭐ 子站专属指引（数据管线/插件/缺陷详解）
│   ├── database/           # 原始数据源（MD 表格）+ school_files/（学校深度报告 MD）
│   ├── home/               # 新风机选购指南 HTML（独立静态页）
│   ├── other_infos/        # 舆情/分析报告（HTML/MD），构建时复制进 dist
│   ├── public/             # favicon.svg、icons.svg
│   ├── src/                # 源码（见 §5 数据管线）
│   ├── audit_report.md     # 数据审核报告（含已知 FAIL/WARN 项，见 §10）
│   ├── vite.config.ts      # base:'./' + 3 个自定义插件（见 §5.3）
│   └── package.json        # 子站点级脚本：dev/build/lint/test/preview
│
├── 健康/                   # 【类型 C】家庭健康档案（多级导航）
│   ├── AGENTS.md           # ⭐ 子站专属指引（脚本生成/多成员层级/认证）
│   ├── 哥/ 妈/ 弟/ 爸/     # 各成员子目录（MD 报告 + PNG + index.html）
│   ├── 妈/generate_index.py # ⚠️ 脚本生成页面，index.html 禁止手改（见 §8）
│   └── index.html
│
├── 四季景点/               # 【类型 C】岭南景点（从化狮象岩 / 肇庆燕岩 / 花都石头记）
│   └── AGENTS.md           # ⭐ 子站专属指引（小红书图片/多主题/已知缺陷）
│
├── 采购与维护/             # 【类型 C】家电选购与维护（新风机、大金空调诊断）
│   └── AGENTS.md           # ⭐ 子站专属指引（MD↔HTML双改/富视觉长文档）
│
├── 学习与成长/             # 【类型 C】学习资源与成长指南（纪录片推荐等）
│   └── index.html
│
├── 生活点滴/               # 【类型 C · 多级导航·纯记录型】随拍照片+视频（非计划），由 home/src 纯记录型模板(site-template-travelogue.html)生成
│   ├── index.html          # 画廊首页
│   └── <YYYY>/MMDD/        # 每天的记录文件夹（含 index.html + README.MD + 媒体）
│
└── grade-insight/          # 【类型 A · 纯静态交互应用】高中成绩跟踪分析（原生JS单页，无构建）
    ├── index.html          # 单页应用：总览/趋势/科目/考试/录入/设置（hash 深链路由）
    ├── js/                 # data(快照种子)/store(本地存储)/analysis(分析引擎)/charts/app
    ├── vendor/echarts.min.js  # 本地图表库（离线可用，禁止换 CDN）
    ├── auth.config.json    # 子站密码（初始 grade2026，可改配置）
    └── AGENTS.md           # ⭐ 子站专属指引（localStorage主存+快照同步/三重归一/file:// 兼容）
```

### 1.1 子站点 → 类型 映射

| 子站点 | 类型 | 是否参与根 build | 入口 href |
|--------|------|------------------|-----------|
| query-system | B (React SPA) | 是 | `./query-system/dist/index.html` |
| 四季景点 | C (多级导航) | 否 | `./四季景点/index.html` |
| 健康 | C (多级导航) | 否 | `./健康/index.html` |
| 采购与维护 | C (多级导航) | 否 | `./采购与维护/index.html` |
| 学习与成长 | C (多级导航) | 否 | `./学习与成长/index.html` |
| 生活点滴 | C (多级导航 · 纯记录型) | 否 | `./生活点滴/index.html` |
| grade-insight | A (纯静态交互应用) | 否 | `./grade-insight/index.html` |

---

## 2. 工程命令流（harness 命令层）

所有命令在仓库根执行，除非另注。Windows 环境，PowerShell 5。

| 任务 | 命令 | 说明 |
|------|------|------|
| 安装 SPA 依赖 | `cd query-system; npm install` | 首次或 `package.json` 变更后 |
| 本地开发（SPA） | `npm run dev`（根） | 等价 `cd query-system && npm run dev`，Vite dev server |
| 生产构建 | `npm run build`（根） | `cd query-system && npm install && npm run build`，产出 `query-system/dist/` |
| 预览构建产物 | `cd query-system; npm run preview` | 必须先 `build` |
| 单元测试 | `cd query-system; npm run test` | vitest run（一次性） |
| 测试监听 | `cd query-system; npm run test:watch` | 开发期 |
| Lint | `cd query-system; npm run lint` | eslint，提交前必跑 |
| 全站回归（静态层） | `npm run test:repo`（根） | `tests/` 套件：门户/全站链接/品牌/生成页/配置/Python 语法，秒级只读 |
| 全站回归（深层） | `npm run test:repo:full`（根） | 静态层 + 健康站一致性守卫 + SPA lint/test（棘轮基线）/build/dist 产物校验 |

> 两者均自动生成 Markdown 测试报告至 `tests/reports/latest.md`（含结论、逐用例明细、失败详情与债务快照；目录已 gitignore）。用例矩阵见 `tests/README.md`。
| 部署 | `git push` | Netlify 自动执行 `npm run build` 并发布 |

**harness 约束：**
- 改动 `query-system/src/` 后，提交前**必须依次通过** `npm run lint` → `npm run test` → `npm run build`。三者全绿方可推送（当前为存量红，见 `tests/baseline.json` 棘轮基线，重构只许改善不许恶化）。
- **任何 HTML / 媒体 / 目录结构的改动（含定期重构）落地后，必须 `npm run test:repo` 全绿方可提交推送**；涉及 `query-system`、认证或部署配置时改跑 `npm run test:repo:full`。用例矩阵见 `tests/README.md`。
- `tests/config.js` 的 `KNOWN_ISSUES` 是显式记账的存量债务豁免：**对应重构项落地时必须同步删除条目**，禁止为变绿静默加白。
- **媒体入库三重防线**（2026-09 设立，防 HEVC 复发）：① pre-commit 钩子自动拒绝 HEVC(hvc1/hev1) 与 >100MB 文件（源文件 `tests/hooks/scan-media.js`，已装至 `.bare/hooks/pre-commit`；**新克隆/换机须重装**：`cp tests/hooks/pre-commit.sh "$(git rev-parse --git-path hooks)/pre-commit" && chmod +x "$(git rev-parse --git-path hooks)/pre-commit"`）；② push 后 GitHub Actions 自动跑静态回归（`.github/workflows/regression.yml`）；③ 本地 `npm run test:repo` 的 S7 编码守卫。入库前建议先经媒体压缩服务 `python src/compress_media.py <目录>` 减体积（§8.3 工作流 ②；实测照片省 14%、视频省 71%、PNG 省 96%）。
- `dist/` 与 `node_modules/` 已在 `.gitignore`，**禁止提交**。
- 纯静态子站点（健康/景点/采购）改动后无需 build，但需本地浏览器验证链接与 Logo。

---

## 3. 子站点分类与创建范式

新增子站点时，先判定类型，再按下表执行。**类型 C 子站点（四季景点、生活点滴等）统一由 `home/src` 共享模板库生成**：复制 `home/src/site-template*.html` 并填占位符（含 `{{SITE_LABEL}}`/`{{RECORD_HEADING}}` 令牌），引用规则、COPY BLOCK 约定、生成器用法见 `src/README.md`；禁止各子站本地另存模板副本。通用 Checklist 仍见 `README.md` 第二、七节。

| 类型 | 适用 | 关键步骤要点 |
|------|------|--------------|
| A 纯静态 HTML | 内容展示、单页 | 建目录 → 写 `index.html` → 嵌 Logo → 门户加卡片 → 验证跳转 |
| B React+Vite SPA | 交互应用 | 初始化 Vite → **`vite.config.ts` 设 `base:'./'`** → 改根 `package.json` build → `netlify.toml` 加 SPA 重定向 → 门户卡片指向 `dist/index.html` → 嵌 Logo → 本地 build 验证 |
| C 多级导航 | 聚合类（景点/健康/生活点滴） | 由 `home/src` 模板库生成：复制 `site-template*.html` 填占位符 → 嵌 Logo → 门户加卡片 → 验证全层级跳转 |

**不可妥协项（三类通用）：**
- 每个页面必须嵌入完整 XBrain 品牌 Logo（见 §6）。
- 门户首页 `index.html` 的 `.sites-grid` 必须新增对应卡片入口。
- SPA 子站点必须在 `netlify.toml` 配置 history fallback，否则刷新 404。

**长文 / 文章页导航标准（新增页面必须遵守）：**

仓库内所有**长文 / 文章页**（科普文章、景点/家庭游攻略等需章节内跳转的页面），统一使用固定顶部章节导航（top-nav），不得再用「面包屑」式无意义导航或 `position: sticky` 的简易标签栏。

**权威模板：** `brand/top-nav-template.html`，内含 `COPY BLOCK 1/3 · 2/3 · 3/3` 三段注释标注可复制代码，实际应用参考 `四季景点/花都周末家庭游/index.html` 和 `四季景点/香港周末家庭游/index.html` 的实现。

### top-nav 技术规格

#### CSS（COPY BLOCK 2/3）
- `.top-nav` 为 `position: fixed; top: 0; left: 0; right: 0; z-index: 99`，桌面端 `height: 52px`、居中排列，移动端 `height: 48px`、靠右排列。
- 桌面端 `.nav-inner` 内链接横向排列，`overflow-x: auto` 可横滑，隐藏滚动条。
- 移动端 `.nav-inner { display: none }`，`.nav-hamburger` 按钮出现（最小触控面积 `44×44px`）。
- 链接 `.top-nav a.active` 高亮当前章节：文字变 `--xb-accent`，底边 `2px` 色条。
- 移动端下拉菜单 `.nav-mobile-dropdown`：`position: fixed; top: 48px`，默认 `translateY(-120%)` 隐藏在屏幕上方，`.open` 时 `translateY(0)` 滑入，`transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)`。
- **锚点偏移**：`section[id] { scroll-margin-top: 72px }`（桌面）和 `64px`（移动端），确保锚点不被固定导航遮挡。
- z-index 层次：top-nav `99` < 品牌 Logo `100` < 灯箱遮罩 `200+`。

#### HTML（COPY BLOCK 3/3）
- `<nav class="top-nav" id="topNav">` 内含 `<div class="nav-inner" id="navInner">`（桌面链接）+ `<button class="nav-hamburger" id="navToggle">`（汉堡按钮，含 SVG 三横线图标）。
- `<div class="nav-mobile-dropdown" id="navMobile">` 紧随其后，内含移动端全文字链接（与 navInner 条目一致但文字可略长）。
- 导航链接须覆盖页面所有章节，首条固定为 `<a href="#top">`，页面首屏元素必须有 `id="top"`。
- 如需返回上级，在 navInner/navMobile 最前插入 `<a href="../index.html">← 返回</a>`。

#### JavaScript（模板底部）
- **滚动高亮**：遍历 `#navInner a` 取 `href` → 找对应 `section[id]` → 滚动时比较 `offsetTop - 100` 判定当前章节 → 同时更新 navInner 和 navMobile 的 `.active` 类。
- **汉堡菜单**：`navToggle` 点击切换 `navMobile.classList.toggle('open')`，图标在三横线（☰）与叉号（✕）间切换。点击下拉菜单项 → 关闭。点击菜单外区域 → 关闭。
- **平滑锚点跳转**：接管所有 `a[href^="#"]`，`preventDefault()` → `scrollIntoView({ behavior:'smooth', block:'start' })` → `history.pushState(null, '', hash)` 写入 URL 片段以支持深链分享。

---

## 4. 门户首页与卡片入口

- 门户首页 `index.html` 的 `.sites-grid` 内以 `.site-card` 卡片聚合入口，SPA 卡片 `href` 指向 `./[子站点]/dist/index.html`，静态卡片指向 `./[子站点]/index.html`。
- 卡片分「带封面图」与「占位 SVG」两种模板，代码见 `README.md` 第五节。
- 卡片渐入动画由 `IntersectionObserver` 驱动（`threshold:0.15`），新增卡片自动生效，无需额外 JS。
- 改门户首页后无需 build，但需本地打开验证卡片跳转与封面图加载。

---

## 5. query-system 数据管线（最复杂子系统，改动需格外谨慎）

### 5.1 源码结构

```
query-system/src/
├── types.ts               # 全部 TypeScript 类型（SchoolRecord 等核心模型）
├── main.tsx / App.tsx     # 入口与主组件
├── utils/
│   ├── rawData.ts         # ⚠️ 内嵌原始 MD 表格字符串（核心分数数据源）
│   ├── mdParser.ts        # MD 表格解析 → 类型化记录（parseMdTable + 各 parse* 函数）
│   ├── dataMerger.ts      # 多源合并 → SchoolRecord[]（含 extractBaseName 模糊匹配）
│   ├── filterEngine.ts    # 筛选条件应用
│   ├── fieldHelpers.ts    # 字段显示辅助
│   └── exportCsv.ts       # CSV 导出
├── components/            # UI 组件（FilterPanel/ResultTable/DetailDrawer/各 Modal）
└── __tests__/             # vitest 测试（comprehensive/dataConsistency/dataMerger/filterEngine/mdParser/regression）
```

### 5.2 数据流

```
rawData.ts (内嵌 MD 字符串)
   └─ mdParser.ts (parseSchoolLibrary / parseBatch3/4Data / parseQuotaControlLines /
                   parseXieheQuota2026/2025 / parseXieheSendingDetails / parseQuotaCompare2526 /
                   parseMakeupScores / parseMakeupPlan2025)
        └─ dataMerger.ts mergeAllData() → SchoolRecord[]  (按校名+extractBaseName 模糊合并)
             └─ filterEngine.ts → 过滤后结果
                  └─ components 渲染
```

- **核心分数数据（第三/四批录取、学校库、控制线、协和名额）内嵌在 `rawData.ts`**，不从 `database/` 运行时读取。
- `database/school_files/*.md`（学校深度报告）与 `other_infos/*` 通过 `vite.config.ts` 插件生成的 JSON 列表在运行时 fetch。
- 改原始数据：若改的是核心分数，需同步更新 `rawData.ts` 内嵌字符串（而非仅改 `database/` 下的 MD）；若改的是学校深度报告，改 `database/school_files/` 下对应 MD 即可。

### 5.3 Vite 自定义插件（`vite.config.ts`）

| 插件 | 作用 |
|------|------|
| `generateSchoolFilesList` | dev 中间件 + build 时写 `public/school-files-list.json` |
| `generateOtherInfosList` | dev 中间件 + build 时写 `public/other-infos-list.json` |
| `copyStaticAssetsPlugin` | build 后把 `school_files/*.md` 与 `other_infos/` 复制进 `dist/` |

新增需运行时 fetch 的数据目录时，需在此三处插件逻辑中同步扩展，否则线上缺失数据。

### 5.4 已知数据缺陷（见 `audit_report.md`）

- **[FAIL] 补录数据完全丢失**：`parseMakeupScores` 要求 `学校编码`，但 `补录分数-2025.md` 无该列，导致所有补录记录被跳过。修复需移除对 `code` 的强制检查。
- **[WARN] 2026 控制线名称映射不全**：`clNameMap` 仅硬编码约 24 所，其余靠精确名匹配，括号差异可能导致 `xieheControlLine2026` 关联失败。
- **[WARN] `districtQuota` 与 `provinceQuota` 同值**：`parseXieheQuota2026` 将同一数同时赋两字段；当前显示仅用 `provinceQuota`，暂无影响。
- **[WARN] `extractBaseName` 去括号模糊匹配**：同校不同校区去括号后同名（如六中海珠/从化），当前靠完整名优先匹配，风险可控。

改动数据解析逻辑时，先读 `audit_report.md` 确认是否触碰已知缺陷点。

---

## 6. 品牌与视觉规范（品牌底座，不可妥协）

权威参照：`README.md` 第六节 + 第九节 + 门户 `index.html` 实现。

### 6.1 色彩（CSS 变量，必须复用）

```css
--xb-deep:#0a0a1a; --xb-mid:#1a1030; --xb-light:#2d1b4e;
--xb-accent:#64b4ff; --xb-accent2:#80c0ff;
--xb-glow:rgba(100,180,255,0.35); --xb-border:rgba(100,180,255,0.2);
--xb-text:#e8ecf4; --xb-text-dim:rgba(200,210,230,0.6);
```

### 6.2 字体

- 标题 `Noto Serif SC`，正文 `Noto Sans SC`，Google Fonts 加载。

### 6.3 Logo 组件（直接从门户 `index.html` 复制完整方案）

- 类名 `.xbrain-brand`（渐变背景 + 多层阴影 + `12px` 圆角）。
- 完整 SVG（含 `defs` 渐变、`xb-ring`、`xb-ttai`、`xb-bar-group` 等全部元素）。
- 文字 `.xbrain-text`：`<span>X</span>Brain`，`font-weight:800`。
- 滚动淡出 JS：`requestAnimationFrame` 节流 + `opacity = 1 - ratio*0.7`。
- 跳转：门户首页 `href="#top"`；子站点 `href="../index.html"`（按层级调整 `../`）。

**禁止：** 自行简化 Logo SVG；用 `border-radius:100px` 胶囊形；改品牌文字或门户 `href="#top"`。

### 6.4 圆角层级

容器/卡片 `12px` → 导航/标签/表格 `8px` → 小内嵌元素 `4px`。

### 6.5 设计增强

品牌底座之上可自由发挥布局/动效/视觉层次（可用 `frontend-design` 技能），但不得破坏色彩、字体、Logo 三项底座。

### 6.6 流程图分支标识（如产出含流程图的页面）

✅是/❌否/➡️继续/🏁结论/⛔终止，配色绿/红/蓝/绿/红；详见 `README.md` 第 9.7 节模板。

### 6.7 Logo 注入与 IP 规范文件

为已完成的 HTML 页面叠加 XBrain Logo，**必须依据项目内 IP 规范文件 `brand/XBRAIN-LOGO-IP.md`**，该文件是 Logo 组件的**单一来源（Single Source of Truth）**，含完整三段代码模板（CSS / HTML / JS）、插入位置规范、硬性规则与注意事项。注入时直接复制该文件代码，勿手写简化。

**触发场景（用户说以下任一即按 IP 规范文件执行注入）：**
- "给这个 HTML 加上 XBrain Logo"
- "叠加 XBrain"
- "让 HTML 带上 XBrain"
- 完成 HTML 编制后要求应用 XBrain 品牌标识

**执行时必须先读取 `brand/XBRAIN-LOGO-IP.md`**，按其 §三 插入位置规范、§四 代码模板、§五 硬性规则、§八 操作流程执行。本节仅列要点速查，完整内容以 IP 规范文件为准：

- 三段代码插入位置：CSS→`</style>` 前 / HTML→`<body>` 后第一子元素 / JS→`</body>` 前。
- 硬性规则：`href="#top"` + **首屏 `id="top"` 锚点**；品牌文字 `<span>X</span>Brain`；子站点 `href` 按层级改 `../index.html`；SVG 不得简化；禁用 `border-radius:100px` 胶囊形。
- 可选配置：淡出系数 `ratio*0.7`、`scrolled` 阈值 `vh*0.3`。
- 注意：无滚动条时 Logo 不透明为预期行为；注入前查类名冲突；移动端兼容代码勿删。

**与 §6.3 的关系：** §6.3 为规范概述，IP 规范文件为完整代码来源，二者同源；冲突时以 `brand/XBRAIN-LOGO-IP.md` 为执行基准。

### 6.8 Logo 复用规范（自动注入流程）

**用途：** 在任意 HTML 页面中复用 XBrain Logo 组件，包含固定定位、毛玻璃背景、SVG 图标和滚动淡出交互。

**自动注入（推荐）：** 编制完 HTML 后，直接对 AI 说以下任意一种即可自动触发注入：
- "给这个 HTML 加上 XBrain Logo"
- "叠加 XBrain"
- "让 HTML 带上 XBrain"

AI 将自动读取 HTML 文件，按规范插入 CSS、HTML 结构和 JS，无需手动复制代码。**完整代码模板与自动注入流程见 `brand/XBRAIN-LOGO-IP.md`。**

**固定规则（不可更改）：**


| 配置项 | 位置 | 说明 |
|--------|------|------|
| 跳转链接 | HTML 中 `href="#top"` | **固定为 `#top`**，点击回到当前页面顶部。页面首屏元素须添加 `id="top"` 锚点 |
| 品牌文字 | HTML 中 `.xbrain-text` | **固定为 `<span>X</span>Brain`**，不可修改 |

**可选配置：**

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 淡出强度 | JS 中 `ratio * 0.7` | 增大系数则滚动时更快变淡，减小则更慢 |
| 触发阈值 | JS 中 `scrollY > vh * 0.3` | 修改为 `0.5` 则滚动半屏后才切换 `scrolled` 样式 |

---

### 6.9 移动端优先设计（全局，所有新页面必遵循）

**适用范围：** 本项目所有 HTML 页面（门户首页、各子站点静态页、query-system 组件等），**设计阶段即以移动端为首要目标**，桌面端在此基础上增强。

**强制项（新页面必过）：**

| # | 规则 | 说明 |
|---|------|------|
| ① | **`viewport` meta** | 每页 `<head>` 必须含 `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">`，禁止 `user-scalable=no` |
| ② | **响应式断点** | 基础样式以 320–480px 为起点，用 `@media (min-width: 640px)` / `768px` / `1024px` 逐步增强桌面端；不要反过来"桌面写完再缩" |
| ③ | **触摸目标 ≥44px** | 所有可点击元素（按钮、链接、关闭图标等）在 ≤640px 视口下最小 44×44px；手机端操作区不得遮挡、不得过密 |
| ④ | **安全区域避让** | 固定/绝对定位元素（如光箱关闭按钮、浮层导航）须加 `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` 避让 iPhone 刘海屏与小白条 |
| ⑤ | **字体不小于 16px** | 移动端正文最小 16px，防止 iOS 在 `<input>`/文本区聚焦时自动缩放 |
| ⑥ | **触摸手势** | 图片轮播/光箱/画廊等交互组件须支持触摸滑动（`touchstart` + `touchend` 方向判断）；重要操作需有双击回退/重置 |

**参照实现：** `四季景点/花都周末家庭游/index.html` 的游记 lightbox 段——含 viewport meta、`@media (max-width:640px)` 重写按钮布局、`touchstart`/`touchend` 左右滑+下滑关闭、`env(safe-area-inset-*)`、提示语同时覆盖桌面/移动操作。

**验证（新页面提交前）：**
- [ ] 在 Chrome DevTools Device Toolbar 中选 iPhone SE（375×667）逐段滚动，布局无溢出、按钮可单手点按、文字不溢出
- [ ] 光箱/模态层/浮层在 iPhone 刘海屏上关闭/切图按钮不被硬件遮挡
- [ ] 图片/表格在小屏上不超出视口、不强制水平滚动（除不得已的宽表格可 `overflow-x:auto`）

---

## 7. 认证系统（XBrainAuth v1.2）

- 模块：`brand/auth.js`，`</body>` 前加载，`XBrainAuth.init({level, configPath, ...})`。
- 主站 `level:'main'`，读 `/auth.config.json` 的 `main` 段；子站点 `level:'sub'`，读各自 `auth.config.json` 顶层字段，缺省回退 `defaults` 段。
- 机制：SHA-256 比对密码哈希 → localStorage 会话（按 `sessionDuration`/`sessionUnit`）→ 失败计数锁定。
- 主站密码 `xbrain2026`，会话 1 天，5 次失败锁 15 分钟。
- 改密码/会话策略改 `auth.config.json`；改 UI 文案改其 `ui` 段。**勿改 `auth.js` 除非确有必要。**
- 页面加载即隐藏 body 防闪烁（`html.xbrain-auth-hidden`），认证通过后 `revealContent()`。

---

## 8. 脚本生成页面约定（禁止手改）

### 8.1 健康/妈 子站点

- 生成脚本：`健康/妈/generate_index.py`，输出 `健康/妈/index.html`。
- 数据源：目录下所有符合 `YYYYMMDD-项目-医院.md` 的报告；**排除** `个人健康档案与深度医学分析报告.md`、`p.report.md`、`README.md`（任何非报告 `.md` 都必须加入 `EXCLUDE_FILES`，否则会被 `parse_filename` 解析成垃圾条目并污染年份过滤器，历史上 `README.md` 曾生成 `data-date="READ-ME-"` 条目）。
- 识别标志：文件头注释 `<!-- GENERATED BY generate_index.py - DO NOT EDIT -->`。
- **更新流程（强制四步，缺一不可）**：

  ```powershell
  cd 健康/妈
  python generate_index.py        # 1. 重新生成页面（发现孤儿图会写 orphans.json）
  # 2. 同步更新 个人健康档案与深度医学分析报告.md（九项清单见 健康/AGENTS.md §3.5）
  python check_consistency.py     # 3. 一致性守卫，退出码 0 方可继续
  # 4. git push
  ```

- **一致性守卫 `健康/妈/check_consistency.py`**：校验汇总报告中的派生统计（报告总数 / 覆盖时间止月 / 时间线标题份数 / 最新报告已入线 / 患者年龄 / 文末份数）与实际报告文件是否一致，并检查 `index.html` 无非法条目日期。**FAIL 时禁止推送**。
- **禁止**直接编辑该 `index.html`（会被覆盖）；**禁止**重写生成逻辑（脚本已存在，直接调用）。
- 新增排除文件需求 → **同时**改 `generate_index.py` 与 `check_consistency.py` 的 `EXCLUDE_FILES`（两处必须一致）。

### 8.2 通用识别法

目录中存在 `generate_*.py` 且 HTML 头部有 GENERATED 注释 → 视为脚本生成页，改内容须改源数据/脚本后重生成，不手改 HTML。

### 8.3 生活点滴 子站点（纯记录型 · 双生成器架构）

`生活点滴/` 是随拍照片+视频的多级画廊，记录目录为 `生活点滴/<YYYY>/<MMDD>/`（两级深），每目录含 `README.MD` + 媒体。存在 **两个生成器**，职责不同、不可混用：

- **`src/gen_travelogue.py`（0816 专用原型）**：写死了 0816 泮塘文案，且要求 README 含 `## 实录` / `### HH:MM` 时间戳结构，才能产出「实录章节 + 人文背景」精修页。**只**为带这种结构的精修记录服务（目前仅 `2026/0816`）。⚠️ 用它生成其他简单随拍记录会失败或内容错乱，**切勿**调用。
- **`src/gen_life_record.py`（通用记录页生成器）**：复用 `src/site-template-travelogue.html` 单一来源模板，处理**无 `## 实录` 结构**的简单随拍记录（date + 引言 + 媒体画廊 `.media-block` + `<video>` 视频），并内置占位符残留校验（剥离 HTML 注释后再查 `{{...}}`）与 section 平衡校验（剔除 CSS 注释里的字面 `<section>` 再计数）。用法：
  - `python src/gen_life_record.py <YYYY>/<MMDD>` → 生成该记录 `index.html`；
  - `python src/gen_life_record.py gallery` → 重建 `生活点滴/index.html` 画廊（汇入全部记录，新→旧，并保留手搓页标题）。
  - **画廊手搓标题保留机制**：`gallery` 子命令通过 `extract_existing_titles()` 读取现有画廊 HTML 中已存在的卡片标题/简介，重跑时**会保留**这些手搓文案（不会回退到生成器默认标题如「高一军训」）。因此可安全重跑 `gallery` 来纳入新记录，不必担心覆盖已精修的卡片；但若某卡片标题是从生成器默认继承的，重跑仍会沿用旧默认——需先手改再重跑。

**手搓精修页清单（禁止通用生成器重盖）**：`2026/0816` 是手搓精修页，含泮塘专属内容与「人文背景」section；`2026/0823` 也是手搓精修页（通用生成器默认「高一军训」主题与该记录「暑假唱K」错位，且会把媒体一股脑塞进单 blob、无法按时序分章）。两者通用生成器都会覆盖丢失其精修内容，新增记录时**只对新目录跑 `gen_life_record.py`，绝不重跑手搓页**。如未来再出现手搓页，在此追加记录。

**媒体格式处理（HEIC）**：iPhone 直出的 `.heic` 浏览器无法显示。本机**无 ImageMagick / ffmpeg**，HEIC 解码用系统 Python 3.10（`C:/Users/km/AppData/Local/Programs/Python/Python310/python.exe`，已 `pip install pillow-heif`）；Managed Python 3.13 缺 PIL。处理法：用 `pillow-heif` 把 `.heic` 转 `.jpg`（最长边 1600、Q82 控制体积），`.jpg` 与原始 `.heic` 同目录共存（原档留底）；页面只引用 `.jpg`。⚠️ 勿用 `gen_life_record.py` 之类的生成器去「重命名」hero（曾误把 `index.html.jpg` 当封面），应显式复制为 `index.jpg` 并删冗余 `*.html.jpg`。

**跨年媒体嵌入（单一来源，禁止复制）**：从某记录页引用同仓库其他年份的媒体（如 0822 嵌入 2023 军训）须用 `../../<YYYY>/...`（记录页在两级深目录，须两级上跳到 `生活点滴/` 再进目标年），而非 `../<YYYY>/`。媒体一律相对路径引用，**禁止把大视频/图片复制到本记录目录**（避免重复入库、Netlify 体积膨胀）。此方式可把旧记录拼成「前后回望」叙事（如 0822 的「三年之变」：2023 初中军训 + 训弟视频 → 落差 → 2026 高一军训，基调正向积极、带警醒、贯穿兄弟情）。

**⚠️ 媒体时序铁律（按文件名时间戳归属章节，禁止跨时段串图）**：每张图/视频的文件名都带拍摄时间戳（如 `…_190419.jpg` = 19:04:19）。**编排章节时必须按时间戳把媒体放进对应时段章节**，绝不可把后时段素材塞进前时段章节。反例：章「15:20 等位」误插了 `走-兄弟合影-IMG_20260823_190419.jpg`（19:04 散场）与开唱后现场图 → 时序错乱。正确做法：等位章节只放 `等-202608231520.jpg` 一张；散场合影只在 19:04 章出现。生成页后务必逐章核对「章内媒体时间戳 ⊆ 章时间范围」。

**⚠️ 文案忠实铁律（不虚构时段起点、不夸大连续性）**：记录页文案须忠实于事实，不得为叙事流畅而失真：
- **照片未记录的时段不能写成「开始」**：若事实是 15:30 入场即开唱、只是镜头从 17:36 才举起，则不得写「厢一开沙先拿麦」暗示唱从 17:36 开始；应显式标注「15:30 入场即唱 · 17:36 留影」并说明镜头起点。
- **不得把随意哼唱写成连轴**：若全程断断续续、谁想唱接过去，不得写「一首接一首」「麦克风一拿就不想放」式的连轴暗示；应写「断断续续、并不连轴」「挑了几首慢慢唱」。
- 文案扩展必须以 `README.MD` 底稿与文件名事实为锚，宁可平实也不能编造节奏。

**同步工作流（新增/更新记录后）**：① 把媒体 + `README.MD` 放入 `生活点滴/<YYYY>/<MMDD>/` → ② `python src/compress_media.py --dry-run 生活点滴/<YYYY>/<MMDD>` 预览压缩收益，确认后去掉 `--dry-run` 实际压缩（媒体压缩服务：图片重编码去 EXIF、视频统一 H.264 CRF20+faststart，仅更小才替换，可用 `--backup-dir` 留底；用法与参数见 `src/README.md` §10；HEIC 先按上文 pillow-heif 转 jpg 再压缩）→ ③ `python src/gen_life_record.py <YYYY>/<MMDD>` 生成页 → ④ `python src/gen_life_record.py gallery` 重建画廊 → ⑤ 校验（无 `{{` 残留、section 平衡、媒体路径解析，`git ls-files` 确认入库）→ ⑥ 提交并推送。

**⚠️ git 推送纪律（分支引用碰撞处置）**：提交前先 `git fetch origin home` 并比对 `git merge-base HEAD origin/home`。若**两分支无公共祖先**（`merge-base` 为空，且 `origin/home` 含与本仓库无关的 commit，如陌生项目内容），属**分支引用碰撞**，**禁止** `git push --force` / `--force-with-lease` 覆盖远端——可能毁掉远端历史。此时应：停止推送、向用户报告远端异常、由用户确认 `origin/home` 的真实意图（是错误推送的另一项目 / 需换分支 / 还是可安全强推）后再决定。本地 commit 已落盘即安全，不丢工作。

---

## 9. 部署（Netlify）

- `netlify.toml`：`command="npm run build"`，`publish="."`（发布整个仓库根）。
- SPA 路由重定向已为 `query-system` 配置；新增 SPA 子站点须追加对应 `[[redirects]]`。
- 推送即部署：`git push` → Netlify 自动 `npm run build` → 发布。
- 纯静态子站点无需 build，直接随仓库发布。

### 9.1 静态资源上线核查（图片 / 封面不显示排查清单）

纯静态子站（类型 C，如四季景点）的图片、封面、HTML 都靠 `git` 发布——**未进 `git index` 的文件 Netlify 部署后必 404，且按封面规则（背景图加载失败不触发 `onerror`）会静默空白、无任何控制台报错**，极易误判为"标记 / 架构问题"。排查"图不显示"按以下顺序，不要先改代码：

1. **先确认文件是否真入库**：`git ls-files --error-unmatch <path>` 命中即已跟踪；或 `git ls-tree -r origin/<branch> <dir>` 直接看远端是否已含（比看 `git status` 快）。
2. **`git status` 只显示相对 HEAD 的变化**：已 `commit` 的图片在 status 里不出现是**正常**的，不是漏提。验证"是否入 git"用 `git ls-tree -r origin/<branch> <dir>`（远端）或 `git ls-tree -r HEAD <dir>`（本地 HEAD），而非看 status。
3. **文件名逐字对齐**：HTML `src`/`href` 引用的文件名必须与磁盘 + git 树**逐字**一致（含大小写、空格、`copy`/`1` 等序号）。用户常把 `image copy.png` 改名成 `image1.png` 而 HTML 未同步 → 404。改图名后务必同步 HTML，并 `git add` 新名 + `git rm --cached` 旧名。
4. **导航与子站必须同提交**：改子站同时改了 `四季景点/index.html` 的 `SITES` 条目（封面 / 卡片升【已实现】），若只提交子站目录、漏提交导航文件 → 导航改动丢失、线上封面 / 卡片不生效。提交时把导航文件与子站目录一起 `git add`。

---

## 10. 约束与陷阱（Gotchas）

- **`rawData.ts` 是核心数据真源**：改 `database/` 下 MD 不会自动反映到查询系统分数列，须同步改 `rawData.ts` 内嵌字符串。
- **本地辅助脚本已删除**（2026-09 重构）：`query-system/publish.ps1`/`start.bat`/`ngrok.bat` 不再存在，权威流程是根 `npm run build` + `git push`。
- **认证遮罩不保护静态文件直链**：Netlify `publish="."` 发布整个仓库，XBrainAuth 只是前端 UI 遮罩，任何入库文件都可被直链下载。敏感档案（`健康/妈/MR-无需建立子站点/` 医疗影像 zip）与 AI 工作记忆（`.workbuddy/`）已于 2026-09 重构移出 git（本地保留，`.gitignore` 防回填）；**今后任何敏感/隐私文件不得入库**。
- **入库视频必须 H.264（avc1）+ faststart**：iPhone「高效」HEVC(hvc1) 视频在 Chrome/Edge/多数安卓浏览器无法播放（2026-09 重构追补：37 个存量 HEVC 已批量转码为 H.264）。入库前用「兼容性最佳」导出，或经 `imageio-ffmpeg`（系统 Python 3.10 自带静态 ffmpeg）转码；回归套件 S7 编码守卫将拦截违规入库。单文件 ≤100MB（GitHub 硬限）。也可直接用媒体压缩服务 `python src/compress_media.py <目录>`——输出恒为 H.264(CRF20)+faststart 且音轨保留（已实测验证），见 §8.3 工作流 ②。
- **SPA `base` 必须为 `'./'`**：否则相对路径部署资源 404。
- **图片用相对路径**：子站点图片路径错乱多因未用相对路径或 `base` 配置错误。
- **dist/node_modules 禁提交**：已在 `.gitignore`。
- **补录数据已知 FAIL**：改动 `parseMakeupScores` 前先读 `audit_report.md`。
- **校名匹配脆弱**：改 `extractBaseName` 或 `clNameMap` 影响全局合并，须跑全量测试。
- **认证配置加载失败有兜底**：`auth.js` 会渲染错误遮罩并提供刷新；勿删该兜底。
- **中文目录名**：`健康/四季景点/采购与维护` 为中文路径，shell 命令与 href 须正确处理（PowerShell 用单引号包裹）。
- **改动后必跑测试**：`query-system` 有 6 个测试套件，含 regression，回归测试是数据管线改动的安全网。
- **移动端灯箱禁用 `body.style.overflow='hidden'` 锁滚动**：iOS Safari 上给 `body` 设 `overflow` 会让 `position:fixed` 的灯箱遮罩锚定到 `body` 盒子（页面有横向溢出时被撑宽），表现为「点开灯箱黑屏、要把屏幕拖到右边才看到」。改用遮罩自身 `touch-action:none` + `overscroll-behavior:contain` 阻止手势穿透。铁律与代码模板见 **§14**。
- **CSS 变量声明行尾必须有分号 `;`**：`:root` 块内任一变量漏 `;`，CSS 解析器会把下一行变量当作本行值的一部分吞掉，导致下一变量未定义、`var()` 回退到浏览器默认黑色 → 全页文字在深色背景上完全不可见。生成器（`gen_travelogue.py`）做字符串替换换肤时，**替换值必须保留结尾 `;`**。详见 `home/src/README.md` §7.1。
- **深色主题文字颜色用不透明 hex**：`--text` / `--text-dim` / `--text-hint` 禁止 `rgba(...,0.X)` 透明度写法——半透明文字在深色背景上视觉等同"深色文字"，用户报"看不见"。正文段落（`.section-desc` / `.log-chapter p` / `.food-card p` / `.tips-box li` 等）统一用 `var(--text)`（全亮），不用 `var(--text-dim)`。详见 `home/src/README.md` §7.2–§7.3。
- **README.MD 是叙事底稿，不是页面内容源**：`## 简介` 内若夹带 ```` ```markdown ```` 围栏长文（如背景文章），生成器**剥离**该围栏块、不当作页面内容显示（绝不"开篇照搬"原样 markdown）。章节切割由 README `### HH:MM` 锚点 + 媒体文件名时间戳共同决定（对齐 `四季景点/AGENTS.md` §14.5/§14.6）。详见 `home/src/README.md` §3.5。
- **人文背景（`#culture`）由生成器自动产出**：README `## 简介` 的 ```` ```markdown ```` 围栏长文会被 `gen_travelogue.py` 的 `build_culture_section()` 重组为「人文背景」叙事 section（按 `##` 拆卡、`##` 段数 >4 自动合并、📌 提取为 `.tips-box`、配图按标题关键词匹配），**自动插在 `#log` 与 `#food` 之间并加 nav 链接**；无围栏长文则不出该 section。⚠️ 生成器剥离 H1 正则必须用 `r'^#[^#].+$'`（只匹配 `#` 非 `##`），误用 `r'^#.+$'` 会删掉所有 `##` 标题导致 section 为空。详见 `home/src/README.md` §9。

- **空格文件名 `%20` 二次编码 → 404**：HTML `src`/`href` 里写**原始空格**（如 `src="石燕岩/image copy.png"`），浏览器会自行编码为 `%20`；若手写 `%20` 会被浏览器再次编码成 `%2520` → 服务端收 `%2520` 解析失败 404。中文 / 空格路径一律写原始字符，由浏览器编码。
- **沙箱 Bash 文件系统 / 索引快照跨命令可能漂移**：本 harness 的 Bash 环境在多次命令之间，单次 `os.walk` 看到的文件、`git status`/`git add` 的暂存快照，可能与真实 git 对象库不一致（曾出现"上条命令加的文件夹下条命令消失""图片名在快照里被改写"）。**权威来源是 git 对象库**——用 `git ls-tree -r HEAD` / `git ls-tree -r origin/<branch>` / `git rev-parse HEAD` 核对，不要只信单次 `os.walk` 或单次 `git status`。提交时把"暂存 + 提交 + 推送"放进**同一条 Bash 命令**更稳。
- **生活点滴 双生成器不可混用**：`src/gen_travelogue.py` 是 `2026/0816` 专用原型（写死泮塘文案、要求 `## 实录`/`### HH:MM` 结构），**只**生成 0816；其他简单随拍记录用 `src/gen_life_record.py`（`gen_life_record.py <YYYY>/<MMDD>` 生成单页、`gen_life_record.py gallery` 重建画廊）。误用 `gen_travelogue.py` 生成简单记录会内容错乱或丢字段。详见 §8.3。
- **生活点滴 手搓精修页禁止通用生成器重盖**：`2026/0816` 是手搓精修页，通用生成器 `gen_life_record.py` 会覆盖丢失其泮塘专属内容；新增记录时只对新目录跑生成器，绝不重跑手搓页（手搓页清单见 §8.3）。
- **生活点滴 跨年媒体引用深度**：记录页在 `生活点滴/<YYYY>/<MMDD>/`（两级深），跨年引用同仓库其他年份媒体须用 `../../<YYYY>/...`，而非 `../<YYYY>/`——路径少一级会 404。媒体一律相对路径单一来源引用，禁止复制大文件到本记录目录。详见 §8.3。
- **生活点滴 大视频入库**：随拍视频常 50MB+，务必 `git add` 入库（GitHub 仅给 size 警告不拦截），未入库 → Netlify 404（见 §9.1）。

- **grade-insight 数据双轨不可混淆**：日常录入走 localStorage（设备本地，不进 git），备份/多设备同步走「导出 data.js 快照 → 手动替换 `grade-insight/js/data.js` 的 `GRADE_SNAPSHOT` → 提交」。快照提交进 git 即明文入库（git 历史不受站点密码保护），须用户自行确认隐私接受度。分析层禁止直接比较原始分——每场考试满分可不同，必须走得分率/排名百分位/相对均分三重归一。详见 `grade-insight/AGENTS.md`。

- **导航首页与子站目录须同一次提交**：见 §9.1 第 4 条。

---

## 11. 任务验证清单（harness 验证门）

按任务类型在交付前逐项核对。

> **通用 HTML 规范**：凡涉及 HTML 页面（门户首页、各子站点静态页、query-system SPA 页等），须额外遵循 **§13 页内锚点链接规范**——交叉引用可点击、每章返回顶部、URL 显式带 `#片段`、支持深链。该规范为全仓库通用强制项，新增/改动任何 HTML 都需满足。

### 11.1 改动 query-system 源码/数据
- [ ] `rawData.ts` 与 `database/` 数据是否一致（若涉及核心分数）
- [ ] `cd query-system; npm run lint` 通过
- [ ] `cd query-system; npm run test` 通过（含 regression）
- [ ] `npm run build`（根）通过，`dist/` 生成
- [ ] `npm run preview` 抽查页面渲染与数据
- [ ] 若改 `vite.config.ts` 插件，确认 build 产物含 `school-files-list.json`/`other-infos-list.json` 与复制资源

### 11.2 新增/改动纯静态子站点
- [ ] **`npm run test:repo` 全绿（链接完整性/品牌/生成页约定，见 `tests/README.md`）**
- [ ] 目录与 `index.html` 就位
- [ ] 嵌入完整 XBrain Logo（按 §6.7 引用 `brand/XBRAIN-LOGO-IP.md` 代码模板注入），`href` 层级正确
- [ ] 首屏元素已加 `id="top"` 锚点（IP 规范硬性要求）
- [ ] 门户首页 `.sites-grid` 已加卡片入口，href 正确
- [ ] 本地浏览器验证卡片→子站点→返回全链路跳转
- [ ] 移动端抽查（≤640px）布局与 Logo 不遮挡内容
- [ ] 触摸手势就位：光箱/轮播支持左右滑切图、下滑关闭（`touchstart`/`touchend`）
- [ ] 固定定位元素已加 `env(safe-area-inset-top/bottom)` 避让 iPhone 刘海屏/小白条
- [ ] 可点击元素在 ≤640px 下最小 44×44px，按钮不过密
- [ ] 移动端正文字号 ≥16px，图片/表格不溢出视口
- [ ] 页内交叉引用已改为可点击锚点（§13），无纯文本"详见/返回"死链
- [ ] 每个大章节结尾有"返回顶部"链接，点击后地址栏显式带 `#片段`（可深链分享）

### 11.3 新增/改动 SPA 子站点
- [ ] `vite.config.ts` 设 `base:'./'`
- [ ] 根 `package.json` build 脚本已串联该子站点
- [ ] `netlify.toml` 已加 SPA 重定向
- [ ] 门户卡片指向 `dist/index.html`
- [ ] 嵌 Logo
- [ ] `npm run build` 通过
- [ ] preview 验证，刷新不 404

### 11.4 改动脚本生成页（健康/妈等）
- [ ] 改的是源数据 `.md` 或脚本，而非 `index.html`
- [ ] 新增的非报告 `.md`（README/说明类）已加入两处 `EXCLUDE_FILES`
- [ ] 运行 `generate_index.py` 重新生成
- [ ] **`健康/妈` 须运行 `python check_consistency.py` 并通过（退出码 0）**；FAIL 禁止推送
- [ ] 深度汇总报告 `个人健康档案与深度医学分析报告.md` 的派生统计已同步（清单见 `健康/AGENTS.md` §3.5）
- [ ] `orphans.json` 的 `count` 为 0（无待生成解读报告的图片）
- [ ] 生成后 `index.html` 头部仍含 GENERATED 注释
- [ ] 浏览器验证新内容已渲染

### 11.5 改动认证/品牌
- [ ] 改 `auth.config.json` 后本地验证登录/锁定/会话
- [ ] 改品牌元素后多页面抽查 Logo 显示与跳转
- [ ] 未触碰 Logo SVG 简化、圆角胶囊化、品牌文字等禁止项

---

## 12. 术语表

| 术语 | 含义 |
|------|------|
| 门户首页 | 仓库根 `index.html`，卡片聚合入口 |
| 子站点 | 门户下的独立站点目录（A/B/C 三类） |
| 品牌底座 | 色彩+字体+Logo 三项不可妥协规范 |
| 数据管线 | rawData→mdParser→dataMerger→filterEngine→组件 的链路 |
| orphan 学校 | 仅出现在录取分数表但不在学校库的学校，由 `dataMerger` 推断批次 |
| 脚本生成页 | 由 `generate_*.py` 产出、禁止手改的 HTML |
| harness | 本文件定义的「命令流 + 范式 + 验证门」工程化作业框架 |

---

## 13. 页内锚点链接规范（通用，所有 HTML 必遵循）

长图文/多章节 HTML 页面必须有"可跳转"的内部导航，避免读者在大段内容里迷路，且每段都能生成可分享的深链 URL。本规则适用于仓库内**所有 HTML**（门户首页、各子站点静态页、query-system SPA 页等）。详细实现见 `四季景点/花都周末家庭游/index.html` 的「页内锚点链接」CSS 段与 `initAnchors` JS。统一规则：

- **正文交叉引用必须可点击**：页面内"详见 XX""返回 XX"等引用不能写成纯文本，必须改为 `<a class="in-doc-link" href="#目标锚点">文字</a>`，跳转到对应章节或元素。
- **被引用元素要带 `id`**：目标章节/卡片须有 `id`（如 `id="culture-yuanxuan"`、`id="hours"`），锚点精确指向具体元素而非整节；跳转体验更准。
- **每个大章节结尾加"返回顶部"**：在章节闭合前插入 `<div class="section-backtop"><a href="#top">↑ 返回顶部</a></div>`。页面首屏须有 `id="top"`（门户首页/子站首屏已有，IP 规范硬性要求），形成"读到底一键回顶"的闭环。
- **URL 必须显式带片段（#hash）**：锚点点击不能只滚动、不更新地址栏。统一用一段 JS 接管所有 `a[href^="#"]`（`initAnchors`）：`e.preventDefault()` → `target.scrollIntoView({behavior:'smooth'})` → `history.pushState(null,'',hash)` 把 `#片段` 写进 URL。点击后地址栏可见 `index.html#culture-stone`，且能把带 `#片段` 的链接复制给别人直接深链到该章节。**注意**：在 WorkBuddy 预览面板（iframe 渲染）里，片段只更新 iframe 内部地址、顶部预览地址栏不变属正常；用浏览器直接打开或部署到 Netlify 后顶部地址栏即显示片段。
- **打开即定位（深链）**：页面加载时若 `location.hash` 非空，监听 `load` 后 `setTimeout(...scrollIntoView, 450)` 自动滚到该章节，保证分享链接一打开就到正确位置。
- **跳转不被吸顶导航遮挡**：给 `section[id]`、被跳转的目标元素加 `scroll-margin-top: 80px`（吸顶导航高度余量），避免锚点落点被固定导航盖住。
- **样式复用**：`.in-doc-link`（强调色 + 下划线）、`.section-backtop`（居中圆角描边按钮、hover 高亮）的 CSS 直接复用 `四季景点/花都周末家庭游/index.html` `<style>` 内的「页内锚点链接」段，新增页面无需重新设计。
- **验证（发布前必过）**：① 所有 `in-doc-link` 的 `href` 都能在页面内找到对应 `id`（无死链）；② `section-backtop` 数量 = 大章节数；③ 点击任一锚点后地址栏出现 `#片段` 且平滑滚动到位、无吸顶遮挡；④ 直接以 `index.html#某id` 打开能自动定位。

> 目的：让分散在页面各部分的信息能**双向跳转**——从列表/时间轴跳到详解，读完详解一键回顶部继续浏览，且每段都可生成可分享的深链 URL（"方向链接"）。本规范由 `四季景点/AGENTS.md` §13.7 经验提炼并上升为项目级通用强制项。

---

## 14. 移动端适配与灯箱（lightbox）规范

> 由 `四季景点/花都周末家庭游/index.html` 的游记灯箱实践提炼，已在 iOS Safari / 移动端 Chrome / PC 真机验证。凡仓库内任何含图片画廊、游记、图文详情页的子站点（四季景点、健康、采购与维护、学习与成长等）均须遵循。与 §11.2 移动端验证清单互为补充。

### 14.1 适用范围
- 任何 `position: fixed` 全屏遮罩：灯箱大图、图集瀑布流（`.waterfall-overlay`）、弹层、菜单。
- 任何 `background-image` 缩略图网格 / 图文时间线（如 `.travel-log-*`）。
- 完整可运行实现见 `四季景点/花都周末家庭游/index.html` 的 `.lightbox-*` / `.waterfall-*` / `.travel-log-*` 段，新增页面可整段复制后改路径。

### 14.2 不可妥协的铁律
1. **禁止用 `document.body.style.overflow = 'hidden'` 锁背景滚动。** iOS Safari 上给 `body` 设 `overflow` 会让 `position:fixed` 遮罩不再锚定视口，而是锚定 `body` 盒子；页面一旦存在横向溢出（`overflow-x:hidden` 也救不了），`body` 被撑宽，遮罩 `inset:0` 居中后即整体右移，表现为「点开灯箱黑屏、要把屏幕拖到右边才看到」。PC 端走另一渲染路径不受影响，故只在移动端暴露。→ 改用遮罩自身的 `touch-action: none` + `overscroll-behavior: contain` 阻止手势穿透（遮罩不透明，背景滚动视觉上不可见，无需锁 body）。
2. **遮罩定位必须显式写满**：`position: fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%`。不要只写 `inset:0`（部分 WebView/老内核需要显式 width/height 才 100% 覆盖）。
3. **导航箭头必须明显且恒在可视区**：禁止用负 `left/right`（如 `-50px/-64px`）把箭头推出屏外——鼠标移到边缘才浮现的写法在移动端无解。用 ≥48px、带描边/辉光、半透明深色底的圆钮，贴在容器内侧（`left/right: 6~12px`），`z-index` 高于图片。
4. **移动端交互只信 `touch*` 事件 + `:active` 反馈**，不要依赖 `:hover`（触屏无 hover）。左右切换必须支持手势滑动，不能只靠点按钮。
5. **可点击元素 ≥44×44px**（iOS 最小触控目标），按钮不过密；移动端正文字号 ≥16px；图片/表格不得溢出视口（用 `100vw` / `max-width:100%` + `object-fit:contain`）。
6. **固定定位元素加 `env(safe-area-inset-*)`**：遮罩内 close/nav 距顶/底留 `env(safe-area-inset-top/bottom)` 余地，避让 iPhone 刘海/小白条。

### 14.3 灯箱遮罩 + 滚动锁（CSS）
```css
.lightbox-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  z-index: 210;
  background: rgba(5,5,15,0.97);
  display: none; align-items: center; justify-content: center;
  flex-direction: column; padding: 0.5rem;
  overscroll-behavior: contain;   /* 阻止手势穿透到背景 */
  -webkit-overflow-scrolling: touch;
  touch-action: none;             /* 关键：遮罩自身吞掉触摸，背景不滚动 */
}
.lightbox-overlay.active { display: flex; }
```
> 同类 `.waterfall-overlay`（图集瀑布流）用完全相同的定位与 `overscroll-behavior/touch-action` 写法（见源文件 `.waterfall-overlay`）。

### 14.4 导航箭头（明显、恒在屏内）
```css
.lightbox-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(10,14,32,0.72);
  border: 2px solid rgba(100,180,255,0.55);
  color: #fff;
  width: 52px; height: 52px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 18px rgba(100,180,255,0.4);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  transition: background .2s, box-shadow .2s, transform .12s;
  z-index: 5;                      /* 永远压在图片之上 */
}
.lightbox-nav svg { width: 24px; height: 24px; }
.lightbox-nav.prev { left: 6px; }   /* 容器内侧，不推出屏外 */
.lightbox-nav.next { right: 6px; }
.lightbox-nav:hover, .lightbox-nav:active {
  background: rgba(100,180,255,0.28);
  box-shadow: 0 0 26px rgba(100,180,255,0.65);
}
.lightbox-nav:active { transform: translateY(-50%) scale(0.92); }
```
> ❌ 废弃写法「`.lightbox-nav.prev { left: -50px }`」：箭头被推到屏外，移动端完全找不到。

### 14.5 图文网格移动优先（缩略图墙）
```css
.travel-log-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
@media (min-width: 640px)  { .travel-log-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; } }
@media (min-width: 1024px) { .travel-log-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; } }
```
- 缩略图用 `aspect-ratio` 固定比例（如 `4/3`），`background-size: cover`；点击 `onclick="openGallery('galleryName', index)"` 直跳对应大图。
- 竖向 hero 图用 `aspect-ratio: 9/16; max-height: 460px`。

### 14.6 灯箱 JS：openGallery 支持起始索引 + 图注
```js
var currentGallery = null, currentIndex = 0;

window.openGallery = function(name, startIndex) {
  currentGallery = galleries[name];
  if (!currentGallery) return;
  currentIndex = (typeof startIndex === 'number') ? startIndex : 0;
  updateLightbox();
  document.getElementById('lightbox').classList.add('active');
  // ⚠️ 不要设 document.body.style.overflow='hidden'（见 §14.2 第 1 条 iOS Bug）
};

function updateLightbox() {
  if (!currentGallery) return;
  var img = document.getElementById('lightboxImg');
  img.classList.add('switching');
  setTimeout(function(){ img.src = currentGallery.images[currentIndex]; img.classList.remove('switching'); }, 150);
  document.getElementById('lightboxTitle').textContent = currentGallery.title;
  document.getElementById('lightboxCounter').textContent =
    (currentIndex + 1) + ' / ' + currentGallery.images.length;
  var cap = document.getElementById('lightboxCaption');
  if (cap) cap.textContent =
    (currentGallery.captions && currentGallery.captions[currentIndex]) ? currentGallery.captions[currentIndex] : '';
  // 缩略图条 render（略，见源文件 updateLightbox）
}
window.nextImage = function(){ if(!currentGallery) return; currentIndex = (currentIndex+1)%currentGallery.images.length; updateLightbox(); };
window.prevImage = function(){ if(!currentGallery) return; currentIndex = (currentIndex-1+currentGallery.images.length)%currentGallery.images.length; updateLightbox(); };
```
- 图库数据结构：`{ title, images:[...], captions:[...] }`，`captions` 与 `images` 等长；`openGallery(name, idx)` 第二个参数让缩略图点哪张就从哪张开始。

### 14.7 移动端手势滑动切换（左右滑切图）
在大图区域监听 `touch*`，**横向位移 > 45px 且明显大于纵向**才判定为切换，单次滑动只触发一次：
```js
(function initSwipe(){
  var wrap = document.querySelector('.lightbox-img-wrap');
  if (!wrap) return;
  var startX = 0, startY = 0, tracking = false, swiped = false;
  wrap.addEventListener('touchstart', function(e){
    if (!currentGallery) return;
    var t = e.changedTouches[0];
    startX = t.clientX; startY = t.clientY; tracking = true; swiped = false;
  }, { passive: true });
  wrap.addEventListener('touchmove', function(e){
    if (!tracking || swiped) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      if (dx < 0) nextImage(); else prevImage();   // 左滑→下一张，右滑→上一张
    }
  }, { passive: true });
  wrap.addEventListener('touchend', function(){ tracking = false; }, { passive: true });
})();
```
- 用 `Math.abs(dx) > Math.abs(dy)` 区分横滑/竖滑，避免看长图上下滑时误翻页。
- 桌面端另支持键盘 `←/→/Esc`（已存在于 `keydown` 监听，无需新增）。

### 14.8 移动端滑动提示（推荐）
```html
<div class="lightbox-hint">← 左右滑动屏幕，或点按两侧箭头切换 →</div>
```
```css
.lightbox-hint { margin-top: .55rem; font-size: 12px; color: var(--xb-text-dim); text-align: center; }
@media (min-width: 640px) { .lightbox-hint { display: none; } }  /* 桌面端隐藏 */
```

### 14.9 验证清单（发布前必过）
- [ ] 移动端（真机或 DevTools 设备模拟，≤640px）点击缩略图 → 灯箱**直接满屏居中**，无需拖动。
- [ ] 灯箱内左右箭头明显可见、可点；点按两侧区域/箭头可切换上一张下一张。
- [ ] 移动端在图上左右滑动可切图；上下滑不误翻。
- [ ] 全文无 `document.body.style.overflow = 'hidden'`（或已确认不影响定位）。
- [ ] `<html>` 已 `overflow-x: hidden`（双保险，防横向溢出撑宽 body）。
- [ ] 内嵌 JS 经 `node --check` 通过；图片路径全部存在。
- [ ] 固定定位 close/nav 已避让 `env(safe-area-inset-*)`。

### 14.10 内联媒体画廊（.media-block）导航规范

> 与全屏灯箱（§14.1–§14.9）互补。`home/src/site-template-travelogue.html` 的 `.media-block` 组件采用**内联式**主图 + 缩略图条（非全屏灯箱），已内置以下功能，由 JS 动态注入，生成器无需改 HTML。功能规范与代码见 `home/src/README.md` §8 与模板 `<script>` 段。

| 功能 | 说明 |
|------|------|
| 首图自动解析 | 画廊中命名 `index.*` 的图优先作主图；缺失回退第一张 |
| **图片名称标题** | 主图上方动态插入 `.media-caption`，绑定 `thumb.alt`（取自文件名中文主题），每次切换同步更新——便于读者理解图片现场 |
| **左右切换** | 多图时动态创建 `.media-nav-btn` 圆形箭头（prev/next）覆盖在主图两侧；支持**点击**、**键盘 ← →**、**触摸滑动**（横向 >45px）三种方式循环切换 |
| 竖屏自适应 | `syncOrient()` 按图片真实方向给容器加 `.img-portrait` 类，避免裁切 |

**生成器责任**：确保每个 `<img>` 的 `alt` 属性包含有意义的中文场景描述（从文件名提取主题词），因为该 `alt` 会作为大图标题显示。

---

## 15. 子站点方案已完成印章

当出行方案已被**实际执行并补充游记**后，在方案选择按钮上打上红色圆形"已完成"印章，供读者快速识别哪些方案已经过实地验证。

### 15.1 核心规则

- **仅当方案已被执行 + 已有游记(含真实照片/行车记录)时才打标**。纸面规划不加印章。
- 印章为红色圆形、轻微倾斜的邮戳风格，用 `<span class="stamp">已完成</span>` 放在 `.plan-btn` 内。
- `.plan-btn` 必须设 `position: relative; overflow: hidden;`
- 印章自身 `pointer-events: none` 不干扰按钮点击，`user-select: none` 不可选中。

### 15.2 代码模板

```css
.plan-btn .stamp {
  position: absolute; top: 4px; right: 4px;
  width: 42px; height: 42px;
  border: 2.5px solid #e74c3c; border-radius: 50%;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.06);
  font-size: 11px; font-weight: 900;
  font-family: 'Noto Serif SC', serif;
  display: flex; align-items: center; justify-content: center;
  transform: rotate(-15deg);
  opacity: 0.72;
  pointer-events: none; text-align: center;
  line-height: 1.15; letter-spacing: 1px;
  user-select: none; z-index: 2;
}
@media (min-width: 640px) {
  .plan-btn .stamp { width: 50px; height: 50px; font-size: 13px; top: 6px; right: 6px; }
}
```

**HTML 用法**（在方案按钮末尾插入）：
```html
<button class="plan-btn" onclick="switchPlan('planXX')">
  <span class="plan-name">方案XX</span>
  <span class="plan-desc">简述</span>
  <span class="stamp">已完成</span>
</button>
```

详细规范见 `四季景点/AGENTS.md` **§5.7**。

---

*维护：当架构、命令、数据管线或规范发生结构性变化时，须同步更新本文件，保持与 `README.md` 一致。*
```

## 吸收的既有规则：grade-insight/AGENTS.md

> 吸收时间 20260927-112616 · 处置：标准入口原位续存。
> 本节为原文全量收录（无损），自 init 起以原文效力由 VAND 治理；与 VAND 范式冲突之处，VAND 优先。

```text
# grade-insight/AGENTS.md — 高中成绩跟踪分析

> 本文件为 `grade-insight` 子站的专属指引，补充根 `AGENTS.md` 的通用描述。
> 阅读优先级：**根 AGENTS.md > 本文件**。
> 本子站是全仓库唯一的**纯静态零构建交互应用**（原生 JS 单页），核心特殊性是 **localStorage 主存储 + data.js 快照同步** 双轨数据流。

---

## 1. 子站定位与技术栈

- **功能**：高一至高三校内历次考试成绩记录与智能分析（趋势/偏科/波动/相对位置/目标推演/中文简报）。不录中高考成绩，高考仅作目标参照。
- **技术栈**：原生 HTML/CSS/JS + 本地 vendored `echarts.min.js`。**无框架、无构建、无 npm 依赖**。
- **类型**：A（纯静态交互应用），不参与根 build，不占 `netlify.toml` 重定向（hash 路由天然深链）。
- **认证**：接入 XBrainAuth 子站模式（`auth.config.json`，初始密码 `grade2026`，可改配置文件；勿改 auth.js）。
- **隐私**：成绩属家庭隐私。站点页面有密码，但 git 历史不受密码保护——快照是否入库由用户自行决定。

## 2. 文件结构与职责（改代码前必读）

```
grade-insight/
├── index.html          # 外壳：Logo（按 brand/XBRAIN-LOGO-IP.md 注入）/Tab/视图容器/弹层
├── css/style.css       # 品牌变量+组件+移动端优先
├── js/data.js          # GI_DEFAULTS 配置 + GRADE_SNAPSHOT 快照（种子/同步源）
├── js/store.js         # localStorage CRUD、导入导出、校验（xbrain_grade_insight_v1）
├── js/analysis.js      # 分析引擎（纯函数，不碰 DOM）
├── js/charts.js        # ECharts 封装（品牌主题）
├── js/app.js           # hash 路由 + 六视图渲染 + 表单/弹层
├── vendor/echarts.min.js
└── auth.config.json
```

脚本加载顺序固定：`data.js → store.js → analysis.js → charts.js → app.js`（全部经典 script、全局命名空间 `GI_DEFAULTS / GRADE_SNAPSHOT / GIStore / GIAnalysis / GICharts / GIApp`）。

## 3. 数据模型与跨考试归一（核心）

- exam：`{id(日期+名称), name, date, term, type, note, subjects:[{key, full, score|null, avgClass?, avgGrade?, rank?, rankSize?, level?}], totalRank?, totalRankSize?}`。`score=null` 表缺考/未考，不进数值分析。
- **每场考试每科满分可不同**（如月考数学 120、期末 150），分析层统一三重归一：得分率（score/full）、排名百分位（(1-rank/size)×100）、相对均分差（个人得分率−年级/班级均分得分率）。**禁止**在任何分析逻辑里直接比较原始分。
- 科目配置存在 state.subjects（快照携带），`GI_DEFAULTS.subjects` 仅作导入兜底。

## 4. 数据流：本地主存 + 快照同步（不可混用的两条路径）

1. **日常**：页面「录入」→ localStorage（`xbrain_grade_insight_v1`）即时生效。多设备之间**不自动同步**。
2. **备份/同步**：「设置 → 导出 data.js 快照」→ 复制/下载文本 → **手动替换 `js/data.js` 里的 `window.GRADE_SNAPSHOT`** → 提交推送 → 其他设备首次打开（或清缓存后）自动载入最新快照作种子。
3. 导入支持两种格式：纯 JSON 备份、data.js 快照文本（`parseImportText` 自动识别）。
4. 备份提醒：距上次导出 >14 天且有修改 → 总览横幅提示。
5. ⚠️ localStorage 被清 = 数据丢失（除非导出过）；⚠️ 快照提交进 git = 明文进仓库历史，操作前向用户确认隐私接受度。

## 5. 本地运行与调试

- **file:// 直接双击 `index.html` 即可**：数据经 `<script>` 加载（无 fetch），`app.js` 内 file:// 分支自动跳过认证并解除 `xbrain-auth-hidden` 防闪烁隐藏（配套 `css/style.css` 末尾 `.xbrain-auth-filefix` 规则）。**勿删该兼容段**。
- 验证认证流程用 `python -m http.server`（或任意静态服务器）后访问 `http://localhost:8000/grade-insight/`。
- 改 js 后检查：`node --check js/*.js`。

## 6. 分析引擎口径（analysis.js）

- 趋势：全序列 OLS 斜率（得分率/次），阈值 ±0.012/±0.03 → 平稳/上升(下滑)/强上升(强下滑)；近 3 次斜率与长期反号 → 拐点提示。
- 偏科：单科均值得分率 − 个人总分均值得分率，|Δ|≥8pp 标强/弱科。
- 波动：近全部序列标准差，<2pp 稳定 / <4.5pp 基本稳定 / 否则波动大。
- 贡献度：Σ(科目满分占比 × 得分率变化) = 总得分率变化，按贡献排序。
- 目标推演与外推均带"仅供参考"口径；结论一律要求 ≥3 场数据，不足时明示。

## 7. 禁改/陷阱清单

- **勿把 echarts 换成 CDN**（离线 file:// 会失效）；勿提交 `node_modules`。
- **勿改 `brand/auth.js`**；改密码/会话只动 `auth.config.json`。
- **勿删** index.html 内：Logo 三段 IP 代码、`id="top"` 锚点、file:// 认证兼容段、脚本加载顺序注释。
- 弹层遵守根 AGENTS.md §14：禁 `document.body.style.overflow='hidden'`；遮罩显式满定位 + `touch-action:none`。
- 移动端铁律（§6.9）适用于本站所有改动：触控 ≥44px、正文 ≥16px、safe-area、viewport 禁 `user-scalable=no`。
- 科目 key 一旦产生历史数据就不可改（历史 exam.subjects 按 key 关联），删除科目只影响新录入。

## 8. 验证清单（改动后）

- [ ] `node --check` 全部 js 通过
- [ ] file:// 打开：六视图切换、录入→保存→图表联动、弹层开合、深链 `index.html#subjects` 直接定位
- [ ] http.server 下认证遮罩+密码通过；改 `auth.config.json` 密码后生效
- [ ] DevTools iPhone SE（375px）：Tab 可点、表格不撑破视口（宽表允许横向滚动）、弹层关闭可达
- [ ] 导出快照 → 新建导入来回：数据无损
- [ ] 推送前 `git ls-files grade-insight` 确认 vendor/echarts.min.js 已入库
```

## 吸收的既有规则：query-system/AGENTS.md

> 吸收时间 20260927-112616 · 处置：标准入口原位续存。
> 本节为原文全量收录（无损），自 init 起以原文效力由 VAND 治理；与 VAND 范式冲突之处，VAND 优先。

```text
# query-system/AGENTS.md — 中考志愿填报查询系统

> 本文件为 `query-system` 子站的专属指引，补充根 `AGENTS.md`（§5）的通用描述。
> 阅读优先级：**根 AGENTS.md > 本文件 > `query-system/README.md`**。
> 本子站是全仓库**唯一需要构建的 SPA**（类型 B），也是最复杂的子系统。

---

## 1. 子站定位与技术栈

- **功能**：广州中考学校数据查询、分数线分析、志愿填报辅助。
- **技术栈**：React 19 + Vite 8 + TypeScript 6 + vitest 4。
- **类型**：B（React+Vite SPA），`vite.config.ts` 设 `base:'./'` 相对路径部署。
- **构建产物**：`dist/`，门户卡片指向 `./query-system/dist/index.html`。
- **不接入认证**：本子站未加载 `brand/auth.js`，依赖主站门户认证。

---

## 2. 目录结构

```
query-system/
├── index.html                  # Vite 入口 HTML
├── vite.config.ts              # base:'./' + 3 个自定义插件（见 §5）
├── package.json                # scripts: dev/build/lint/test/preview
├── tsconfig.json / *.app/node.json
├── eslint.config.js
├── database/                   # 原始数据源（MD 表格）
│   ├── school_files/           # 学校深度报告 MD（运行时 fetch）
│   ├── 2026年广州市普通高中名额分配录取最低控制线.md
│   ├── 第三批录取分数.md / 第四批录取分数.md
│   ├── 广州高中学校库.md
│   ├── 第二批-广州协和学校-名额分配计划/明细-*.md
│   ├── 补录分数-2025.md / 2025年补录*.xlsx
│   └── ...（政策指南、分数段统计等）
├── other_infos/                # 舆情/分析报告（HTML/MD），构建时复制进 dist
├── public/                     # favicon.svg、icons.svg
├── src/                        # 源码（见 §3）
├── audit_report.md             # 数据审核报告（已知缺陷，见 §7）
├── README.md                   # 构建运行文档（命令速查）
└── fix_private_schools.py / verify_private_schools.py  # 一次性数据修复脚本
```

> 注：原 `home/`（新风机选购指南完整版）已于 2026-09 重构迁至 `采购与维护/家用新风机选购指南-完整版.html`；
> 原 `publish.ps1`/`start.bat`/`ngrok.bat` 外部路径脚本已删除，权威流程为根 `npm run build` + `git push`。

---

## 3. 源码架构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 主组件（状态管理、数据加载、布局编排）
├── types.ts                    # 全部 TypeScript 类型定义（核心模型 SchoolRecord）
├── App.css / index.css         # 样式
├── utils/
│   ├── rawData.ts              # ⚠️ 核心分数数据真源（内嵌 MD 字符串）
│   ├── mdParser.ts             # MD 表格解析 → 类型化记录
│   ├── dataMerger.ts           # 多源合并 → SchoolRecord[]
│   ├── filterEngine.ts         # 筛选条件应用
│   ├── fieldHelpers.ts         # 字段显示辅助
│   └── exportCsv.ts            # CSV 导出
├── components/
│   ├── FilterPanel.tsx         # 筛选面板
│   ├── ResultTable.tsx         # 结果表格
│   ├── DetailDrawer.tsx        # 详情抽屉
│   ├── SchoolDetailModal.tsx   # 学校详情弹窗
│   ├── MarkdownModal.tsx       # MD 报告弹窗（渲染 school_files）
│   ├── GradientBar.tsx         # 梯度线组件
│   ├── Tooltip.tsx + tooltipData.ts  # 提示信息
└── __tests__/                  # vitest 测试（6 套件）
    ├── comprehensive.test.ts
    ├── dataConsistency.test.ts
    ├── dataMerger.test.ts
    ├── filterEngine.test.ts
    ├── mdParser.test.ts
    └── regression.test.ts
```

---

## 4. 数据管线（核心，改动需格外谨慎）

### 4.1 数据流

```
rawData.ts (内嵌 MD 字符串)
   └─ mdParser.ts (parseSchoolLibrary / parseBatch3/4Data / parseQuotaControlLines /
                   parseXieheQuota2026/2025 / parseXieheSendingDetails /
                   parseQuotaCompare2526 / parseMakeupScores / parseMakeupPlan2025)
        └─ dataMerger.ts mergeAllData() → SchoolRecord[]
             └─ filterEngine.ts → 过滤后结果
                  └─ components 渲染
```

### 4.2 两类数据源（关键区分）

| 数据类型 | 存储位置 | 运行时读取方式 | 改动方式 |
|----------|----------|----------------|----------|
| **核心分数数据**（第三/四批录取、学校库、控制线、协和名额） | `rawData.ts` 内嵌字符串 | 编译时打包 | 改 `rawData.ts` 内嵌字符串 |
| **学校深度报告** | `database/school_files/*.md` | 运行时 fetch JSON 列表 + MD 文件 | 改 `database/school_files/` 下 MD |
| **舆情/分析报告** | `other_infos/*` | 运行时 fetch JSON 列表 + 文件 | 改 `other_infos/` 下文件 |

**⚠️ 陷阱**：改 `database/` 下的核心分数 MD（如 `第三批录取分数.md`）**不会自动反映到查询系统**，必须同步改 `rawData.ts` 内嵌字符串。`database/` 下的这些 MD 仅作存档参考。

### 4.3 学校合并逻辑（`dataMerger.ts`）

- 以 `学校名称` 为主键建 `schoolMap`。
- `extractBaseName` 去括号后做模糊匹配键（如 `广州市第六中学（海珠校区）`→`广州市第六中学`），处理同一学校不同校区。
- 批次推断：有 quotaControlLine→二，有 batch3Records→三，有 batch4Records→四，结合学校库原始批次。
- orphan 学校（仅出现在录取分数表但不在学校库）通过数据推断批次。
- `clNameMap` 硬编码约 24 所学校名称映射（控制线名称→系统名称）。

---

## 5. Vite 自定义插件（`vite.config.ts`）

| 插件 | dev 行为 | build 行为 |
|------|----------|------------|
| `generateSchoolFilesList` | 中间件返回 `school_files` 的 MD 文件列表 | 写 `public/school-files-list.json` |
| `generateOtherInfosList` | 中间件返回 `other_infos` 的 HTML/MD 文件列表 | 写 `public/other-infos-list.json` |
| `copyStaticAssetsPlugin` | — | build 后把 `school_files/*.md` 与 `other_infos/` 复制进 `dist/` |

**新增需运行时 fetch 的数据目录时**，须在此三处插件逻辑中同步扩展（新增 `generate*List` 插件 + 在 `copyStaticAssetsPlugin` 中追加复制逻辑），否则线上缺失数据。

---

## 6. 命令流（本子站专属）

在 `query-system/` 目录执行：

| 任务 | 命令 | 说明 |
|------|------|------|
| 安装依赖 | `npm install` | 首次或 `package.json` 变更后 |
| 开发 | `npm run dev` | Vite dev server，热更新 |
| 构建 | `npm run build` | `tsc -b && vite build`，产出 `dist/` |
| 预览 | `npm run preview` | 预览 `dist/`，须先 build |
| 测试 | `npm run test` | vitest run（一次性） |
| 测试监听 | `npm run test:watch` | 开发期 |
| Lint | `npm run lint` | eslint，提交前必跑 |

或在仓库根用 `npm run build` / `npm run dev`（根 `package.json` 已编排 `cd query-system`）。

**提交前必过门**：`npm run lint` → `npm run test` → `npm run build`，三者全绿方可推送。

---

## 7. 已知数据缺陷（见 `audit_report.md`）

改动数据解析逻辑前，**先读 `audit_report.md`** 确认是否触碰已知缺陷点。

| 级别 | 问题 | 位置 | 影响 |
|------|------|------|------|
| **FAIL** | 补录数据完全丢失 | `parseMakeupScores` | 要求 `学校编码`，但 `补录分数-2025.md` 无该列，所有补录记录被跳过。修复需移除对 `code` 的强制检查 |
| WARN | 2026 控制线名称映射不全 | `clNameMap`（`dataMerger.ts`） | 仅硬编码约 24 所，括号差异可能导致 `xieheControlLine2026` 关联失败 |
| WARN | `districtQuota` 与 `provinceQuota` 同值 | `parseXieheQuota2026` | 同一数同时赋两字段；当前显示仅用 `provinceQuota`，暂无影响 |
| WARN | `extractBaseName` 模糊匹配风险 | `dataMerger.ts` | 同校不同校区去括号后同名（如六中海珠/从化），当前靠完整名优先匹配 |

---

## 8. 约束与陷阱

- **`rawData.ts` 是核心数据真源**：改 `database/` 下核心分数 MD 无效，须同步改 `rawData.ts`。
- **本地辅助脚本已删除**（2026-09 重构）：原 `publish.ps1`/`start.bat`/`ngrok.bat` 外指 `ws_workbuddy\ws_study8\*`，已移除；权威流程是 `npm run build` + `git push`。
- **`base:'./'` 不可改**：否则相对路径部署资源 404。
- **校名匹配脆弱**：改 `extractBaseName` 或 `clNameMap` 影响全局合并，须跑全量测试（含 `regression.test.ts`）。
- **6 套测试是安全网**：含 `regression.test.ts` 回归测试，数据管线改动后必跑。
- **新风机完整版已迁出**（2026-09 重构）：原 `home/新风机选购指南.html` 现为 `../采购与维护/家用新风机选购指南-完整版.html`，`home/` 目录已删除。
- **`fix_private_schools.py`/`verify_private_schools.py`** 是一次性数据修复脚本，非构建流程一部分。

---

## 9. 改动验证清单

### 9.1 改动源码/数据
- [ ] `rawData.ts` 与 `database/` 数据是否一致（若涉及核心分数）
- [ ] `npm run lint` 通过
- [ ] `npm run test` 通过（含 regression）
- [ ] `npm run build` 通过，`dist/` 生成
- [ ] `npm run preview` 抽查页面渲染与数据
- [ ] 若改 `vite.config.ts` 插件，确认 build 产物含 `school-files-list.json`/`other-infos-list.json` 与复制资源

### 9.2 新增学校深度报告
- [ ] MD 文件放入 `database/school_files/`
- [ ] 本地 `npm run dev` 验证报告可在弹窗中正常渲染
- [ ] 无需改 `rawData.ts`（深度报告运行时 fetch）

### 9.3 新增舆情/分析报告
- [ ] 文件放入 `other_infos/`
- [ ] 本地 `npm run dev` 验证列表与内容加载
- [ ] build 后确认 `other_infos/` 已复制进 `dist/`
```

## 吸收的既有规则：健康/AGENTS.md

> 吸收时间 20260927-112616 · 处置：标准入口原位续存。
> 本节为原文全量收录（无损），自 init 起以原文效力由 VAND 治理；与 VAND 范式冲突之处，VAND 优先。

```text
# 健康/AGENTS.md — 家庭健康档案

> 本文件为 `健康` 子站的专属指引，补充根 `AGENTS.md`（§8）的脚本生成页约定。
> 阅读优先级：**根 AGENTS.md > 本文件 > `健康/妈/README.md`**。
> 本子站是全仓库**唯一的"脚本生成 + 手写"混合子站**，含真实家庭成员医疗档案，隐私敏感。

---

## 1. 子站定位

- **功能**：家庭成员（哥/妈/爸/弟）健康档案聚合，含体检报告解读、就诊记录、深度医学分析。
- **类型**：C（多级导航），纯静态 + Python 脚本生成。
- **不参与构建**：无 npm 依赖，改动后直接 `git push` 部署。
- **隐私敏感**：含真实医疗数据与 DICOM 归档，妈子站有独立密码保护。

---

## 2. 目录结构与成员范式

```
健康/
├── index.html                  # 导航首页（手写，卡片网格，4 成员入口）
├── 哥/                          # 【脚本生成时间线 + 手写详情页 混合】
│   ├── generate_index.py        # 生成脚本
│   ├── index.html               # ⚠️ 脚本生成（GENERATED 注释，禁手改）
│   └── YYYYMMDD.标题/           # 就诊子目录（点号分隔）
│       ├── README.MD            # 短描述（时间线卡片摘要）
│       ├── *.md                 # 主题报告（病情分析/生活调整等）
│       ├── *.png                # 检验报告图片
│       └── index.html           # 可选手写深度详情页
├── 妈/                          # 【纯脚本生成 + 独立认证】
│   ├── generate_index.py        # 生成脚本
│   ├── index.html               # ⚠️ 脚本生成（GENERATED 注释，禁手改）
│   ├── README.md                # 子站说明
│   ├── auth.config.json         # 独立认证（密码 mom2026，30 分钟会话）
│   ├── 个人健康档案与深度医学分析报告.md  # 深度分析（嵌入页面顶部，不进时间线）
│   ├── p.report.md              # AI 报告生成提示词（排除，禁改）
│   ├── MR-无需建立子站点/       # DICOM zip 归档（天然排除）
│   └── YYYYMMDD-项目-医院.md/.png  # 44 对报告+图片（短横分隔）
├── 爸/                          # 【纯手写，无脚本】
│   ├── index.html               # 手写导航页
│   ├── *.md                     # 源数据
│   └── 腰椎间盘突出/index.html   # 手写详情页
└── 弟/                          # 【纯手写，无脚本】
    ├── index.html               # 手写导航页
    ├── 增高.md                  # 源数据
    └── 增高/index.html           # 手写详情页
```

### 2.1 成员范式对比

| 成员 | index.html 来源 | 文件名约定 | 图片配对 | 认证 | 详情页 |
|------|-----------------|------------|----------|------|--------|
| 哥 | 脚本生成 | `YYYYMMDD.标题`（点号） | 子目录内所有图片 | 无 | 可选手写 |
| 妈 | 脚本生成 | `YYYYMMDD-项目-医院`（短横） | 严格同名 PNG | **有**（mom2026） | 无 |
| 爸 | 手写 | — | — | 无 | 手写 |
| 弟 | 手写 | — | — | 无 | 手写 |

---

## 3. 脚本生成页约定（核心约束）

### 3.1 哪些页面禁止手改

| 文件 | 标志 | 生成脚本 |
|------|------|----------|
| `哥/index.html` | `<!-- GENERATED BY generate_index.py - DO NOT EDIT -->` | `哥/generate_index.py` |
| `妈/index.html` | 同上 | `妈/generate_index.py` |

**识别法**：文件头含 GENERATED 注释 → 禁手改，改内容须改源数据/脚本后重新生成。

### 3.2 妈/generate_index.py

- **硬编码绝对路径** `BASE`，换机器/换仓库需改。
- 遍历 `*.md`（`EXCLUDE_FILES` = `个人健康档案与深度医学分析报告.md`、`p.report.md`、`README.md`），按文件名倒序（=日期倒序）。
  - ⚠️ **非报告 `.md` 必须加入 `EXCLUDE_FILES`**：脚本不做格式校验，`README.md` 曾因此被 `parse_filename` 解析成 `date="READ-ME-"`，在时间线生成垃圾条目并让年份过滤器多出 "READ"。新增说明类 MD 时两处 `EXCLUDE_FILES`（`generate_index.py` + `check_consistency.py`）都要改。
- `parse_filename`：按 `-` 分割为 `日期/项目/医院` 三段。
- PNG 配对：按 stem 依次尝试 `.png` / `.jpg` / `.jpeg`，存在则显示"查看图片"按钮。
- **孤儿图工单机制**（2026-09-11 新增）：无同名 `.md` 的图片会被扫描并登记到 `orphans.json`（含 `image` / `target_md` / 解析出的日期·项目·医院），脚本同时打印 `[TODO]` 清单。**标准流程是由 AI 读图生成同名 `.md` 解读报告**，而非让用户手写。
  - 兜底：AI 尚未处理时，页面先出降级「仅图片」条目（图片默认展开、标题带 `.img-only-badge` 橙色徽标、无"查看完整报告"按钮、详情写"解读报告生成中"）。生成 MD 后重跑脚本，该条目自动升级为常规条目、徽标消失。
  - `orphans.json` 每次运行覆盖写入；count 为 0 表示全部图片均有解读报告。
- 深度分析报告单独读取嵌入页面顶部，**不进时间线**。
- **健康状况总览**（`.status-grid` 12 项：妇科/乳腺/肺部等）**硬编码在脚本 `build_html` 中**，不从 MD 生成——改总览须改脚本。
- 生成 HTML 含完整 XBrain Logo（压缩版短 id）、认证加载（`level:'sub'`，`configPath:'/健康/妈/auth.config.json'`）、时间线、搜索、年份过滤、图片 modal。

### 3.3 哥/generate_index.py（与妈的差异）

- **双类型条目** `get_items()`：
  - **子目录**（`YYYYMMDD.标题`，点号分隔）：读 `README.MD` 作摘要，合并子目录内所有 `.md`（排除 README）为详情，收集所有图片为缩略图网格，**图片相对路径重写**（`src="x.png"`→`src="./子目录名/x.png"`），`has_index` 检测手写详情页存在则生成"查看详情页"链接。
  - **根目录 MD**：同名 PNG 优先，回退 `image.png`。
- 排除规则：`EXCLUDE_DIRS={"MR-无需建立子站点"}`，`EXCLUDE_FILES={"generate_index.py","index.html","README.md","README.MD"}`。
- **无健康状况总览、无深度分析段落**（仅 Hero + 时间线）。
- **无认证**。
- tag 区分：「就诊记录」（subdir）/「健康报告」（md）。

### 3.4 重新生成流程（妈：强制四步）

```powershell
# 妈（新增/改动报告后）
cd 'd:\data\wy25311753\workspace\git\github\XBrain\home\健康\妈'
python generate_index.py       # 1. 生成页面；孤儿图会写入 orphans.json
#                              2. 同步 个人健康档案与深度医学分析报告.md（清单见 §3.5）
python check_consistency.py    # 3. 守卫；退出码 0 方可 push
#                              4. git push

# 哥（无深度汇总报告，无守卫）
cd 'd:\data\wy25311753\workspace\git\github\XBrain\home\健康\哥'; python generate_index.py
```

生成后 `index.html` 头部须仍含 GENERATED 注释。

### 3.5 深度汇总报告同步清单（妈专属，**新增报告后必做**）

`个人健康档案与深度医学分析报告.md` 里大量统计是从报告文件**派生**的，此前靠人肉维护导致长期腐化（新增报告后仍写「44份 / 2026年5月 / 42岁」）。新增子报告后按下表逐项更新：

| # | 位置 | 要改什么 |
|---|------|----------|
| 1 | 头部 `**报告总数**` | = 目录内真实报告 `.md` 数量（不含排除项） |
| 2 | 头部 `**报告覆盖时间**` | 结束月份 = 最新报告月份 |
| 3 | 头部 `**患者概况**` 年龄 | 1983年9月出生，按当前日期换算 |
| 4 | `## 二、完整检查时间线（N份报告）` | 标题 N |
| 5 | 时间线表格 | 对应阶段追加新行（日期/检查/机构/核心发现/意义） |
| 6 | 所属系统 `**涉及报告**：N份（…）` | 计数与构成 |
| 7 | 该系统的专题段落 | 补充本次结果与小结（如内膜息肉追踪做成三行对比小表） |
| 8 | `## 五、异常指标跟踪表` | 必要时加时间列 + 指标行 |
| 9 | `## 八` 检查日历 / `## 九` 总结 / 文末免责声明 | 过期项改「尽快（原定X月，已超期）」；份数同步 |

改完必须重跑 `generate_index.py`，汇总内容才会注入 `index.html` 顶部。

### 3.6 一致性守卫 `check_consistency.py`

```powershell
cd 健康/妈
python generate_index.py
python check_consistency.py    # 退出码 0 = PASS，1 = FAIL（FAIL 禁止 push）
```

校验 9 项：报告总数、覆盖时间止月、时间线标题份数、最新报告已入线、时间线无幽灵日期、患者年龄、总结段份数、免责声明份数、生成页面条目日期合法。任何一项与环境不符即 FAIL 并给出精确差值。

---

## 4. 三级 href 层级（本子站独有）

本子站比其他子站多一级层级，href 处理须格外注意：

| 页面层级 | Logo href | 返回链接 href | 返回文案 |
|----------|-----------|---------------|----------|
| 健康首页 `健康/index.html` | `../index.html`（门户） | `../index.html` | 返回首页 |
| 成员首页 `健康/[成员]/index.html` | `../index.html`（健康首页） | `../index.html` | 返回健康档案 |
| 成员子页 `健康/[成员]/[主题]/index.html` | `../../index.html`（**直达门户**） | `../index.html`（回成员首页） | 返回[成员]健康档案 |

**注意**：成员子页的 Logo 直达门户而非回健康首页，这是本子站的既定模式（手写页如此）。新增手写子页时遵循此规律。

---

## 5. 三种页面模板

| 模板 | 用途 | 来源 | 特征 |
|------|------|------|------|
| A 时间线聚合页 | 成员首页（妈/哥） | 脚本生成 | `.hero`(id=top) + `.timeline-controls`(sticky 搜索+年份) + `.timeline`(item 列表) + 折叠/搜索/过滤/modal |
| B 内容详情页 | 成员子页（哥详情/爸/弟） | 手写 | `.page-header`(date-tag + h1 + summary) + `.content`(h2/h3/table/blockquote/highlight-box/report-images) + 顶底各一 `.back-link` |
| C 卡片导航页 | 健康首页/爸/弟根 index | 手写 | `.hero`(id=top) + `.sites-grid` + `.back-link`，复用门户卡片范式 |

---

## 6. 医学报告 MD 格式约定

### 6.1 妈的报告（单文件配对）

- 文件名：`YYYYMMDD-项目名称-医院.md`（如 `20260515-肠镜-中山一院.md`）。
- 内容：标准 markdown，`#` 主标题、`##` 章节、表格、列表、blockquote、`---` 分隔、文末免责声明。
- 图片：严格同名 `.png`。
- **禁用纯中文文件名**（须英文日期+项目+医院，见 `妈/README.md`）。

### 6.2 哥的报告（子目录形式）

- 目录名：`YYYYMMDD.标题`（**点号**分隔，与妈的短横不同）。
- 内含：`README.MD`（2 行短描述，作卡片摘要）+ 多个主题 `.md`（合并为详情）+ 多张 `.png`。
- 可选手写 `index.html` 深度详情页（脚本检测其存在并生成链接）。

### 6.3 深度分析报告（妈专属）

- `个人健康档案与深度医学分析报告.md`：全量汇总，由 AI（qwen/kimi）依 `p.report.md` 提示词生成。
- 嵌入页面顶部单独展示，**不进时间线**，被脚本排除。

---

## 7. 认证（妈专属）

- 仅 `妈/auth.config.json` 存在，哥/爸/弟无认证。
- 密码 `mom2026`，会话 **30 分钟**（远短于主站 1 天），5 次失败锁 15 分钟。
- 妈脚本生成的 HTML 加载 `/brand/auth.css` + `/brand/auth.js`，`XBrainAuth.init({level:'sub', subSiteName:'mom', configPath:'/健康/妈/auth.config.json'})`。
- 认证配置路径用中文 URL `/健康/妈/auth.config.json`。

---

## 8. 新增报告流程

### 8.1 妈的新报告

1. 放入图片 `YYYYMMDD-项目-医院.png`（须英文日期命名）；**图片即可，MD 由 AI 生成**。
2. `cd 健康/妈; python generate_index.py` → 若有孤儿图，脚本写入 `orphans.json` 并打印 `[TODO]` 清单。
3. 让 AI 读 `orphans.json`，逐张读图，**按 `p.report.md` 提示词 + 现有 MD 格式**（六段式：基本信息/检查方法/检查所见/与前次对比/综合解读/临床建议 + 免责声明）生成 `target_md`。
4. 重跑 `python generate_index.py` → 确认 `image-only: 0`，条目已升级为常规条目。
5. 按需更新 `个人健康档案与深度医学分析报告.md`（用 `p.report.md` 汇总提示词让 AI 重新生成全量汇总）。
6. 浏览器验证时间线新条目、图片、深度报告；`git push`。

> 若跳过第 3~4 步，页面仍会以「仅图片」降级条目上线，不会报错，但缺少文字解读。

### 8.2 哥的新就诊记录

1. 新建 `YYYYMMDD.标题/` 子目录（点号分隔）。
2. 放入 `README.MD`（短描述）+ 主题 `.md` + `.png`。
3. （可选）手写 `index.html` 深度详情页。
4. `cd 健康/哥; python generate_index.py`。
5. 验证、推送。

### 8.3 爸/弟的新内容

直接手写 `.md` 源数据 + `index.html` 详情页，无脚本步骤。

---

## 9. 约束与陷阱

- **两套脚本不兼容**：妈用短横分隔文件名，哥用点号分隔子目录名，解析逻辑各自独立，勿混用。
- **PNG 配对规则不一**：妈按 stem 匹配 `.png/.jpg/.jpeg` 且支持孤儿图独立成条，哥子目录收集所有图片，哥根 MD 同名优先回退 `image.png`。
- **无自动构建**：妈/哥的 `index.html` 由本地 Python 脚本生成，**Netlify build 不含此步骤**，也不存在 watcher/hook。放进文件后必须手动跑脚本再 `git push`，否则线上不会更新。
- **哥的"生成+手写"双层**：`哥/index.html` 脚本生成，但子目录内 `index.html` 手写——脚本通过 `has_index` 检测并生成链接。这是全仓库唯一的"脚本页链接到手写页"模式。
- **妈的健康总览硬编码**：12 项状态写死在脚本里，改总览须改脚本而非数据。
- **脚本硬编码绝对路径**：换机器/换仓库须改 `BASE`。
- **`p.report.md` 是提示词模板**：禁改，仅供 AI 生成报告参考。
- **DICOM 归档**：`MR-无需建立子站点/*.zip` 天然被 `glob("*.md")` 排除，勿删。
- **隐私数据**：含真实医疗档案，妈子站独立密码保护符合隐私敏感性，勿移除认证。
- **非报告 `.md` 未排除会生成垃圾条目**：脚本不校验文件名格式，`README.md` 曾被解析成 `READ-ME-` 进入时间线与年份过滤器。新增说明类 MD 时，`generate_index.py` 与 `check_consistency.py` 两处 `EXCLUDE_FILES` 都要加。
- **汇总报告容易腐化**：统计数字是派生值却手写维护，新增报告后极易漏改（历史遗留「44份/2026年5月/42岁」）。守卫脚本 `check_consistency.py` 就是为此而设，**不要绕过它直接 push**。
- **无 build 依赖，但不是无校验**：纯静态 + Python，无 lint/test 框架；但**妈子站以 `check_consistency.py` 等价承担提交前闸门**（退出码非 0 禁止 push）。哥/爸/弟暂无守卫。

---

## 10. 改动验证清单

### 10.1 妈/哥新增报告后重新生成
- [ ] 文件名符合约定（妈短横、哥点号）
- [ ] 新增的非报告 `.md` 已加入两处 `EXCLUDE_FILES`
- [ ] 图片配对正确（妈同名 PNG、哥子目录内图片）
- [ ] `python generate_index.py` 执行成功，`image-only: 0`
- [ ] **妈：`python check_consistency.py` 通过（退出码 0）**
- [ ] **妈：深度汇总报告九项已同步（§3.5）**
- [ ] 生成后 `index.html` 头部仍含 GENERATED 注释
- [ ] 时间线无非法条目日期（守卫已覆盖）
- [ ] 浏览器验证时间线新条目、图片显示、搜索/年份过滤
- [ ] 妈子站验证认证流程（密码登录、会话过期）

### 10.2 爸/弟手写页改动
- [ ] `.md` 源数据与 `index.html` 内容一致
- [ ] Logo 完整嵌入，href 层级正确（子页 `../../index.html`）
- [ ] 首屏 `id="top"` 锚点存在
- [ ] 返回链接正确（`../index.html` 回成员首页）

### 10.3 改动生成脚本本身
- [ ] 改 `generate_index.py` 后重新生成 `index.html`
- [ ] 浏览器全量验证（时间线、搜索、折叠、modal、Logo 淡出）
- [ ] 确认未破坏排除规则（妈的 EXCLUDE_FILES、哥的 EXCLUDE_DIRS/FILES）
- [ ] 妈脚本改后确认认证加载仍正常
```

## 吸收的既有规则：四季景点/AGENTS.md

> 吸收时间 20260927-112616 · 处置：标准入口原位续存。
> 本节为原文全量收录（无损），自 init 起以原文效力由 VAND 治理；与 VAND 范式冲突之处，VAND 优先。

```text
# 四季景点/AGENTS.md — 岭南景点档案

> 本文件为 `四季景点` 子站的专属指引，补充根 `AGENTS.md` 的类型 C 通用描述。
> 阅读优先级：**根 AGENTS.md > 本文件**。
> 本子站为纯手写多级导航，**无脚本生成、无构建**，各景点独立视觉主题。

---

## 1. 子站定位

- **功能**：岭南景点（从化狮象岩）图文档案。
- **类型**：C（多级导航），纯静态，所有 `index.html` 均手写，可自由编辑。
- **不参与构建**：无 npm 依赖、无 Python 脚本，改动后直接 `git push` 部署。
- **无认证**：不接入 XBrainAuth。

---

## 2. 目录结构

```
四季景点/
├── index.html                          # 导航首页（卡片网格，3 景点入口）
├── 小梅沙海洋世界/
│   ├── index.html                      # 景点详情页（深蓝海洋主题）
│   └── *.jpg × 6                        # Pexels / LoremFlickr 免费图库图片
├── 世界之窗/
│   ├── index.html                      # 景点详情页（暗金主题）
│   └── *.jpg × 6                        # Pexels / LoremFlickr 免费图库图片
└── 从化吕田狮象岩/
    ├── index.html                      # 景点详情页（绿色自然浅色主题）
    ├── PTitle.jpg                      # 封面图（hero 背景 + 卡片封面）
    └── *_来自小红书网页版.jpg × 9       # 小红书图片（3 位作者）
```

---

## 3. 导航首页结构

- **复用门户卡片网格范式**：`.hero`(id=top) + `.sites-grid`（3 张 `.site-card`）+ `.back-link`（`../index.html` 回门户）。
- **完整 XBrain Logo**：`.xbrain-brand`，`href="../index.html"`（回门户）。
- **卡片顺序**：从化→深圳→花都周末家庭游-new。
- **卡片封面两种模式**：有照片用 `background-image`，无照片用 `.site-card-image.fallback` + 内嵌简化 Logo SVG 占位。
- 卡片渐入动画 `IntersectionObserver`（`threshold:0.15`），新增卡片自动生效。
- 复用门户 `--xb-*` 色彩变量。

---

## 4. 景点子页面共性

所有景点子页面均：
- 嵌入完整 XBrain Logo（`.xbrain-brand` + 全部 SVG 元素 + 滚动淡出 JS）。
- 采用 `hero` + 多个 `section` + `footer` 总体骨架。
- 自定义独立视觉主题（不复用 `--xb-*` 变量，仅保留 Logo 品牌底座）。

### 4.1 三景点视觉主题对比

| 景点 | 主题色调 | 风格 | 字体 |
|------|----------|------|------|
| 小梅沙海洋世界 | `--ocean-deep:#0a1628` + `--cyan:#06b6d4` 青蓝 | 暗色海洋深蓝 | Google Fonts |
| 世界之窗 | `--bg-deep:#1a1720` + `--gold:#d4a853` | 暗色金色 | Google Fonts |
| 从化狮象岩 | `--primary:#2d5016` 绿 + `--accent:#c8922a` 金 + `--bg:#f5f2eb` 米 | 绿色自然浅色 | 系统字体 |
| 花都石头记 | `--slate-900:#0f0f14` + `--amber-400:#d4a853` + `--crystal-blue` | 暗色矿物宝石 | Google Fonts |
| 肇庆燕岩 | `--primary:#1a3a2a` 深绿 + `--accent:#c8a05e` 金棕 + `--bg:#faf7f0` 米 | 深绿秘境浅色 | 系统字体 |

### 4.2 布局差异

| 景点 | 布局特点 | 独有组件 |
|------|----------|----------|
| 从化 | hero 全屏背景图 + 7 section + footer | stats-grid、timeline、gallery、data-table、fade-in 动画 |
| 花都 | hero CSS 渐变 + SVG 装饰（无照片）+ 11 section + footer | overview-grid、itinerary、category-card、tip-box、nearby-card |
| 肇庆 | **fixed nav 导航栏** + hero + 5 section + footer | nav 锚点导航（其他两个无） |

**无统一模板**：三个子页面风格/布局/组件各不相同，新增景点无法直接套用某个"标准模板"，需自行设计（可参考任一现有页面）。

---

## 5. 图片资源管理（本子站核心特殊性）

四种图片模式并存，新增景点时须选定一种：

### 5.1 模式 A：小红书图片相对路径（从化、花都）

- 命名规律：`[小红书笔记标题]_[序号]_[作者昵称]_来自小红书网页版.jpg`。
- 作者昵称可能含全角括号（如 `YYyong（摩旅版）`）、emoji、特殊字符，文件名须原样保留。
- HTML 中用相对路径直接引用，图注标注 `小红书 @作者昵称`。

### 5.2 模式 B：封面图 PTitle.jpg（从化特有）

- `PTitle.jpg` 同时用于：子页面 hero 全屏背景、导航首页卡片封面、**门户首页卡片封面**（门户 `index.html` 引用 `./四季景点/从化吕田狮象岩/PTitle.jpg`）。

### 5.3 模式 C：base64 内联（肇庆）

- 肇庆目录下无图片文件，图片以 base64 data URI 内联在 HTML 中，导致 `index.html` 达 1917KB。
- **不推荐**：增大仓库体积，无法用 Grep/Read 常规分析。新增景点避免此模式。

### 5.4 模式 D：外部跨域图片（从化局部）

- 从化引用 `http://www.conghua.gov.cn/img/...jpg`，存在跨域失效风险。**不推荐**。

### 5.4 模式 E：免费图库图片（小梅沙、世界之窗，新增）

- 当小红书等真实游客照片不可得时，可从 Pexels / Unsplash / Pixabay / LoremFlickr 等免费图库获取。
- 图片来源须为真实摄影作品（非 AI 生成），CC0 或类似免版税协议。
- 命名规范：简洁中文描述名（如 `海底隧道.jpg`、`金字塔.jpg`），避免保留图库默认文件名。
- 图片与 HTML 同目录存储，使用相对路径引用。

**推荐**：新增景点用模式 A（小红书图片）或自定义本地图片，避免 base64 内联与外部跨域引用。

### 5.5 禁止使用 AI 生成图片

- **景点图片必须来源于真实拍摄**。禁止使用 ImageGen / DALL·E / Midjourney 等任何 AI 工具生成景点图片。
- 合法图片来源：
  - 小红书（`*_来自小红书网页版.jpg`，模式 A）
  - 免费图库（Pexels / Unsplash / Pixabay / LoremFlickr 等，CC 协议或免版税图片）
  - 维基共享资源（Wikimedia Commons）
  - 自摄照片
- 如无法找到特定景点的真实照片，可选用主题相近的免费图库图片替代（如海洋馆场景用通用 aquarium 照片），并确保图片与页面描述场景吻合。
- AI 生成图片在攻略类页面中不可接受：它们可能误导游客预期、缺乏真实细节、且不符合旅游档案的纪实定位。

### 5.6 灯箱与移动端适配规范（指向根 §14）

本子站图片密集（游记、画廊、图文时间线），灯箱大图 / 图集瀑布流 / 图文网格的**实现与移动端铁律已上升为项目级通用规范**，见根 `AGENTS.md` **§14**。本子站内所有图片交互须满足：

- **移动端灯箱 Bug 根因**：iOS Safari 下用 `document.body.style.overflow='hidden'` 锁滚动会让 `position:fixed` 遮罩整体右移（需拖动才可见）。根 §14.2 第 1 条与 §14.3 给出正确写法（遮罩自身 `touch-action:none` + `overscroll-behavior:contain`）。
- **导航箭头必须明显且恒在屏内**（≥48px、描边+辉光、容器内 `left/right:6~12px`），不得用负偏移推到屏外。
- **手势滑动切图**：大图区域监听 `touch*`，横向位移 >45px 且大于纵向才切（根 §14.7 完整代码）。
- **移动优先网格**：缩略图墙 `2→3→4` 列断点（根 §14.5）。
- **安全区避让**：固定定位 close/nav 加 `env(safe-area-inset-*)`。
- **可直接复制的代码**：图墙/画廊复用 `home/src/site-template-travelogue-core.html` 的 `.media-block`（封面 `<img>` + 缩略图条，JS 自动选封面 index.* 优先、竖屏 `syncOrient` 完整显示、当前封面 `is-cover` 高亮）；旧 `花都周末家庭游` 手编的 `.lightbox-*` / `.waterfall-*` / `.travel-log-*` 灯箱已随该目录删除而退役，**切勿再引用**。新增游记/画廊页整段复用 `.media-block` 后再改路径，避免重复踩坑。

### 5.7 方案已完成印章

当出行方案已被**实际执行并补充游记**后，在方案选择按钮（`.plan-btn`）右上角打上红色圆形"已完成"印章，让读者一目了然哪些方案已经过实地验证。

**使用前提**：
- 方案已被实际出行执行（非纸面规划）
- 已有对应的游记段落（含真实照片 / 行车记录）

**HTML 模板**：

> 注：本子站**无本地模板目录**（原 `四季景点/src/` 已于 2026-09 重构删除）。全部可复用模板在仓库根 `home/src/`（`site-template.html` / `site-template-travelogue.html` / `site-template-travelogue-core.html`），用法见 `home/src/README.md`。

```html
<button class="plan-btn" onclick="switchPlan('planXX')">
  <span class="plan-name">方案XX · 方案名称</span>
  <span class="plan-desc">方案简述</span>
  <span class="stamp">已完成</span>
</button>
```

**CSS 模板**（移动优先，需 `.plan-btn { position: relative; overflow: hidden; }`）：

```css
.plan-btn .stamp {
  position: absolute;
  top: 4px; right: 4px;
  width: 42px; height: 42px;
  border: 2.5px solid #e74c3c;
  border-radius: 50%;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.06);
  font-size: 11px; font-weight: 900;
  font-family: 'Noto Serif SC', serif;
  display: flex; align-items: center; justify-content: center;
  transform: rotate(-15deg);
  opacity: 0.72;
  pointer-events: none;          /* 不干扰按钮点击 */
  text-align: center; line-height: 1.15;
  letter-spacing: 1px;
  user-select: none;
  z-index: 2;
}

@media (min-width: 640px) {
  .plan-btn .stamp { width: 50px; height: 50px; font-size: 13px; top: 6px; right: 6px; }
}
```

**印章本身要求**：
- **不干扰交互**：`pointer-events: none` 确保点击穿透到按钮
- **不可选中**：`user-select: none` 避免拖选
- **适度醒目但不刺眼**：红色描边 + 极浅红底 + 0.72 透明度，倾斜 -15° 营造邮戳感
- **添加的条件**：仅当方案已被实际执行并写了游记时才添加 `stamp` span

**已知已打标的方案**：
- 花都周末家庭游-new → 方案E1（2026-07-25 已执行，有完整游记含行车记录）
- 佛西藏山石燕岩周末家庭游 → 方案A（2026-09-19 已执行，游记 8 章 + 美食记录 + 科普图解已补；邮戳 `2026.09.19`，并按 §14.6.1-7 接线 `updateTravelogueGate` 门控）

---

### 5.8 攻略型页面（site-template.html 派生）`.media-block` 媒体组件必保留

攻略型子站页（如 `佛山西樵山石燕岩周末家庭游`）由 `home/src/site-template.html` 派生，**每个景点 `spot-card` 内嵌的 `.media-block`（封面 `<img>` + 缩略图条 + 切换 JS）是核心组件**：

- **建页（尤其"规划页"改写"实拍页"）切勿整体删除该组件**：否则卡片无 `<img>`、图片不显示——属**架构缺件**，非部署问题。
- 需要缩略图切换 + 竖屏完整显示时，移植 `home/src/site-template.html` 的 `.media-block` 相关 CSS（含 `.img-portrait`）与 JS（封面自动选 `index.*` 优先、缩略图点击切换、`is-cover` 高亮）。
- **`syncOrient` 在攻略模板 `site-template.html` 里没有**（仅在游记核心 `site-template-travelogue-core.html` 内）：竖屏图（`naturalHeight > naturalWidth`）需 `img-portrait`（`object-fit:contain` 完整显示不裁切，见根 §14）。手编攻略页须**自补** `syncOrient(img)` 函数，并在封面 `onload` 与缩略图切换时调用；无该函数则竖屏图被 `cover` 裁切。
- 时间线（`plans` 的 `timeline-content`）节点同步显示实拍时同样嵌 `.media-block`，JS 用 `.closest('.media-block, .culture-card, .timeline-content, .log-chapter, .food-card')` 取所在宿主的缩略图条。
- 复用优先级：先整段复制 `site-template.html` 的 `.media-block`（HTML/CSS/JS）再改路径，避免重复踩坑；不要从零手写图墙。

## 6. MD 资讯汇总与 HTML 的关系

- 当前各景点均**不随附 MD 资讯底稿**（区别于 query-system 的 `rawData.ts`）；如需编写参考可单独建 MD，但**不被运行时读取**。
- MD 是 HTML 页面的**内容底稿/信息源**，与 HTML 章节高度对应。
- MD **不被运行时读取**（区别于 query-system 的 `rawData.ts`），仅为编写参考。
- MD 格式：大量表格、`>` 引用块、`---` 分隔、末尾关键信息速查卡。

---

## 7. Logo / href / 锚点处理

### 7.1 当前状态

| 页面 | Logo 嵌入 | Logo href | id="top" | 返回导航链接 |
|------|-----------|-----------|----------|--------------|
| 导航首页 | ✓ 完整 | `../index.html`（门户） | ✓ `<section class="hero" id="top">` | ✓ `.back-link`→`../index.html` |
| 从化子页 | ✓ 完整 | `#top`（本页顶） | ✓ `<div class="hero" id="top">` | ✗ 仅"返回顶部"，无回导航 |
| 花都子页 | ✓ 完整 | `#top`（本页顶） | ✓ `<section class="hero" id="top">` | ✗ 无任何返回链接 |
| 肇庆子页 | ✓ 完整 | `#top`（本页顶） | **✗ 缺失** | ✗ 无任何返回链接 |

### 7.2 已知缺陷（改动时建议同步修复）

1. **肇庆缺 `id="top"` 锚点**：Logo `href="#top"` 断链，违反 IP 规范硬性要求。
2. **三个子页 Logo `href="#top"` 而非 `../index.html`**：与类型 C"子页回导航"规范不符，子页无法回到导航首页（只能靠浏览器后退）。
3. **子页无"返回导航首页"链接**：UX 缺陷。

**新增景点时遵循正确规范**：子页 Logo `href="../index.html"`（回导航首页）+ 首屏 `id="top"` + 底部加"返回景点导航"链接。

---

## 8. 新增景点流程

1. 在 `四季景点/` 下新建景点子目录（中文命名）。
2. 编写 `index.html`：
   - 自行设计风格（可参考任一现有页面）。
   - **必须**嵌入完整 XBrain Logo（参照 `brand/XBRAIN-LOGO-IP.md`）。
   - Logo `href="../index.html"`（回导航首页）。
   - 首屏元素加 `id="top"`。
   - 底部加"返回景点导航"链接（`href="../index.html"`）。
3. 放入图片资源（推荐小红书命名规律或自定义本地图片，**避免 base64 内联**）。
4. （可选）编写 `XX资讯汇总.md` 作为内容底稿。
5. 在 `四季景点/index.html` 的 `.sites-grid` 新增 `.site-card` 卡片入口：有照片用 `background-image`，无照片用 `.fallback` 占位。
6. 本地浏览器验证：门户→导航→景点→返回全链路跳转、Logo 显示、移动端布局。
7. `git push`（无需 build）。

---

## 9. 约束与陷阱

- **无统一模板**：三景点风格各异，新增需自行设计。
- **子页面不复用 `--xb-*` 色彩变量**：仅保留 Logo 品牌底座，主题色各自独立（这是本子站既定模式，新增可沿用）。
- **肇庆 base64 内联**：文件 1917KB，勿用 Grep/Read 整文件分析，改动须谨慎避免破坏 data URI。
- **从化 PTitle.jpg 跨级引用**：门户首页也引用此图，改动/删除须同步门户 `index.html`。
- **小红书文件名特殊字符**：含全角括号、emoji、空格，href 须原样保留，shell 命令用单引号包裹。
- **卡片顺序非目录顺序**：导航首页按推荐度排列（从化→深圳→花都周末家庭游-new），新增景点时按内容定位插入合适位置。
- **无 build/无脚本**：纯手写，改动后直接 `git push`，仅需本地浏览器验证。
- **封面图须随子站一起 `git add`**：子站目录下的 `index.html.<ext>` 封面若只放进目录、没 `git add`（或导航 `SITES` 条目与子站分两次提交漏了导航），线上导航卡片封面静默空白（见 §15.4 + 根 §9.1）。
- **攻略页勿整体删 `.media-block`**：由 `site-template.html` 派生的页面，改"规划页"为"实拍页"时若删掉景点卡的 `.media-block`，卡内图不显示；需恢复媒体组件（见 §5.8）。
- **景点文件夹改名须同步 HTML + git**：用户把 `黄飞鸿馆/` 改名为 `黄飞鸿狮艺馆/`、`image copy.png` 改名 `image1.png` 后，HTML `src` 与 git 旧路径都要同步（旧路径 `git rm --cached`，新路径 `git add`），否则 404。
- **文件名空格写原始空格**：`src=".../image copy.png"` 写原始空格，勿写 `%20`（二次编码 404，见根 §10）。

---

## 10. 改动验证清单

### 10.1 新增/改动景点子页
- [ ] `index.html` 嵌入完整 XBrain Logo
- [ ] Logo `href="../index.html"`（回导航首页）
- [ ] 首屏 `id="top"` 锚点存在
- [ ] 底部有"返回景点导航"链接
- [ ] 图片用相对路径（非 base64、非外部跨域）
- [ ] 导航首页 `.sites-grid` 已加卡片入口，href 正确
- [ ] 本地浏览器验证全链路跳转、Logo 显示、移动端布局

### 10.2 改动导航首页
- [ ] 卡片封面图路径正确（有照片用 `background-image`，无照片用 `.fallback`）
- [ ] Logo `href="../index.html"`（回门户）
- [ ] `id="top"` 锚点存在
- [ ] 新增卡片渐入动画自动生效（IntersectionObserver）

### 10.3 修复已知缺陷（如被指派）
- [ ] 肇庆子页补 `id="top"` 锚点
- [ ] 子页 Logo `href` 改为 `../index.html`
- [ ] 子页补"返回景点导航"链接

---

## 11. 用户出行偏好规则（km 家庭 — 4口之家亲子游）

> 以下规则从深圳攻略实际迭代中提炼，适用于后续所有亲子景点行程规划。

### 11.1 时间策略：早出发、早返程，双向错峰

- **出发**：接受 07:00-07:30 早出发，避开周六 08:30-10:00 出城高峰。
- **返程**：希望 14:00-15:00 返程，避开周日 17:00-20:00 返城高峰。
- **原则**：不赶夜路，下午 2-3 点出发预计 16:30-17:30 到家，小孩还能吃晚饭、不耽误第二天上学。

### 11.2 酒店策略：景点优先，入住后置

- **不提前办理入住**：酒店标准入住时间 14:00，上午 10:00 去寄存行李是浪费时间。
- **自驾行李全程放车上**：玩完景点后再去酒店，行李从车上搬入房间。
- **酒店是目的地本身**：不只是睡觉的地方，深度体验儿童俱乐部、恒温泳池、私家海滩、园林等配套设施。
- **入住后安排休整**：15:00-16:00 办理入住后，让小孩洗澡、换衣服、小睡 30-60 分钟恢复体力。

### 11.3 天气策略：避开正午暴晒

- **最热时段 13:00-15:00 避免户外**：7 月深圳下午气温 30-35°C，悬崖/礁石/沙滩完全无遮挡，非常难受。
- **户外景点优先时段**：
  - 上午 09:30-12:30：海风习习，温度尚未升到最高，最佳时段。
  - 傍晚 16:00-18:30：太阳西斜，不再直射，温度回落，海风舒适。
- **下午避暑安排**：13:30-15:30 安排在遮阴处（古城街巷、室内场馆、博物馆、酒店）或午休。

### 11.4 节奏策略：悠闲深度，不赶打卡

- **不追求"一次玩遍"**：专注深度体验，不走马观花。
- **每个景点预留充足时间**：不赶时间，让小孩慢慢观察、互动。
- **行程灵活**：可中途回酒店休息/午睡，关注景点是否支持当日二次入园。
- **中午安排午休**：小孩下午容易犯困，13:00-15:00 安排室内或休息。

### 11.5 小孩作息策略

- **核心时段 09:30-12:30**：小孩精力最旺盛，安排核心门票景点（如海洋世界开园即入）。
- **午餐 12:30 左右**：不安排在 14:00 等尴尬时间，避免饿肚子。
- **13:00-15:00 低电量期**：避免长时间户外步行，安排室内或午休。
- **15:00-16:00 酒店小睡**：恢复体力后再进行傍晚活动（沙滩、散步）。

### 11.6 景点策略：开园即入，灵活出入

- **热门景点开园就进**：如海洋世界 09:30 开园，人流最少，体验最佳。
- **确认二次入园政策**：部分园区可凭手 stamp 或电子票当日再次进入，方便中途回酒店休息。
- **人文历史补充**：每个景点需补充人文历史背景介绍（如大鹏所城 1394 年建城、深圳别称"鹏城"来源）。

### 11.7 特殊地区规则

- **大鹏半岛**：周末/节假日进入需提前在"深圳交警"公众号预约车辆通行，未预约可能被劝返。
- **大梅沙海滨公园**：周末需提前在"i深圳"APP 预约入场。
- **深圳天文台**：需提前在"深圳天文台"公众号预约，或仅走公共栈道（无需预约）。

### 11.8 视觉与内容规范

- **封面图统一**：各景点使用 `index.png` 作为封面图（hero 背景 + 卡片封面）。
- **图片画廊**：景点支持点击封面图查看所有图片，全屏 lightbox + 左右切换 + 缩略图导航。
- **三方案设计**：提供 A（全能打卡）、B（悠闲度假）、C（纯深度/另一区域）三种方案，费用横向对比。

---

## 12. 深圳子站建设经验沉淀

> 深圳子站（原路径 `四季景点/深圳/`，2026-08-11 重命名为 `四季景点/深圳周末家庭游/`）是"攻略型子站"多方案切换架构的**参考范式与默认架构**来源，经验提炼自其早期建设过程。**新建攻略型子站（多方案亲子游）默认采用该架构**，除非有明确理由另选；后续子站（如 `花都周末家庭游`）均在此范式上扩展。注：深圳子站已于 2026-08-11 改版为**纯游记型**（`site-template-travelogue.html` 模板，真实出行记录·妈途中发烧致行程偏离原计划），其"攻略/多方案"范式仅作历史参考，新攻略型子站仍应新建而非沿用该页。

### 12.1 文件与图片结构

```
四季景点/深圳周末家庭游/
├── index.html                    # 唯一页面，方案切换全部在此实现
├── index.png                     # 子站封面（导航首页卡片引用）
├── 小梅沙海洋世界/               # 景点图片目录
│   ├── index.png                 # 封面图（spot-card + 卡片）
│   └── image*.png × N            # 画廊图片
├── 背仔角灯塔/image*.png
├── 深圳大鹏半岛/                 # 含多景点子目录
│   ├── 人鱼洞/
│   ├── 大鹏所城/
│   ├── 深圳天文台/
│   ├── 桔钓沙/
│   └── 深圳大鹏半岛国家地质公园博物馆/
├── 小梅沙海滨乐园(小梅沙沙滩)/   # 注意：目录名含括号
└── 酒店/
```

**规则：**
- **封面图统一命名 `index.png`**：每个景点目录下用 `index.png` 作为封面图（spot-card 背景和 plan-summary 表格缩略图均引用此文件）。
- **画廊图片命名自由**：其余图片可沿用原始文件名，无需统一。
- **注意目录名中的特殊字符**：如 `小梅沙海滨乐园(小梅沙沙滩)` 含括号，JS 字符串引用时需原样保留。

### 12.2 多方案切换架构

深圳子站核心特点是单一页面承载 4 个旅行方案（A / B1 自驾 / B2 高铁 / C），通过 JS 切换显示。

#### 12.2.1 HTML 结构

```html
<section class="section" id="plans">
  <!-- 方案选择按钮 -->
  <div class="plan-selector">
    <button class="plan-btn active" onclick="switchPlan('planA')">方案A</button>
    <button class="plan-btn" onclick="switchPlan('planB1')">方案B1</button>
    <button class="plan-btn" onclick="switchPlan('planB2')">方案B2</button>
    <button class="plan-btn" onclick="switchPlan('planC')">方案C</button>
  </div>

  <!-- 方案内容 -->
  <div class="plan-content active" id="planA">
    <div class="plan-summary">...</div>
    <div class="day-divider">...</div>
    <div class="timeline">...</div>
  </div>

  <div class="plan-content" id="planB1">...</div>
  <div class="plan-content" id="planB2">...</div>
  <div class="plan-content" id="planC">...</div>
</section>
```

#### 12.2.2 CSS 规则

```css
.plan-content { display: none; }
.plan-content.active { display: block; animation: fadeIn 0.5s ease; }
```

#### 12.2.3 JS 切换函数

```javascript
window.switchPlan = function(planId) {
  document.querySelectorAll('.plan-btn').forEach(function(btn) { btn.classList.remove('active'); });
  document.querySelectorAll('.plan-content').forEach(function(content) { content.classList.remove('active'); });
  document.getElementById(planId).classList.add('active');
  event.currentTarget.classList.add('active');
};
```

#### 12.2.4 ⚠️ 关键陷阱：plan-content div 过早闭合

**这是建设过程中最频繁出错的点。** 每个 `plan-content` 的 HTML 结构必须是一个完整自封闭的 `<div>`，不能出现多一个或少一个 `</div>`。

**典型错误 1 — plan-summary 末尾多闭合：**
```html
<!-- 错误：plan-summary 末尾多一个 </div>，提前关闭了 plan-content -->
</table>
</div></div>       <!-- 第二个 </div> 错误地关闭了 plan-content！ -->
<div class="day-divider">
```
应改为：
```html
</table>
</div>             <!-- 仅关闭 plan-summary -->
<div class="day-divider">
```

**典型错误 2 — timeline DAY 间多闭合：**
```html
<!-- 错误：DAY 1 timeline 闭合后多一个 </div> -->
      </div>     <!-- 关闭 timeline -->
      </div>     <!-- ⚠️ 多余的 </div>，提前关闭 plan-content！ -->
<div class="day-divider">
```
应改为：
```html
      </div>     <!-- 关闭 timeline -->
<!-- 不额外闭合，plan-content 继续打开 -->
<div class="day-divider">
```

**验证方法：** 每次修改后运行以下命令确保全局 `<div>` 与 `</div>` 数量相等：
```bash
python -c "with open('index.html') as f: c=f.read(); print(c.count('<div'), c.count('</div'))"
```
也可以分 plan 区域检查是否有异常差值。**全局差值非零必有问题。**

#### 12.2.5 方案数量与按钮/预算同步

当方案拆分（如 B → B1 + B2）时，须同步更新：
1. `.plan-selector` 按钮（HTML + `onclick` 参数）
2. `id="planB"` → `id="planB1"` 重命名
3. 预算对比表的列数（`<th>` 和所有 `<tr>` 的 `<td>` 数量对齐）
4. QA / 贴士 / 避坑段落中的方案名称引用
5. HTML 注释标记（`<!-- ===== PLAN B ===== -->`）

### 12.3 行程总表（plan-summary）

每个方案的 `plan-content` 开头放置 `<div class="plan-summary">`，包含按 day 分组的行程总表。

#### 12.3.1 表格规范

| 出发 | 到达 | 目的地或项目 | 耗时 |
|------|------|-------------|------|
| 07:00 | 09:00 | 广州出发（自驾） | 2h |
| 09:00 | 12:30 | 深圳世界之窗 | 3.5h |

```html
<div class="plan-summary">
  <div class="day-label">DAY 1 · 周六</div>
  <table class="plan-summary-table">
    <thead><tr><th>出发</th><th>到达</th><th>目的地或项目</th><th>耗时</th></tr></thead>
    <tbody>
      <tr><td>07:00</td><td>09:00</td><td>广州出发（自驾）</td><td>2h</td></tr>
      ...
    </tbody>
  </table>
  <div class="day-label">DAY 2 · 周日</div>
  <table class="plan-summary-table">...</table>
</div>
```

#### 12.3.2 ⚠️ 四列必须填满

每个 `<tr>` 必须有 4 个 `<td>`，**不能为空**：
- **出发**：开始时间（如 `07:00`）
- **到达**：预估到达/结束时间（如 `09:00`），不能用"约2h"之类模糊表述
- **目的地或项目**：简要描述（如 `广州出发（自驾）`、`午餐`）
- **耗时**：合理估算时长（如 `2h`、`1h`、`0.5h`），单位统一用 `h`

**就餐/入住等短时活动也需要填写耗时**：午餐 `1h`、入住 `0.5h`、退房 `0.5h`。

**验证方法：**
```bash
grep -c '<td></td>' index.html  # 应为 0
```

### 12.4 景点图片卡片 + 瀑布式画廊

#### 12.4.1 spot-card 嵌入 timeline

在 timeline-item 末尾（`timeline-tags</div>` 之后）嵌入：

```html
<div class="timeline-spot-card" onclick="openWaterfall('oceanworld')">
  <div class="timeline-spot-card-img" style="background-image: url('小梅沙海洋世界/index.png')">
    <div class="timeline-spot-card-bar">
      <span>📷 13张</span>
      <span class="view-btn">查看全部 <svg>...</svg></span>
    </div>
  </div>
</div>
```

**规则：**
- 仅在对应【景点推荐】的 timeline-item 上加 spot-card，交通/餐饮/酒店等行程不加。
- spot-card 的 `📷 N张` 数字必须与 galleries 数据中的实际图片数一致。
- 封面图统一用该景点目录下的 `index.png`。

#### 12.4.2 galleries 数据定义

```javascript
var galleries = {
  oceanworld: {
    title: '小梅沙海洋世界',
    images: ['小梅沙海洋世界/image.png', '小梅沙海洋世界/image copy.png', ...]
  },
  // 每个景点一个 key
};
```

#### 12.4.3 ⚠️ 图片路径验证

**插入 galleries 数据后必须验证所有图片路径是否存在**，否则瀑布式展开后会有空白/裂图。

```python
import os, re
base_dir = '四季景点/深圳'
with open(f'{base_dir}/index.html', 'r', encoding='utf-8') as f:
    c = f.read()
paths = re.findall(r"'([^']+\.png)'", c)
for p in paths:
    if not os.path.exists(os.path.join(base_dir, p)):
        print(f'MISSING: {p}')
```

**常见问题：**
- 画廊引用了不存在的 `image copy N.png`（编号跳跃，如缺 9、缺 6）
- 首图引用 `image.png` 但实际只有 `index.png`
- 目录下实际文件比画廊数据多（遗漏了某张图片没加入 galleries）

#### 12.4.4 瀑布式画廊 JS

`openWaterfall` 和 `galleries` 变量**必须在 IIFE 内部、且在变量声明之后**定义，否则函数内无法访问 `galleries`——这是早期 bug 根源（点击无反应）。

### 12.5 导航栏（Top Navigation）

长页面（如深圳多方案页面超过 3000 行）应添加固定顶部导航栏。

#### 12.5.1 桌面端

```html
<nav class="top-nav" id="topNav">
  <div class="nav-inner">
    <a href="#top">首页</a>
    <a href="#route">路线</a>
    <a href="#plans">方案</a>
    ...
  </div>
  <button class="nav-hamburger" id="navToggle">...</button>
</nav>
```

- 使用 `scroll-spy`：监听 scroll 事件，根据各 section 的 `offsetTop` 高亮当前导航项。
- 各 section 需添加 `id` 属性，并设置 `scroll-margin-top: 60px` 防止被固定导航栏遮挡。

#### 12.5.2 移动端

```css
@media (max-width: 640px) {
  .top-nav .nav-inner { display: none; }
  .top-nav .nav-hamburger { display: flex; }
  .nav-mobile-dropdown { display: flex; }
}
```

移动端关键交互：
- 隐藏横向链接，显示汉堡按钮 + 下拉面板
- 下拉面板用 `transform: translateY` 实现展开/收起动画
- **点击链接后自动关闭菜单**：抽取共享的 `closeMenu()` 函数，同时重置 `menuOpen` 状态、移除 CSS `open` 类、恢复汉堡图标为 ☰
- 点击面板外部也需关闭菜单
- 汉堡图标需在 ☰（展开前）和 ✕（展开后）之间切换

#### 12.5.3 ⚠️ 移动端 Logo 位置

导航栏 `position: fixed; top: 0; z-index: 99`，XBrain Logo `position: fixed; z-index: 100`。移动端须调整 Logo 使其与导航栏同行、不与汉堡按钮重叠：

```css
@media (max-width: 640px) {
  .xbrain-brand { top: 8px; padding: 4px 10px 4px 6px; }
  .xbrain-brand svg { width: 24px; height: 24px; }
  .xbrain-brand .xbrain-text { font-size: 13px; }
}
```

### 12.6 版本号

每个页面页脚添加版本号，格式 `vYYYYMMDD-HHMMSS`（最后更新时间）：

```html
<footer>
  ...
  <p class="footer-version">v20260706-104854</p>
</footer>
```

```css
footer .footer-version {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: rgba(200, 210, 230, 0.3);
  font-family: 'Courier New', monospace;
}
```

用命令获取当前时间戳：`date +%Y%m%d-%H%M%S`

### 12.7 完整验证清单（攻略型子站）

新增或修改攻略型子站后，逐项确认：

- [ ] 每个方案 `plan-content` div 完整闭合（全局 `<div>` 数 = `</div>` 数）
- [ ] 方案切换按钮的 `onclick` 参数与 `plan-content` 的 `id` 一致
- [ ] 行程总表每行 4 列全部填满（无空 `<td></td>`）
- [ ] 封面图统一使用各景点目录下的 `index.png`
- [ ] galleries 数据中所有图片路径真实存在（用脚本验证）
- [ ] spot-card 的 `📷 N张` 与 galleries 实际图片数一致
- [ ] 瀑布式画廊 JS（`openWaterfall`/`galleries`）在 IIFE 内且在变量声明之后
- [ ] 预算表列数与方案数对齐
- [ ] 导航栏 section `id` 与 `href` 一致，各 section 有 `scroll-margin-top`
- [ ] 移动端 Logo 与导航栏同行不重叠
- [ ] 移动端导航链接点击后自动关闭菜单（需同时重置 `menuOpen` 和汉堡图标）
- [ ] 页脚含版本号 `vYYYYMMDD-HHMMSS`

> **营业时间核实 / 人文背景补充相关条目见 §13.6。**

---

## 13. 通用规则：营业时间核实 + 人文背景补充 + 出行前天气核实（攻略型子站必遵循）

> 本轮建设 花都周末家庭游（已重编为 花都周末家庭游-new）时新增的核心规则，适用于**所有攻略型子站**（多方案亲子游）。
> 深圳子站（§12）确立了"多方案切换架构"，本节在其之上补充三项硬性要求：**① 行程必须基于真实营业时间（禁止凭惯例填，§13.1）**；**② 人文/历史类景点必须补面向孩子的背景解说（§13.5）**；**③ 出行前必须联网核实天气并评估对行程的影响（§13.8）**。
> 工作流默认顺序：先按 §11 出行偏好 + §12 架构搭骨架 → 再按 §13.1 联网核实营业时间 → 据此修订行程表（§13.2）→ 补人文背景（§13.5）→ **出行前按 §13.8 联网核实天气、评估影响并补「天气影响评估」章节**。

### 13.1 营业时间核实（写行程表前的强制步骤）

- **禁止凭经验/惯例填时间**：尤其"开园即入 08:00"这类默认假设常错。实测反例：融创乐园/雪世界/体育世界实际约 **10:00** 开园，水世界约 **10:30**（并非 08:00）；深圳海洋世界约 09:30。
- **核实渠道**：携程 / 同程 / 腾讯地图 / 大众点评 / 马蜂窝等平台，取最新在售/官方公告信息；页面须注明"以出行当日景区官方公告为准"。
- **需核实字段**：
  - 营业/开放时间（开园、闭园）
  - 停售 / 停入园时间（如雪世界 19:30 停售、20:30 停入园）
  - 闭馆日（尤其**周一闭馆**，节假日除外——人文/博物馆类常见）
  - 门票参考（成人/儿童/免费）
  - 季节性限开（如室内水世界冬季或部分日期限开，须出行前确认）
- **人文/博物馆类**：多为 9:00–17:00 且**周一闭馆**，行程安排须避开周一，或加闭馆提醒并给出替代方案。

### 13.2 行程表必须对齐真实营业时间

- 各方案 `plan-summary` 总表与 timeline 时间标签，须用核实后的真实开园/开放时间，不得写"开园即入"而实际未到时间。
- 若出发早、场馆未开：早到时段改安排「综合体早餐 + 行李寄存 + 开园前缓冲」，既避出城高峰又不白等（花都周末家庭游-new 融创即为范例）。
- 夜间场馆（雪/水/体育/大马戏）多营业至 21:00 后，夜场安排合理。
- 复核要点：开园时间误写、时段与营业时间冲突、闭馆日撞行程，均须在发布前修正。

### 13.3 新增「营业时间 & 行程复核」章节

- 每个攻略型子站建议含独立 `section#hours`，内容：
  - **对照表**（列：景点/场馆、营业/开放时间、门票参考、备注），逐行列出已核实数据。
  - **「行程复核结论」提示框**：列出已修正点（如"原 08:00 误写，已改 10:00 开园 + 缓冲"）+ 避坑提醒（周一闭馆、水世界冬季限开等）。
- 导航栏加 `<a href="#hours">营业时间</a>` 锚点；各 section 设 `scroll-margin-top` 防遮挡。

### 13.4 各景点卡加开放时间行

- 每个 `spot-card` 内加一行 `.spot-hours`，写明该景点真实开放时间 + 闭馆日 + 门票，例：
  `🕘 开放时间：9:00–17:00（16:30停入），周一闭馆。免费。`
- **有图无卡的景点须补卡**：画廊/目录里有真实图片但该景点此前没建 `spot-card` 的（如 花都周末家庭游-new 的圆玄道观），须补 `spot-card`，保证"图—卡"一致、不被遗漏。
- 全站 `spot-card` 数量应与"实际纳入行程/推荐清单的景点数"一致（用脚本校验）。

### 13.5 人文历史景点补详细背景解说

- 对周边**人文 / 历史 / 非遗 / 宗教 / 地质**类景点，**必须**补充面向孩子的背景解说，让孩子看景不只是看热闹（呼应 §11.6 人文历史补充）。
- 建议新增独立 `section#culture`（标题如「人文背景·给孩子的解说」），用 `culture-card` 呈现，每张含两部分：
  - **背景**：景点是什么、历史脉络、文化/科学价值（例：洪秀全与太平天国近代史、资政大夫祠三雕两塑一彩与非遗、圆玄道观道教文化、石头记矿物园地质科普、曼古园东南亚文化）。
  - **讲给孩子听**：口语化、可互动的知识点列表（含小任务/对比/提问），降维到儿童能理解；避免长段落说教。
- 导航栏加 `<a href="#culture">人文背景</a>` 锚点；`IntersectionObserver` 观察器须将 `.culture-card` 纳入渐显集合（否则新卡不触发动画）。
- **覆盖类型建议**（新增人文线时参考）：近代史、岭南古建与非遗、道教/佛教/宗族文化、地质科普、东南亚/异域文化。
- 可选增强：在方案 B（人文历史方案）的 timeline 文案里加"可给孩子讲：…"钩子，把解说前置到行程中。

### 13.6 验证清单补充（攻略型子站）

在 §12.7 基础上追加以下条目（均须通过方可发布）：

- [ ] **营业时间已联网核实**（携程/同程/腾讯地图等至少 2 源交叉），非凭惯例填写
- [ ] **行程表时间标签对齐真实开园/开放时间**，无"08:00 开园即入"类误写
- [ ] **周一闭馆 / 季节性限开**景点已加提醒，行程未撞闭馆日（或已给替代方案）
- [ ] 含「营业时间 & 行程复核」章节（`#hours`），导航锚点一致、表格数据已核实
- [ ] **每个 `spot-card` 有 `.spot-hours` 开放时间行**
- [ ] **有图无卡的景点已补 `spot-card`**，`spot-card` 数量与推荐清单一致
- [ ] 含「人文背景·给孩子的解说」章节（`#culture`），`culture-card` 含【背景】+【讲给孩子听】两部分
- [ ] 导航含 `#hours` / `#culture` 锚点，`IntersectionObserver` 观察器覆盖 `.culture-card`
- [ ] **正文交叉引用已改为可点击锚点**：时间轴/景点卡里"详见 XX"等引用用 `<a class="in-doc-link" href="#目标id">` 实现，每个大章节结尾有"返回顶部"（`#top`），无死链（详见 §13.7）
- [ ] **出行前已联网核实天气**：含户外/沿海/山地/水域/台风季(7–9月)/雨季(4–6月)的行程，已搜索气象网站评估天气对行程的影响，非纯室内行程（详见 §13.8）
- [ ] **含「天气影响评估」章节或提示框**（台风/暴雨/大风预警时必含）：逐段风险对照表 + 调整建议，已指出必保室内段、户外段取舍、返程风险（详见 §13.8）
- [ ] **方案选择区各方案可深链**：点击任一方案后地址栏出现 `#方案id`（如 `#planE1`）；以 `index.html#方案id` 直接打开能自动切换到该方案（详见 §13.9）

### 13.7 页内锚点链接（交叉引用 + 返回顶部）

长图文攻略页必须有"可跳转"的内部导航，避免读者在大段内容里迷路。统一规则：

- **正文交叉引用必须可点击**：行程时间轴/景点卡里出现的"详见「人文背景·给孩子的解说」"等引用，不能写成纯文本，必须改为 `<a class="in-doc-link" href="#目标锚点">文字</a>`，跳转到对应章节或卡片。
- **被引用元素要带 `id`**：目标章节/卡片须有 `id`（如人文卡 `id="culture-yuanxuan"`、`id="culture-stone"`），锚点精确指向具体卡片而非整节；跳转体验更准。
- **每个大章节结尾加"返回顶部"**：在 `<section>` 闭合前插入 `<div class="section-backtop"><a href="#top">↑ 返回顶部</a></div>`。页面 hero 区须有 `id="top"`（顶部导航"首页"也指向 `#top`），形成"读到底一键回顶"的闭环。
- **URL 必须显式带片段（#hash）**：锚点点击不能只滚动、不更新地址栏。统一用一段 JS 接管所有 `a[href^="#"]`（`initAnchors`）：`e.preventDefault()` → `target.scrollIntoView({behavior:'smooth'})` → `history.pushState(null,'',hash)` 把 `#片段` 写进 URL。这样点击后地址栏可见 `index.html#culture-stone`，且能把带 `#片段` 的链接复制给别人直接深链到该章节。**注意**：在 WorkBuddy 预览面板（iframe 渲染）里，片段只更新 iframe 内部地址、顶部预览地址栏不变属正常；用浏览器直接打开或部署到 Netlify 后顶部地址栏即显示片段。
- **打开即定位（深链）**：页面加载时若 `location.hash` 非空，监听 `load` 后 `setTimeout(...scrollIntoView, 450)` 自动滚到该章节，保证分享链接一打开就到正确位置。
- **跳转不被吸顶导航遮挡**：给 `section[id], .culture-card[id]` 加 `scroll-margin-top: 80px`（吸顶导航高度余量），避免锚点落点被固定导航盖住。
- **样式复用**：`.in-doc-link`（强调色 + 下划线）、`.section-backtop`（居中圆角描边按钮、hover 高亮）的 CSS 见 `花都周末家庭游-new/index.html` 的 `<style>`「页内锚点链接」段或 `home/src/site-template-travelogue.html`，新增子站直接复用同款，无需重新设计。
- **验证**：发布前确认① 所有 `in-doc-link` 的 `href` 都能在页面内找到对应 `id`（无死链）；② `section-backtop` 数量 = 大章节数；③ 点击任一锚点后地址栏出现 `#片段` 且平滑滚动到位、无吸顶遮挡；④ 直接以 `index.html#某id` 打开能自动定位。

> 目的：让分散在各方案、各章节的信息能**双向跳转**——从时间轴跳到详解，读完详解一键回顶部继续浏览，且每段都可生成可分享的深链 URL（"方向链接"）。

> **规则已上升为项目级**：本条锚点链接规范已提炼并上升为仓库根 `AGENTS.md` 的 **§13 页内锚点链接规范（通用，所有 HTML 必遵循）**，作为全仓库 HTML 的通用强制规范。本 §13.7 仅保留攻略页场景的补充说明；权威来源与最新版本以项目级 **§13** 为准，后续新增/改动任何 HTML 页面均须遵循根级 §13。

### 13.8 出行前天气核实（强制步骤，所有出行计划必遵循）

- **强制触发**：凡攻略型子站的多方案行程，定稿/发布前**必须联网搜索天气网站**，评估天气对行程的影响。尤其含**户外、沿海、山地、水域、台风季(7–9月)、雨季(4–6月华南前汛期)**的行程，天气是出行安全与体验的第一变量，不可省略。
- **纯室内行程**（如纯博物馆/商场/室内乐园一日游）可简略：仅需确认当日无极端预警、场馆正常开放即可。
- **核实渠道（至少 2 源交叉）**：
  - 官方：中央气象台 (nmc.cn)、中国天气网 (weather.com.cn)、各省/市气象局官网。
  - 区域：广东天气 / 广州天气 / 深圳天气等官方微博、微信公众号、停课停工信号。
  - 工具：Windy、彩云天气、腾讯地图天气，用于降水雷达、风力可视化、短时临近预报。
  - 预警信号：台风蓝/黄/橙/红、暴雨、雷雨大风、高温等预警的发布状态与生效时段。
- **需核实字段**：
  - 出行日期逐日的天气预报（晴/多云/雨/雷/台风外围影响）。
  - 气温与高温预警：7–9 月华南常 35℃+，户外段须避开正午（呼应 §11.3）。
  - 降雨概率与量级（小雨/中雨/暴雨/特大暴雨）：影响户外景点与返程高速。
  - 风力与阵风等级：沿海/山地/水域尤甚；台风季须追踪**台风编号、路径、登陆时间与地段、中心风力**。
  - 预警信号等级与生效时段：一旦发布台风黄/橙/红或雷雨大风橙色以上，户外段一律取消。
- **评估方法（对照行程时间轴）**：
  - 把出行日期天气时间线与行程 D1/D2 各节点逐段比对（如"25日白天外围高温、25夜风雨抵穗、26全天主要影响"）。
  - 逐段打风险徽章：**🟢低（室内/无影响）｜🟡注意（需带雨具/防晒/避峰）｜🔴高（户外高危/建议取消或改期）**。
  - 重点盯：户外景点、夜游、自驾返程、高速路段。
  - 区分"登陆核心区"与"外围影响区"：花都等内陆/外围区域风力远低于登陆点，先校准天气系统位置再下结论，避免夸大或轻视（参照 花都周末家庭游-new 方案 E 台风「红霞」章节的位置校准段）。
- **输出要求**：
  - 在受影响方案内（或方案末尾）追加独立「天气影响评估」章节，结构建议：① 位置校准（台风/天气系统位置与影响程度）② 逐段风险对照表（时段·活动·地点·风险徽章·说明）③ 调整建议（必保室内、户外取消/改期/只玩室内段、返程提前或延后、出发前必查预警）。
  - 参照范例：花都周末家庭游-new 方案 E 末尾「台风『红霞』对方案E的影响与备选」章节（含台风影响时间窗色条 + 逐段对照表 + 核心取舍）。
  - 若天气平稳无预警：可在「实用贴士 / 天气备选」框写一句"出行前请查当日天气"即可，不必单列章节。
- **出行当日必查**：出发前一日与出发当日，再查一次实时预警与雷达；若新发预警升级，即时调整户外段或取消。
- **联动 §11.3 天气策略**：高温日把户外段排上午/傍晚、下午避暑；暴雨/大风日把户外段替换为室内（雪世界/水世界/博物馆/酒店）。

> **触发来源**：本条规则来自用户明确要求——"日后所有出行计划都需要提前搜索天气网站的天气情况评估对出行的影响"。与 §13.1 营业时间核实并列，作为攻略型子站定稿前的两道"联网核实"强制关卡。
> **作用域限定（不上升项目级）**：天气分析仅适用于出行计划类内容，而仓库内仅 `四季景点` 子站涉及行程规划（其余子站为志愿查询/健康档案/家电选购/学习资源，无出行场景）。故本条规则**仅保留在 `四季景点/AGENTS.md`**，不上升为根 `AGENTS.md` 通用规范——避免对非出行子站产生噪音与误导（区别于 §13.7 锚点规则，后者因适用所有 HTML 页面才上升）。

### 13.9 方案选择锚点（方案可深链）

攻略页「方案选择」区的每个方案选项（`.plan-btn`）必须可经由 URL 片段直接定位 / 分享，让家人能"打开链接即看到某方案"，不限于默认第一个。统一规则（参照 `花都周末家庭游-new/index.html` 的 `switchPlan` 实现，或 `home/src/site-template.html` 规划型模板）：

- **点击方案须同步 URL 片段**：`switchPlan(planId)` 在切换后调用 `history.replaceState(null,'','#'+planId)` 把 `#方案id` 写入地址栏。用 `replaceState` 而非 `pushState`，避免每切一次方案就污染浏览器历史栈（返回键不会在方案间反复横跳）。
- **打开即选中（方案深链）**：页面加载时若 `location.hash` 命中方案 id 列表（`PLAN_IDS = ['planA','planB','planC','planD','planE','planE1']`），须自动 `switchPlan(该id, true)` 切到该方案，并滚到「方案选择」区（`#plans` / `.plan-selector`）方便查看；与 §13.7 的章节深链共用同一加载期 `location.hash` 判断逻辑（命中方案 id 走切换分支，否则走 `scrollIntoView` 章节分支）。
- **方案 id 与内容块对应**：每个方案内容块须带 `id="planA"…"planE1"`（即 `switchPlan` 的目标）。「方案选择」区本身带 `id="plans"`，可作章节锚点。
- **`switchPlan` 通用遍历、零改动**：新增方案只需在 `plan-selector` 加一个 `<button class="plan-btn" onclick="switchPlan('planX')">` + 在对应 `<div class="plan-content" id="planX">` 写内容；同时把 `'planX'` 补进 `PLAN_IDS` 数组即可自动获得深链能力，JS 不再改。
- **识别方案 id 的方式**：`switchPlan` 内用正则 `/switchPlan\('([^']+)'\)/` 匹配按钮 `onclick` 来定位"当前激活按钮"，不依赖 `event.currentTarget`，更稳。
- **验证（发布前必过）**：
  ① 点击任一方案后地址栏出现 `#方案id`；
  ② 以 `index.html#planE1`（或任一方案 id）直接打开，自动选中该方案、不落在默认方案；
  ③ 新增方案后 `PLAN_IDS` 已同步包含其 id，深链不失效。

> 目的：把"方案切换"纳入整页锚点体系——既与 §13.7 的章节深链一致（地址栏可见、可分享），又解决"方案是 JS 互斥切换而非普通锚点"的特殊性：用 `#方案id` 既定位又切换，让家人能把"直接看方案 E1"的链接发给彼此。本 §13.9 为攻略页场景补充，权威锚点通用规范以 §13.7 / 根级 §13 为准。

---

## 14. 标准子站模板（攻略型 / 纯游记型）

> 2026-08-10 评审确定两套互补模板，取代此前"每个子站自行设计"的松散约定（§4.2「无统一模板」不再适用于新子站）：
> - **攻略 / 规划型** `site-template.html`：陌生 / 远 / 复杂、需提前规划的出行（周末家庭游、多方案亲子游）。
> - **纯游记 / 记录型** `site-template-travelogue.html`：熟悉 / 去过 / 近 / 简单、事前不规划、事后记录（2026-08-11 新增）。
> 候选 B（`kit/`）、候选 C（`site-template-themed.html`）、`CANDIDATES.md` 已于评审后清理，不作为常驻文件。

### 14.1 模板位置与组成

- **攻略型正式模板**：`home/src/site-template.html` —— 复制即用（8 段结构 + 多方案切换）。
- **纯游记型模板**：`home/src/site-template-travelogue.html` —— 复制即用（轻量结构，暖色皮肤）。
- **模板 hub 文档**：`home/src/README.md`（两套模板用法、占位符、硬规则、"何时用哪个"、标题映射）。
- **占位图**：`home/src/assets/ph1..6.svg`，预览用，正式子站须替换为真实图片；`home/src/assets/index.svg` 为首图占位演示（命名 `index.*` 会被自动选为主图，缺失则回退画廊第一张）。

### 14.1.1 模板选型决策（hybrid 页防回归）

按「是否含方案切换 + 已执行游记」选骨架，避免 花都周末家庭游-new 踩过的「游记实录不跟随已执行方案」回归：

- **纯记录、无方案切换** → 纯游记模板 `home/src/site-template-travelogue.html`（其 `#log` 常驻顶部、无门控，本就如此）。
- **多方案切换 + 已执行游记实录（hybrid，如花都-new）** → **必须以规划型模板 `home/src/site-template.html` 为骨架**。该模板已内置「游记跟随已执行方案」门控，复制即用：
  - 结构顺序：`#plans`(约 470) → `#log`(约 587, 默认 `hidden`) → `#food`(约 635, 默认 `hidden`)，**游记在方案之后且默认隐藏**；
  - 门控 JS：`getExecutedPlanId`(760) / `updateTravelogueGate`(766) / `switchPlan`(784，内部调 `updateTravelogueGate`) / `syncTravelogueNav`(805) / `initGate`(818) / 导航拦截(906，点 `#log`/`#food` 若 `hidden` 先 `switchPlan(已执行方案)`)；
  - 已执行方案按钮加 `data-executed="true"`（模板 491 行示例），邮戳由 `.plan-stamp` 渲染（§14.6.1 规则 5）。
- ⚠️ **严禁先以纯游记模板为骨架、事后补 `#plans`**：纯游记模板把 `#log` 置于顶部且常驻可见、无门控 JS，补 plans 后极易漏接门控（花都-new 曾因此踩坑，门控细则见 §14.6.1 规则 7）。

### 14.2 模板已内置的结构（无需再设计）

模板按需求固化了以下要点，新增子站直接沿用：

- **8 段式顺序（§4 重排）**：行程速览 → 景点 & 餐厅总览 → 行程方案 → 人文背景·讲给孩子听 → 营业时间 & 行程复核 → 酒店推荐 → 天气影响评估 → 实用贴士。
- **配图组件（§2）**：`.media-block` / `.culture-card` / `.timeline-content` 内嵌主图 `.media-cover` + 缩略图条 `.media-gallery`，点击缩略图切主图。**首图由 JS 自动解析**：画廊中命名 `index.*` 的图优先作主图；若漏命名 `index.*`（常见），回退为画廊第一张作为主图（兼容缺失，绝不空白）；当前主图从缩略图条隐藏，点击切换时原主图回到条中；仅一张图时隐藏整条。HTML 里 `<img class="media-cover">` 的 `src` 为占位、会被 JS 覆盖，**不要手动改它定首图**——要定首图请在画廊里命名 `index.*` 或调整顺序。
- **行程方案（§3/#5）**：先 `plan-summary` 行程表，再 `timeline` 按时间点展开，节点内嵌 `.media-cover + .media-gallery`；多方案用 `plan-selector` 外壳 + `switchPlan()` 切换、支持 `#方案id` 深链。
- **XBrain IP（§6）**：完整 Logo + 滚动淡出 + 顶部固定导航（移动端汉堡）+ 页内锚点（`in-doc-link` / `section-backtop`）。
- **纯游记型内置结构**（`site-template-travelogue.html`，与攻略型共享 Logo / top-nav / 媒体组件 / JS）：hero（含日期·同行·交通·天气 meta）→ 行程总览（关键事实卡）→ 游记实录（若干 `.log-chapter` 章节，每章时间标签 + 叙述 + 可选 `.media-block` 组图）→ 美食 & 随手发现 → 实用信息。**无**多方案切换、**无**强制「营业时间 & 行程复核」、无出行前天气预警；营业时间 / 花费 / 停车写在「实用信息」，属回忆性备注（非出行前强制核实）。

### 14.3 模板不替代的硬规则（仍须执行）

模板只管"骨架与组件"。以下 §12 / §13 规则对**攻略型**子站不因用模板而免除，定稿前逐项过；**纯游记型**为事后记录，营业时间 / 天气等按回忆性备注处理（见 14.2），不强制出行前联网核实，但 Logo、锚点、图片路径校验等同理适用：

- 营业时间须**联网核实**（§13.1），行程表时间标签对齐真实开园/开放时间，含「营业时间 & 行程复核」章节（§13.3）。
- 人文/历史类景点补「人文背景·讲给孩子听」（§13.5）。
- 出行前**联网核实天气**并补「天气影响评估」（§13.8，户外/沿海/台风季强制）。
- 方案深链（§13.9）、文档内锚点（§13.7）、`spot-card` 开放时间行（§13.4）齐备。
- 发布前校验：全局 `<div>` 数 = `</div>` 数；行程表每行 4 列填满；画廊图片路径真实存在（§12.7 / §13.6）。

### 14.4 换肤与既有子站

- **换肤**：仅改 `:root` 的 `--accent` / `--accent2` / `--hero-grad` 三处（XBrain 深色品牌底座保留），无需动结构。
- **既有子站不回溯迁移**：深圳 / 惠东周末家庭游 / 古埃及展南沙周末家庭游 维持各自现有结构，仅后续新增子站套用本模板。（注：花都周末家庭游已于 2026-08-12 重编为 花都周末家庭游-new，按 src 游记模板重建，属例外重做而非回溯迁移。）
- **导航首页（数据驱动）**：`四季景点/index.html` 已于 2026-08-11 重设计为**数据驱动主站入口**——子站全貌由页面内 `SITES` 数组（JS 对象数组）渲染，支持搜索 / 地区·主题·状态筛选（**已实现/未实现，强制二选一，无「全部」，无排序下拉——排序由状态驱动**）/ 卡片↔管理表格双视图 / 草稿专区 / 模板入口。新增子站**只需在 `SITES` 数组追加一条对象**（`name/title/region/regionTag/theme/type/status/updated/date/cover/desc/hasLog`，字段含义见 §15.5），卡片、统计、筛选、管理表会自动更新；封面图缺失（`cover:''`）则**留空不显示占位**（已删除 `onerror` 渐变回退死代码，详见 §15.4）。已发布子站 `href="./<name>/index.html"`；**【未实现】子站显示「未实现」徽标**，草稿（无页）卡给「用纯游记模板补建」CTA。状态 / 排序 / 首图等完整口径以 **§15** 为准。

### 14.5 纯游记子站内容生成规则（素材 → 页面）

> 当子站目录下已有 `README.MD`（叙事底稿）+ 一批 `主题-YYYY-MM-DD-HHMMSS.<ext>` 命名的图片/视频文件时，按本工作流生成纯游记子站（基于 `site-template-travelogue.html`）。本规则从「白云乐8小城周末家庭游」首次落地时提炼，后续同类子站复用，**不要再参考其它游记子站的结构**（模板即唯一权威）。

**1. 素材即数据源（双重）**
- `README.MD`：叙事底稿，含出行时间、简介、关键情节与**情感线索**（如乐8「3 年前学校发的'钱'，3 年后带回再用」的温情、荒废商场 vs 崭新云门的对比）。
- 媒体文件名：时间戳（`-YYYY-MM-DD-HHMMSS` 或 `_YYYYMMDD_HHMMSS`）是章节时间锚点；中文描述（`-升旗队-` / `-押运-` / `-消防-`）是主题关键词。

**2. 文件名 → `.log-chapter` 映射**
- 将所有媒体文件按时间戳**升序**排列，按「连续时间簇 / 同一主题」聚合为若干 `.log-chapter`。
- 每章 `chapter-time` 取该簇**最早**时间戳（HH:MM）；视频（`.mp4` / `.mov`）与图片同簇归入同章。
- 模板媒体组件默认只支持图片：视频须在章节内**额外加 `<video controls playsinline>` 元素 + 配套 CSS**（`.media-block` 之外单列 `.chapter-videos`），**不可**塞进 `.media-gallery`（画廊只认 `<img>`，视频放进去不渲染）。

**3. 叙述还原 + 真挚情感**
- 每章正文基于 README.MD **还原真实经历**（谁 · 在哪 · 做了什么 · 孩子/家人反应），并**补充情感线索**。
- **禁止规划腔、禁止虚构未发生的情节**——纯游记是事后记录；与攻略型（§13）不同，营业时间 / 花费 / 停车写在「实用信息」属回忆性备注即可，不强制出行前联网核实。

**4. 首图与封面**
- 章节主图由模板 JS 自动解析画廊首张（画廊无 `index.*` 时回退第一张）→ **把最想作主图的图放画廊第一张**来定主图，不要手改 `.media-cover` 的 `src`。
- 子站目录下放置 `index.html.<ext>` 作为导航首页卡片封面（§15.4）。

**5. 媒体平铺约定**
- 素材直接平铺在子站根目录（与 `index.html` 同目录），引用用相对路径（如 `乐8小城-升旗队-2026-08-09-114444.JPG`）。
- 文件名含特殊字符（空格、`(1)`、全角、大小写混杂如 `IMG_20260809_122729.jpg`）须**原样保留**，shell 命令用单引号包裹。

**6. 发布联动（建成即升「已实现」）**
- 子站 `index.html` 建成后，在导航首页 `SITES` 把该对象置 `status:'published'` + `hasLog:true` + 填 `date` + `cover:'./<子站名>/index.html.<ext>'`（§15.5 / §15.6）→ 自动从【未实现】升【已实现】并按出行日重排，无需改其它逻辑。

## 14.6 纯游记子站防回归硬规则（素材 → 页面 · 固化）

> 以下规则提炼自「深圳周末家庭游」游记页多轮修复（竖屏裁切、坏视频、素材错配、空/坏章节）。**模板 `site-template-travelogue.html` / `-core.html` 已内置对应 CSS/JS（§14.6.1），但本节的编排/生成/校验规则必须由 agent 在生成内容时遵循**——模板只管"组件长什么样"，不管"素材怎么分组、有没有漏/错配"。参考实现：同子站 `index.html`（已修复版）+ `gen_log.py`（生成器原型）。

### 14.6.1 媒体展示硬规则（模板已内置，勿手改覆盖）

1. **竖屏图完整显示**：`.media-cover img` 默认 `object-fit: cover` 塞进固定 16:10 框，会把竖屏图（高>宽）上下裁掉一半。模板已内置 `.img-portrait` 变体（`object-fit: contain` + `max-height:82vh`）+ `syncOrient()` JS（按 `naturalHeight>naturalWidth` 自动加类）。**不要**把 `.media-cover` 改成固定高度硬裁；新增主图容器一律复用 `.media-cover`，方向自适应交给 JS。
2. **视频源必须是 .mp4（仅指 `src` / `<source src>`）**：`<video>` 的 `src` / `<source src>` 一律指向真实 `.mp4` 文件，**绝不能是 `.jpg`/`.png`**（浏览器无法把静态图解码为视频，会整块黑屏/无法播放）。曾把 `…192641.jpg` 当视频源，导致"视频播放不了"。`poster` 属另类（见规则 6），**不要**在 `src`/`source` 之外把 `.mp4` 塞进 `poster`。
3. **视频必须独立整宽块，不可塞进 `.media-gallery`**：画廊是 `84×63` 横向缩略条、只渲染 `<img>`，把 `<video>` 塞进去既不渲染、又撑破布局（退潮章曾因此错乱）。视频一律用独立 `.log-video` 块（模板已定义 CSS）单列在 `.media-block` 之外。
4. **当前封面缩略图保持可见（高亮，勿隐藏）**：JS 给「当前封面」缩略图打 `is-cover` 类，CSS **绝不可写 `display:none`**——否则多图章里该缩略图从条中消失，缩略图条永远少一张、默认首图无占位，交互违和。模板已内置 `.media-gallery img.is-cover { border-color: var(--accent); opacity:1; box-shadow: 0 0 0 2px var(--accent); }`（高亮当前图）。单图章由 JS `gallery.style.display = visible ? '' : 'none'` 自动隐藏整条，无需此规则干预。
5. **已执行方案邮戳 = 红色圆形 + 执行日期**：`data-executed="true"` 的方案按钮，其 `.plan-stamp` 必须是**红色（`#e0322f`）圆形邮戳**（双环：`border` 外圈 + `::before` 内圈，`border-radius:50%`，`transform:rotate(-14deg)` 拟手盖），内含「已完成」+ 执行日期（如 `2026.07.11`）。**不要用**原来"细虚线小方章 + 主题蓝 + 隐藏首图缩略图"样式（太小不显眼）。布局上给 `.plan-btn[data-executed="true"]` 加 `padding-right:4.8rem` 留出右上角圆形空间，邮戳 `position:absolute; top:.5rem; right:.5rem`（`pointer-events:none` 不挡点击）。模板 `site-template.html` 的邮戳日期用 `{{执行日期}}` 占位，克隆时填真实出行日。
6. **视频首屏预览（不播放即显首帧）= `preload="metadata"` + 不设 `poster`**：参考「古埃及展南沙周末家庭游」子站（8/2 13:00–15:30 南沙天后宫·风铃视频）已验证实现——`<video controls preload="metadata">` **不设 `poster`** 时，浏览器原生把视频**第一帧**当封面显示，无需 ffmpeg 抽帧、无需 poster 图。**严禁 `poster` 指向 `.mp4`**（`poster` 只能接收图片 URL，指向视频文件无效 → 整块黑屏；深圳页曾因此 14 个视频全黑）。若确需自定义首帧，`poster` 须指向真实 `.jpg`/`.png` 首帧图，否则一律省略 `poster`。`.log-video` CSS 的 `background:#000` 仅作首帧加载前的瞬间底色，首帧就绪即被覆盖。

7. **游记跟随「已执行」方案（hybrid 页必须接线，否则回归）**：若子站同时含「方案切换」（`switchPlan` + `data-executed="true"` 方案按钮）与「游记实录」（`#log`/`#food`），必须按规划型模板 `site-template.html` 约定接线，否则会出现"游记实录不跟随已执行方案"的回归。四点硬约束：① `#log`/`#food` 在 DOM 中必须位于 `#plans` **之后**（不是顶部）；② 默认带 `hidden`，仅当 `data-executed` 的方案被 `switchPlan` 选中才显（`updateTravelogueGate(planId)` 用 `getExecutedPlanId()` 比对显隐）；③ `switchPlan` 内调用 `updateTravelogueGate`，加载时执行 `syncTravelogueNav()` + `initGate` 同步；④ 导航点击 `#log`/`#food` 时若 `target.hidden`，先 `switchPlan(已执行方案)` 再滚动。⚠️ **易错根因**：直接以纯游记模板 `site-template-travelogue.html` 为骨架、事后补 `#plans` 时，原模板把 `#log` 放在顶部且常驻可见、无门控 JS——必须显式改造（移动到 `#plans` 之后 + 加 `hidden` + 接门控 JS），否则即违反本规则（花都周末家庭游-new 曾踩此坑）。未执行的纯规划页应直接删掉 `data-executed` 与 `#log`/`#food`（相关导航由 `syncTravelogueNav` 自动隐藏）。

### 14.6.2 游记编排规则（主题优先 + 连续时段归并）

素材文件名已带权威时间戳（`IMG_20260711_192422` / `事件-YYYYMMDD-HHMMSS`），编排时**以时间戳为硬约束**，避免"薄章节凑图"导致的错配与重复。

- **R1 时间戳解析（主键）**：统一解析为精确到秒的 datetime，排序与归属的唯一依据。
- **R2 行程段时间窗（半开区间）**：按真实动线分窗（如 入住12:00–15:00 / 儿童乐园15:00–17:00 / 沙滩疯跑17:00–18:30 …）。时间戳落在哪个窗，归哪个章。
- **R3 事件标签覆盖**：`沙滩兄弟`→沙滩疯跑、`儿童乐园`→儿童乐园、`Mshow`→M-show、`晚饭后散步`→夜里美高梅，处理时间相邻的同地点不同活动。
- **R4 唯一归属、禁止重复**：每张素材只在一个章节出现，哪怕"氛围像" M-show，也按时间戳归 19:30 段（曾把 192422/193000 两图同时塞进 M-show 与夜里美高梅，造成重复）。
- **R5 「无图必然不对」硬规则**：任何章节若**无真实素材支撑**（既无图也无视频）且非显式文本章，必须删除或合并；**绝不允许引用磁盘上不存在的文件**（曾出现 `沙滩兄弟_20260711_203826.mp4` 引用了根本不存在的文件，形成坏/空章节）。生成器 `keep_theme()` 只渲染「有真实素材」或「显式文本章（`text=True`，如'妈发烧'）」的主题，其余一律跳过。

### 14.6.3 确定性聚类（"动态归并"必须收敛为可复现算法）

"把明显连续时段内的多主题归并"是合理意图，但**不能写成每次结果浮动的模糊规则**——否则同一文件夹两次构建出不同章节结构，已发布页面会"自己变结构"。收为两个可调常量 + 作者硬边界：

```
排序：所有素材按 datetime 升序
逐对聚类：
  gap > GAP_MAX(默认90min)           → 新聚类（强拆，跨大间隔必断）
  否则 theme 变化 且 gap > THEME_MIN(默认20min) → 新聚类
  否则（同/邻主题且连续）            → 归入当前聚类（归并）
[豁免] 同地点前缀 且 gap < 60min    → 强制归并（贴合叙事直觉）
PINNED：作者显式锚定的章节边界（如 {清晨退潮, 清晨最后一眼}），防止过度合并
```

- 调大 `GAP_MAX` / 调小 `THEME_MIN` → 合并更多；`PINNED` 防止误并。
- 实测：默认阈值下算法**自动复现**手工精修的 13–14 章结构（含 M-show 独立成章、192422 归回夜景段），证明规则内核成立。
- **已知边界**：纯文件名无法区分"同主题跨章"（如 `酒店沙滩景致` 在 06:03 与 07:18 都用），此时用 `PINNED` 做人工兜底——数据能推导的自动化，数据推不出的用少量 override 补。

### 14.6.4 文件名契约（R0）

新增素材命名统一为：`[地点-]主题-YYYYMMDD-HHMMSS.<ext>`
- **主题词取自受控表**（避免 `海边走走`/`沙滩散步` 被判两主题）；地点前缀可选但固定。
- 文案层（`主题 → {标题, 叙述, 标签}`）单独做成映射表，聚类结果查表取文案；查不到用默认模板——既去"放错章节"错误类，又保住手写叙事质量。

### 14.6.5 生成器范式（素材 → #log 自动重排）

参考「深圳周末家庭游/`gen_log.py`」：构建期扫描 `游记/`（浏览器无法列目录，故必须在构建期做）→ 解析时间戳+主题 → 确定性聚类 → 渲染 `#log` 章节 HTML + 输出对比报告。已验证可替代手工反复校对，零人工错配风险。推广到其它游记页时把阈值/主题映射/文案表抽成独立配置文件。

### 14.6.6 发布前校验清单（纯游记子站专用，须全过）

在 §12.7 / §13.6 / §15.7 之外，纯游记子站额外过以下项（脚本化优先）：

- [ ] **全局 `<div>` 开 = `</div>` 闭**（曾因脚本 split 吞掉 `<div class="log-chapter">` 开头标签导致失衡）。
- [ ] **资产双向覆盖**：页面引用的每张 `游记/...` 都在磁盘存在（`MISSING=[]`），磁盘每个媒体都被引用（`UNUSED=[]`）。用脚本比对 `re.findall(r'游记/([^"\'>\s]+)')` 与 `os.listdir('游记/')`。
- [ ] **坏视频检测**：所有 `<video src>` / `<source src>` 必须 `.mp4` 结尾（无 `.jpg/.png` 源）；且 `poster` 属性若存在必须指向图片（`.jpg`/`.png`），**不得指向 `.mp4`**（指向视频文件 → 黑屏）。推荐直接用 `preload="metadata"` 原生首帧，省略 `poster`。
- [ ] **竖屏图检查**：`.media-cover` 容器未被固定高度硬裁（依赖模板 `img-portrait` + `syncOrient`）。
- [ ] **视频不在画廊内**：`<video>` 不出现在 `.media-gallery` 中。
- [ ] **内嵌脚本语法**：提取末段 `<script>` 喂 `node --check` 通过。
- [ ] **门控标志**：`#log` / `#food` 若按 recap 门控，`hidden` 属性正确；`goToLog()` 等门控函数已定义。
- [ ] ⚠️ **沙箱 heredoc 陷阱**：Bash heredoc 中反斜杠会被沙箱转义、破坏正则/JS；验证/拼接脚本优先用 Write 写成 `.py`/`.js` 文件再执行，避免内联转义出错。
- [ ] ⚠️ **超大单文件 HTML 写入（Write 400 长度超限）**：单文件子站（如 1700+ 行）一次 `Write` 可能触发 `400 input length too long` 被截断，留下悬空标签。规避/恢复：分多次写入（首段 `Write` + 后续段用 `Edit` 续写），或截断后读尾 + 分段 `Edit` 补全；每阶段结束校验 `<div>`/`<section>` 配平与末段 `<script>` 过 `node --check`（见上文各项）。

### 14.6.7 旧 hand-authored 子站 → src 规范迁移方法

重编/迁移旧「手编」子站（如已删除的 `花都周末家庭游`）到新模板规范时，旧专属内容须**全部保留、不遗漏**，仅把呈现形式改为新组件：

- **旧 `background-image: url('...')` 景点卡 → `.media-block`**：改为 `<img class="media-cover">` 主图 + `.media-gallery` 缩略图条（JS 自动选封面、竖屏 `syncOrient` 完整显示、当前封面 `is-cover` 高亮，§14.6.1 规则 1/4）。旧自定义灯箱 JS（`openWaterfall`/`openGallery` 等）直接删除，改用模板媒体组件（参考 `home/src/site-template-travelogue-core.html`）。
- **旧台风 `.tf-note` 块 → 语义化 `.typhoon-note`**：结构为 `h4` 标题 + `.tf-sub` 副标题 + `h5` 小节 + `p` 正文 + `.tf-win` 时间窗色条（橙色/蓝色段落）。CSS 与实例见 `花都周末家庭游-new/index.html` 第 322–327 行与 `#typhoon-e`/`#typhoon-e1`。
- ⚠️ **`.typhoon-note` 当前仅定义在 花都周末家庭游-new（未入模板）**：下次同类重编应将其 CSS/HTML 抽入 `home/src/site-template-travelogue-core.html` 复用，避免重复定义。
- 旧站全部专属内容（多套方案 A–E+E1、9 景点、5 人文、4 酒店、预算对比、QA、路线、营业时间复核、台风评估 ×2）按上述组件重构后保留，内容对等（新＝旧）。

## 15. 四季景点主站入口页（index.html · 数据驱动重设计）

> 2026-08-11 因子站增多，将原本"手填 `.site-card`"的静态入口重设计为**可浏览 + 可管理**的数据驱动页面（双视图：卡片 / 管理）。时间轴作为"出行轨迹"概览**内嵌于卡片视图**（位于卡片网格下方），朋友圈式垂直信息流。本页所有展示由页面内 `SITES` 数组（JS 对象数组）渲染；**状态 / 排序 / 首图规则已几经迭代，以下为当前（2026-08-11 末）权威口径，改动须与此一致。**

### 15.1 页面能力
- **全貌总览**：Hero 下方统计条（子站总数 / 已实现 / 未实现 / 覆盖城市 / 主题类型），数字由 `SITES` 实时计算（已实现 = `hasLog` 计数）。
- **浏览（卡片视图）**：朋友圈式时间轴卡片（见 §15.2）+ 封面图 + 地区/主题/类型标签 + 状态徽标 + 出行日期徽标 + 简介 + 更新日期；已实现卡片点击进子站，未实现草稿卡显示「用纯游记模板补建」CTA。
- **时间轴（内嵌于卡片视图）**：卡片网格下方展示「出行轨迹 · 时间轴」，单列垂直信息流（见 §15.2）。**排序不自下拉、由状态驱动**（见 §15.3）。
- **管理（表格视图）**：点工具栏「管理」切到表格，列含 名称/地区/主题/类型/状态/更新/入口，便于一眼核对全量子站与状态；切换时卡片 + 内嵌时间轴整体隐藏。
- **检索与筛选**：关键词搜索（名称/标题/地区/主题标签/简介）+ 状态（**已实现 / 未实现，强制二选一，无「全部」，默认 已实现**）+ 地区 + 主题（后两者含「全部」并动态带计数）。**无排序下拉**——排序轴完全由状态决定（见 §15.3）。
- **草稿专区 + 模板入口**：底部面板列出 `status==='draft'`（无 index.html 页面）的子站并提示用纯游记模板补建；提供攻略型 / 纯游记型模板与 `src/README.md` 直达链接。

### 15.2 时间轴设计（朋友圈式垂直信息流）

**结构**：每个节点 = `.site-card-wrap`（`border-left` 竖线 + `padding-left` 缩进 + **`padding-top` 顶部留白**）+ `.tl-dot`（骑在竖线上的圆点）+ 卡片。移动端保留竖线（`.site-card-wrap` 仅缩小 `padding-left`）。

**节点时间标签 `.tl-time`**（关键交互元素）：
- 紧贴圆点右侧、卡片上方的**顶部时间头部**小胶囊（`position:absolute; left:17px; top:1px`，移动端 `left:13px; top:0`）。
- 已实现（有游记）→ 显示**出行时间 `date`**；`date` 缺失 → 琥珀色「待补」。
- 未实现（无游记）→ 显示**更新时间 `updated`**，琥珀色。
- 颜色：蓝 `--xb-accent`（已实现）/ 琥珀 `--xb-warn`（未实现·待补）。

**⚠️ 卡片下沉坑（已踩）**：`.site-card-wrap` **必须保留 `padding-top`**（桌面 34px / 移动 28px），让卡片渲染在圆点 + 时间标签「头部」**下方**。曾因卡片从顶部（`top:0`）渲染导致 `.tl-time` 与卡片**重叠**，靠 `padding-top` 把卡片整体下移解决——**删改此处 padding 会复现重叠，务必保留。**

**圆点颜色**：`.tl-dot` 蓝（已实现）；`.tl-dot.tl-dot-draft` 琥珀（未实现 / 草稿）。

**卡片内容 `cardInner`**（已实现 / 未实现通用）：状态徽标（已实现/未实现）→ 封面（`coverHtml`，见 §15.4）→ 出行日期徽标（「出行于 `date`」/「出行日期待补」琥珀色）→ 整理于 `updated` 副标 → 地区/主题/类型标签 → 标题 → 简介 → 入口（已发布：箭头 + 更新日期；草稿：`draft-cta` 补建入口）。

### 15.3 状态定义与排序（核心规则 · 强制）

**【已实现】严格定义**：**有执行后的游记**（以子站目录是否出现游记为准），**不等于**「是否发布了 index.html 页面」。当前（2026-09-20）已有 6 站有游记（`hasLog:true`）：**深圳周末家庭游、花都周末家庭游-new、古埃及展南沙周末家庭游、白云乐8小城周末家庭游、老表大岗周末家庭游、佛西藏山石燕岩周末家庭游**；其余为【未实现】。

**【未实现】**：无游记——既包括「有攻略页但未出行」的子站，也包括「草稿无页面」的子站。

**字段解耦（重要）**：
- `hasLog`（布尔）：表示「是否已执行真实游记」→ 决定 **已实现/未实现分类、徽标、节点圆点 / 时间标签颜色**。
- `status`（`published`/`draft`）：仅表示「有无 `index.html` 页面」→ 决定 **链接卡片 vs 草稿 CTA**，以及底部「草稿专区」面板（只列 `status==='draft'`）。
- 两者正交：有游记但暂未发文（无页）可为 `status:'draft'` 但 `hasLog:true`；有攻略页但无游记为 `status:'published'` 但 `hasLog:false`。

**筛选与排序（无手动下拉）**：
- 状态筛选强制二选一，`filters.status` 取值 `published`（映射【已实现】）/ `draft`（映射【未实现】），默认 `published`。
- **排序轴由状态决定**：
  - 【已实现】→ 按**出行时间 `date` 倒序**（由近及远，最新出行在最上层），缺失出行日（`date` 空串）的条目**统一沉到时间轴末尾**（不挤占真实轨迹），同日/均缺失按 `updated` 倒序兜底。
  - 【未实现】→ 按**更新时间 `updated` 倒序**（新→旧）。

### 15.4 首图（cover）规则

- **卡片首图统一取对应子站目录下的 `index.html.<图片扩展名>` 文件**（如 `从化吕田狮象岩/index.html.jpg`、`深圳周末家庭游/index.html.png`、`花都周末家庭游-new/index.html.jpeg`）。
- **无该文件 → `cover:''`，渲染 `.site-card-image.empty`（透明空白），不显示任何占位图。**
- 原「SVG 渐变占位 fallback」已删除：背景图加载失败**不会触发 `onerror`**，原 fallback 是死代码，故不再保留。
- **白云乐8小城周末家庭游** 子站目录下已有 `index.html.JPG`（建成后补的首图），故该对象 `cover` 已设为 `./白云乐8小城周末家庭游/index.html.JPG`；其余 8 个子站同样各有 `index.html.<ext>`（jpg/png/jpeg）。
- 若某子站**暂未**建 `index.html.<ext>` 文件 → `cover:''` → 卡片留空不显示占位。
- **给子站加封面**：在子站目录下放置 `index.html.<ext>` 文件，并在 `SITES` 把该对象的 `cover` 设为 `./<子站名>/index.html.<ext>`（相对路径即可）。
- **封面文件必须随子站 `git add`**：`index.html.<ext>` 只有进了 `git index` 才会随 `git push` 发布；漏加则线上静默空白（无任何报错），排查见根 §9.1。导航 `SITES` 条目与子站目录须同一次提交（根 §9.1 第 4 条）。

### 15.5 SITES 数据模型

```javascript
// 字段（新增子站须一次性填全）：
//   name        子站目录名（唯一，决定卡片 href="./<name>/index.html"）
//   title       展示标题
//   region      城市（统计「覆盖城市」用）
//   regionTag   地区标签（广州→从化/南沙/白云等）
//   theme       主题标签（统计「主题类型」用）
//   type        '攻略' | '游记'（展示为「攻略规划」/「纯游记」）
//   status      'published' | 'draft'（有无 index.html 页面 → 链接/CTA + 草稿面板）
//   updated     整理日期 YYYY-MM-DD（未实现时间轴据此倒序）
//   date        出行日期 YYYY-MM-DD（已实现时间轴据此升序；缺失填 '' → 自动沉末待补）
//   cover       子站首图相对路径（见 §15.4；无则 ''）
//   desc        简介
//   hasLog      布尔（是否已执行真实游记 → 已实现/未实现；当前仅古埃及 true）
//   isDraft     仅草稿卡用（可选）
var SITES = [
  { name:'古埃及展南沙周末家庭游', title:'古埃及展+南沙度假', ..., date:'2026-08-01', hasLog:true, ... },
  { name:'白云乐8小城周末家庭游', title:'白云乐8小城', status:'draft', date:'2026-08-09', cover:'', isDraft:true, ... },
  // ……
];
```

**现状（2026-08-11）**：`date` 仅 古埃及(`2026-08-01`)、乐8小城(`2026-08-09`) 有显式值，其余 7 条为空串（待用户补）；`hasLog` 仅古埃及 `true`。

### 15.6 维护要点
- **加子站**：编辑 `index.html` 内 `SITES` 数组，追加一条对象（字段见 §15.5）；卡片、统计、筛选、管理表自动更新。
- **标记「已实现」**：子站补建真实游记后，在该对象加 `hasLog:true` 并填 `date` → 自动归入【已实现】并按出行日重排；无需改其它逻辑。
- **改分类/维度**：直接改 `region`/`theme`/`type`/`status`/`date`/`hasLog` 字段，筛选器与统计自动同步。
- **保持品牌一致性**：沿用 `index.html` 内联 XBrain Logo（与子站、`src` 模板同一套 IP 规范）；深色主题变量（`--xb-deep`/`--xb-accent`/`--xb-warn` 等）勿随意改。
- **封面命名**：按 §15.4 用子站目录下的 `index.html.<ext>`；缺失即留空（不要回退旧占位逻辑）。

### 15.7 改动验证（数据驱动页面专用）

> 本页 JS 重（数据驱动 + 动态渲染），以下三项为**每次改后的必过校验**：

1. **静态 div 配平**：页面整体 `<div` 开数 = `</div>` 闭数（曾因 timetag 段落增删导致不配平）。
2. **内嵌脚本语法**：提取 `<script>` 内容喂 `node --check`（Bash：`node -e "...<script>..."` 提取后 `child_process.execSync('node --check -',{input:scriptSrc})`）。
3. **逻辑仿真**：用括号配平从 `var SITES = [` 提取到对应 `]` 后 `eval`，跑 `getFiltered('published'/'draft')` 两端分类与排序，确认：已实现 + 未实现 = 总数、无重叠遗漏、排序符合 §15.3。
4. **⚠️ 沙箱 heredoc 陷阱**：Bash heredoc 中反斜杠（`\`）会被沙箱转义，破坏正则/JS 字符串——**验证脚本优先用 Write 写成 `.js`/`.py` 文件再执行**，避免内联转义出错。

### 15.8 删除 / 重命名子站同步清单

子站被删除或重命名后，必须同步以下位置，否则门户出现破图卡、文档出现死链（花都周末家庭游 删除后曾留失效 `SITES` 卡片，已在 2026-08-12 修复）：

1. **门户 `四季景点/index.html` 的 `SITES` 数组**：删除该条目或重定向；其 `cover`（如 `花都周末家庭游/index.html.jpeg`）若指向已删目录必失效，须一并清掉。
2. **本 `AGENTS.md`**：`grep '子站名'`（精确匹配、排除 `-new` 等新名）与 `'子站名/'` 路径引用，凡指向已删目录的卡片示例 / 封面示例 / 枚举项，一律改指向幸存站或 `home/src` 模板，或标注「已退役 / 已重编为 -new」。
3. **其它子站 AGENTS 与页面交叉链接**：根 `AGENTS.md`、门户 `README.md`、各子站内 `../` 链接同理核查。

> 谨慎原则（2026-08-12 落地）：先逐处读上下文判断「改指向 / 标退役 / 保留历史溯源」，不盲目全局替换；保留的「已删站」字样须确属正当（如退役说明、§12 历史溯源），且不得造成死链或失效路径引用。
```

## 吸收的既有规则：采购与维护/AGENTS.md

> 吸收时间 20260927-112616 · 处置：标准入口原位续存。
> 本节为原文全量收录（无损），自 init 起以原文效力由 VAND 治理；与 VAND 范式冲突之处，VAND 优先。

```text
# 采购与维护/AGENTS.md — 家电选购与维护

> 本文件为 `采购与维护` 子站的专属指引，补充根 `AGENTS.md` 的类型 C 通用描述。
> 阅读优先级：**根 AGENTS.md > 本文件**。
> 本子站为纯手写多级导航，核心特殊性是 **MD 源 ↔ HTML 渲染手工双改约定**。

---

## 1. 子站定位

- **功能**：家电选购指南（新风机）与故障诊断报告（大金空调）。
- **类型**：C（多级导航），纯静态，无脚本生成、无构建。
- **不参与构建**：无 npm 依赖、无 Python 脚本，改动后直接 `git push` 部署。
- **无认证**：不接入 XBrainAuth。

---

## 2. 目录结构

```
采购与维护/
├── index.html                              # 导航首页（卡片网格，2 子页入口）
├── 大金空调制冷异常诊断报告.md              # MD 报告源（九大章节，内容真源）
├── 家用新风机选购指南-简版.html             # 简版 HTML（6 章节，纯 HTML 无 MD 源）
└── 大金空调制冷异常诊断报告/
    └── index.html                          # 大金诊断报告 HTML 渲染版（9 章节 #sec1~#sec9）
```

**特点**：混合两种子页形态——「富视觉长文档 HTML」与「MD 源 + HTML 渲染双份」。

---

## 3. 导航首页结构

- **复用门户卡片网格范式**：`.hero`(id=top) + `.sites-grid`（2 张 `.site-card`）+ `.back-link`（`../index.html` 回门户）。
- **2 张卡片**（均为占位 SVG fallback，无封面图）：
  - `./大金空调制冷异常诊断报告/index.html` → "大金空调诊断"
  - `./家用新风机选购指南-简版.html` → "家用新风机选购指南"
- **完整 XBrain Logo**：`.xbrain-brand`，`href="../index.html"`（回门户）。
- 卡片渐入动画 `IntersectionObserver`（`threshold:0.15`）。
- 复用品牌底座 `--xb-*` CSS 变量、`Noto Serif SC`/`Noto Sans SC` 字体。

---

## 4. 子页面结构与模板

两个子页共用「**顶部章节锚点导航 + main(id=top) 长文档 + back-top + scroll reveal**」富视觉长文档模板，区别于导航首页的卡片网格。

### 4.1 家用新风机选购指南-简版.html（根级子页）

- **主题**：XBrain 深色原生品牌（`--xb-*` 变量，深空背景 + 星云渐变 + 噪点）。
- **Logo**：`href="#top"`（回本页顶，⚠️ 偏差，见 §6）。
- **id="top"**：`<main id="top">`。
- **顶部导航**：`.top-nav` 含 6 个 `.nav-chip` 章节锚点（`#s1`~`#s6`）：几台/参数/品牌/推荐/安装/避坑。
- **内容**：声明 alert-bar + hero + 6 个 `h2.section-title[id]` 章节，富组件（`.solution-card`/`.tag`/表格）。
- **返回**：`.back-top`（`href="#"`），**无"返回导航首页/门户"链接**。
- **纯 HTML**：无对应 MD 源，内容直接写在 HTML 内。

### 4.2 大金空调制冷异常诊断报告/index.html（二级子页）

- **主题**：XBrain 深色原生品牌，含大气背景 + 噪点纹理。
- **Logo**：`href="../index.html"`（回采购与维护导航首页，层级正确）。
- **id="top"**：`<main id="top">`。
- **顶部导航**：`.top-nav` 含 9 个 `.nav-chip`（`#sec1`~`#sec9`），标题与 MD 九大章节一一对应。
- **内容**：hero（DIAGNOSTIC REPORT 徽章）+ 9 个 `.section[id]`，MD 表格渲染为富视觉 `<table>`，含移动端折叠步骤（`toggleStep()`）。
- **返回**：`.back-top`（`href="#top"`），无"返回导航首页"链接（只能靠 Logo 回 `../index.html`）。

---

## 5. MD ↔ HTML 手工双改约定（核心特殊性）

### 5.1 大金空调：MD 源 + HTML 渲染双份

- `大金空调制冷异常诊断报告.md`（源）与 `大金空调制冷异常诊断报告/index.html`（渲染）章节一一对应（#sec1~#sec9 = MD 一~九节）。
- HTML 是**手工编写的高保真富视觉版**，**无 `generate_*.py` 脚本、无 `GENERATED` 注释**，非自动生成。
- **⚠️ 改动诊断报告内容必须同步修改 `.md` 与子目录 `index.html` 两处**，不像健康子站有脚本自动同步。

### 5.2 新风机简版：纯 HTML 独立内容

- 无对应 MD 源，6 章节内容直接写在 HTML 内，单点维护。

### 5.3 与健康子站的区别

| 维度 | 采购与维护 | 健康（妈/哥） |
|------|------------|---------------|
| MD→HTML 同步 | **手工双改** | 脚本自动生成 |
| 生成脚本 | 无 | `generate_index.py` |
| 改内容风险 | 易漏改一处导致不一致 | 改源数据后重新生成即可 |

---

## 6. Logo / href / 锚点处理与已知缺陷

### 6.1 当前状态

| 页面 | Logo href | id="top" | 回上级方式 |
|------|-----------|----------|------------|
| 导航首页 | `../index.html`（门户） | ✓ `<section class="hero" id="top">` | `.back-link`→`../index.html` |
| 简版（根级子页） | `#top`（本页顶）⚠️ | ✓ `<main id="top">` | 无（仅 back-top） |
| 大金子页（二级子页） | `../index.html`（导航首页） | ✓ `<main id="top">` | 无（仅 back-top，靠 Logo 回上级） |

### 6.2 已知缺陷

1. **简版 Logo `href="#top"` 偏差**：未按 IP 规范"子站点 href 按层级改 `../index.html`"，简版缺回到"采购与维护导航首页"的入口（只能靠浏览器后退）。新增子页应统一为 `../index.html` 回上级导航。
2. ~~**简版 footer 断链**~~（2026-09 重构已修复）：完整版已迁入本子站为 `家用新风机选购指南-完整版.html`，footer 链接可达。
3. **两子页均无"返回导航首页"链接**：仅 back-top，UX 缺陷。
4. ~~**跨子站关联缺陷**~~（2026-09 重构已解决）：完整版已自 `query-system/home/` 迁入本子站，Logo `href="../index.html"`、首屏 `id="top"` 均已补齐，与简版形成互链。

**新增子页时遵循正确规范**：Logo `href="../index.html"`（回导航首页）+ 首屏 `id="top"` + 底部加"返回导航首页"链接。

---

## 7. 富视觉长文档模板（新增采购维护项推荐复用）

新增选购指南/诊断报告时，推荐复用简版/大金子页的模板：

```
.top-nav（fixed，居中，nav-chip 带编号 01/02…，章节锚点）
  ↓
main#top
  ↓
hero（徽章/标题/副标题）
  ↓
多个 .section[id] / h2.section-title[id]（与 nav-chip 一一对应）
  ↓
.back-top（回顶）
  ↓
footer
```

**交互**：nav-chip 滚动联动高亮（`IntersectionObserver`）+ section reveal 渐入 + Logo 淡出。
**大金子页额外**：移动端 `.flow-steps-mobile` 折叠（`toggleStep`）。

---

## 8. 新增采购维护项流程

1. 建子目录（如 `XX报告/index.html`）或根级 HTML（如 `XX指南.html`）。
2. 复用富视觉长文档模板（§7），编写 `index.html`：
   - 嵌入完整 XBrain Logo（参照 `brand/XBRAIN-LOGO-IP.md`）。
   - Logo `href="../index.html"`（回导航首页）。
   - 首屏 `id="top"`。
   - 底部加"返回导航首页"链接。
3. 若内容源自 MD，按大金模式建立 **MD + HTML 双份**并手工同步。
4. 在 `采购与维护/index.html` 的 `.sites-grid` 追加 `.site-card` 入口（href 指向新页）。
5. 本地浏览器验证全链路跳转、Logo 显示、移动端布局。
6. `git push`（无需 build）。

---

## 9. 约束与陷阱

- **MD↔HTML 手工双改**：大金空调改内容须同步改 `.md` 与 `index.html`，易漏改一处。无脚本自动同步， unlike 健康子站。
- **简版 Logo href 偏差**：`#top` 而非 `../index.html`，新增子页勿沿用此偏差。
- ~~**简版 footer 断链**~~（2026-09 重构已修复）：完整版已迁入本子站（`家用新风机选购指南-完整版.html`，含 `id="top"` 锚点与规范 Logo 链接），footer 链接可达。
- **完整版页面为浅色独立页**：与子站导航深色风格不同，新增内容时注意延续其既有配色。
- **无 build/无脚本**：纯静态，改动后直接 `git push`，仅需本地浏览器验证。
- **中文目录名**：`采购与维护/`、`大金空调制冷异常诊断报告/` 为中文路径，shell 命令与 href 须正确处理（PowerShell 用单引号包裹）。

---

## 10. 改动验证清单

### 10.1 改动大金空调诊断报告
- [ ] `.md` 源与 `index.html` 渲染版内容**同步修改**（章节一一对应）
- [ ] 9 个 `#sec1`~`#sec9` 锚点与 nav-chip 一一对应
- [ ] Logo `href="../index.html"` 正确
- [ ] `id="top"` 锚点存在
- [ ] 本地浏览器验证表格渲染、移动端折叠步骤

### 10.2 改动新风机简版
- [ ] 内容直接改 HTML（无 MD 源）
- [ ] 检查 footer 断链是否已修复（或移除断链）
- [ ] Logo `href` 与 `id="top"` 一致

### 10.3 新增采购维护项
- [ ] 复用富视觉长文档模板
- [ ] 嵌入完整 XBrain Logo，`href="../index.html"`
- [ ] 首屏 `id="top"` + 底部"返回导航首页"链接
- [ ] 导航首页 `.sites-grid` 已加卡片入口
- [ ] 若有 MD 源，建立 MD+HTML 双份并约定同步方式
- [ ] 本地浏览器验证全链路跳转、Logo 显示、移动端布局
```
