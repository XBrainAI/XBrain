/**
 * D2 query-system 构建管线深层校验：lint / 单元测试（棘轮基线）/ build / dist 产物结构。
 * 对应 AGENTS.md §2 / §5.3 / §11.1。运行时间较长（分钟级），仅在 test:repo:full 层执行。
 *
 * 棘轮（ratchet）说明：SPA 的 lint 与单元测试在基线提交 b889056 时即为红
 * （b1f2208 数据模型大改未同步），故 D2.1/D2.2 采用「失败数不许超过基线、
 * 只许自动收紧」的门禁。清偿为 0 后删除 tests/baseline.json 对应字段即转严格。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { ROOT, listFiles, readText, stripComments, extractAttrs, classifyUrl, resolveLocal } = require('../helpers');

const SPA_DIR = path.join(ROOT, 'query-system');
const DIST_DIR = path.join(SPA_DIR, 'dist');
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'baseline.json'), 'utf8'));

/** 剥离 ANSI 色码 */
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function npmRun(script) {
  return spawnSync(`npm run ${script}`, {
    cwd: SPA_DIR,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 32 * 1024 * 1024,
  });
}

/** 棘轮比较：actual <= base 通过；actual < base 时自动收紧基线文件 */
function ratchet(name, actual, base, writer) {
  if (actual <= base) {
    if (actual < base) {
      writer(actual);
      console.log(`  [ratchet] ${name}: ${base} → ${actual}（基线已自动收紧）`);
    }
    return;
  }
  assert.fail(
    `${name} 恶化：基线 ${base} → 实际 ${actual}。` +
    '重构不得引入新的 SPA lint 错误/测试失败；如属有意变更请先修复，再更新 tests/baseline.json。'
  );
}

const saveBaseline = (patch) => {
  const next = { ...BASELINE, ...patch };
  fs.writeFileSync(
    path.join(ROOT, 'tests', 'baseline.json'),
    JSON.stringify(next, null, 2) + '\n'
  );
};

test('D2.1 SPA lint：错误数不超过基线（棘轮）', { timeout: 240_000 }, () => {
  const r = npmRun('lint');
  const m = /✖\s+(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/.exec(stripAnsi(r.stdout || ''));
  assert.ok(m, `无法解析 eslint 输出（结构性故障，需人工介入）：\n${(r.stderr || r.stdout || '').slice(-1500)}`);
  const [, problems, errors, warnings] = m.map(Number);
  ratchet('SPA lint 错误数', errors, BASELINE.spaLintErrors, (v) =>
    saveBaseline({ spaLintErrors: v })
  );
  ratchet('SPA lint 警告数', warnings, BASELINE.spaLintWarnings, (v) =>
    saveBaseline({ spaLintWarnings: v })
  );
  assert.ok(problems === errors + warnings, 'eslint 输出 problems 与 errors+warnings 不一致');
});

test('D2.2 SPA 单元测试：失败数不超过基线，通过数不得减少（棘轮）', { timeout: 300_000 }, () => {
  const r = npmRun('test');
  const out = stripAnsi(r.stdout || '');
  const filesLine = /^.*Test Files\s+(.*)$/m.exec(out);
  const testsLine = /^.*Tests\s+(.*)$/m.exec(out);
  assert.ok(filesLine && testsLine, `无法解析 vitest 汇总（结构性故障，需人工介入）：\n${out.slice(-1500)}`);
  const sum = (line, word) =>
    [...line.matchAll(new RegExp(`(\\d+)\\s+${word}`, 'g'))].reduce((a, m) => a + Number(m[1]), 0);

  const filesFailed = sum(filesLine[1], 'failed');
  const testsFailed = sum(testsLine[1], 'failed');
  const testsPassed = sum(testsLine[1], 'passed');

  ratchet('SPA 失败测试文件数', filesFailed, BASELINE.spaTestFilesFailed, (v) =>
    saveBaseline({ spaTestFilesFailed: v })
  );
  ratchet('SPA 失败测试数', testsFailed, BASELINE.spaTestsFailed, (v) =>
    saveBaseline({ spaTestsFailed: v })
  );
  // 通过数只许增加：防止「删测试」式作弊
  assert.ok(
    testsPassed >= BASELINE.spaTestsPassed,
    `通过的测试数减少：基线 ${BASELINE.spaTestsPassed} → 实际 ${testsPassed}，禁止删除测试来降失败数`
  );
});

test('D2.3 SPA 生产构建通过（产出 dist/）', { timeout: 600_000 }, () => {
  const r = npmRun('build');
  assert.equal(
    r.status, 0,
    `构建失败：\n${(r.stdout || '').slice(-3000)}\n${(r.stderr || '').slice(-3000)}`
  );
  assert.equal(fs.existsSync(path.join(DIST_DIR, 'index.html')), true, 'dist/index.html 未生成');
});

test('D2.4 dist 产物结构完整（§5.3 插件产物 + 静态资源复制）', () => {
  for (const f of ['school-files-list.json', 'other-infos-list.json']) {
    const p = path.join(DIST_DIR, f);
    assert.equal(fs.existsSync(p), true, `dist/${f} 缺失（列表插件未产出）`);
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(Array.isArray(arr) && arr.length > 0, `dist/${f} 为空，运行时 fetch 将无数据`);
  }
  // copyStaticAssetsPlugin 将学校深度报告平铺复制进 dist 根：以清单逐名校验
  const schoolList = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'school-files-list.json'), 'utf8'));
  const missing = schoolList.filter((name) => !fs.existsSync(path.join(DIST_DIR, name)));
  assert.deepEqual(missing, [], '清单中的学校深度报告未复制进 dist');
  const otherInfos = listFiles('.html', path.join(DIST_DIR, 'other_infos'));
  assert.ok(otherInfos.length > 0, 'dist/other_infos/ 未复制舆情报告');
});

test('D2.5 构建后门户 SPA 卡片链接可达，dist/index.html 内部资源自洽', () => {
  const cardTarget = resolveLocal(path.join(ROOT, 'index.html'), './query-system/dist/index.html');
  assert.equal(fs.existsSync(cardTarget), true, '门户 SPA 卡片指向的 dist/index.html 不存在');

  const html = stripComments(readText(path.join(DIST_DIR, 'index.html')));
  const broken = [];
  for (const { url } of extractAttrs(html)) {
    if (classifyUrl(url) !== 'local') continue;
    const target = resolveLocal(path.join(DIST_DIR, 'index.html'), url);
    if (target && !fs.existsSync(target)) broken.push(url);
  }
  assert.deepEqual(broken, [], `dist/index.html 存在失效资源引用: ${broken.join(', ')}`);
});
