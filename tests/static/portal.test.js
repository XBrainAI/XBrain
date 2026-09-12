/**
 * S1 门户完整性：卡片入口、子站覆盖、链接可解析。
 * 对应 AGENTS.md §3/§4/§11.2。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, listFiles, readText, stripComments, classifyUrl, resolveLocal } = require('../helpers');
const { SUBSITE_DIRS, isExempt } = require('../config');

const PORTAL = path.join(ROOT, 'index.html');

test('S1.1 门户首页存在且具备卡片网格结构', () => {
  assert.equal(fs.existsSync(PORTAL), true, '仓库根 index.html 缺失');
  const html = readText(PORTAL);
  assert.match(html, /class="sites-grid"/, '.sites-grid 容器缺失');
  assert.match(html, /class="site-card/, '.site-card 卡片缺失');
  assert.match(html, /class="xbrain-brand/, '门户品牌 Logo 缺失');
});

test('S1.2 门户每张卡片的 href 均可解析（构建产物除外，归 deep 层校验）', () => {
  const html = stripComments(readText(PORTAL));
  // 只校验 .site-card 卡片锚点内的 href；门户其余 <link>/资源引用由 S2.x 纪律用例管辖。
  const broken = [];
  const artifacts = [];
  const cardRe = /<a\b[^>]*class=["'][^"']*site-card[^"']*["'][^>]*>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const hm = /href\s*=\s*(["'])([^"']*)\1/i.exec(m[0]);
    const url = hm ? hm[2].trim() : '';
    if (!url) { broken.push('(卡片缺 href)'); continue; }
    const kind = classifyUrl(url);
    if (kind !== 'local') {
      if (kind === 'artifact') artifacts.push(url);
      continue;
    }
    const target = resolveLocal(PORTAL, url);
    if (target && !fs.existsSync(target)) {
      if (!isExempt(PORTAL, 'S1.2', url)) broken.push(url);
    }
  }
  assert.deepEqual(broken, [], `门户存在失效卡片链接: ${broken.join(', ')}`);
  assert.ok(artifacts.length > 0, '门户应包含指向 query-system/dist 的 SPA 卡片');
});

test('S1.3 七大子站均被门户卡片覆盖', () => {
  const html = stripComments(readText(PORTAL));
  for (const dir of SUBSITE_DIRS) {
    const re = new RegExp(`href=["'][^"']*${dir}/`, 'i');
    assert.match(html, re, `门户缺少子站 ${dir} 的入口卡片`);
  }
});
