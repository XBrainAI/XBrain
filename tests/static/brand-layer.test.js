/**
 * S3.8 共享品牌层完整性：tokens.css / brand.css / brand.js 的 IP 锚点保护
 * 规格：SPEC-008 阶段 2 新增门禁——共享层是 51 页迁移的品牌件唯一来源，
 * IP 锚点（九令牌值、四件套 override 色值、胶囊圆角、淡出行为参数）在此锁定。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.resolve(__dirname, '../..', f), 'utf8');

/** 品牌层九令牌权威值（= 门户 index.html :root，IP 锚点） */
const XB_TOKENS = {
  '--xb-deep': '#0a0a1a',
  '--xb-mid': '#1a1030',
  '--xb-light': '#2d1b4e',
  '--xb-accent': '#64b4ff',
  '--xb-accent2': '#80c0ff',
  '--xb-glow': 'rgba(100, 180, 255, 0.35)',
  '--xb-border': 'rgba(100, 180, 255, 0.2)',
  '--xb-text': '#e8ecf4',
  '--xb-text-dim': 'rgba(200, 210, 230, 0.6)',
};

test('S3.8.1 tokens.css：品牌层九令牌存在且值与门户权威值一致（IP 锚点零漂移）', () => {
  const css = read('brand/tokens.css');
  const bad = [];
  for (const [k, v] of Object.entries(XB_TOKENS)) {
    const re = new RegExp(`${k.replace(/[-]/g, '\\-')}\\s*:\\s*${v.replace(/[()]/g, '\\$&').replace(/[,]/g, ',')}\\s*;`);
    if (!re.test(css)) bad.push(`${k}: 期望 ${v}`);
  }
  assert.deepEqual(bad, [], `品牌令牌漂移:\n  ${bad.join('\n  ')}`);
});

test('S3.8.2 tokens.css：皮肤层默认映射品牌层（不得默认覆写 --xb-*）', () => {
  const css = read('brand/tokens.css');
  assert.match(css, /--skin-accent:\s*var\(--xb-accent\)/, '皮肤层须默认映射品牌层');
});

test('S3.8.3 brand.css：四件套 override 色值与 IP 标准一致', () => {
  const css = read('brand/brand.css');
  const checks = [
    [/\.xb-ttai\s*\{[^}]*fill:\s*#4a70c0/, 'xb-ttai fill #4a70c0'],
    [/\.xb-bar\s*\{[^}]*fill:\s*#5a90e0/, 'xb-bar fill #5a90e0'],
    [/\.xb-ring/, 'xb-ring override'],
    [/\.xb-decor-group|xb-bar-group/, '装饰组 override'],
  ];
  const bad = checks.filter(([re]) => !re.test(css)).map(([, name]) => name);
  assert.deepEqual(bad, [], `四件套 override 缺失/漂移: ${bad.join(', ')}`);
});

test('S3.8.4 brand.css：胶囊圆角走令牌 12px（禁 100px 胶囊形，S3.5 共享层版）', () => {
  const css = read('brand/brand.css');
  const m = /\.xbrain-brand\s*\{[^}]*\}/.exec(css);
  assert.ok(m, '缺 .xbrain-brand 规则块');
  assert.match(m[0], /border-radius:\s*var\(--r-lg\)/, '胶囊圆角须 var(--r-lg)');
  assert.doesNotMatch(m[0], /border-radius:\s*100px/, '禁胶囊形 100px');
});

test('S3.8.5 brand.js：淡出行为参数为 IP 基线（ratio*0.7、scrolled 阈值 0.3vh）', () => {
  const js = read('brand/brand.js');
  assert.match(js, /1\s*-\s*ratio\s*\*\s*0\.7/, '淡出系数 ratio*0.7');
  assert.match(js, /scrollY\s*>\s*vh\s*\*\s*0\.3/, 'scrolled 阈值 0.3*vh');
});

test('S3.8.6 brand.js：hero 编排一次性、逐元素渐入默认关闭（页面须显式加 .xb-reveal-on）', () => {
  const js = read('brand/brand.js');
  assert.match(js, /xb-hero-seq/, 'hero 单编排序列');
  // 默认关闭 = initReveal 以存在性守卫开头：页面无 .xb-reveal-on 时零副作用
  assert.match(js, /if\s*\(!document\.querySelector\('\.xb-reveal-on'\)\)\s*return;/, 'initReveal 须以 .xb-reveal-on 存在性守卫开头');
});
