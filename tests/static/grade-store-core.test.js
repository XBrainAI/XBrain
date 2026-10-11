/**
 * S8 SPEC-2026-0006：grade-store 服务端纯逻辑（凭证校验 / 载荷校验 / 冲突判定）。
 * 被测模块零外部依赖（netlify/functions/lib/grade-store-core.cjs）。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const core = require('../../netlify/functions/lib/grade-store-core.cjs');

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

test('S8.1 passwordHash 与前端登录链路同源（sha256hex）', () => {
  assert.equal(core.passwordHash('grade2026'), sha('grade2026'));
  assert.match(core.passwordHash('x'), /^[0-9a-f]{64}$/);
});

test('S8.2 凭证校验：正确放行，缺失/篡改/非 hex64 一律拒绝（AC4）', () => {
  const expected = core.passwordHash('grade2026');
  assert.equal(core.validateAuthHeader(expected, expected), true);
  assert.equal(core.validateAuthHeader(sha('wrong'), expected), false);
  assert.equal(core.validateAuthHeader('', expected), false);
  assert.equal(core.validateAuthHeader(null, expected), false);
  /* 大写 hex / 位数不足 / 位数超长 / 非法字符 */
  assert.equal(core.validateAuthHeader(expected.toUpperCase(), expected), false);
  assert.equal(core.validateAuthHeader(expected.slice(0, 63), expected), false);
  assert.equal(core.validateAuthHeader(expected + '0', expected), false);
  assert.equal(core.validateAuthHeader('g'.repeat(64), expected), false);
});

test('S8.3 载荷校验：合法放行，缺 exams / 坏 lastModified / 非对象拒绝', () => {
  const ok = core.normalizePayload({ schema: 1, exams: [], lastModified: '2026-10-11T00:00:00.000Z' });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.exams, []);

  for (const [name, payload] of [
    ['exams 缺失', { lastModified: '2026-10-11T00:00:00.000Z' }],
    ['exams 非数组', { exams: 'x', lastModified: '2026-10-11T00:00:00.000Z' }],
    ['lastModified 缺失', { exams: [] }],
    ['lastModified 非时间', { exams: [], lastModified: 'not-a-date' }],
    ['非对象 null', null],
    ['非对象 数组', []],
    ['非对象 字符串', 'x'],
  ]) {
    const r = core.normalizePayload(payload);
    assert.equal(r.ok, false, name + ' 应被拒绝');
    assert.ok(Array.isArray(r.errors) && r.errors.length > 0, name + ' 应给出原因');
  }
});

test('S8.4 冲突判定：云端较新拒绝；相等/云端较旧/坏数据不卡死（AC5）', () => {
  const old = '2026-10-11T00:00:00.000Z';
  const neu = '2026-10-11T01:00:00.000Z';
  /* 云端较新 → 冲突 */
  assert.equal(core.isConflicting({ lastModified: neu }, { lastModified: old }), true);
  /* 云端较旧 / 相等 → 允许写 */
  assert.equal(core.isConflicting({ lastModified: old }, { lastModified: neu }), false);
  assert.equal(core.isConflicting({ lastModified: neu }, { lastModified: neu }), false);
  /* 云端为空 / 缺 lastModified → 首次写入，不冲突 */
  assert.equal(core.isConflicting(null, { lastModified: old }), false);
  assert.equal(core.isConflicting({}, { lastModified: old }), false);
  assert.equal(core.isConflicting({ lastModified: neu }, {}), false);
  /* 坏时间戳按不冲突处理（避免坏数据把写入永久卡死） */
  assert.equal(core.isConflicting({ lastModified: 'garbage' }, { lastModified: old }), false);
  assert.equal(core.isConflicting({ lastModified: neu }, { lastModified: 'garbage' }), false);
});

test('S8.5 query-system 配置载荷校验（SPEC-2026-0007）：合法放行，结构不符拒绝', () => {
  const ok = core.normalizeQueryPayload({
    favorites: ['华南师范大学附属中学'],
    volunteerOrders: { 广州市协和中学: { batch2: '3', batch3: '', batch4: '' } },
    lastModified: '2026-10-11T00:00:00.000Z',
  });
  assert.equal(ok.ok, true);

  for (const [name, payload] of [
    ['favorites 缺失', { volunteerOrders: {}, lastModified: '2026-10-11T00:00:00.000Z' }],
    ['favorites 非数组', { favorites: 'x', volunteerOrders: {}, lastModified: '2026-10-11T00:00:00.000Z' }],
    ['favorites 含非字符串', { favorites: [1], volunteerOrders: {}, lastModified: '2026-10-11T00:00:00.000Z' }],
    ['volunteerOrders 缺失', { favorites: [], lastModified: '2026-10-11T00:00:00.000Z' }],
    ['volunteerOrders 是数组', { favorites: [], volunteerOrders: [], lastModified: '2026-10-11T00:00:00.000Z' }],
    ['lastModified 缺失', { favorites: [], volunteerOrders: {} }],
    ['lastModified 非时间', { favorites: [], volunteerOrders: {}, lastModified: 'not-a-date' }],
    ['非对象', null],
    ['数组', []],
  ]) {
    const r = core.normalizeQueryPayload(payload);
    assert.equal(r.ok, false, name + ' 应被拒绝');
    assert.ok(Array.isArray(r.errors) && r.errors.length > 0, name + ' 应给出原因');
  }
});
