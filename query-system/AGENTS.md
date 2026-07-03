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
├── home/                       # 新风机选购指南 HTML（独立静态页，非 SPA 部分）
├── other_infos/                # 舆情/分析报告（HTML/MD），构建时复制进 dist
├── public/                     # favicon.svg、icons.svg
├── src/                        # 源码（见 §3）
├── audit_report.md             # 数据审核报告（已知缺陷，见 §7）
├── README.md                   # 构建运行文档（命令速查）
├── publish.ps1 / start.bat / ngrok.bat  # ⚠️ 外部路径脚本，勿在本仓库用
└── fix_private_schools.py / verify_private_schools.py  # 一次性数据修复脚本
```

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
- **`publish.ps1`/`start.bat` 外指**：指向外部开发工作区 `ws_workbuddy\ws_study8\*`，本仓库内不使用，权威流程是 `npm run build` + `git push`。
- **`base:'./'` 不可改**：否则相对路径部署资源 404。
- **校名匹配脆弱**：改 `extractBaseName` 或 `clNameMap` 影响全局合并，须跑全量测试（含 `regression.test.ts`）。
- **6 套测试是安全网**：含 `regression.test.ts` 回归测试，数据管线改动后必跑。
- **`home/` 目录的 HTML 不属于 SPA**：`home/新风机选购指南.html` 是独立静态页，不参与 Vite 构建。
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
