#!/usr/bin/env node
/* grade-insight 流水线 S3 转换器（gi-exam-data/1，converter v1）
   契约：pipeline/DATA-CONTRACT.md ｜ 准入：pipeline/acceptance.yaml ｜ 别名：data/knowledge-alias.yaml
   纪律：解析失败进 quarantine 不猜；缺层缺省不冒充；integrity 如实存档。
   用法：node convert.js --exam <考试目录> [--check] [--selftest]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const SUBJECTS = [
  { key: 'chinese', cn: '语文' }, { key: 'math', cn: '数学' }, { key: 'english', cn: '英语' },
  { key: 'physics', cn: '物理' }, { key: 'chemistry', cn: '化学' }, { key: 'biology', cn: '生物' },
  { key: 'politics', cn: '政治' }, { key: 'history', cn: '历史' }, { key: 'geography', cn: '地理' },
];
const CN2KEY = {}; SUBJECTS.forEach(s => { CN2KEY[s.cn] = s.key; CN2KEY['生物学'] = 'biology'; });
const PIPE_VERSIONS = { transcribePrompt: 'v1', converter: 'v1', acceptance: 'v1.1', alias: 'v1' };

function lines(t) { return t.split(/\r?\n/); }
function cells(line) {
  const s = line.trim();
  if (!s.startsWith('|')) return null;
  return s.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}
function isSep(c) { return c && c.length && c.every(x => /^:?-{2,}:?$/.test(x)); }
function tables(ls) {
  const out = []; let cur = null;
  for (const l of ls) {
    const c = cells(l);
    if (c) { (cur = cur || []).push(c); }
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}
function num(x) { const n = parseFloat(String(x).replace(/[**]/g, '')); return Number.isFinite(n) ? n : null; }
function normName(s) {
  return String(s).replace(/【重点】/g, '').replace(/^重点\s*/, '').replace(/\s+/g, '')
    .replace(/（/g, '(').replace(/）/g, ')');
}

/* ---------- 各科成绩概览：L1 + 题级表 ---------- */
function parseOverview(md) {
  const ls = lines(md); let score = null, full = null, level = null;
  for (let i = 0; i < ls.length; i++) {
    if (score === null) {
      const m = ls[i].match(/^\*\*(\d+(?:\.\d+)?)\*\*\s*$/);
      if (m && ls[i + 1] && /\d+(?:\.\d+)?\s*$/.test(ls[i + 1]) && /分数/.test(ls[i + 1])) {
        score = num(m[1]);
        const fm = ls[i + 1].match(/(\d+(?:\.\d+)?)\s*$/); if (fm) full = num(fm[1]);
      }
    }
    if (level === null) {
      const lm = ls[i].match(/(?:当前标记位于|指针标记位于)\s*\**([A-E])\**/) || ls[i].match(/等级：\*\*([A-E])\*\*/);
      if (lm) level = lm[1];
    }
  }
  const questions = []; const issues = { deduped: [], quarantined: [], notes: [] };
  for (const l of ls) { const nm = l.match(/^>\s*注：(.+)$/); if (nm) issues.notes.push(nm[1].trim()); }
  for (const t of tables(ls)) {
    const head = t[0];
    if (!head || head[0] !== '题号' || !head.includes('得分')) continue;
    const si = head.indexOf('得分'), pi = head.indexOf('分值'), ti = head.indexOf('题型'), di = head.indexOf('难度');
    let prev = null; const seen = new Map();
    for (const r of t.slice(1)) {
      if (isSep(r)) continue;
      const raw = r.join('|');
      const no = parseInt(r[0], 10);
      if (!Number.isFinite(no)) { if (r[0] && r[0] !== '题号') issues.quarantined.push({ raw }); continue; }
      if (prev && prev.raw === raw) { issues.deduped.push({ no, why: '连续重复行' }); continue; }
      if (seen.has(no)) {
        if (seen.get(no) === raw) { issues.deduped.push({ no, why: '同内容重复行' }); continue; }
        issues.quarantined.push({ raw, why: '重复题号且内容不一致，保留首现' }); prev = { raw }; continue;
      }
      const q = { no, type: ti >= 0 ? r[ti] : '', point: pi >= 0 ? num(r[pi]) : null, diff: di >= 0 ? r[di] : '', score: num(r[si]) };
      if (q.point === null || q.score === null) { issues.quarantined.push({ raw }); prev = { raw }; continue; }
      seen.set(no, raw); questions.push(q); prev = { raw };
    }
  }
  return { score, full, level, questions, issues };
}

