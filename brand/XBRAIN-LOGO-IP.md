# XBrain 品牌 Logo IP 规范

> 本文件为 XBrain Logo 组件的**权威 IP 规范**，包含完整代码模板、插入规则与注意事项。
> `AGENTS.md` §6.7 与 `README.md` 第 4.2 节均引用本文件。
> 任何对 Logo 代码的修改须以本文件为单一来源（Single Source of Truth）。

---

## 一、组件概述

XBrain Logo 是固定定位的品牌标识组件，由 SVG 图标 + 品牌文字组成，支持滚动淡出交互。所有子站点页面必须嵌入本组件，保持统一品牌识别。

**视觉特征：** 毛玻璃背景 + 渐变边框 + 多层阴影 + `12px` 圆角，滚动时根据位置淡出。

---

## 二、使用场景

完成 HTML 页面编写后，为页面叠加 XBrain Logo。常见触发用语：
- "给这个 HTML 加上 XBrain Logo"
- "叠加 XBrain"
- "让 HTML 带上 XBrain"
- 完成 HTML 编制后要求应用 XBrain 品牌标识

---

## 三、插入位置规范

三段代码须按以下位置插入目标 HTML，顺序不可颠倒：

| 段 | 插入位置 |
|----|----------|
| CSS | 已有 `<style>` 则在其 `</style>` 之前；否则在 `<head>` 内新建 `<style>` 标签 |
| HTML（`<a class="xbrain-brand">`） | `<body>` 标签后**第一个子元素**位置（保证 z-index 与固定定位正确） |
| JS（滚动淡出脚本） | 页面底部、所有内容之后、`</body>` 之前 |

### 插入位置示意

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* 原有样式... */
    /* === 在这里插入 XBrain CSS === */
  </style>
</head>
<body>
  <!-- === 在这里插入 XBrain HTML（body 第一个子元素）=== -->
  <a class="xbrain-brand">...</a>

  <!-- 原有页面内容... -->

  <!-- === 在这里插入 XBrain JS（</body> 之前最后一个 script）=== -->
  <script>...</script>
