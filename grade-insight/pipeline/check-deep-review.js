#!/usr/bin/env node
/* grade-insight SPEC-017 深度解读结构断言（check-deep-review v1）
   用法：node pipeline/check-deep-review.js --exam <考试目录> [--refs]
   校验：① 每科每道错题（score<point）有 md/〈科〉-试卷解析 (N).md，含三段标题+口径标注；
         ② 每科有 md/〈科〉-错题缺漏汇总.md；③ 每份 md 有渲染 HTML；
         ④ --refs：错题 analysisRef 与 md 文件双向一致（exam.json 无多余/缺失引用）。
   只读断言，不改任何文件。exit 0 = 全过。 */
'use strict';
const fs = require('fs');
const path = require('path');

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : null;
}
const examDir = arg('exam');
const checkRefs = process.argv.includes('--refs');
if (!examDir || !fs.existsSync(examDir)) { console.error('[fail] --exam 目录无效：' + examDir); process.exit(2); }

const exam = JSON.parse(fs.readFileSync(path.join(examDir, 'data', 'exam.json'), 'utf-8'));
const needHeads = ['### 考点定位', '### 缺漏诊断', '### 防复发策略'];
const cToken = /\bC[1-6]\b/; // 内部错因编号不外露（C2H5 等化学式不含边界，不误伤）
let errs = [], warns = [], nFiles = 0;

for (const s of exam.subjects) {
  const qs = s.questions || [];
  if (!qs.length) continue;
  const cn = s.name;
  const wrong = qs.filter(q => (q.score || 0) < (q.point || 0));
  const summ = path.join(examDir, 'md', cn + '-错题缺漏汇总.md');
  if (!fs.existsSync(summ)) errs.push(cn + '：缺缺漏汇总件 md/' + cn + '-错题缺漏汇总.md');
  for (const q of wrong) {
    const mdRel = 'md/' + cn + '-试卷解析 (' + q.no + ').md';
    const mdAbs = path.join(examDir, mdRel);
    if (!fs.existsSync(mdAbs)) { errs.push(cn + ' 第' + q.no + '题：缺 ' + mdRel); continue; }
    nFiles++;
    const txt = fs.readFileSync(mdAbs, 'utf-8');
    for (const h of needHeads) if (!txt.includes(h)) errs.push(cn + ' 第' + q.no + '题：缺标题「' + h + '」');
    if (!txt.includes('口径标注')) errs.push(cn + ' 第' + q.no + '题：缺口径标注行');
    if (cToken.test(txt)) warns.push(cn + ' 第' + q.no + '题：疑内部编号外露 → ' + (txt.match(new RegExp('.{0,12}' + cToken.source + '.{0,12}')) || [''])[0]);
    const html = path.join(examDir, 'data', 'analysis', cn + '-试卷解析-' + q.no + '.html');
    if (!fs.existsSync(html)) warns.push(cn + ' 第' + q.no + '题：缺渲染 HTML（待 render-analysis）');
    if (checkRefs) {
      const want = 'md/' + cn + '-试卷解析 (' + q.no + ').md';
      if (q.analysisRef !== want) errs.push(cn + ' 第' + q.no + '题：analysisRef 应为 "' + want + '"，实为 ' + JSON.stringify(q.analysisRef || null));
    }
  }
  if (checkRefs) {
    const wrongSet = new Set(wrong.map(q => q.no));
    const legacySubjects = new Set(['数学', '生物']); // SPEC-009/011 存量：做对题也有解析件，零回退保留
    for (const q of qs) {
      if (!wrongSet.has(q.no) && q.analysisRef && !legacySubjects.has(cn)) errs.push(cn + ' 第' + q.no + '题：非错题不应有 analysisRef（存量科目除外）');
    }
  }
}

console.log('[check-deep-review] 错题解读件 = ' + nFiles + '，错误 ' + errs.length + '，提示 ' + warns.length);
errs.forEach(e => console.log('  [error] ' + e));
warns.forEach(w => console.log('  [warn ] ' + w));
process.exit(errs.length ? 1 : 0);