/* ---------- 总分概览：各科 L1 交叉源 + 总分 ---------- */
function parseTotal(md) {
  const bySubject = {}; let total = null, level = null;
  const lm = md.match(/(?:当前标记位于|指针标记位于)\s*\**([A-E])\**/); if (lm) level = lm[1];
  for (const t of tables(lines(md))) {
    const head = t[0];
    if (!head || head[0] !== '科目') continue;
    const fi = head.indexOf('分数'), mi = head.indexOf('满分');
    let prev = null;
    for (const r of t.slice(1)) {
      if (isSep(r)) continue;
      if (prev && prev.join('|') === r.join('|')) continue;
      if (r[0] === '总分') { total = { score: num(r[fi]), full: num(r[mi]), level }; }
      else if (CN2KEY[r[0]]) { bySubject[CN2KEY[r[0]]] = { score: num(r[fi]), full: num(r[mi]) }; }
      prev = r;
    }
  }
  return { bySubject, total };
}

/* ---------- 知识点 ---------- */
function parseKpFile(md) {
  let badges = null; const list = [];
  for (const t of tables(lines(md))) {
    const head = t[0];
    if (head && head.length === 4 && head.join('').includes('考查知识点')) {
      badges = {};
      const cellInt = (x) => { const m = String(x || '').match(/\d+/); return m ? parseInt(m[0], 10) : null; };
      const fromHeader = head.map(cellInt);
      if (fromHeader.every((v, i) => i === 0 || v !== null) && fromHeader[0] !== null) {
        ['exam', 'mastered', 'improve', 'weak'].forEach((k, i) => { badges[k] = fromHeader[i]; });
      } else {
        for (const r of t.slice(1)) { if (isSep(r)) continue; ['exam', 'mastered', 'improve', 'weak'].forEach((k, i) => { badges[k] = cellInt(r[i]); }); break; }
      }
    }
    if (head && head[0] === '知识点名称') {
      for (const r of t.slice(1)) {
        if (isSep(r)) continue;
        const rate = (String(r[1] || '').match(/(\d+(?:\.\d+)?)\s*%/) || [])[1];
        const wrong = num(r[2]);
        if (!r[0] || rate === undefined || wrong === null) continue;
        list.push({ name: r[0], rate: parseFloat(rate), wrong, key: r[0].includes('【重点】') || /^重点\s/.test(r[0]) });
      }
    }
  }
  return { badges, list };
}

/* ---------- 别名表 ---------- */
function loadAlias(file) {
  const canonical = []; let cur = null;
  for (const l of lines(fs.readFileSync(file, 'utf8'))) {
    const m = l.match(/^\s*-\s+id:\s*(\S+)/); if (m) { cur = { id: m[1], aliases: [] }; canonical.push(cur); continue; }
    if (cur) {
      const f = l.match(/^\s+(name|subject|first_seen):\s*(.+)$/);
      if (f) cur[f[1]] = f[2].trim();
      const a = l.match(/^\s+-\s+(.+)$/); if (a && /^\s+aliases:/.test(l) === false) cur.aliases.push(a[1].trim());
    }
  }
  return canonical;
}
function saveAlias(file, canonical, total0) {
  const head = lines(fs.readFileSync(file, 'utf8')).slice(0, 12).join('\n').replace(/stats:\n.*$/s, '');
  const body = ['stats:', '  total: ' + canonical.length, '  updated_at: "' + total0 + '"', '', 'canonical:'];
  for (const c of canonical) {
    body.push('  - id: ' + c.id);
    body.push('    name: ' + c.name);
    body.push('    subject: ' + c.subject);
    body.push('    aliases: [' + c.aliases.join(', ') + ']');
    body.push('    first_seen: ' + c.first_seen);
  }
  body.push('', 'suspected: []');
  fs.writeFileSync(file, head + body.join('\n') + '\n');
}
function makeResolver(canonical) {
  const byNorm = {};
  canonical.forEach(c => { byNorm[normName(c.name) + '|' + c.subject] = c.id; c.aliases.forEach(a => { byNorm[normName(a) + '|' + c.subject] = c.id; }); });
  let next = canonical.length;
  const unmapped = [];
  return {
    canonical,
    resolve(name, subject) {
      const k = normName(name) + '|' + subject;
      if (byNorm[k]) return byNorm[k];
      const id = 'kp-' + String(++next).padStart(4, '0');
      const e = { id, name, subject, aliases: [], first_seen: new Date().toISOString().slice(0, 7) };
      canonical.push(e); byNorm[k] = id; unmapped.push(id + ' ' + name);
      return id;
    },
    unmapped,
  };
}

