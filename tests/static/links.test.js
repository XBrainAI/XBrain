/**
 * S2 全站链接与资源完整性：href/src/poster、CSS url()、JS 内媒体字符串、页内锚点、编码纪律。
 * 对应 AGENTS.md §9.1 / §10 / §13。这是重构（删除/移动文件）后最重要的一张安全网。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  ROOT, listFiles, readText, stripComments,
  extractAttrs, extractCssUrls, extractScriptAssets, extractIds,
  classifyUrl, resolveLocal, relToRoot, underDir,
} = require('../helpers');
const { SCAN_EXCLUDE_DIRS, SCAN_EXCLUDE_FILES, isExempt } = require('../config');

const MEDIA_EXTS = /\.(png|jpe?g|gif|webp|svg|ico|mp4|mov|webm|m4v|mp3|wav|ogg|html?|md|json|js|css|toml|txt)$/i;

/** 链接扫描范围：全站 HTML，剔除模板库目录与 SPA 源码壳 */
const pages = listFiles('.html').filter((f) => {
  const rel = relToRoot(f);
  if (SCAN_EXCLUDE_DIRS.some((d) => rel === d || rel.startsWith(d + '/'))) return false;
  if (SCAN_EXCLUDE_FILES.includes(rel)) return false;
  return true;
});

test('S2.0 扫描覆盖面守卫：参与链接检查的页面数不低于基线', () => {
  // 防止范围配置被误改导致静默漏扫。页面数确实变化（重构新增/删除）时，
  // 同步调整基线并在 tests/README.md 记录。
  assert.ok(pages.length >= 40, `仅扫描到 ${pages.length} 个 HTML 页面，疑似扫描范围异常`);
});

test('S2.1 所有本地 href/src/poster 引用的目标文件存在（构建产物除外）', () => {
  const broken = [];
  for (const file of pages) {
    const html = stripComments(readText(file));
    const refs = [
      ...extractAttrs(html).map((a) => a.url),
      ...extractCssUrls(html),
      ...extractScriptAssets(html),
    ];
    const seen = new Set();
    for (const raw of refs) {
      const url = raw.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const kind = classifyUrl(url);
      if (kind !== 'local') continue;
      const target = resolveLocal(file, url);
      if (!target) continue;
      if (fs.existsSync(target)) continue;
      if ((MEDIA_EXTS.test(url) || url.endsWith('/')) && !isExempt(file, 'S2.1', url)) {
        broken.push(`${relToRoot(file)} -> ${url}`);
      }
    }
  }
  assert.deepEqual(broken, [], `存在 ${broken.length} 个失效引用:\n  ${broken.slice(0, 30).join('\n  ')}${broken.length > 30 ? '\n  ...' : ''}`);
});

test('S2.2 页内锚点无死链：href="#x" 须有 id="x"（#top 享有浏览器回退语义）', () => {
  // 排除：brand/ 模板库（占位 href="#id"）；grade-insight（hash 深链路由，section 由 JS 渲染）。
  const scoped = pages.filter((f) => !underDir(f, 'grade-insight'));
  const dead = [];
  for (const file of scoped) {
    const html = stripComments(readText(file));
    const ids = extractIds(html);
    for (const { url } of extractAttrs(html)) {
      if (!url.startsWith('#') || url === '#' || url === '#top') continue;
      const anchor = url.slice(1);
      if (!ids.has(anchor) && !isExempt(file, 'S2.2', url)) {
        dead.push(`${relToRoot(file)} -> ${url}`);
      }
    }
  }
  assert.deepEqual(dead, [], `存在 ${dead.length} 个页内死锚点:\n  ${dead.slice(0, 30).join('\n  ')}`);
});

test('S2.3 编码纪律：禁止二次编码 %25；%20 仅当解码后文件不存在才报（§10）', () => {
  // 磁盘文件名本身含空格时，href 写 %20 是合法编码（S2.1 已验证存在性）；
  // 真正的事故是 %25（浏览器把 %20 再编码为 %2520 → 404）。
  const bad = [];
  for (const file of pages) {
    const html = stripComments(readText(file));
    for (const { url } of extractAttrs(html)) {
      if (/%25/i.test(url) && !isExempt(file, 'S2.3', url)) {
        bad.push(`${relToRoot(file)} -> ${url}（二次编码）`);
        continue;
      }
      if (/%20/i.test(url)) {
        const target = resolveLocal(file, url);
        if (target && !fs.existsSync(target) && !isExempt(file, 'S2.3', url)) {
          bad.push(`${relToRoot(file)} -> ${url}（含 %20 且解码后无对应文件）`);
        }
      }
    }
  }
  assert.deepEqual(bad, [], `百分号编码问题:\n  ${bad.slice(0, 20).join('\n  ')}`);
});

test('S2.4 路径纪律：本地 href/src 禁止根绝对路径（必须相对，§10）', () => {
  const bad = [];
  for (const file of pages) {
    const html = stripComments(readText(file));
    for (const { url } of extractAttrs(html)) {
      if (url.startsWith('/') && !url.startsWith('//') && !isExempt(file, 'S2.4', url)) {
        bad.push(`${relToRoot(file)} -> ${url}`);
      }
    }
  }
  assert.deepEqual(bad, [], `存在根绝对路径引用:\n  ${bad.slice(0, 20).join('\n  ')}`);
});
