# XBrain 子站点开发指引

本文档为 XBrain 多子站点聚合项目的通用开发指引，适用于新增任何类型的子站点。

---

## 一、项目架构概述

XBrain 采用 **统一门户首页 + 独立子站点** 的聚合架构，部署于 Netlify。

```
XBrain/
├── index.html              # 门户首页（聚合所有子站点入口）
├── netlify.toml            # Netlify 部署配置
├── package.json            # 根级构建脚本编排
├── brand/                  # 品牌资源（Logo SVG）
└── [子站点目录]/           # 各子站点独立目录
```

### 核心原则

- **门户首页** 是纯静态 HTML 页面，展示所有子站点的卡片入口
- **子站点** 各自独立，可以是纯静态 HTML、React SPA 或其他类型
- **统一品牌** 所有子站点共享 XBrain 视觉风格（深色主题、蓝色调、品牌 Logo）
- **独立部署** 每个子站点有自己的构建流程，由根 `package.json` 统一编排

---

## 二、子站点类型与新增流程

### 2.1 类型 A：纯静态 HTML 子站点

**适用场景：** 内容展示页、导航聚合页、简单单页

**目录结构：**
```
[子站点名称]/
└── index.html
```

**新增步骤：**

1. 在项目根目录创建子站点目录
2. 创建 `index.html`，嵌入 XBrain 品牌 Logo（见第四节）
3. 在门户首页 `index.html` 的 `.sites-grid` 中添加卡片入口（见第五节）
4. 无需修改 `netlify.toml` 和根 `package.json`（静态文件自动发布）

### 2.2 类型 B：React + Vite SPA 子站点

**适用场景：** 交互式应用、数据查询系统、复杂前端逻辑

**目录结构：**
```
[子站点名称]/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── ...
└── public/
```

**新增步骤：**

1. 在项目根目录创建子站点目录
2. 初始化 Vite + React 项目：
   ```bash
   cd [子站点名称]
   npm create vite@latest . -- --template react-ts
   ```
3. 修改 `vite.config.ts`，设置 `base: './'`（确保相对路径部署）
4. 修改根 `package.json` 的 build 脚本，追加该子站点的构建命令：
   ```json
   {
     "scripts": {
       "build": "cd [已有子站点1] && npm install && npm run build && cd ../[子站点名称] && npm install && npm run build"
     }
   }
   ```
5. 在 `netlify.toml` 中添加 SPA 路由重定向（见第三节）
6. 在门户首页添加卡片入口，`href` 指向 `./[子站点名称]/dist/index.html`
7. 在子站点页面中嵌入 XBrain 品牌 Logo

### 2.3 类型 C：多级导航子站点

**适用场景：** 需要二级导航的聚合类站点（如景点合集、分类目录）

**目录结构：**
```
[子站点名称]/
├── index.html              # 导航首页（卡片网格）
├── [子页面1]/
│   ├── index.html
│   └── [资源文件]
└── [子页面2]/
    └── index.html
```

**新增步骤：**

1. 创建子站点目录及子页面目录
2. 导航首页复用门户首页的卡片网格样式
3. 子页面通过相对路径 `../index.html` 返回导航首页
4. XBrain Logo 的 `href` 指向 `../index.html`（回到门户首页）
5. 在门户首页添加卡片入口

---

## 三、Netlify 部署配置

### 3.1 基础配置

```toml
[build]
  command = "npm run build"
  publish = "."
```

- `publish = "."` 发布整个仓库根目录，所有子站点均可通过路径访问
- `command` 调用根级 `package.json` 的 build 脚本

### 3.2 SPA 路由重定向

对于 React/Vue 等 SPA 子站点，需要配置 history fallback：

```toml
# 替换 [子站点名称] 为实际目录名
[[redirects]]
  from = "/[子站点名称]/dist/*"
  to = "/[子站点名称]/dist/index.html"
  status = 200

[[redirects]]
  from = "/[子站点名称]"
  to = "/[子站点名称]/dist/index.html"
  status = 301

[[redirects]]
  from = "/[子站点名称]/"
  to = "/[子站点名称]/dist/index.html"
  status = 301
```

### 3.3 构建脚本编排

根 `package.json` 的 build 脚本需串联所有需要构建的子站点：

```json
{
  "scripts": {
    "build": "cd [子站点1] && npm install && npm run build && cd ../[子站点2] && npm install && npm run build"
  }
}
```

**注意：** 纯静态 HTML 子站点无需加入 build 脚本。

---

## 四、XBrain 品牌 Logo 规范

所有子站点页面必须嵌入 XBrain 品牌 Logo，保持统一品牌识别。