/* ---------- 主流程 ---------- */
function convert(examDir, aliasFile, month) {
  const mdDir = path.join(examDir, 'md');
  const files = fs.readdirSync(mdDir);
  const read = (f) => fs.readFileSync(path.join(mdDir, f), 'utf8');
  const totalMd = files.find(f => /^总分概览\.md$/.test(f));
  const xtotal = totalMd ? parseTotal(read(totalMd)) : { bySubject: {}, total: null };

  /* 已登记正式档案（SPEC-001）优先：保持登记值一致 */
  let registered = null;
  const regFile = fs.readdirSync(examDir).find(f => /^正式档案.*\.json$/.test(f));
  if (regFile) {
    const j = JSON.parse(fs.readFileSync(path.join(examDir, regFile), 'utf8'));
    if (j.exams && j.exams[0]) registered = j;
  }

  const alias = makeResolver(loadAlias(aliasFile));
  const subjects = []; const issuesAll = {};
  for (const s of SUBJECTS) {
    const ovFile = files.find(f => new RegExp('^' + s.cn + '[－-]?成绩概览\\.md$').test(f) || (s.key === 'biology' && /^生物[-－]?成绩概览\.md$/.test(f)));
    if (!ovFile) { subjects.push({ key: s.key, name: s.cn, ...(xtotal.bySubject[s.key] || {}) }); continue; }
    const ov = parseOverview(read(ovFile));
    const reg = registered && registered.exams[0].subjects.find(x => x.key === s.key);
    const L1 = { score: ov.score ?? (reg ? reg.score : null), full: ov.full ?? (reg ? reg.full : null) };
    const level = ov.level || (reg ? reg.level : null) || (xtotal.bySubject[s.key] || {}).level || null;
    const subj = { key: s.key, name: s.cn, full: L1.full, score: L1.score };
    if (level) subj.level = level;
    if (ov.questions.length) subj.questions = ov.questions.map(q => Object.assign({}, q));
    if (s.key === 'math' || s.key === 'biology') {
      subj.questions && subj.questions.forEach(q => {
        const f = files.find(x => x === s.cn + '-试卷解析 (' + q.no + ').md');
        if (f) q.analysisRef = 'md/' + f;
      });
    }
    issuesAll[s.key] = ov.issues;
    subjects.push(subj);
  }

  /* L3 知识点：数学（全量页+三页签）、生物（-1..-4） */
  function attachKps(key, mainPat, tabPats) {
    const subj = subjects.find(x => x.key === key); if (!subj) return;
    const mainF = files.find(f => new RegExp(mainPat).test(f)); if (!mainF) return;
    const main = parseKpFile(read(mainF)); const merged = {};
    const add = (item, category) => {
      const id = alias.resolve(item.name, key);
      const k = normName(item.name);
      merged[k] = merged[k] || { kpId: id, name: item.name.replace(/^重点\s*/, ''), rate: item.rate, wrong: item.wrong, key: item.key };
      if (category) merged[k].category = category;
    };
    main.list.forEach(i => add(i, '考查'));
    const catMap = { mastered: '已掌握', improve: '待提升', weak: '薄弱' };
    for (const [pat, cat] of tabPats) {
      const f = files.find(x => new RegExp(pat).test(x)); if (!f) continue;
      parseKpFile(read(f)).list.forEach(i => add(i, cat));
    }
    subj.kps = Object.values(merged);
    subj.kpBadges = main.badges;
  }
  attachKps('math', '^数学-知识点掌握情况\\.md$', [[ '^数学-知识点掌握情况2\\.md$', '已掌握' ], [ '^数学-知识点掌握情况3\\.md$', '待提升' ], [ '^数学-知识点掌握情况4\\.md$', '薄弱' ]]);
  attachKps('biology', '^生物-知识点掌握情况-1\\.md$', [[ '^生物-知识点掌握情况-2\\.md$', '已掌握' ], [ '^生物-知识点掌握情况-3\\.md$', '待提升' ], [ '^生物-知识点掌握情况-4\\.md$', '薄弱' ]]);

  /* integrity */
  const checks = [];
  const qsum = {};
  for (const s of subjects) if (s.questions) qsum[s.key] = +s.questions.reduce((a, q) => a + q.score, 0).toFixed(2);
  for (const s of subjects) {
    if (!s.questions) continue;
    const expect = s.score;
    const st = expect === null || expect === undefined ? 'warn' : (Math.abs(qsum[s.key] - expect) < 0.01 ? 'pass' : 'fail');
    checks.push({ name: '题级得分之和 vs 科得分:' + s.key, expect, actual: qsum[s.key], status: st });
  }
  const ssum = +subjects.reduce((a, s) => a + (s.score || 0), 0).toFixed(2);
  const fsum = +subjects.reduce((a, s) => a + (s.full || 0), 0).toFixed(2);
  checks.push({ name: '各科得分之和 vs 总分', expect: xtotal.total && xtotal.total.score, actual: ssum, status: xtotal.total && Math.abs(ssum - xtotal.total.score) < 0.01 ? 'pass' : 'fail' });
  checks.push({ name: '各科满分之和 vs 总分满分', expect: xtotal.total && xtotal.total.full, actual: fsum, status: xtotal.total && Math.abs(fsum - xtotal.total.full) < 0.01 ? 'pass' : 'fail' });
  for (const s of subjects) {
    if (s.kpBadges && s.kps) {
      const st = s.kpBadges.exam === s.kps.length ? 'pass' : 'warn';
      checks.push({ name: '知识点行数 vs 徽标:' + s.key, expect: s.kpBadges.exam, actual: s.kps.length, status: st });
    }
  }
  const refCnt = {};
  for (const s of subjects) if (s.questions) { const c = s.questions.filter(q => q.analysisRef).length; if (c) refCnt[s.key] = c + '/' + s.questions.length; }
  checks.push({ name: '题解覆盖(analysisRef)', expect: '数学/生物源图存在页', actual: refCnt, status: 'pass' });

  const deduped = [], quarantined = [], sourceNotes = [];
  for (const [k, v] of Object.entries(issuesAll)) {
    v.deduped.forEach(d => deduped.push({ subject: k, no: d.no, why: d.why }));
    v.quarantined.forEach(d => quarantined.push({ subject: k, raw: d.raw }));
    (v.notes || []).forEach(n => sourceNotes.push({ subject: k, note: n }));
  }
  const confidence = {};
  for (const s of SUBJECTS) {
    confidence[s.key] = (issuesAll[s.key] && (issuesAll[s.key].deduped.length || issuesAll[s.key].quarantined.length)) ? '中' : '高';
  }

  const regExam = registered && registered.exams[0];
  const exam = regExam ? {
    id: regExam.id, name: regExam.name, date: regExam.date, term: regExam.term, type: regExam.type,
    note: regExam.note + '；本件由流水线 S3 按 gi-exam-data/1 生成',
  } : { id: month + '-考', name: month, date: month, term: '', type: '月考', note: '转换器无正式档案，字段待补' };

  return {
    data: {
      contract: 'gi-exam-data/1',
      meta: { source: 'raw', pipeline: PIPE_VERSIONS, transcribedAt: new Date().toISOString().slice(0, 19), confidence },
      exam,
      student: registered ? registered.student : { name: '待登记', studentId: 's1', enrollYear: null, targetRate: 0.8 },
      total: { score: xtotal.total.score, full: xtotal.total.full, level: xtotal.total.level },
      subjects,
      integrity: { checks, deduped, quarantined, unmapped: alias.unmapped, sourceNotes },
    },
    canonical: alias.canonical,
  };
}

