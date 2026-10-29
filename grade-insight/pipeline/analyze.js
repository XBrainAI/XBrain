#!/usr/bin/env node
/* 流水线 S4.5 CLI（analyze v2）：读 data/exam.json（+正式档案 targetRate + js/joint-data.js）→ GIAnalyze v2 → 渲染 md 存档。
   研判逻辑唯一实现＝js/analyze.js（与站点同源）；本文件只做 Markdown 呈现。
   v2 新增（SPEC-011）：错因构成（D2）、KP 四象限摘要（D3）、错因加权补救（A1）、四周复习计划（A2）、跨考演化（E 系列，单考占位）。
   用法：node analyze.js --exam <考试目录>
*/
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('../js/analyze.js');

const pct = (x) => (x == null ? '–' : (x * 100).toFixed(1) + '%');
const escMd = (s) => String(s).replace(/\|/g, '\\|');
const short = (n) => String(n).split('>').pop();
const CAUSE_ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const QUAD_NAME = { highValue: '高价值补强', stable: '稳定得分区', lowEffort: '低效防护', safe: '安全区' };

function loadJoint() {
  try { return require('../js/joint-data.js'); } catch (e) { return null; }
}

function run(examDir) {
  const d = JSON.parse(fs.readFileSync(path.join(examDir, 'data', 'exam.json'), 'utf8'));
  let targetRate = 0.8, targetFrom = '默认 0.8';
  const regFile = fs.readdirSync(examDir).find((f) => /^正式档案.*\.json$/.test(f));
  if (regFile) { try { targetRate = JSON.parse(fs.readFileSync(path.join(examDir, regFile), 'utf8')).student.targetRate || 0.8; targetFrom = 'student.targetRate'; } catch (e) {} }
  const joint = loadJoint();
  const m = A.build(d, targetRate, joint);
  const o = m.overall;
  const L = [];
  const P = (s) => L.push(s);
  P('# 系统分析报告 · ' + d.exam.name);
  P('');
  P('- 输入：本考目录 data/exam.json（pipeline ' + JSON.stringify(d.meta.pipeline) + '）｜ 规则：' + m.rules + ' ｜ 引擎：' + m.engine + ' ｜ 目标得分率 ' + pct(targetRate) + '（' + targetFrom + '）');
  P('- 确定性生成（同输入同输出）；"预估回收"为规则估计非承诺；缺源不研判；错因为"AI 预判+人工复核"口径。站点端"系统分析"标签页与本文件同源同结论。');
  P('');
  P('## 一、全科研判');
  P('');
  P('- 总分 **' + o.score + '/' + o.full + '**（' + pct(o.rate) + '，' + o.level + '）；距目标差 ' + o.gapPP + 'pp；规则估计回收上限 ' + o.potential + ' 分（全实现约可达 ' + pct(o.potentialRate) + '，上限口径）→ R7 ' + (o.rate < targetRate ? '未达标' : '已达标'));
  P('- 等级构成：' + o.levels.map(([k, v]) => k + '×' + v).join('、') + '（班级口径）');
  P('- 均衡度：极差 ' + o.spread.pp + 'pp（' + o.spread.minName + ' ' + pct(o.spread.minRate) + ' ↔ ' + o.spread.maxName + ' ' + pct(o.spread.maxRate) + '），σ=' + o.sigma + (o.skewed ? ' → 偏科发散区间' : ' → 相对均衡'));
  P('- 末三短板：' + o.bottom.map((b) => b.name + '(' + pct(b.rate) + (b.level !== '–' ? '/' + b.level : '') + ')').join('、'));
  P('- R1 弱科命中：' + (o.r1.length ? o.r1.join('、') : '无'));
  P('');
  P('## 二、逐科研判（得分率升序）');
  for (const s of m.subjects) {
    P('');
    P('### ' + s.name + '　' + s.score + '/' + s.full + '（' + pct(s.rate) + (s.level ? '，' + s.level : '') + '）');
    if (!s.hasQ) { P('- ' + (s.note || '') + '（题级未参与）'); if (s.concls.length) P('- 结论：' + s.concls.map((c) => c.text).join('；')); continue; }
    P('- 难度结构：' + ['易', '中', '难'].map((dd) => dd + '题 ' + s.diffs[dd].total + ' 丢 ' + s.diffs[dd].loss + ' 分' + (s.diffs[dd].point ? '（占该档 ' + pct(s.diffs[dd].loss / s.diffs[dd].point) + '）' : '')).join('；'));
    if (s.types.length) P('- 题型丢分 top：' + s.types.slice(0, 3).map(([t, l, n]) => t + '（丢 ' + l + ' / ' + n + ' 题错）').join('、'));
    if (s.easyWrongNos.length) P('- ⚠ 易题错题：' + s.easyWrongNos.map((n) => '第' + n + '题').join('、'));
    if (s.kp) { P('- 知识点（' + s.kp.count + ' 条）：薄弱 ' + s.kp.weakN + '（' + pct(s.kp.weakRatio) + '），重点未掌握 ' + s.kp.keyWeakN + '；最弱 top5：' + s.kp.top.map((k) => (k.key ? '★' : '') + short(k.name) + '(' + k.rate + '%)').join('、')); }
    else P('- 知识点：本轮源未提供该科视图（不参与 R5/R6，非"无问题"）');
    if (s.l2) {
      const grid = s.l2.grid, gs = [];
      ['易', '中', '难'].forEach((dd) => Object.keys(grid[dd]).forEach((t) => gs.push(dd + '/' + t + ' ' + grid[dd][t] + ' 分')));
      P('- 题级诊断（D1 九宫格）：' + (gs.length ? gs.join('、') : '无丢分格'));
      const c = s.l2.cause;
      P('- 错因构成（AI 预判+人工复核）：' + (c.causes ? CAUSE_ORDER.filter((k) => c.causes[k] > 0).map((k) => A.RULES.causeName[k] + ' ' + c.causes[k] + ' 分').join(' / ') + '（确认 ' + c.coverage.confirmed + '/' + c.coverage.total + '）' : '无错因数据（未标注≠无问题）'));
      if (s.l2.quadrant) {
        const q = s.l2.quadrant;
        const hv = q.points.filter((p) => p.quadrant === 'highValue');
        P('- KP 四象限（D3）：高价值补强 ' + hv.length + ' 条（关联丢分 ≥ ' + q.xLine + ' 且掌握率 < ' + q.rateLine + '%）' + (q.degradedN ? '；' + q.degradedN + ' 条无题号映射按退化口径估算' : '') + (hv.length ? '；含 ' + hv.slice(0, 5).map((p) => (p.key ? '★' : '') + short(p.name)).join('、') : ''));
      }
    }
    P('- 结论：' + (s.concls.length ? s.concls.map((c) => c.text).join('；') : '未命中风险规则'));
  }
  P('');
  P('## 三、补救优先级清单（top' + m.plan.length + '，共 ' + m.planTotal + ' 候选，按规则估计回收降序）');
  P('');
  P('| # | 科目 | 事项 | 依据 | 预估回收* | 标签 |');
  P('|---|------|------|------|-----------|------|');
  m.plan.forEach((it, i) => P('| ' + (i + 1) + ' | ' + it.subj + ' | ' + escMd(it.what) + ' | ' + escMd(it.basis) + ' | ' + it.rec + ' 分 | ' + it.tag + ' |'));
  P('');
  P('*预估回收口径：易×' + A.RULES.recEasy + '、中档×' + A.RULES.recMid + '、重点薄弱按中档分摊上限 ' + A.RULES.recKpCap + '/条。');
  P('');
  P('### 补救优先级 v2（错因加权；A1）');
  P('');
  P('| # | 科目 | 事项 | 基础回收 | 错因系数 | 顽固加权 | 预估回收 |');
  P('|---|------|------|---------|---------|---------|---------|');
  m.actionV2.items.slice(0, 10).forEach((it, i) => P('| ' + (i + 1) + ' | ' + it.subj + ' | ' + escMd(it.what) + ' | ' + it.base + ' | ' + (it.w == null ? '—（无错因数据）' : it.w) + ' | ' + (it.stubborn ? '×' + A.RULES.stubbornBoost : '—') + ' | ' + it.rec + ' 分 |'));
  P('');
  P('- 合计（全部候选）：' + m.actionV2.potential + ' 分；难题档来源按 ×' + A.RULES.hardFactor + ' 口径（本期清单无难题档来源）。');
  P('');
  P('## 四、错因构成（v2 新增 · AI 预判+人工复核）');
  P('');
  const withCause = m.subjects.filter((s) => s.l2 && s.l2.cause && s.l2.cause.causes);
  if (!withCause.length) P('- 本轮无任何科目提供已确认错因（未标注≠无问题）。');
  withCause.forEach((s) => {
    const c = s.l2.cause;
    P('**' + s.name + '**（确认 ' + c.coverage.confirmed + '/' + c.coverage.total + '）');
    P('');
    P('| 错因 | 丢分 | 题数 |');
    P('|------|------|------|');
    CAUSE_ORDER.filter((k) => c.causes[k] > 0).forEach((k) => P('| ' + A.RULES.causeName[k] + ' | ' + c.causes[k] + ' | ' + c.causeCounts[k] + ' |'));
    if (c.pendingLoss > 0) P('| 待标注（未确认） | ' + c.pendingLoss + ' | — |');
    P('');
  });
  const noCause = m.subjects.filter((s) => s.hasQ && !(s.l2 && s.l2.cause && s.l2.cause.causes)).map((s) => s.name);
  if (noCause.length) P('- 未提供错因数据的科目：' + noCause.join('、') + '——"未标注≠无问题"，相关项未做错因加权。');
  P('');
  P('## 五、四周复习计划（v2 新增 · A2 确定性生成）');
  P('');
  m.actionV2.weeks.forEach((w) => {
    P('### 第 ' + w.week + ' 周 · ' + w.title);
    P('');
    P(w.desc + (w.overflow ? '（另有 ' + w.overflow + ' 项未列出，按预估回收降序截断，每周上限 ' + A.RULES.weekCap + '）' : ''));
    P('');
    if (w.items && w.items.length) {
      if (w.week === 1) {
        P('| 科目 | 题号 | 档位 | 错因 | 丢分 | 预估回收 | 解析 |');
        P('|------|------|------|------|------|---------|------|');
        w.items.forEach((it) => P('| ' + it.subj + ' | 第' + it.no + '题 | ' + (it.diff || '–') + ' | ' + (it.causeLabel || (it.cause || '—')) + ' | ' + (it.loss != null ? it.loss + ' 分' : '–') + ' | ' + (it.rec != null ? it.rec + ' 分' : '–') + ' | ' + (it.link ? '[' + short(it.link) + '](md/' + String(it.link).replace(/^md\//, '').replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29') + ')' : '–') + ' |'));
      } else if (w.week === 4) {
        P('| 类型 | 科目 | 内容 | 预估回收 |');
        P('|------|------|------|---------|');
        w.items.forEach((it) => P(it.kind === 'kp'
          ? '| 知识点 | ' + it.subj + ' | ' + escMd(short(it.name)) + '（重练 ' + (it.qNos || []).map((n) => '第' + n + '题').join('、') + '） | ' + it.rec + ' 分 |'
          : '| 题目 | ' + it.subj + ' | 第' + it.no + '题 | ' + it.rec + ' 分 |'));
      } else {
        P('| 科目 | 知识点群 | 掌握率 | 错因系数 | 顽固 | 重练题 | 预估回收 |');
        P('|------|----------|--------|---------|------|--------|---------|');
        w.items.forEach((it) => P('| ' + it.subj + ' | ' + (it.key ? '★' : '') + escMd(short(it.name)) + ' | ' + (it.rate == null ? '–' : it.rate + '%') + ' | ' + (it.w == null ? '—' : it.w) + ' | ' + (it.stubborn ? '×' + A.RULES.stubbornBoost : '—') + ' | ' + (it.questions || []).map((q) => '第' + q.no + '题').join('、') + ' | ' + it.rec + ' 分 |'));
      }
    }
    if ((!w.items || !w.items.length) && !(w.still && w.still.length)) P('本周无新增项（前序周次已覆盖全部重练项）。');
    if (w.still && w.still.length) {
      P('');
      P('仍未掌握（转入下期）：' + w.still.map((x) => x.subj + '·' + short(x.name) + '(' + x.rate + '%)').join('、'));
    }
    P('');
  });
  P('> 周计划为规则生成的确定性框架；"预估回收"沿用 A1 口径（基础回收 × 错因系数 × 顽固 1.3），做到才算，不是承诺。');
  P('');
  P('## 六、跨考演化（v2 新增 · E 系列）');
  P('');
  if (!m.cross.active) {
    P('- ' + m.cross.reason + '。KP 演化折线（E1）、顽固薄弱（E2）、跨考错题本（E3）在第二场带题级数据的考试入库后自动激活，不编造。');
  } else {
    P('- 跨考激活：' + m.cross.exams.map((e) => e.name + '(' + e.date + ')').join('、'));
    P('- E1 回落告警：' + (m.cross.e1.length ? m.cross.e1.map((x) => short(x.kpKey) + ' ' + x.from.rate + '%→' + x.to.rate + '%（' + x.delta + 'pp）').join('；') : '无'));
    P('- E2 顽固薄弱：' + (m.cross.e2.length ? m.cross.e2.map((x) => short(x.kpKey) + '（连续 ' + x.streak + ' 考）').join('；') : '无'));
    P('- E3 跨考错题本：' + m.cross.e3.length + ' 题（站点端支持考次/科目/错因/难度筛选）');
  }
  P('');
  P('## 七、边界与置信附录');
  P('');
  m.bounds.forEach((b) => P('- ' + b));
  (m.boundsV2 || []).forEach((b) => P('- ' + b));
  P('');
  P('（引擎 ' + m.engine + '，与站点 js/analyze.js 同源）');
  fs.writeFileSync(path.join(examDir, 'data', '系统分析.md'), L.join('\n') + '\n');
  console.log('OK 系统分析.md ｜ 丢分 ' + o.lossTotal + ' ｜ 回收上限 ' + o.potential + ' ｜ 加权回收 ' + m.actionV2.potential + ' ｜ 候选 ' + m.planTotal + '（引擎 ' + m.engine + '）');
}

const argv = process.argv.slice(2);
const examDir = argv[argv.indexOf('--exam') + 1];
if (!examDir) { console.error('用法：node analyze.js --exam <目录>'); process.exit(2); }
run(examDir);
