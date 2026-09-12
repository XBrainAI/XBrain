/**
 * S3 品牌 / 移动端规范：Logo 组件、品牌链接不死链、id=top、viewport、禁用模式。
 * 对应 AGENTS.md §6 / §6.9 / §14。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  listFiles, readText, extractBrandHref, resolveLocal, underDir, relToRoot,
} = require('../helpers');
const { BRAND_SCOPE_DIRS, isExempt } = require('../config');

const pages = listFiles('.html').filter(
  (f) => underDir(f, 'index.html') || BRAND_SCOPE_DIRS.some((d) => underDir(f, d))
);
const IS_PORTAL = (f) => relToRoot(f) === 'index.html';

test('S3.1 品牌组件完整：.xbrain-brand + .xbrain-text + <span>X</span> + SVG', () => {
  const missing = [];
  for (const file of pages) {
    const html = readText(file);
    if (isExempt(file, 'S3.1')) continue;
    const problems = [];
    if (!/class="xbrain-brand/.test(html)) problems.push('缺 .xbrain-brand');
    if (!/class="xbrain-text/.test(html)) problems.push('缺 .xbrain-text');
    if (!/<span>X<\/span>Brain/.test(html)) problems.push('品牌文字非 <span>X</span>Brain');
    if (!/<svg[\s>]/i.test(html)) problems.push('缺品牌 SVG');
    if (problems.length) missing.push(`${relToRoot(file)}: ${problems.join('; ')}`);
  }
  assert.deepEqual(missing, [], `品牌组件缺失页:\n  ${missing.join('\n  ')}`);
});

test('S3.2 品牌链接不死链：门户 #top；子站 #top 或解析后目标存在', () => {
  // 实际站点约定：深度页品牌链接可能回子站根（生活点滴/2026/0816 → ../../），
  // 也可能回门户（学习与成长/高考 → ../../index.html），唯一硬约束是不落 404。
  const bad = [];
  for (const file of pages) {
    if (isExempt(file, 'S3.2')) continue;
    const href = extractBrandHref(readText(file));
    if (href === null) continue; // 缺 Logo 由 S3.1 报
    if (IS_PORTAL(file)) {
      if (href !== '#top') bad.push(`${relToRoot(file)}: 门户品牌链接应为 #top，实际 ${href || '(空)'}`);
      continue;
    }
    if (href === '#top') continue; // 浏览器回退到页顶，语义有效
    const resolved = resolveLocal(file, href || '');
    if (href === '' || !resolved || !fs.existsSync(resolved)) {
      bad.push(`${relToRoot(file)}: 品牌链接 ${href || '(空)'} 解析后不存在`);
    }
  }
  assert.deepEqual(bad, [], `品牌链接死链:\n  ${bad.join('\n  ')}`);
});

test('S3.3 每页存在 id="top" 首屏锚点（IP 规范硬性要求）', () => {
  const missing = [];
  for (const file of pages) {
    if (isExempt(file, 'S3.3')) continue;
    if (!/\bid\s*=\s*["']top["']/.test(readText(file))) missing.push(relToRoot(file));
  }
  assert.deepEqual(missing, [], `缺 id="top" 页面:\n  ${missing.join('\n  ')}`);
});

test('S3.4 viewport meta 存在，且禁止 user-scalable=no（§6.9 ①）', () => {
  const bad = [];
  for (const file of pages) {
    if (isExempt(file, 'S3.4')) continue;
    const html = readText(file);
    const vp = /<meta\s+name=["']viewport["'][^>]*>/i.exec(html);
    if (!vp) { bad.push(`${relToRoot(file)}: 缺 viewport meta`); continue; }
    if (/user-scalable\s*=\s*(no|0)/i.test(vp[0])) bad.push(`${relToRoot(file)}: viewport 禁止缩放`);
  }
  assert.deepEqual(bad, [], `viewport 问题:\n  ${bad.join('\n  ')}`);
});

test('S3.5 品牌组件禁止胶囊形 border-radius:100px（§6.3，仅查 .xbrain-brand 规则块）', () => {
  const bad = [];
  const re = /\.xbrain-brand\s*\{[^}]*\}/g;
  for (const file of pages) {
    if (isExempt(file, 'S3.5')) continue;
    const html = readText(file);
    let m;
    while ((m = re.exec(html)) !== null) {
      if (/border-radius\s*:\s*100px/.test(m[0])) bad.push(relToRoot(file));
    }
  }
  assert.deepEqual(bad, [], `品牌组件使用胶囊形圆角: ${bad.join(', ')}`);
});

test('S3.6 禁止 body.style.overflow 锁滚动（§14.2 铁律 1：iOS 灯箱错位）', () => {
  const bad = [];
  for (const file of pages) {
    if (isExempt(file, 'S3.6')) continue;
    if (/body\.style\.overflow/i.test(readText(file))) bad.push(relToRoot(file));
  }
  assert.deepEqual(bad, [], `存在 body 滚动锁页面: ${bad.join(', ')}`);
});

test('S3.7 灯箱导航箭头不得负偏移推出屏幕（§14.2 铁律 3）', () => {
  const bad = [];
  const re = /\.lightbox-nav\.(prev|next)\s*\{[^}]*\}/g;
  for (const file of pages) {
    if (isExempt(file, 'S3.7')) continue;
    const html = readText(file);
    let m;
    while ((m = re.exec(html)) !== null) {
      if (/(left|right)\s*:\s*-\d/.test(m[0])) {
        bad.push(`${relToRoot(file)}: .${m[1]} 负偏移`);
      }
    }
  }
  assert.deepEqual(bad, [], `灯箱箭头负偏移:\n  ${bad.join('\n  ')}`);
});