### 4.1 Logo 组件

Logo 由固定定位的 SVG 图标 + 品牌文字组成，支持滚动淡出交互。

**固定规则（不可修改）：**
- 品牌文字：`<span>X</span>Brain`
- 跳转链接：
  - 门户首页：`href="#top"`
  - 子站点页面：`href="../index.html"` 或 `href="../../index.html"`（根据层级调整）

**可选配置：**
- 淡出系数：JS 中 `ratio * 0.7`（调整滚动淡出速度）
- 触发阈值：JS 中 `scrollY > vh * 0.3`（调整切换样式的位置）

### 4.2 自动注入

编制完 HTML 后，可通过以下方式自动注入 Logo：
- "给这个 HTML 加上 XBrain Logo"
- "叠加 XBrain"
- "让 HTML 带上 XBrain"

完整代码模板见 `.trae/skills/xbrain-logo-injector/SKILL.md`。

---

## 五、门户首页卡片模板

在门户首页 `index.html` 的 `.sites-grid` 中添加子站点入口卡片。

### 5.1 带封面图的卡片

```html
<a class="site-card" href="./[子站点路径]/index.html">
  <div class="site-card-image" style="background-image: url('./[子站点路径]/cover.jpg')"></div>
  <div class="site-card-content">
    <span class="site-card-tag">标签</span>
    <h3>站点标题</h3>
    <p>站点简介文字</p>
    <div class="site-card-arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </div>
  </div>
</a>
```

### 5.2 无封面图的占位卡片

```html
<a class="site-card" href="./[子站点路径]/index.html">
  <div class="site-card-image fallback">
    <svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg">
      <circle cx="176" cy="180" r="168" fill="none" stroke="#64b4ff" stroke-width="1" opacity="0.3" />
      <g transform="matrix(0 -1 1 0 30 230)">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#64b4ff" stroke-width="1.5" opacity="0.3" />
        <line x1="22" y1="22" x2="78" y2="78" stroke="#64b4ff" stroke-width="1" opacity="0.3" />
        <line x1="78" y1="22" x2="22" y2="78" stroke="#64b4ff" stroke-width="1" opacity="0.3" />
        <circle cx="50" cy="50" r="8" fill="#64b4ff" opacity="0.3" />
      </g>
    </svg>
  </div>
  <div class="site-card-content">
    <span class="site-card-tag">子站点</span>
    <h3>站点标题</h3>
    <p>站点简介文字</p>
    <div class="site-card-arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </div>
  </div>
</a>
```

### 5.3 SPA 子站点卡片

对于需要构建的 SPA 子站点，`href` 指向构建产物：

```html
<a class="site-card" href="./[子站点名称]/dist/index.html">
  <!-- 卡片内容同上 -->
</a>
```

---

## 六、视觉风格规范

所有子站点应遵循统一的 XBrain 视觉风格：

### 6.1 色彩体系

```css
:root {
  --xb-deep: #0a0a1a;        /* 深蓝背景 */
  --xb-mid: #1a1030;         /* 中蓝 */
  --xb-light: #2d1b4e;       /* 浅蓝紫 */
  --xb-accent: #64b4ff;      /* 强调蓝 */
  --xb-accent2: #80c0ff;     /* 亮蓝 */
  --xb-glow: rgba(100, 180, 255, 0.35);
  --xb-border: rgba(100, 180, 255, 0.2);
  --xb-text: #e8ecf4;        /* 主文字 */
  --xb-text-dim: rgba(200, 210, 230, 0.6);  /* 次要文字 */
}
```

### 6.2 字体

