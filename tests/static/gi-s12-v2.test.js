/**
 * S12 SPEC-011 v2：联合数据（gi-joint/1）+ GIAnalyze v2（D/E/A 系列）+ V1–V5 接线与纪律。
 * 零回退口径：v2 引擎对同一 exam.json 的 R1–R7 输出与 v1 引擎逐字段一致（tests/static/fixtures/gi-analyze-v1.js 为冻结基线）。
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const EXAM_DIR = path.join(ROOT, 'grade-insight/details/高一/上学期/10月');
const EXAM = JSON.parse(fs.readFileSync(path.join(EXAM_DIR, 'data', 'exam.json'), 'utf8'));
const A = require(path.join(ROOT, 'grade-insight/js/analyze.js'));
const A_V1 = require(path.join(ROOT, 'tests/static/fixtures/gi-analyze-v1.js'));
const JOINT = require(path.join(ROOT, 'grade-insight/js/joint-data.js'));
const J = require(path.join(ROOT, 'grade-insight/pipeline/joint.js'));
const RULES_MD = fs.readFileSync(path.join(ROOT, 'grade-insight/pipeline/ANALYZE-RULES.md'), 'utf8');
const JOINT_SRC = fs.readFileSync(path.join(ROOT, 'grade-insight/js/joint-data.js'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'grade-insight/js/app.js'), 'utf8');
const INDEX = fs.readFileSync(path.join(ROOT, 'grade-insight/index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'grade-insight/css/style.css'), 'utf8');

const V1_KEYS = ['key', 'name', 'score', 'full', 'rate', 'level', 'hasQ', 'diffs', 'types', 'easyWrongNos', 'kp', 'concls', 'note'];
const isWrong = (q) => q.score !== null && q.score !== undefined && q.point !== null && q.point !== undefined && q.score < q.point;
const lossOf = (q) => Math.max(0, (q.point || 0) - (q.score || 0));
const r2 = (x) => Math.round(x * 100) / 100;

test('S12.1 v2 规则常量与 ANALYZE-RULES v2 文档一致（防漂移）', () => {
  const R = A.RULES;
  assert.equal(R.v, 'ANALYZE-RULES v2');
  assert.match(RULES_MD, /D3 \| KP 四象限/); assert.equal(R.D3rateLine, 60);
  assert.match(RULES_MD, /掌握率差 ≤ −15pp/); assert.equal(R.E1dropPP, 15);
  assert.match(RULES_MD, /连续 ≥2 考/); assert.equal(R.E2streak, 2);
  assert.match(RULES_MD, /顽固 ×1\.3/); assert.equal(R.stubbornBoost, 1.3);
  assert.match(RULES_MD, /难题档来源一律再 ×0\.3/); assert.equal(R.hardFactor, 0.3);
  assert.deepEqual(R.causeW, { C1: 0.6, C2: 0.6, C3: 0.9, C4: 0.9, C5: 0.6, C6: 0.5 });
  assert.match(RULES_MD, /C6 待标注 \| 0\.5/);
});

test('S12.2 零回退：v2 对 10 月考的 R1–R7 输出与 v1 引擎逐字段一致', () => {
  const v1 = A_V1.build(EXAM, 0.8);
  const v2 = A.build(EXAM, 0.8, JOINT);
  assert.deepEqual(v2.overall, v1.overall, 'overall 全等');
  assert.deepEqual(v2.plan, v1.plan, '补救清单 v1 全等');
  assert.equal(v2.planTotal, v1.planTotal);
  assert.deepEqual(v2.bounds, v1.bounds, '边界附录 v1 全等');
  assert.equal(v2.subjects.length, v1.subjects.length);
  v2.subjects.forEach((s, i) => {
    const b = v1.subjects[i];
    V1_KEYS.forEach((k) => {
      if (s[k] === undefined && b[k] === undefined) return;
      assert.deepEqual(s[k], b[k], 'subject ' + s.name + ' 字段 ' + k);
    });
  });
});

test('S12.3 L2 题级诊断：九宫格守恒 / 错因覆盖 / KP 四象限', () => {
  const m = A.build(EXAM, 0.8, JOINT);
  for (const s of m.subjects) {
    if (!s.l2) continue;
    const gridSum = ['易', '中', '难'].reduce((a, d) => a + Object.keys(s.l2.grid[d]).reduce((b, t) => b + s.l2.grid[d][t], 0), 0);
    const diffSum = ['易', '中', '难'].reduce((a, d) => a + s.diffs[d].loss, 0);
    assert.equal(r2(gridSum), r2(diffSum), s.name + ' 九宫格丢分合计=难度丢分合计');
  }
  const math = m.subjects.find((s) => s.key === 'math');
  const bio = m.subjects.find((s) => s.key === 'biology');
  assert.deepEqual(math.l2.cause.coverage, { confirmed: 10, total: 10 });
  assert.deepEqual(bio.l2.cause.coverage, { confirmed: 12, total: 12 });
  const causeLoss = Object.keys(math.l2.cause.causes).reduce((a, k) => a + math.l2.cause.causes[k], 0);
  const wrongLoss = EXAM.subjects.find((s) => s.key === 'math').questions.filter(isWrong).reduce((a, q) => a + lossOf(q), 0);
  assert.equal(causeLoss, r2(wrongLoss), '错因构成合计=数学错题丢分');
  assert.equal(math.l2.quadrant.points.length, 50, '数学 50 条 KP（kp-0051 已并入）');
  assert.ok(math.l2.quadrant.xLine > 0);
  assert.ok(math.l2.quadrant.points.some((p) => p.quadrant === 'highValue'));
  assert.ok(math.l2.quadrant.degradedN >= 0);
});

test('S12.4 joint-data.js：schema/头注/确定性/与生成器同源', () => {
  assert.match(JOINT_SRC, /由 pipeline\/joint\.js 生成，勿手改/);
  assert.equal(JOINT.schema, 'gi-joint/1');
  assert.ok(Array.isArray(JOINT.exams) && JOINT.exams.length >= 1);
  assert.equal(typeof JOINT.kpTimeline, 'object');
  const a = J.buildJoint([EXAM_DIR], path.join(ROOT, 'grade-insight/data/knowledge-alias.yaml'));
  const b = J.buildJoint([EXAM_DIR], path.join(ROOT, 'grade-insight/data/knowledge-alias.yaml'));
  assert.deepEqual(a, b, '同输入同输出');
  assert.deepEqual(JOINT, a, '仓库内 joint-data.js 与生成器输出一致（未过期）');
  const math = a.exams[0].subjects.math;
  assert.equal(math.causes.C2 + math.causes.C5 + math.causes.C6 + math.causes.C1, 70, '数学丢分分解守恒');
  assert.ok(math.wrongQuestions.every((q) => q.cause));
});

test('S12.5 诚实降级：GI_JOINT 缺失/单考时跨考维度不编造', () => {
  const none = A.build(EXAM, 0.8, null);
  assert.equal(none.cross.active, false);
  assert.equal(none.cross.e1, null); assert.equal(none.cross.e2, null); assert.equal(none.cross.e3, null);
  assert.match(none.cross.reason, /下考激活/);
  const one = A.build(EXAM, 0.8, JOINT);
  assert.equal(one.cross.active, false, '1 考不激活跨考');
  const txt = JSON.stringify(one);
  assert.ok(!/undefined|NaN/.test(txt), '模型无 undefined/NaN');
  const v4 = one.actionV2.weeks;
  assert.equal(v4.length, 4);
  assert.ok(v4.every((w) => Array.isArray(w.items)));
});

test('S12.6 A1/A2：加权算式一致、每周上限、确定性', () => {
  const m = A.build(EXAM, 0.8, JOINT);
  m.actionV2.items.forEach((it) => {
    const expect = r2(it.base * (it.w === null ? 1 : it.w) * (it.stubborn ? A.RULES.stubbornBoost : 1));
    assert.equal(it.rec, expect, it.subj + ' ' + it.what + ' 加权算式');
  });
  assert.ok(m.actionV2.items.every((it, i) => i === 0 || it.base !== undefined));
  m.actionV2.weeks.forEach((w) => assert.ok(w.items.length <= A.RULES.weekCap, '第 ' + w.week + ' 周 ≤ ' + A.RULES.weekCap + ' 项'));
  assert.ok(m.actionV2.weeks[0].items.every((it) => it.diff === '易' || it.cause === 'C3' || it.cause === 'C4'), '第 1 周止血口径');
  assert.ok(m.actionV2.weeks[2].items.length === 0 || m.actionV2.weeks[2].items.every((it) => it.questions && it.questions.length), '无题号映射的 KP 不生成重练项');
  const m2 = A.build(EXAM, 0.8, JOINT);
  assert.deepEqual(m.actionV2, m2.actionV2);
});

test('S12.7 站点接线：joint-data 引入顺序 / V1–V5 容器 / 移动端纪律', () => {
  const jointIdx = INDEX.indexOf('js/joint-data.js');
  const analyzeIdx = INDEX.indexOf('js/analyze.js');
  assert.ok(jointIdx > 0 && analyzeIdx > jointIdx, 'joint-data.js 必须先于 analyze.js');
  ['qzDiag', 'qzChart', 'kpQuadWrap', 'kpEvoWrap', 'saChartLadder'].forEach((id) => assert.ok(APP.indexOf(id) >= 0, 'app.js 缺失容器 ' + id));
  assert.match(APP, /GIAnalyze\.build\(d, tr, window\.GI_JOINT \|\| null\)/);
  assert.match(APP, /openQzCard/);
  assert.match(APP, /window\.GIQzPanel/);
  assert.match(APP, /window\.GIKpPanel/);
  assert.match(CSS, /touch-action:pan-y/);
  assert.match(CSS, /@media \(max-width:767px\)/);
  assert.match(CSS, /@media \(max-width:400px\)/);
  assert.ok(!/cdn\.jsdelivr|unpkg\.com|cdnjs/.test(INDEX), '无图表 CDN');
});

test('S12.8 术语与口径：错因中文短语、AI 预判+人工复核、规则估计', () => {
  const names = A.RULES.causeName;
  Object.keys(names).forEach((k) => assert.match(names[k], /^[\u4e00-\u9fa5]+$/, '错因 ' + k + ' 对外为中文短语'));
  assert.match(APP, /AI 预判\+人工复核/);
  assert.match(APP, /规则估计|规则生成的确定性/);
  assert.match(APP, /CAUSE_NAME\[/);
});

test('S12.9 exam.json integrity：错因覆盖与 qNos 一致性均 pass', () => {
  const checks = EXAM.integrity.checks;
  ['错因覆盖(cause):math', '错因覆盖(cause):biology', 'qNos 一致性:math', 'qNos 一致性:biology'].forEach((n) => {
    const c = checks.find((x) => x.name === n);
    assert.ok(c, '缺少检查项 ' + n);
    assert.equal(c.status, 'pass', n + ' 应为 pass，实际 ' + c.status);
  });
});
