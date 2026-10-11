/**
 * S9 SPEC-2026-0006：grade-insight 前端存储层行为（vm 沙箱加载 store.js）。
 * 覆盖：数据兜底（AC6）、录入校验/增删改回归（AC7）、云同步层未登录/演示数据安全网。
 * store.js 为浏览器 IIFE，此处以最小 window/localStorage/location/document 沙箱执行；
 * 网络层（fetch/setTimeout）以 stub 隔离——同步网络行为由服务端单测 + 双设备演示取证。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STORE_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../grade-insight/js/store.js'), 'utf8'
);

function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

const SEED = {
  schema: 1,
  sample: true,
  student: { name: '演示学生', studentId: 's1', enrollYear: 2025, targetRate: 0.8 },
  subjects: [
    { key: 'chinese', name: '语文', full: 150 },
    { key: 'math', name: '数学', full: 150 },
  ],
  exams: [
    {
      id: '2026-09-01-九月月考', name: '九月月考', date: '2026-09-01', term: '高三上', type: '月考',
      subjects: [
        { key: 'chinese', full: 150, score: 110, avgClass: 98, avgGrade: 95, rank: 12, rankSize: 500, level: null },
        { key: 'math', full: 150, score: 130, avgClass: 100, avgGrade: 102, rank: 8, rankSize: 500, level: null },
      ],
      totalRank: 10, totalRankSize: 500,
    },
  ],
};

/* 加载 store.js：location 可指定协议；fetch/setTimeout stub 隔离网络与去抖定时器 */
function loadStore({ protocol = 'http:', seed = SEED, subjectsDefault = null, fetchStub = null } = {}) {
  const storage = makeLocalStorage();
  const sandbox = {
    window: { GRADE_SNAPSHOT: JSON.parse(JSON.stringify(seed)), GI_DEFAULTS: subjectsDefault },
    localStorage: storage,
    location: { protocol },
    document: { dispatchEvent() {} },
    setTimeout: () => 0,
    clearTimeout: () => {},
    fetch: fetchStub || (() => Promise.resolve(jsonRes(500, {}))),
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(STORE_SRC, sandbox, { filename: 'store.js' });
  return { GIStore: sandbox.window.GIStore, storage, sandbox };
}

test('S9.1 种子与首次载入：示例数据落库且不上传（isSample 安全网）', async () => {
  const { GIStore } = loadStore();
  assert.equal(GIStore.syncEnabled(), true);
  const st = GIStore.load();
  assert.equal(st.isSample, true);
  assert.equal(st.exams.length, 1);
  /* 演示数据上传被拒（Promise reject 带原因） */
  await assert.rejects(() => GIStore.syncUp(), /演示数据/);
});

test('S9.2 数据兜底（AC6）：缺字段快照自动补全、损坏 JSON 回落种子', () => {
  const { GIStore, storage } = loadStore({
    subjectsDefault: { subjects: [{ key: 'chinese', name: '语文', full: 150 }] },
  });
  /* 缺 student/subjects/lastModified → normalize 补全 */
  storage.setItem('xbrain_grade_insight_v1', JSON.stringify({
    exams: [{ name: '期中', date: '2026-10-01', subjects: [{ key: 'chinese', score: 100, full: 150 }] }],
  }));
  const st = GIStore.load();
  assert.equal(st.student.name, '学生');
  assert.ok(st.subjects.some((s) => s.key === 'chinese'), '默认科目应被补齐');
  assert.ok(st.lastModified, 'lastModified 应补全');
  /* 损坏 JSON → 回落种子 */
  storage.setItem('xbrain_grade_insight_v1', '{broken json');
  const st2 = GIStore.load(true);
  assert.equal(st2.isSample, true);
  assert.equal(st2.exams.length, SEED.exams.length);
});

test('S9.3 录入校验回归（AC7）：同日同名判重、得分超满分、空得分', () => {
  const { GIStore } = loadStore();
  const state = GIStore.load();
  const base = { name: '期中', date: '2026-10-01', term: '', type: '期中', subjects: [{ key: 'chinese', full: 150, score: 120 }] };
  /* 无同日同名 → 通过（warnings 可有）；vm realm 数组不做跨域 deepEqual，比长度 */
  let v = GIStore.validateExam({ ...base, subjects: [{ key: 'chinese', full: 150, score: 120 }] }, state, null);
  assert.equal(v.errors.length, 0);
  /* 得分超满分 */
  v = GIStore.validateExam({ ...base, subjects: [{ key: 'chinese', full: 150, score: 151 }] }, state, null);
  assert.ok(v.errors.some((e) => e.includes('超过满分')));
  /* 全科目空得分 */
  v = GIStore.validateExam({ ...base, subjects: [{ key: 'chinese', full: 150, score: null }] }, state, null);
  assert.ok(v.errors.some((e) => e.includes('至少')));
  /* 同日同名判重（先入库一条再验） */
  GIStore.upsertExam({ ...base, subjects: [{ key: 'chinese', full: 150, score: 120 }] });
  v = GIStore.validateExam({ ...base, subjects: [{ key: 'chinese', full: 150, score: 100 }] }, state, null);
  assert.ok(v.errors.some((e) => e.includes('同日期同名称')));
});

test('S9.4 增删改回归（AC7）：upsert 保存后本地可读，delete 后消失', () => {
  const { GIStore, storage } = loadStore();
  const exam = {
    name: '期末', date: '2026-01-20', term: '高二上', type: '期末',
    subjects: [{ key: 'chinese', full: 150, score: 118 }],
    totalRank: 30, totalRankSize: 500,
  };
  const saved = GIStore.upsertExam(exam);
  assert.ok(GIStore.getExam(saved.id));
  assert.equal(JSON.parse(storage.getItem('xbrain_grade_insight_v1')).exams.length, 2);
  GIStore.deleteExam(saved.id);
  assert.equal(GIStore.getExam(saved.id), null);
});

test('S9.5 同步状态：未登录时安全网与文案（file:// 跳过 / 尚未同步）', async () => {
  const { GIStore } = loadStore();
  assert.ok(GIStore.syncStatusText().includes('尚未同步过'));
  assert.equal(Object.keys(GIStore.getSyncStatus()).length, 0);
  /* file:// 场景：同步整体关闭 */
  const local = loadStore({ protocol: 'file:' });
  assert.equal(local.GIStore.syncEnabled(), false);
  assert.ok(local.GIStore.syncStatusText().includes('本地调试模式'));
  await assert.rejects(() => local.GIStore.syncUp(), /本地调试模式/);
  await assert.rejects(() => local.GIStore.syncDown(), /本地调试模式/);
});

/* ---------- S9.6 云端对账决策（pullSoon） ---------- */

const REMOTE_SNAPSHOT = {
  schema: 1, sample: false, exportedAt: '2026-10-11T00:00:00.000Z',
  lastModified: '2026-10-11T00:00:00.000Z',
  student: { name: '真实学生', enrollYear: 2025, targetRate: 0.8 },
  subjects: [{ key: 'chinese', name: '语文', full: 150 }],
  exams: [{ id: 'e1', name: '期中', date: '2026-10-09', term: '', type: '期中', note: '',
    subjects: [{ key: 'chinese', full: 150, score: 120 }], totalRank: 30, totalRankSize: 500 }],
};

const jsonRes = (status, body) => ({
  status,
  ok: status < 400,
  json: () => Promise.resolve(body === undefined ? {} : body),
});

/* 可控 fetch stub：按 [方法, 状态码, 响应体] 序列依次响应，记录全部调用 */
function makeFetch(sequence) {
  const calls = [];
  const fn = (url, opts) => {
    const step = sequence[Math.min(calls.length, sequence.length - 1)];
    calls.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body });
    return Promise.resolve(jsonRes(step[0], step[1]));
  };
  fn.calls = calls;
  return fn;
}

