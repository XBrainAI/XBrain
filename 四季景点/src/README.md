# 四季景点 · 模板目录（已迁移至全局共享库）

> ⚠️ 本目录**不再保存模板副本**。
> 所有可复用 HTML 模板已于 **2026-08-17 整体提升至仓库根 `home/src`（全局共享模板库）**，作为唯一来源；此举为消除「各子站各自维护一份模板」的代码冗余。

## 去哪里找模板（相对于本文件：`../../src/`）

| 需要 | 路径 |
|------|------|
| 攻略 / 规划型模板 | `../../src/site-template.html` |
| 纯记录型模板（生活点滴 / 轻游记） | `../../src/site-template-travelogue.html` |
| 记录核心模块（公共 · 单一来源） | `../../src/site-template-travelogue-core.html` |
| 占位图（预览用） | `../../src/assets/` |
| 引用规则 / 标题映射 / 建记录流程 | `../../src/README.md` |

## 规则
- **新建四季景点子站**：复制 `../../src/site-template*.html` → `四季景点/<新子站>/index.html`，按 `../../src/README.md` 填占位符（含 `{{SITE_LABEL}}=四季景点`、`{{RECORD_HEADING}}=游记实录`），并替换 `assets/ph*.svg` 为真实图片。
- **不要在此目录另存模板副本**，避免与 `home/src` 单一来源漂移。
- `.log-chapter` / `.food-card` 的样式与结构只改 `../../src/site-template-travelogue-core.html`，再复制 COPY BLOCK 到用到的页面。
