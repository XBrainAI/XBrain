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
- `query-system/publish.ps1` 指向**外部独立开发工作区**（`ws_workbuddy\ws_study8\*`）的本地同步脚本，其硬编码路径不属于本仓库。在本仓库内作业时，**以根 `npm run build` + `git push` 触发 Netlify 自动部署为唯一权威流程**，不要使用 `publish.ps1`。

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
│   ├── publish.ps1 / start.bat / ngrok.bat  # 本地辅助脚本（外部路径，勿在本仓库用）
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
└── 学习与成长/             # 【类型 C】学习资源与成长指南（纪录片推荐等）
    └── index.html
```

### 1.1 子站点 → 类型 映射

| 子站点 | 类型 | 是否参与根 build | 入口 href |
|--------|------|------------------|-----------|
| query-system | B (React SPA) | 是 | `./query-system/dist/index.html` |
| 四季景点 | C (多级导航) | 否 | `./四季景点/index.html` |
| 健康 | C (多级导航) | 否 | `./健康/index.html` |
| 采购与维护 | C (多级导航) | 否 | `./采购与维护/index.html` |
| 学习与成长 | C (多级导航) | 否 | `./学习与成长/index.html` |

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
| 部署 | `git push` | Netlify 自动执行 `npm run build` 并发布 |

**harness 约束：**
- 改动 `query-system/src/` 后，提交前**必须依次通过** `npm run lint` → `npm run test` → `npm run build`。三者全绿方可推送。
- `dist/` 与 `node_modules/` 已在 `.gitignore`，**禁止提交**。
- 纯静态子站点（健康/景点/采购）改动后无需 build，但需本地浏览器验证链接与 Logo。

---

## 3. 子站点分类与创建范式

新增子站点时，先判定类型，再按下表执行。完整模板与 Checklist 见 `README.md` 第二、七节。

| 类型 | 适用 | 关键步骤要点 |
|------|------|--------------|
| A 纯静态 HTML | 内容展示、单页 | 建目录 → 写 `index.html` → 嵌 Logo → 门户加卡片 → 验证跳转 |
| B React+Vite SPA | 交互应用 | 初始化 Vite → **`vite.config.ts` 设 `base:'./'`** → 改根 `package.json` build → `netlify.toml` 加 SPA 重定向 → 门户卡片指向 `dist/index.html` → 嵌 Logo → 本地 build 验证 |
| C 多级导航 | 聚合类（景点/健康） | 导航首页复用门户卡片网格 → 子页 `../index.html` 回导航 → Logo `href` 按层级回门户（`../` 或 `../../`）→ 验证全层级跳转 |

**不可妥协项（三类通用）：**
- 每个页面必须嵌入完整 XBrain 品牌 Logo（见 §6）。
- 门户首页 `index.html` 的 `.sites-grid` 必须新增对应卡片入口。
- SPA 子站点必须在 `netlify.toml` 配置 history fallback，否则刷新 404。

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
- 数据源：目录下所有 `.md` 报告；排除 `个人健康档案与深度医学分析报告.md`、`p.report.md`。
- 识别标志：文件头注释 `<!-- GENERATED BY generate_index.py - DO NOT EDIT -->`。
- 更新流程：新增 `.md` → （按需更新总报告）→ `cd 健康/妈; python generate_index.py` → push。
- **禁止**直接编辑该 `index.html`（会被覆盖）；**禁止**重写生成逻辑（脚本已存在，直接调用）。
- 新增排除文件需求 → 改脚本内 `EXCLUDE_FILES` 集合。

### 8.2 通用识别法

目录中存在 `generate_*.py` 且 HTML 头部有 GENERATED 注释 → 视为脚本生成页，改内容须改源数据/脚本后重生成，不手改 HTML。

---

## 9. 部署（Netlify）

- `netlify.toml`：`command="npm run build"`，`publish="."`（发布整个仓库根）。
- SPA 路由重定向已为 `query-system` 配置；新增 SPA 子站点须追加对应 `[[redirects]]`。
- 推送即部署：`git push` → Netlify 自动 `npm run build` → 发布。
- 纯静态子站点无需 build，直接随仓库发布。

---

## 10. 约束与陷阱（Gotchas）

- **`rawData.ts` 是核心数据真源**：改 `database/` 下 MD 不会自动反映到查询系统分数列，须同步改 `rawData.ts` 内嵌字符串。
- **`publish.ps1`/`start.bat` 路径外指**：本仓库内不使用，权威流程是根 `npm run build` + `git push`。
- **SPA `base` 必须为 `'./'`**：否则相对路径部署资源 404。
- **图片用相对路径**：子站点图片路径错乱多因未用相对路径或 `base` 配置错误。
- **dist/node_modules 禁提交**：已在 `.gitignore`。
- **补录数据已知 FAIL**：改动 `parseMakeupScores` 前先读 `audit_report.md`。
- **校名匹配脆弱**：改 `extractBaseName` 或 `clNameMap` 影响全局合并，须跑全量测试。
- **认证配置加载失败有兜底**：`auth.js` 会渲染错误遮罩并提供刷新；勿删该兜底。
- **中文目录名**：`健康/四季景点/采购与维护` 为中文路径，shell 命令与 href 须正确处理（PowerShell 用单引号包裹）。
- **改动后必跑测试**：`query-system` 有 6 个测试套件，含 regression，回归测试是数据管线改动的安全网。

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
- [ ] 目录与 `index.html` 就位
- [ ] 嵌入完整 XBrain Logo（按 §6.7 引用 `brand/XBRAIN-LOGO-IP.md` 代码模板注入），`href` 层级正确
- [ ] 首屏元素已加 `id="top"` 锚点（IP 规范硬性要求）
- [ ] 门户首页 `.sites-grid` 已加卡片入口，href 正确
- [ ] 本地浏览器验证卡片→子站点→返回全链路跳转
- [ ] 移动端抽查（≤640px）布局与 Logo 不遮挡内容
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
- [ ] 运行 `generate_index.py` 重新生成
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

*维护：当架构、命令、数据管线或规范发生结构性变化时，须同步更新本文件，保持与 `README.md` 一致。*