const flush = () => new Promise((r) => setImmediate(() => setImmediate(r)));
const login = (storage) => storage.setItem('xbrain_auth_sub_grade',
  JSON.stringify({ token: 'a'.repeat(64), expires: Date.now() + 86400000, createdAt: Date.now() }));

test('S9.6a 本地是示例数据 + 已登录 + 云端有档案 → 直接采用云端（新设备核心路径）', async () => {
  const fetchStub = makeFetch([[200, REMOTE_SNAPSHOT]]);
  const { GIStore, storage } = loadStore({ fetchStub });
  login(storage);
  GIStore.load();
  GIStore.onAuthReady();
  await flush();
  const st = GIStore.load();
  assert.equal(st.isSample, false, '示例标记应被云端档案覆盖');
  assert.equal(st.exams.length, 1);
  assert.equal(st.student.name, '真实学生');
  assert.equal(fetchStub.calls.filter((c) => c.method === 'PUT').length, 0, '拉取覆盖不应回推');
});

test('S9.6b 本地是示例数据 + 云端为空（404）→ 保持示例且不上传', async () => {
  const fetchStub = makeFetch([[404]]);
  const { GIStore, storage } = loadStore({ fetchStub });
  login(storage);
  GIStore.load();
  GIStore.onAuthReady();
  await flush();
  assert.equal(fetchStub.calls.length, 1, '只应有一次 GET，绝不能把示例数据推上去');
  assert.equal(GIStore.load().isSample, true);
});

