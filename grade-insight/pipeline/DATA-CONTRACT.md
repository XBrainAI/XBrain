# 考试数据契约 gi-exam-data/1

- 版本：v1.1（2026-10-23，SPEC-005 增 §5 展示路径约定；schema 字段不变）｜ 承载规格：SPEC-003/SPEC-005 ｜ 母本：SPEC-002 方案稿 §二（字段级定稿于本文）
- 适用：`grade-insight/details/<学段>/<学期>/<YYYY-MM>-<第N考>/data/exam.json`
- 铁律：**缺层不冒充**——数据没有的字段一律缺省（不写 null 占位以外的假值）；机器拿不准的进 quarantine，不进 subjects。

## 1. 目录契约（每轮考试一目录）

```
<YYYY-MM>-<第N考>/
  raw/                 原始截图（准入见 pipeline/acceptance.yaml）
  md/  + md/images/    转写件（pipeline/transcribe-prompt.md 产物）
  data/exam.json       ★ 标准账（本契约）
  data/report.md       单考深挖报告（由 exam.json 生成，人读）
```

## 2. exam.json 字段规范

### 2.1 顶层
| 字段 | 必含 | 说明 |
|------|-----|------|
| contract | ✔ | 固定 `gi-exam-data/1` |
| meta | ✔ | 见 2.2 |
| exam | ✔ | `{id,name,date,term,type,note}`，与站点 store.js v1 考试字段同名同义；id=日期+名称规范化；date 未确认时以月内暂记并在 note 声明（SPEC-001 先例） |
| student | ✔ | `{name, studentId, enrollYear, targetRate}` |
| total | ✔ | `{score, full, level?, rank?, rankSize?}` |
| subjects[] | ✔ | 见 2.3，key 用站点科目 key（chinese…geography） |
| integrity | ✔ | 见 2.4，**对账结果随数据存档** |

### 2.2 meta（流水线溯源）
- `source`: `"raw"`（走 S1-S5 管线）或 `"manual"`（手工录入/导入包直填）。
- `pipeline`: `{transcribePrompt, converter, acceptance, alias}` 各为固化件版本号（如 v1）——升版回归义务的依据。
- `transcribedAt`: 产物生成时刻。
- `confidence`: `{<科目key>: "高"|"中"}`——出现拼接去重/隔离行的科目降"中"，并在 integrity 留原因。

### 2.3 subjects[] 各项
| 字段 | 层 | 必含 | 说明 |
|------|----|------|------|
| key/name/full/score/level | L1 | score/full ✔ | level=班级口径等级（A-E），源为概览页等级标尺读数 |
| avgClass/avgGrade/rank/rankSize | L1' | 选 | 有则填（概览页班级/年级切换态下可见值才录） |
| questions[] | L2 | 选 | `{no,type,point,diff,score}`；no=题号(int)，type=题型原文，point=分值(num)，diff=难度原文（易/中/难等），score=得分(num，允许小数/0)；`mine/ref/correct` 阶段 2 起可选 |
| kps[] | L3 | 选 | `{kpId,name,rate,wrong,key,category}`；rate=掌握率百分比数值(0-100)，wrong=错题数，key=布尔（【重点】/重点前缀），category=`考查|已掌握|待提升|薄弱`（页签归属）；name 保留源层级路径（`>>` 分隔） |
| analysisRef | L4 | 选（题目级） | 指向 `md/<科>-试卷解析 (n).md`（题目级字段挂 questions[].analysisRef） |

### 2.4 integrity
- `checks[]`: `{name, expect, actual, status:"pass|fail|warn"}`，至少含：①各科题得分之和 vs L1 科得分；②各科分之和 vs 总分；③知识点行数 vs 徽标计数；④试卷解析覆盖数。
- `deduped[]`: 长截图拼接产生的重复行（文件/题号/原因）。
- `quarantined[]`: 解析失败的原始行（文件/行号/原文），**不猜不丢**。
- `unmapped[]`: 别名归一未能对齐既有 kpId、本轮新增登记的名称清单。

## 3. 兼容矩阵（手工录入/数据缺层 → 分析降级）

| 已有层 | 可用分析 |
|--------|---------|
| 仅 L1+total（manual 最小集，E5） | 趋势/偏科/百分位/目标推演（现站点全部能力）、单考小结（分数段） |
| +L2 | 题型×难度丢分矩阵、部分得分统计 |
| +L3 | 知识点画像、跨考核踪、薄弱老化告警 |
| +L4 索引 | 错题本联动（点开题解/图） |
缺层规则：对应分析模块输出"源数据未提供"而非 0 值。

## 4. 治理规则
- **别名表**（`grade-insight/data/knowledge-alias.yaml`）append-only：新名自动登记为 canonical；**疑似同义不合并**，只列 `suspected[]` 供人工裁定后追加 alias。
- **版本纪律**：固化件升版（vN→vN+1）必须对既往各考数据重跑 converter 对账回归，diff 结果入 5.2 留痕后方可用于新考（防"尺子变短"，SPEC-002 R8）。
- 隐私：契约文件含个人成绩，随仓库既有知情裁定管理（SPEC-001 5.1）。

## 5. 展示路径约定（v1.1，SPEC-005；不改 schema，按 dataRef 目录推导）

| 资产 | 路径约定 | 生产方 | 消费方 |
|------|---------|--------|--------|
| 仪表盘裁剪件 | `<考>/data/assets/<科中文名>-仪表盘.png`、`总分-仪表盘.png` | S3.6 裁剪批次（AI 视觉+像素定界，同 SPEC-000 配图纪律） | 详情弹层"仪表盘"页（img onerror 自动退化，缺图不报错） |
| 解析预渲染 HTML | `<考>/data/analysis/<科>-试卷解析-<N>.html`（md 名规则化：去空格括号、`(N)`→`-N`） | `pipeline/render-analysis.js`（devDeps markdown-it+KaTeX，公式内联 SVG，禁 html 直通） | 错题本"解析 ↗"新标签；前端由 questions[].analysisRef 同规则推导 |
| 年级视图补录 | `<科>-成绩概览-年级.(jpg\|png)` 入 raw，转写与转换提取 avgGrade/rank/rankSize | 用户下月投料（acceptance v1.1） | 成绩表"年级均分/排名"列（缺源显示 –，**禁止由等级反推估算**） |
