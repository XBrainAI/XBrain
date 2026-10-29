#!/usr/bin/env node
/* grade-insight 流水线 S3.7 跨考联合数据（joint v1）
   输入：details 下各考 data/exam.json（gi-exam-data/2，v1 件兼容）+ data/knowledge-alias.yaml（KP 全局字典真源）
   输出：js/joint-data.js（window.GI_JOINT，schema gi-joint/1；生成头注"勿手改"）
   纪律：确定性幂等（同输入同输出；generatedAt=输入数据快照时刻，非构建时刻）；缺层不冒充。
   用法：node joint.js [--out <文件>] [--exam <考试目录>...]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const SCHEMA = 'gi-joint/1';
const CAUSES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const ROOT = path.resolve(__dirname, '..');

function r2(x) { return Math.round(x * 100) / 100; }
function normName(s) {
  return String(s).replace(/【重点】/g, '').replace(/^重点\s*/, '').replace(/\s+/g, '')
    .replace(/（/g, '(').replace(/）/g, ')');
}
function kpKeyOf(subjectKey, k) {
  return k.kpKey || subjectKey + '::' + normName(k.name);
}
function kpDictVersion(aliasFile) {
  try {
    return (fs.readFileSync(aliasFile, 'utf8').match(/^\s*-\s+id:\s*kp-/gm) || []).length;
  } catch (e) { return null; }
}
function findExamDirs(detailsDir) {
  const out = [];
  (function walk(dir) {
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'data') { if (fs.existsSync(path.join(p, 'exam.json'))) out.push(path.dirname(p)); continue; }
        walk(p);
      }
    }
  })(detailsDir);
  return out.sort();
}

function buildSubject(s) {
  const questions = s.questions || [];
  if (!questions.length) return null;
  const lossOf = (q) => Math.max(0, (q.point || 0) - (q.score || 0));
  const wrong = questions.filter((q) => q.score !== null && q.score !== undefined && q.point !== null && q.point !== undefined && q.score < q.point);
  const causes = {}; CAUSES.forEach((c) => { causes[c] = 0; });
  wrong.forEach((q) => { if (q.cause && causes[q.cause] !== undefined) causes[q.cause] = r2(causes[q.cause] + lossOf(q)); });
  const hasCause = wrong.some((q) => q.cause);
  const kpList = (s.kps || []).map((k) => ({
    kpKey: kpKeyOf(s.key, k),
    kpId: k.kpId || null,
    name: k.name,
    rate: k.rate,
    wrong: k.wrong,
    key: !!k.key,
    cat: k.category || null,
    qNos: (k.qNos || []).slice().sort((a, b) => a - b),
  }));
  const wrongQuestions = wrong.map((q) => ({
    no: q.no,
    type: q.type || '',
    point: q.point,
    score: q.score,
    diff: q.diff || '',
    cause: q.cause || null,
    causeNote: q.causeNote || null,
    kpKeys: kpList.filter((k) => k.qNos.indexOf(q.no) >= 0).map((k) => k.kpKey),
    analysisRef: q.analysisRef || null,
  })).sort((a, b) => a.no - b.no);
  return {
    name: s.name || s.key,
    score: typeof s.score === 'number' ? s.score : null,
    full: s.full || null,
    hasCause,
    causeCoverage: { confirmed: wrong.filter((q) => q.cause).length, total: wrong.length },
    causes: hasCause ? causes : null,
    kps: kpList,
    wrongQuestions,
  };
}

function buildJoint(examDirs, aliasFile) {
  const exams = [];
  for (const dir of examDirs) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'exam.json'), 'utf8')); } catch (e) { continue; }
    if (!d || !d.exam) continue;
    const subjects = {};
    for (const s of d.subjects || []) {
      const built = buildSubject(s);
      if (built) subjects[s.key] = built;
    }
    exams.push({
      examId: d.exam.id,
      name: d.exam.name,
      date: d.exam.date,
      source: path.relative(ROOT, path.join(dir, 'data', 'exam.json')).replace(/\\/g, '/'),
      transcribedAt: (d.meta && d.meta.transcribedAt) || null,
      subjects,
    });
  }
  exams.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.examId).localeCompare(String(b.examId)));

  const timeline = {};
  exams.forEach((e) => {
    Object.keys(e.subjects).sort().forEach((sk) => {
      e.subjects[sk].kps.forEach((k) => {
        if (k.rate === null || k.rate === undefined) return;
        (timeline[k.kpKey] = timeline[k.kpKey] || []).push({ examId: e.examId, date: e.date, rate: k.rate, cat: k.cat });
      });
    });
  });
  const kpTimeline = {};
  Object.keys(timeline).sort().forEach((k) => { kpTimeline[k] = timeline[k]; });

  const stamps = exams.map((e) => e.transcribedAt).filter(Boolean).sort();
  return {
    schema: SCHEMA,
    generatedAt: stamps.length ? stamps[stamps.length - 1] : null,
    kpDictVersion: aliasFile ? kpDictVersion(aliasFile) : null,
    exams,
    kpTimeline,
  };
}

function renderFile(data) {
  return '/* 由 pipeline/joint.js 生成，勿手改 —— schema ' + SCHEMA +
    ' ｜ 数据截至 ' + (data.generatedAt || 'unknown') + ' */\n' +
    '(function (root) {\n  var data = ' + JSON.stringify(data, null, 2).split('\n').join('\n  ') + ';\n' +
    '  root.GI_JOINT = data;\n' +
    '  if (typeof module !== \'undefined\' && module.exports) module.exports = data;\n' +
    '})(typeof window !== \'undefined\' ? window : globalThis);\n';
}

function write(data, outFile) {
  fs.writeFileSync(outFile, renderFile(data));
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const argAll = (n) => argv.map((v, i) => (v === n ? argv[i + 1] : null)).filter(Boolean);
  const examDirs = argAll('--exam').length ? argAll('--exam').map((p) => path.resolve(p)) : findExamDirs(path.join(ROOT, 'details'));
  const outFile = path.resolve(argAll('--out')[0] || path.join(ROOT, 'js', 'joint-data.js'));
  const data = buildJoint(examDirs, path.join(ROOT, 'data', 'knowledge-alias.yaml'));
  write(data, outFile);
  const subjN = data.exams.reduce((a, e) => a + Object.keys(e.subjects).length, 0);
  const kpN = data.exams.reduce((a, e) => a + Object.keys(e.subjects).reduce((b, k) => b + e.subjects[k].kps.length, 0), 0);
  console.log('OK ' + path.relative(ROOT, outFile).replace(/\\/g, '/') + ' ｜ schema ' + data.schema +
    ' ｜ 考次 ' + data.exams.length + ' ｜ 科目 ' + subjN + ' ｜ KP ' + kpN + ' ｜ 时间线 ' + Object.keys(data.kpTimeline).length);
}

module.exports = { SCHEMA, CAUSES, buildJoint, renderFile, findExamDirs, normName, kpKeyOf };
