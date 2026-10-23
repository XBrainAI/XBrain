/**
 * S11 SPEC-006 v2：GIAnalyze 引擎——规则一致性 + 10 月实据模型断言 + 幂等。
 * 引擎为浏览器/CLI 唯一研判实现（js/analyze.js），本测试守护 ANALYZE-RULES.md 与代码常量不漂移。
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const GIAnalyze = require('../../grade-insight/js/analyze.js');
const RULES_MD = fs.readFileSync(path.resolve(__dirname, '../../grade-insight/pipeline/ANALYZE-RULES.md'), 'utf8');
const EXAM = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../grade-insight/details/高一/上学期/10月/data/exam.json'), 'utf8'));

test('S11.1 RULES 常量与 ANALYZE-RULES.md 阈值一致（防漂移）', () => {
  const R = GIAnalyze.RULES;
  assert.match(RULES_MD, /科得分率 < 60% 或 班级等级 ∈ \{D,E\}/); assert.equal(R.R1rate, 0.6);
  assert.match(RULES_MD, /易题丢分 ÷ 易题满分 ≥ 15% 或 易题错题数 ≥ 3/); assert.equal(R.R2easyLossRatio, 0.15); assert.equal(R.R2easyWrong, 3);
  assert.match(RULES_MD, /中档题丢分 ÷ 全科丢分 ≥ 40%/); assert.equal(R.R3midShare, 0.40);
  assert.match(RULES_MD, /rate<60）÷ 入档知识点 ≥ 25%/); assert.equal(R.R5weakRatio, 0.25);
  assert.match(RULES_MD, /key）且 rate<60% 的知识点数 ≥ 3/); assert.equal(R.R6keyWeakMin, 3);
  assert.match(RULES_MD, /易题错题 \| 该项丢分 × 80%/); assert.equal(R.recEasy, 0.8);
  assert.match(RULES_MD, /中档题错题 \| 该项丢分 × 50%/); assert.equal(R.recMid, 0.5);
  assert.match(RULES_MD, /上限 8 分\/条/); assert.equal(R.recKpCap, 8);
  assert.equal(R.v, 'ANALYZE-RULES v1');
});

test('S11.2 10 月模型：全科研判数字正确', () => {
  const m = GIAnalyze.build(EXAM, 0.8);
  const o = m.overall;
  assert.equal(o.score, 623.5); assert.equal(o.full, 1030);
  assert.equal(o.rate, 0.61); assert.equal(o.level, 'C');
  assert.deepEqual(o.r1, ['化学', '英语', '数学', '政治']);
  assert.equal(o.bottom[0].name, '化学'); assert.equal(o.bottom[0].rate, 0.46);
  assert.equal(o.spread.minName, '化学'); assert.equal(o.spread.maxName, '语文');
  assert.equal(o.skewed, true);
  assert.equal(o.potential, 173.8);
});

test('S11.3 逐科规则命中与题级/知识点结构', () => {
  const m = GIAnalyze.build(EXAM, 0.8);
  const by = {}; m.subjects.forEach((s) => (by[s.name] = s));
  assert.ok(by['化学'].concls.some((c) => c.tag === 'R3'));
  assert.equal(by['化学'].diffs['中'].loss, 48);
  assert.equal(by['化学'].diffs['易'].wrongN, 0);
  assert.ok(by['英语'].concls.some((c) => c.tag === 'R2'));
  assert.equal(by['英语'].easyWrongNos.length, 9);
  assert.ok(by['数学'].kp && by['数学'].kp.weakN === 21 && by['数学'].kp.keyWeakN === 4);
  assert.ok(by['数学'].concls.some((c) => c.tag === 'R5') && by['数学'].concls.some((c) => c.tag === 'R6'));
  assert.ok(by['物理'].concls.some((c) => c.tag === 'R4'));
  assert.equal(by['地理'].hasQ, false);
});

test('S11.4 补救清单确定性 + 引擎幂等', () => {
  const m = GIAnalyze.build(EXAM, 0.8);
  assert.equal(m.plan.length, 10);
  assert.ok(m.plan.every((it, i) => i === 0 || it.rec <= m.plan[i - 1].rec), '按预估回收降序');
  assert.equal(m.plan[0].subj, '语文'); assert.equal(m.plan[0].rec, 19.2);
  const m2 = GIAnalyze.build(EXAM, 0.8);
  assert.deepEqual(m, m2, '同输入同输出');
});