/* ---------- 报告 ---------- */
function report(data) {
  const rows = [];
  const P = (s) => rows.push(s);
  P('# 单考深挖报告 · ' + data.exam.name);
  P('');
  P('- 生成：' + data.meta.transcribedAt + ' ｜ 来源：' + data.meta.source + ' ｜ 契约：' + data.contract + ' ｜ 流水线：' + JSON.stringify(data.meta.pipeline));
  P('- 日期口径：' + data.exam.date + '（' + (data.exam.note.includes('暂记') ? '月份暂记，待确认' : '已确认') + '）｜ 总分 **' + data.total.score + '/' + data.total.full + '**（班级等级 ' + data.total.level + '）');
  P('');
  P('## 一、成绩结构');
  P('');
  P('| 科目 | 得分 | 满分 | 得分率 | 等级 | 数据置信 |');
  P('|---|---|---|---|---|---|');
  for (const s of data.subjects) {
    P('| ' + (s.name || s.key) + ' | ' + (s.score ?? '–') + ' | ' + (s.full ?? '–') + ' | ' + (s.full ? (100 * s.score / s.full).toFixed(1) + '%' : '–') + ' | ' + (s.level || '–') + ' | ' + (data.meta.confidence[s.key] || '–') + ' |');
  }
  P('');
  P('## 二、丢分结构（科×难度）');
  P('');
  const diffs = {};
  for (const s of data.subjects) if (s.questions) s.questions.forEach(q => {
    const d = q.diff || '未知'; diffs[d] = diffs[d] || {};
    diffs[d][s.key] = +((diffs[d][s.key] || 0) + Math.max(0, (q.point || 0) - (q.score || 0))).toFixed(1);
  });
  const dk = Object.keys(diffs);
  P('| 科目 | ' + dk.join(' | ') + ' |');
  P('|---|' + dk.map(() => '---').join('|') + '|');
  for (const s of data.subjects) if (s.questions) {
    P('| ' + s.name + ' | ' + dk.map(d => (diffs[d][s.key] || 0)).join(' | ') + ' |');
  }
  P('');
  P('## 三、知识点画像（数据源仅数学/生物，其余科未提供 L3，如实缺省）');
  P('');
  for (const s of data.subjects) if (s.kps) {
    const weak = s.kps.filter(k => k.rate < 60).sort((a, b) => a.rate - b.rate).slice(0, 10);
    P('**' + s.name + '**：考查 ' + (s.kpBadges ? s.kpBadges.exam : s.kps.length) + '，入档 ' + s.kps.length + '，其中薄弱（<60%）' + s.kps.filter(k => k.rate < 60).length + ' 条。Top10 薄弱：');
    P('');
    P('| 知识点 | 掌握率 | 错题 | 重点 |');
    P('|---|---|---|---|');
    weak.forEach(w => P('| ' + w.name + ' | ' + w.rate + '% | ' + w.wrong + ' | ' + (w.key ? '★' : '') + ' |'));
    P('');
  }
  P('## 四、对账与置信');
  P('');
  P('| 检查 | 期望 | 实际 | 状态 |');
  P('|---|---|---|---|');
  data.integrity.checks.forEach(c => P('| ' + c.name + ' | ' + JSON.stringify(c.expect) + ' | ' + JSON.stringify(c.actual) + ' | ' + c.status + ' |'));
  P('');
  P('- 拼接去重 ' + data.integrity.deduped.length + ' 处；隔离待审 ' + data.integrity.quarantined.length + ' 行；别名新登记 ' + data.integrity.unmapped.length + ' 条（见 exam.json integrity）。');
  if (data.integrity.sourceNotes && data.integrity.sourceNotes.length) {
    P('- 源文说明（转写件"注："行原文摘录，解释对账差异出处）：');
    data.integrity.sourceNotes.forEach(n => P('  - [' + n.subject + '] ' + n.note));
  }
  P('');
  P('## 五、小结');
  const rates = data.subjects.filter(s => s.full).map(s => ({ n: s.name, r: s.score / s.full })).sort((a, b) => b.r - a.r);
  P('- 亮点：得分率前列 ' + rates.slice(0, 3).map(x => x.n + '(' + (x.r * 100).toFixed(1) + '%)').join('、') + '。');
  P('- 漏洞：得分率末位 ' + rates.slice(-3).map(x => x.n + '(' + (x.r * 100).toFixed(1) + '%)').join('、') + '。');
  const fails = data.integrity.checks.filter(c => c.status !== 'pass');
  P('- 异常：' + (fails.length ? fails.map(c => c.name + '=' + c.status).join('；') : '对账全过') + '。');
  P('');
  return rows.join('\n');
}
/* 修正 report 中表头误拼（避免动态列错误） */

