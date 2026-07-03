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
2. **简版 footer 断链**：链接 `家用新风机选购指南-完整版.html` 在本子站目录下**不存在**，为悬空断链。
3. **两子页均无"返回导航首页"链接**：仅 back-top，UX 缺陷。
4. **跨子站关联缺陷**：`query-system/home/新风机选购指南.html`（完整版，浅色独立页）的 Logo `href="#top"` 为断锚（页面无 `id="top"` 元素），且与简版无互链。

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
- **简版 footer 断链**：`家用新风机选购指南-完整版.html` 不存在，若提供完整版入口需放文件或改 href 指向 `../query-system/home/新风机选购指南.html`（注意该页为浅色独立页、无 `id="top"` 锚点）。
- **跨子站完整版无锚点**：`query-system/home/新风机选购指南.html` 无 `id="top"`，Logo `href="#top"` 断锚，建立互链需补锚点。
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
