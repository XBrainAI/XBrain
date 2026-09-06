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