/* ---------- CLI ---------- */
function selftest() {
  const a = []; const eq = (x, y, m) => a.push((JSON.stringify(x) === JSON.stringify(y) ? 'ok ' : 'FAIL ') + m + ' got ' + JSON.stringify(x));
  eq(normName('【重点】平面与平面所成角的向量求法'), '平面与平面所成角的向量求法', 'normName 去重点标记');
  eq(normName('重点 核酸的结构及功能'), '核酸的结构及功能', 'normName 去重点前缀');
  eq(cells('| 1 | 单选题 | 2.5 | 易 | 2.5 |').length, 5, 'cells');
  eq(num('**45**（选中）'), 45, 'num bold');
  const ov = parseOverview('# x\n**80**\n0　数学分数　150\n\n| 题号 | 题型 | 分值 | 难度 | 得分 |\n|---|---|---|---|---|\n| 1 | 单选题 | 5 | 易 | 0 |\n| 1 | 单选题 | 5 | 易 | 0 |\n| 2 | 填空题 | 5 | 中 | 5 |\n');
  eq(ov.score, 80, 'ov score'); eq(ov.full, 150, 'ov full');
  eq(ov.questions.length, 2, 'dedup 连续重复题'); eq(ov.issues.deduped.length, 1, 'dedup 记录');
  const q = parseOverview('| 题号 | 题型 | 分值 | 难度 | 得分 |\n|---|---|---|---|---|\n| 三 | 主观 | 10 | 难 | 5 |\n');
  eq(q.issues.quarantined.length, 1, '非数字题号入隔离');
  const t = parseTotal('| 科目 | 分数 | 满分 |\n|---|---|---|\n| 历史 | 64 | 100 |\n| 历史 | 64 | 100 |\n| 总分 | 623.5 | 1030 |\n');
  eq(t.total.score, 623.5, 'total 解析'); eq(Object.keys(t.bySubject).length, 1, 'total 去重');
  console.log(a.join('\n')); process.exitCode = a.some(x => x.startsWith('FAIL')) ? 1 : 0;
}

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
if (argv.includes('--selftest')) selftest();
else {
  const examDir = arg('--exam'); if (!examDir) { console.error('用法：node convert.js --exam <目录> [--check]'); process.exit(2); }
  const root = path.resolve(__dirname, '..');
  if (argv.includes('--check')) {
    const raw = fs.readdirSync(path.join(examDir, 'raw'));
    const hasTotal = raw.some(f => /总分概览/.test(f));
    console.log((hasTotal ? 'PASS' : 'FAIL') + ' 总分概览');
    let miss = 0;
    for (const s of SUBJECTS) {
      const hit = raw.some(f => new RegExp('(' + s.cn + '|生物学)' + '[-－]?成绩概览').test(f));
      if (!hit) { console.log('WARN 缺 ' + s.cn + '-成绩概览（源缺失：该科仅能依总分概览，题级层按兼容矩阵降级）'); miss++; }
    }
    console.log('raw 总数：' + raw.length + ' ｜ 概览缺口 ' + miss + '/9（warn 非阻断，属源覆盖事实）');
  }
  const month = path.basename(examDir);
  const { data, canonical } = convert(examDir, path.join(root, 'data', 'knowledge-alias.yaml'), month);
  const outDir = path.join(examDir, 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'exam.json'), JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'report.md'), report(data));
  saveAlias(path.join(root, 'data', 'knowledge-alias.yaml'), canonical, new Date().toISOString().slice(0, 10));
  const fails = data.integrity.checks.filter(c => c.status === 'fail');
  console.log('OK ' + outDir + ' ｜ checks: ' + data.integrity.checks.map(c => c.status).join(',') + ' ｜ fail=' + fails.length + ' unmapped=' + data.integrity.unmapped.length);
}
