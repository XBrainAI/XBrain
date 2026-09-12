/**
 * S5 子站结构与配置：认证配置、grade-insight 静态应用、SPA 壳层品牌、部署配置、git 卫生。
 * 对应 AGENTS.md §2/§5.3/§7/§9。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { ROOT, readText, relToRoot } = require('../helpers');

test('S5.1 认证配置 JSON 可解析（根 + grade-insight）', () => {
  for (const rel of ['auth.config.json', 'grade-insight/auth.config.json']) {
    const p = path.join(ROOT, rel);
    assert.equal(fs.existsSync(p), true, `${rel} 缺失`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(typeof data, 'object', `${rel} 结构异常`);
  }
});

test('S5.2 grade-insight：echarts 走本地 vendor，禁止外链图表库 CDN', () => {
  const dir = path.join(ROOT, 'grade-insight');
  const index = readText(path.join(dir, 'index.html'));
  assert.match(index, /vendor\/echarts\.min\.js/, 'index.html 未引用本地 echarts');
  assert.equal(fs.existsSync(path.join(dir, 'vendor', 'echarts.min.js')), true, 'vendor/echarts.min.js 缺失');
  for (const file of [path.join(dir, 'index.html'), ...fs.readdirSync(path.join(dir, 'js')).map((f) => path.join(dir, 'js', f))]) {
    assert.doesNotMatch(
      readText(file),
      /(?:src|href)\s*=\s*["']https?:\/\/[^"']*echarts/i,
      `${relToRoot(file)} 存在外链 echarts（AGENTS：禁止换 CDN）`
    );
  }
});

test('S5.3 grade-insight：JS 文件语法有效（node --check）', () => {
  const jsDir = path.join(ROOT, 'grade-insight', 'js');
  for (const f of fs.readdirSync(jsDir)) {
    if (!f.endsWith('.js')) continue;
    const p = path.join(jsDir, f);
    execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
  }
});

test('S5.4 SPA 壳层保留品牌标记（query-system/index.html 含 xbrain-brand）', () => {
  const html = readText(path.join(ROOT, 'query-system', 'index.html'));
  assert.match(html, /xbrain-brand/, 'SPA 壳层品牌 Logo 丢失');
});

test('S5.5 netlify.toml：publish 根 + query-system SPA 重定向在位', () => {
  const toml = readText(path.join(ROOT, 'netlify.toml'));
  assert.match(toml, /publish\s*=\s*"\."/, 'publish 必须为仓库根');
  assert.match(toml, /\/query-system\/dist\//, 'query-system SPA 路由重定向缺失');
  assert.match(toml, /command\s*=\s*"npm run build"/, '构建命令缺失');
});

test('S5.6 根 package.json：build 编排 SPA；回归测试脚本已注册', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.build || '', /query-system/, '根 build 必须编排 query-system');
  assert.ok(pkg.scripts['test:repo'], '缺少 test:repo 脚本（静态回归层）');
  assert.ok(pkg.scripts['test:repo:full'], '缺少 test:repo:full 脚本（深层回归）');
});

test('S5.7 git 卫生：dist/ 与 node_modules/ 未被跟踪（§2 禁止提交）', () => {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], {
    cwd: ROOT, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024,
  });
  const tracked = out.toString('utf8').split('\0').filter(Boolean);
  const bad = tracked.filter((p) => /(^|\/)(dist|node_modules)\//.test(p));
  assert.deepEqual(bad, [], '构建产物/依赖被误提交');
});