- **标题：** Noto Serif SC（衬线体，庄重感）
- **正文：** Noto Sans SC（无衬线体，易读性）

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
```

### 6.3 交互效果

- **卡片悬停：** 上浮 8px + 边框高亮 + 阴影增强
- **卡片渐入：** IntersectionObserver 监听，滚动到视口时触发淡入上移动画
- **Logo 淡出：** 滚动时根据滚动位置调整 Logo 透明度

---

## 七、新增子站点 Checklist

### 纯静态 HTML 子站点

- [ ] 创建子站点目录
- [ ] 编写 `index.html` 页面
- [ ] 嵌入 XBrain 品牌 Logo（或让 AI 自动注入）
- [ ] 在门户首页添加卡片入口
- [ ] 本地打开验证链接跳转正常

### React + Vite SPA 子站点

- [ ] 创建子站点目录并初始化 Vite 项目
- [ ] 设置 `vite.config.ts` 的 `base: './'`
- [ ] 修改根 `package.json` 的 build 脚本
- [ ] 在 `netlify.toml` 添加路由重定向规则
- [ ] 在门户首页添加卡片入口（指向 `dist/index.html`）
- [ ] 嵌入 XBrain 品牌 Logo
- [ ] 本地执行 `npm run build` 验证构建产物
- [ ] 推送到 Netlify 验证线上访问

### 多级导航子站点

- [ ] 创建子站点目录及子页面目录
- [ ] 编写导航首页（复用卡片网格样式）
- [ ] 编写各子页面
- [ ] 确保返回链接路径正确（`../index.html` 或 `../../index.html`）
- [ ] 嵌入 XBrain 品牌 Logo
- [ ] 在门户首页添加卡片入口
- [ ] 验证所有层级跳转正常

---

## 八、常见问题

### Q1: 子站点图片路径不生效？

确保使用相对路径，且 `vite.config.ts` 中设置了 `base: './'`。

### Q2: SPA 子站点刷新 404？

检查 `netlify.toml` 是否配置了正确的路由重定向规则。

### Q3: 构建时某个子站点报错？

检查根 `package.json` 的 build 脚本，确保每个子站点的 `cd` 路径正确，且用 `&&` 正确串联。

### Q4: Logo 在子页面不显示？

确保 Logo 的 `href` 指向正确的上级页面路径，且页面首屏有 `id="top"` 的锚点元素。

---

## 九、子站点页面设计优化经验

本章记录在子站点页面中融合 XBrain 品牌规范与 `frontend-design` 技能提升设计感的实践经验。

### 9.1 核心原则

在保持 XBrain 品牌一致性（深色主题、蓝色调、Logo 交互）的前提下，引入 `frontend-design` 技能提升页面的设计感与交互体验。两者不是替代关系，而是**品牌底座 + 设计增强**的关系。

### 9.2 品牌底座（不可妥协）

以下元素必须严格遵循 `index.html` 的实现：

**色彩体系：** 使用 `README.md` 第六节定义的 CSS 变量（`--xb-deep`、`--xb-accent`、`--xb-glow` 等）。

**字体：** `Noto Serif SC`（标题）+ `Noto Sans SC`（正文），通过 Google Fonts 加载。

**Logo 组件：** 直接复制 `index.html` 中的完整 Logo 方案，包括：
- CSS 类名 `.xbrain-brand`（含渐变背景、多层阴影、`12px` 圆角）
- SVG 图标（含 `defs` 渐变定义、`xb-ring`、`xb-ttai`、`xb-bar-group` 等全部元素）
- 文字样式 `.xbrain-text`（`font-weight: 800`、蓝色文字阴影）
- 滚动交互 JS（`requestAnimationFrame` 节流 + `opacity = 1 - ratio * 0.7` 淡出）

**禁止事项：**
- 不要自行简化 Logo SVG（旧版只有圆圈和 X 线，缺少 T 台、信号柱等增强元素）
- 不要使用 `border-radius: 100px` 胶囊形（与全局 `12px` 圆角不一致）
- 不要修改品牌文字 `<span>X</span>Brain` 或跳转链接 `href="#top"`

### 9.3 设计增强（frontend-design 技能）

在品牌底座之上，可自由发挥以下设计维度：

**布局创新：** 不对称网格、悬浮导航、卡片分层等，不必拘泥于门户首页的布局模式。

**动效升级：** 可使用 `cubic-bezier(0.16, 1, 0.3, 1)`（expo out）缓动曲线、`IntersectionObserver` 滚动渐入等高级动效。

**视觉层次：** 通过毛玻璃（`backdrop-filter`）、发光边框、弥散阴影等手段营造空间感。

**内容呈现：** 根据内容类型选择合适的组件（参数网格、产品卡片、步骤列表、检查清单等）。

### 9.4 圆角规范

| 元素类型 | 圆角值 | 说明 |
|----------|--------|------|
| Logo 容器、卡片主容器 | `12px` | 与 `index.html` 一致 |
| 导航项、标签、徽章 | `8px` | 内部小元素 |
| 表格、图片网格 | `8px` | 中等容器 |
| 小标签、内嵌元素 | `4px` | 最小元素 |

### 9.5 手机端适配要点

**Logo + 导航同行布局：**
- Logo 固定在左上角（`top: 10px; left: 10px`）
- 导航固定在右上角（`top: 10px; right: 10px`），`max-width: calc(100% - 110px)` 避免重叠
- 导航项隐藏数字编号，缩小 padding 和字体，支持横向滚动

**尺寸压缩策略：**
- 导航容器 padding 从 `6px` 降至 `4px`，gap 从 `4px` 降至 `2px`
- 导航项 padding 从 `8px 16px` 降至 `6px 8px`，字体从 `13px` 降至 `12px`
- Logo 在极小屏（≤400px）下进一步缩小：SVG `26px`、文字 `13px`

**内容区适配：**
- `main` 的顶部 padding 根据 Logo + 导航高度调整（通常 `100px` 左右）
- 确保首屏内容不被固定元素遮挡

### 9.6 典型优化流程

1. **分析现有页面**：读取目标 HTML，识别当前设计风格与品牌规范的差距
2. **替换 Logo 方案**：从 `index.html` 复制完整的 `.xbrain-brand` CSS + SVG + JS
3. **统一色彩体系**：将自定义色彩变量替换为 XBrain 标准变量
4. **调整圆角**：将所有 `border-radius: 100px` 改为 `12px`/`8px`/`4px` 层级
5. **设计增强**：在品牌底座上应用 `frontend-design` 技能提升视觉层次
6. **移动端适配**：添加 `@media` 查询，优化 Logo + 导航布局、压缩尺寸
7. **验证**：在桌面端和手机端分别测试，确保品牌一致性和用户体验

---

### 9.7 流程图分支标识规范

在流程图中涉及分支判断时，应遵循以下统一标识规范，确保用户能直观区分各路径的走向和状态。

#### 9.7.1 Emoji 标识体系

| 标识 | 含义 | 使用场景 | 颜色 |
|------|------|----------|------|
| ✅ | 是 / YES | 所有"是"路径分支 | 绿色 |
| ❌ | 否 / NO | 所有"否"路径分支 | 红色 |
| ➡️ | 继续执行 | 需要进入下一步的分支 | 蓝色 |
| 🏁 | 结论 | 流程终点（非终止的决策结果） | 绿色 |
| ⛔ | 终止 | 流程中途终止 | 红色 |

**注意：**
- "是"路径始终使用 ✅ 绿色标识，"否"路径始终使用 ❌ 红色标识，与实际逻辑（继续/终止）无关。
- ➡️ 用于标注需要继续执行的分支，⛔ 用于标注需要终止的分支，🏁 用于标注最终结论。

#### 9.7.2 桌面端分支节点规范

```html
<!-- 是路径 -->
<div class="flow-branch-label yes-label">&#8595; ✅ 是</div>
<div class="flow-node branch-yes">
  <span class="branch-tag yes">✅ YES</span>
  <span class="branch-condition">判断结果</span>
  <span class="branch-condition" style="color:var(--xb-accent);">➡️ 进入下一步</span>
