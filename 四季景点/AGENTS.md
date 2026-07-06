# 四季景点/AGENTS.md — 岭南景点档案

> 本文件为 `四季景点` 子站的专属指引，补充根 `AGENTS.md` 的类型 C 通用描述。
> 阅读优先级：**根 AGENTS.md > 本文件**。
> 本子站为纯手写多级导航，**无脚本生成、无构建**，各景点独立视觉主题。

---

## 1. 子站定位

- **功能**：岭南景点（从化狮象岩 / 肇庆燕岩雪风洞 / 花都石头记矿物园）图文档案。
- **类型**：C（多级导航），纯静态，所有 `index.html` 均手写，可自由编辑。
- **不参与构建**：无 npm 依赖、无 Python 脚本，改动后直接 `git push` 部署。
- **无认证**：不接入 XBrainAuth。

---

## 2. 目录结构

```
四季景点/
├── index.html                          # 导航首页（卡片网格，5 景点入口）
├── 小梅沙海洋世界/
│   ├── index.html                      # 景点详情页（深蓝海洋主题）
│   └── *.jpg × 6                        # Pexels / LoremFlickr 免费图库图片
├── 世界之窗/
│   ├── index.html                      # 景点详情页（暗金主题）
│   └── *.jpg × 6                        # Pexels / LoremFlickr 免费图库图片
├── 从化吕田狮象岩/
│   ├── index.html                      # 景点详情页（绿色自然浅色主题）
│   ├── PTitle.jpg                      # 封面图（hero 背景 + 卡片封面）
│   └── *_来自小红书网页版.jpg × 9       # 小红书图片（3 位作者）
├── 肇庆怀集燕岩雪风洞/
│   └── index.html                      # 景点详情页（深绿秘境主题，⚠️ 1917KB，图片 base64 内联）
└── 花都石头记矿物园/
    ├── index.html                      # 景点详情页（暗色矿物宝石主题）
    ├── 广州花都石头记矿物园资讯汇总.md   # 景点资讯 MD（HTML 内容底稿）
    └── *_来自小红书网页版.jpg × 16       # 小红书图片（6 位作者）
```

---

## 3. 导航首页结构

- **复用门户卡片网格范式**：`.hero`(id=top) + `.sites-grid`（3 张 `.site-card`）+ `.back-link`（`../index.html` 回门户）。
- **完整 XBrain Logo**：`.xbrain-brand`，`href="../index.html"`（回门户）。
- **卡片顺序**：花都→肇庆→从化（非目录顺序，按推荐度排列）。
- **卡片封面两种模式**：有照片用 `background-image`，无照片用 `.site-card-image.fallback` + 内嵌简化 Logo SVG 占位（肇庆即此模式）。
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

---

## 6. MD 资讯汇总与 HTML 的关系

- **仅花都有** `广州花都石头记矿物园资讯汇总.md`，从化/肇庆无对应 MD。
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
- **卡片顺序非目录顺序**：导航首页按推荐度排列（花都→肇庆→从化），新增景点时按内容定位插入合适位置。
- **无 build/无脚本**：纯手写，改动后直接 `git push`，仅需本地浏览器验证。

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

> 深圳子站（`四季景点/深圳/`）采用多方案切换架构，是"攻略型子站"的参考范式。以下经验提炼自该站的完整建设过程，适用于后续类似的多方案亲子旅游攻略子站。

### 12.1 文件与图片结构

```
四季景点/深圳/
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
