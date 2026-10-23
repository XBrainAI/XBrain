#!/usr/bin/env node
/* 流水线 S4.5 CLI：读 data/exam.json（+正式档案 targetRate）→ 调 GIAnalyze 引擎 → 渲染 md 存档。
   研判逻辑唯一实现＝js/analyze.js（与站点同源）；本文件只做 Markdown 呈现。
   用法：node analyze.js --exam <考试目录>
*/
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('../js/analyze.js');

const pct = (x) => (x == null ? '–' : (x * 100).toFixed(1) + '%');
const escMd = (s) => String(s).replace(/\|/g, '\\|');
const short = (n) => String(n).split('>').pop();

function run(examDir) {
  const d = JSON.parse(fs.readFileSync(path.join(examDir, 'data', 'exam.json'), 'utf8'));
  let targetRate = 0.8, targetFrom = '默认 0.8';
  const regFile = fs.readdirSync(examDir).find((f) => /^正式档案.*\.json$/.test(f));
  if (regFile) { try { targetRate = JSON.parse(fs.readFileSync(path.join(examDir, regFile), 'utf8')).student.targetRate || 0.8; targetFrom = 'student.targetRate'; } catch (e) {} }
  const m = A.build(d, targetRate);
  const o = m.overall;
  const L = [];
  const P = (s) => L.push(s);
  P('# 系统分析报告 · ' + d.exam.name);
  P('');
  P('- 输入：本考目录 data/exam.json（pipeline ' + JSON.stringify(d.meta.pipeline) + '）｜ 规则：' + m.rules + ' ｜ 引擎：' + m.engine + ' ｜ 目标得分率 ' + pct(targetRate) + '（' + targetFrom + '）');
  P('- 确定性生成（同输入同输出）；"预估回收"为规则估计非承诺；缺源不研判。站点端"系统分析"标签页与本文件同源同结论。');
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
  P('## 四、边界与置信附录');
  P('');
  m.bounds.forEach((b) => P('- ' + b));
  P('');
  P('（引擎 ' + m.engine + '，与站点 js/analyze.js 同源）');
  fs.writeFileSync(path.join(examDir, 'data', '系统分析.md'), L.join('\n') + '\n');
  console.log('OK 系统分析.md ｜ 丢分 ' + o.lossTotal + ' ｜ 回收上限 ' + o.potential + ' ｜ 候选 ' + m.planTotal + '（引擎 ' + m.engine + '）');
}

const argv = process.argv.slice(2);
const examDir = argv[argv.indexOf('--exam') + 1];
if (!examDir) { console.error('用法：node analyze.js --exam <目录>'); process.exit(2); }
run(examDir);