test('S9.6c 未登录 → 不发任何请求且不消耗对账标记', async () => {
  const fetchStub = makeFetch([[200, REMOTE_SNAPSHOT]]);
  const { GIStore, storage } = loadStore({ fetchStub });
  GIStore.load();
  GIStore.onAuthReady();
  await flush();
  assert.equal(fetchStub.calls.length, 0);
  /* 登录后再次触发（同一实例）→ 正常对账 */
  login(storage);
  GIStore.onAuthReady();
  await flush();
  assert.equal(fetchStub.calls.length, 1, '未消耗标记：登录后补跑对账');
});

test('S9.6d 本地真实档案：云端较新覆盖、本地较新推送（双向对账）', async () => {
  /* 本地较新 → PUT 上去 */
  const oldRemote = { ...REMOTE_SNAPSHOT, lastModified: '2026-10-10T00:00:00.000Z' };
  const fetchStubA = makeFetch([[200, oldRemote], [200, { ok: true }]]);
  const a = loadStore({ fetchStub: fetchStubA });
  login(a.storage);
  a.GIStore.replaceAll({
    schema: 1, student: { name: '学生' }, subjects: [{ key: 'chinese', name: '语文', full: 150 }],
    exams: REMOTE_SNAPSHOT.exams, isSample: false,
    lastModified: '2026-10-12T00:00:00.000Z',
  });
  a.GIStore.onAuthReady();
  await flush();
  assert.equal(fetchStubA.calls.filter((c) => c.method === 'PUT').length, 1, '本地较新应推送');
  /* save() 会把 lastModified 刷新为当前时间，故断言载荷携带基线字段而非具体日期 */
  const putBody = JSON.parse(fetchStubA.calls.find((c) => c.method === 'PUT').body);
  assert.ok(putBody.lastModified, 'PUT 载荷应携带 lastModified 基线');
  assert.equal(putBody.exams.length, 1);

  /* 云端较新 → 覆盖本地（save() 已把本地时间刷为真实当前时刻，云端 fixture 须晚于它） */
  const neuRemote = { ...REMOTE_SNAPSHOT, lastModified: '2027-01-01T00:00:00.000Z' };
  const fetchStubB = makeFetch([[200, neuRemote]]);
  const b = loadStore({ fetchStub: fetchStubB });
  login(b.storage);
  b.GIStore.replaceAll({
    schema: 1, student: { name: '学生' }, subjects: [{ key: 'chinese', name: '语文', full: 150 }],
    exams: [], isSample: false, lastModified: '2026-10-09T00:00:00.000Z',
  });
  b.GIStore.onAuthReady();
  await flush();
  assert.equal(fetchStubB.calls.filter((c) => c.method === 'PUT').length, 0);
  assert.equal(b.GIStore.load().exams.length, 1, '云端较新应覆盖本地');
});
