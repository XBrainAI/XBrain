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
