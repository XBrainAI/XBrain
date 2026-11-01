# TD：src模板媒体规则同步contain与min-width与灯箱

- 编号：TD-015-src模板媒体规则同步contain与min-width与灯箱-261101-101729.1692
- 类型：defer
- 关联规格：none（规则出处：project-context §14.11–§14.13，2026-11-01 固化；实践出处：SPEC-016 佛冈子站三轮修复）
- 触发时机：manual——**下次用 `src/site-template*.html` 建站或生成纯游记页之前必须先做**（否则新站复刻 16:10 裁切旧形态，验收按 §14.9 宽高比校验会拦下，等于返工）
- 智力强度：中（三处规则向模板移植 + 既有生成器页回归）
- 状态：open
- 创建：2026-11-01
- 更新：2026-11-01

## 背景（为什么记）

2026-11-01 用户裁决把媒体展示规则升级为：① 网格子项 `min-width:0`（§14.11）；② 封面 contain 完整显示、16/10+cover 废弃（§14.12）；③ 全屏灯箱默认要求（§14.13）。三者已在佛冈子站 hand-authored 页落地并实测，但 `src/site-template*.html`（纯游记/攻略模板）与既有生成器页面仍是旧形态（16:10 定框 + cover + 无灯箱）——模板不同步，下次生成即复刻缺陷。

## 要做什么

向 `src/site-template.html` / `site-template-travelogue.html` / `site-template-travelogue-core.html` 同步三件：① `.info/.spots/.culture-grid > * { min-width:0 }`；② `.media-cover` 改 contain（§14.12 代码块原样移植，`.img-portrait` 保留兼容）；③ 移植佛冈 `#lightboxMask` 灯箱三件套（CSS/HTML/JS，宿主选择器已含 `.media-block`）。同步后跑 §14.9 验证清单（390×844 视口 + 宽高比 + lazy 复测 + 灯箱三态）与既有生成器页回归（深圳/西樵山抽样）。

## 完成口径

模板三件套与 §14.11–14.13 一致；`node --check` 通过；§14.9 全过；生成器页抽查无回归；project-context §14.12 "模板待同步"注记删除。

## 承接自

用户指令"将上述各问题、经验等固化到相关 agents.md"（2026-11-01）——固化时发现的模板缺口

## 回写

〈done/cancelled 时追加：日期 + 结论 + 证据指针；转派时写：转派至：SPEC/AUDIT/DELG-<编号>。〉