</div>

<!-- 否路径（终止） -->
<div class="flow-branch-label no-label">&#8595; ❌ 否</div>
<div class="flow-node branch-no terminate">
  <span class="branch-tag no">❌ NO</span>
  <span class="branch-condition">判断结果</span>
  <span class="terminate-label">⛔ 终止</span>
  <span class="branch-condition" style="color:#ff8a8a;">终止原因</span>
</div>

<!-- 否路径（结论） -->
<div class="flow-branch-label no-label">&#8595; ❌ 否</div>
<div class="flow-node branch-no final-result">
  <span class="result-label">🏁 结论</span>
  <span class="branch-condition">结论内容</span>
</div>
```

#### 9.7.3 移动端分支卡片规范

```html
<div class="flow-step-branches">
  <div class="flow-step-branch no">❌ 判断结果，➡️ 继续</div>
  <div class="flow-step-branch yes">✅ 判断结果，➡️ 继续</div>
  <div class="flow-step-branch no terminate">❌⛔ 终止：终止原因</div>
  <div class="flow-step-branch yes" style="border-left-color:#64ffb4;">❌ 否，🏁 结论内容</div>
</div>
```

#### 9.7.4 精简原则

- 去除 `&rarr; 继续：` / `&rarr; 终止：` 等冗余前缀，改用 ➡️ emoji 直接表达流向。
- 分支节点文字控制在 15 字以内，仅保留判断结果和下一步动作。
- 终止节点必须同时包含 ❌（分支标识）和 ⛔（终止标识），视觉双重确认。

#### 9.7.5 CSS 类名规范

| 类名 | 用途 | 样式特征 |
|------|------|----------|
| `.branch-yes` | 是路径节点 | 绿色边框 + 绿色文字 |
| `.branch-no` | 否路径节点 | 红色边框 + 红色文字 |
| `.terminate` | 终止节点 | 红色脉冲动画 + `⛔` 标签 |
| `.final-result` | 结论节点 | 绿色边框 + `🏁` 标签 |
