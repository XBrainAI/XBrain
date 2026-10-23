/**
 * S10 SPEC-004：gi-exam-data/1 站点透传（kps/dataRef）行为。
 * 覆盖：AC1 导入→状态→导出 roundtrip；AC2 真实 10 月导入包 v2；老档案（无新字段）零回退。
 * 沙箱方式同 gi-store-sync.test.js（vm + 最小 window/localStorage）。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const STORE_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../grade-insight/js/store.js'), 'utf8'
);

function makeLocalStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _map: m };
}
function jsonRes(status, body) { return Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) }); }

function loadStore({ seed, fetchStub } = {}) {
  const storage = makeLocalStorage();
  const sandbox = {
    window: { GRADE_SNAPSHOT: JSON.parse(JSON.stringify(seed)), GI_DEFAULTS: null },
    localStorage: storage,
    location: { protocol: 'http:' },
    document: { dispatchEvent() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    fetch: fetchStub || (() => Promise.resolve(jsonRes(500, {}))),
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(STORE_SRC, sandbox, { filename: 'store.js' });
  return { GIStore: sandbox.window.GIStore, storage, sandbox };
}

const SEED_V2 = {
  schema: 1, sample: false,
  student: { name: '测试', studentId: 's1', enrollYear: 2026, targetRate: 0.8 },
  subjects: [{ key: 'math', name: '数学', full: 150 }],
  exams: [{
    id: 'ex-t', name: '测试考', date: '2026-10-10', term: '高一上', type: '月考',
    subjects: [{ key: 'math', full: 150, score: 80, level: 'D',
      kps: [{ kpId: 'kp-0001', name: '函数的对称性', rate: 0, wrong: 1, key: false, category: '薄弱' }] }],
    dataRef: 'details/x/data/exam.json',
  }],
};

test('S10.1 kps/dataRef 透传与导出 roundtrip（AC1）', () => {
  const { GIStore } = loadStore({ seed: SEED_V2 });
  const st = GIStore.load();
  const e = st.exams[0];
  assert.equal(e.dataRef, 'details/x/data/exam.json');
  const k = e.subjects[0].kps;
  assert.ok(Array.isArray(k) && k.length === 1, 'kps 应保留');
  assert.equal(k[0].kpId, 'kp-0001');
  assert.equal(k[0].name, '函数的对称性');
  assert.equal(k[0].rate, 0);
  assert.equal(k[0].key, false);
  assert.equal(k[0].category, '薄弱');
  /* 导出文本再解析回灌 → 无损 */
  const text = GIStore.buildSnapshotText(st);
  const back = GIStore.parseImportText(text);
  assert.equal(back.exams[0].dataRef, 'details/x/data/exam.json');
  assert.equal(back.exams[0].subjects[0].kps.length, 1);
});

test('S10.2 老档案无 kps/dataRef：字段缺省、行为与改前一致（AC1 兼容）', () => {
  const SEED_OLD = JSON.parse(JSON.stringify(SEED_V2));
  delete SEED_OLD.exams[0].dataRef;
  delete SEED_OLD.exams[0].subjects[0].kps;
  const { GIStore } = loadStore({ seed: SEED_OLD });
  const st = GIStore.load();
  assert.equal(st.exams[0].dataRef, undefined, '无 dataRef 应缺省');
  assert.equal(st.exams[0].subjects[0].kps, undefined, '无 kps 应缺省');
  assert.equal(st.exams[0].subjects[0].score, 80, '既有字段不受影响');
});

test('S10.3 真实 10 月导入包 v2：importSnapshot 全量透传（AC2）', () => {
  const pkgFile = path.resolve(__dirname, '../../grade-insight/details/高一/上学期/10月/正式档案-高一上第一次月考.json');
  const raw = fs.readFileSync(pkgFile, 'utf8');
  const { GIStore } = loadStore({ seed: { schema: 1, sample: true, exams: [], subjects: [], student: {} } });
  const parsed = GIStore.parseImportText(raw);
  GIStore.importSnapshot(parsed);
  const st = GIStore.load();
  const e = st.getExam ? st.getExam(parsed.exams[0].id) : st.exams[0];
  assert.equal(e.dataRef, 'details/高一/上学期/10月/data/exam.json');
  const math = e.subjects.find((s) => s.key === 'math');
  const bio = e.subjects.find((s) => s.key === 'biology');
  assert.equal(math.kps.length, 51, '数学知识点 51 条');
  assert.equal(bio.kps.length, 21, '生物知识点 21 条');
  const total = e.subjects.reduce((a, s) => a + (s.kps ? s.kps.length : 0), 0);
  assert.equal(total, 72);
});