</body>
</html>
```

---

## 四、代码模板

### 4.1 CSS（插入到 `<style>` 末尾）

```css
    /* ===== XBrain Brand (Cerebro Style) ===== */
    .xbrain-brand {
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, rgba(20, 15, 50, 0.94) 0%, rgba(40, 30, 80, 0.92) 100%);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(180, 210, 255, 0.55);
      border-radius: 12px;
      padding: 6px 14px 6px 8px;
      box-shadow:
        0 0 12px rgba(255, 255, 255, 0.15),
        0 0 40px rgba(80, 140, 255, 0.35),
        0 4px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      text-decoration: none;
      transition: opacity 0.6s ease, box-shadow 0.6s ease, border-color 0.6s ease;
    }
    .xbrain-brand:hover {
      box-shadow:
        0 0 24px rgba(80, 140, 255, 0.40),
        0 4px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
      border-color: rgba(180, 210, 255, 0.70);
    }
    .xbrain-brand.scrolled {
      background: rgba(15, 10, 40, 0.4);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border-color: rgba(100, 180, 255, 0.08);
      box-shadow: none;
    }
    .xbrain-brand.scrolled:hover {
      opacity: 0.7 !important;
      border-color: rgba(100, 180, 255, 0.2);
    }
    .xbrain-brand svg {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      filter: drop-shadow(0 0 12px rgba(100, 180, 255, 0.55));
    }
    .xbrain-brand .xb-ring { stroke-width: 4; opacity: 0.95; }
    .xbrain-brand .xb-glow-bg { opacity: 0.40; }
    .xbrain-brand .xb-center-ring { stroke-width: 3; opacity: 0.95; }
    .xbrain-brand .xb-x-line { opacity: 0.9; stroke-width: 2.5; }
    .xbrain-brand .xb-core { r: 12; opacity: 1; }
    .xbrain-brand .xb-ttai { fill: #4a70c0; filter: drop-shadow(0 0 6px rgba(100,180,255,0.45)); }
    .xbrain-brand .xb-ttai-line1,
    .xbrain-brand .xb-ttai-line2 { opacity: 1; }
    .xbrain-brand .xb-bar-group { opacity: 0.75; }
    .xbrain-brand .xb-bar { fill: #5a90e0; }
    .xbrain-brand .xb-bar-glow { opacity: 0.9; }
    .xbrain-brand .xbrain-text {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #e8ecf4;
      line-height: 1;
      text-shadow: 0 0 12px rgba(100, 180, 255, 0.55);
    }
    .xbrain-brand .xbrain-text span {
      color: #64b4ff;
      text-shadow: 0 0 18px rgba(100, 180, 255, 0.9);
    }
```

### 4.2 HTML（插入到 `<body>` 后第一个位置）

```html
    <!-- ===== XBrain Brand IP ===== -->
    <a class="xbrain-brand" href="#top" title="XBrain - Cerebro">
      <svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#64b4ff" stop-opacity="1" />
            <stop offset="60%" stop-color="#3a7bd5" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#1a2a5e" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#80c0ff" />
            <stop offset="50%" stop-color="#4a90e2" />
            <stop offset="100%" stop-color="#80c0ff" />
          </linearGradient>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle class="xb-glow-bg" cx="176" cy="180" r="170" fill="url(#coreGlow)" opacity="0.12" />
        <circle class="xb-ring" cx="176" cy="180" r="168" fill="none" stroke="url(#ringGrad)" stroke-width="2" opacity="0.55" filter="url(#glow)" />
        <g transform="matrix(0 -1 1 0 30 300)">
          <rect class="xb-ttai" fill="#2a4080" width="240" height="36" rx="4" ry="4" />
          <rect class="xb-ttai-line1" fill="url(#ringGrad)" width="240" height="3" rx="1.5" y="4" opacity="0.9" />
          <rect class="xb-ttai-line2" fill="url(#ringGrad)" width="240" height="3" rx="1.5" y="29" opacity="0.6" />
        </g>
        <g class="xb-bar-group" transform="matrix(0 -1 1 0 66 200)" opacity="0.35">
          <rect class="xb-bar" fill="#3a60a0" width="40" height="280" rx="3" ry="3" />
          <rect class="xb-bar-glow" fill="#64b4ff" width="6" height="200" rx="3" x="17" y="20" opacity="0.5" />
        </g>
        <g transform="matrix(0 -1 1 0 30 230)">
          <circle cx="50" cy="50" r="50" fill="#0d1636" />
          <circle cx="50" cy="50" r="46" fill="#162850" opacity="0.8" />
          <circle class="xb-center-ring" cx="50" cy="50" r="42" fill="none" stroke="#64b4ff" stroke-width="2" opacity="0.7" filter="url(#glow)" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#4a90e2" stroke-width="1.2" opacity="0.45" />
          <line class="xb-x-line" x1="22" y1="22" x2="78" y2="78" stroke="#64b4ff" stroke-width="1.5" opacity="0.5" />
          <line class="xb-x-line" x1="78" y1="22" x2="22" y2="78" stroke="#64b4ff" stroke-width="1.5" opacity="0.5" />
          <circle class="xb-core" cx="50" cy="50" r="10" fill="#80c0ff" filter="url(#glow)" opacity="0.9" />
          <circle cx="50" cy="50" r="4" fill="#ffffff" />
        </g>
        <g class="xb-decor-group" transform="matrix(0 -1 1 0 38 222)" opacity="0.4">
          <circle cx="42" cy="42" r="40" fill="none" stroke="#4a90e2" stroke-width="1" />
          <circle cx="42" cy="42" r="32" fill="none" stroke="#64b4ff" stroke-width="0.6" stroke-dasharray="4 4" />
        </g>
      </svg>
      <div class="xbrain-text"><span>X</span>Brain</div>
    </a>
```

### 4.3 JS（插入到页面底部 `</body>` 之前）

```html
    <!-- ===== XBrain Logo Scroll Fade ===== -->
    <script>
      (function () {
        var logo = document.querySelector('.xbrain-brand');
        var ticking = false;

        function updateLogo() {
          var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
          var vh = window.innerHeight || document.documentElement.clientHeight;
          var ratio = Math.min(scrollY / vh, 1);
          var opacity = 1 - ratio * 0.7;
          if (logo) {
            logo.style.opacity = opacity;
            logo.classList.toggle('scrolled', scrollY > vh * 0.3);
          }
        }

        window.addEventListener('scroll', function () {
          if (!ticking) {
            window.requestAnimationFrame(function () {
              updateLogo();
              ticking = false;
            });
            ticking = true;
          }
        }, { passive: true });

        window.addEventListener('touchmove', function () {
          if (!ticking) {
            window.requestAnimationFrame(function () {
              updateLogo();
              ticking = false;
            });
            ticking = true;
          }
        }, { passive: true });

        updateLogo();
      })();
    </script>
```

---

## 五、硬性规则（不可更改）

1. **跳转链接**：`href` 固定为 `#top`，点击回到当前页面顶部。**页面首屏元素必须添加 `id="top"` 锚点**，否则点击 Logo 无法回顶。
2. **品牌文字**：固定为 `<span>X</span>Brain`，不可修改。
3. **子站点页面跳转**：`href` 按层级改为 `../index.html`（回门户首页），同时保留首屏 `id="top"` 用于页内回顶需求时另作锚点。
4. **SVG 完整性**：不得简化 SVG（旧版只有圆圈和 X 线，缺少 T 台、信号柱等增强元素）。`xb-decor-group` 装饰组等全部元素必须保留。
5. **圆角**：不得使用 `border-radius: 100px` 胶囊形（与全局 `12px` 圆角不一致）。

---

## 六、可选配置

在第四节代码模板基础上，可调整以下参数：

- **淡出速度**：JS 中 `ratio * 0.7` 的系数（增大则淡出更快）。
- **`scrolled` 样式触发阈值**：JS 中 `scrollY > vh * 0.3`（调整切换简化样式的滚动位置）。

---

## 七、注意事项

1. **页面需可滚动**：如果页面没有垂直滚动条，`scroll` 事件不会触发，Logo 将保持完全不透明。这是预期行为。
2. **类名冲突检查**：注入前检查目标页是否已存在 `.xbrain-brand`、`.xbrain-text`、`.scrolled` 类，冲突时先处理。
3. **移动端兼容**：CSS 已含 `-webkit-backdrop-filter`，JS 已含 `touchmove` 监听和 `passive: true`，**勿删**。
4. **与门户首页实现的关系**：本文件模板与门户 `index.html` 中的 Logo 实现同源一致。冲突时以本文件为执行基准。

---

## 八、操作流程（AI 代理执行步骤）

1. **读取目标 HTML**：确认文件结构完整（含 `<head>`、`<body>`、`<style>` 或 CSS 链接）。
2. **插入 CSS**：按 §三规则放入 `<style>`。
3. **插入 HTML**：放于 `<body>` 后第一个子元素位置。
4. **插入 JS**：放于 `</body>` 之前。
5. **确保锚点**：首屏元素添加 `id="top"`。
6. **保存并验证**：本地浏览器打开，检查 Logo 显示、滚动淡出、点击回顶、移动端不遮挡内容。

---

*维护：本文件为 Logo 组件的单一来源。代码或规则变更须直接修改本文件，并由 `AGENTS.md` §6.7 与 `README.md` 第 4.2 节引用。*
