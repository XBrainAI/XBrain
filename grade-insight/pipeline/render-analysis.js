#!/usr/bin/env node
/* grade-insight 流水线 S3.5 解析预渲染（render-analysis v1）
   把〈试卷解析〉转写 md 渲染为自包含 HTML（公式→KaTeX 内联 SVG，禁 html 直通），
   供站点错题本新标签打开。devDeps: markdown-it + katex（仅构建期，站点运行时零依赖）。
   用法：node render-analysis.js --exam <考试目录> [--check]
   约定：md/〈科〉-试卷解析 (N).md → data/analysis/〈科〉-试卷解析-N.html
*/
'use strict';
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const katex = require('katex');

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

const CSS = 'body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:24px auto;padding:0 16px;line-height:1.65;color:#222;background:#fff}' +
  'h1,h2,h3{line-height:1.3}table{border-collapse:collapse;margin:10px 0;width:100%}' +
  'th,td{border:1px solid #d8d8d8;padding:6px 9px;text-align:left;font-size:14px}th{background:#f4f4f6}' +
  'img{max-width:100%;height:auto;border:1px solid #eee;border-radius:6px;display:block;margin:8px 0}' +
  'blockquote{margin:8px 0;padding:6px 12px;border-left:3px solid #c9c9d6;background:#fafafc;color:#555;font-size:13px}' +
  '.katex{font-size:1.06em}.src{color:#999;font-size:12px;margin-top:28px;border-top:1px dashed #ddd;padding-top:8px}' +
  '.xbrain-brand{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#2b3a67;font-weight:700;margin-bottom:16px}' +
  '.xbrain-brand svg{width:26px;height:26px}.xbrain-text{font-size:15px;letter-spacing:.02em}';

/* 站点品牌规范（S3 门禁）：紧凑合规品牌头，href=#top 子站合法；禁胶囊圆角 */
const BRAND = '<a class="xbrain-brand" href="#top" title="XBrain - Cerebro">' +
  '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
  '<circle cx="20" cy="20" r="17" fill="none" stroke="#3a7bd5" stroke-width="3"/>' +
  '<path d="M12 12 L28 28 M28 12 L12 28" stroke="#64b4ff" stroke-width="3" stroke-linecap="round"/>' +
  '</svg><span class="xbrain-text"><span>X</span>Brain</span></a>';

function renderMath(text) {
  /* 先抽 $$..$$ 块级、再 $..$ 行内。占位符用 %%MATH:N:%%（纯可见字符，CommonMark 不转义、不含 NUL 坑） */
  const stash = [];
  const put = (html, block) => { stash.push(html); return '%%MATH:' + (stash.length - 1) + (block ? 'B' : 'I') + '%%'; };
  let s = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => put(kx(t, true), true));
  s = s.replace(/\$([^$\n]+?)\$/g, (m, t) => put(kx(t, false), false));
  return { s, stash };
}
function kx(tex, displayMode) {
  try { return katex.renderToString(tex, { output: 'svg', throwOnError: false, displayMode }); }
  catch (e) { return '<code>' + escapeHtml(tex) + '</code>'; }
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function renderFile(srcAbs, outAbs, title, relImgPrefix) {
  const raw = fs.readFileSync(srcAbs, 'utf8');
  /* 图片相对路径：md 内 images/x.png → 相对 HTML 位置 */
  const fixed = raw.replace(/\]\((<)?images\//g, (m, g) => '](' + (g || '') + relImgPrefix);
  const { s, stash } = renderMath(fixed);
  let htmlBody = md.render(s);
  htmlBody = htmlBody.replace(/%%MATH:(\d+)([BI])%%/g, (m, i, b) => (b === 'B' ? '<div style="overflow-x:auto">' + stash[+i] + '</div>' : stash[+i]));
  const doc = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(title) + '</title>' +
    '<style>' + CSS + '</style></head><body id="top">' + BRAND + htmlBody +
    '<div class="src">来源：' + escapeHtml(title) + '（月考数据流水线预渲染，公式已转矢量，可离线阅读）</div></body></html>';
  fs.writeFileSync(outAbs, doc);
}

function htmlNameFor(mdFileName) {
  return mdFileName.replace(/\.md$/, '').replace(/ \((\d+)\)$/, '-$1') + '.html';
}

function run(examDir) {
  const mdDir = path.join(examDir, 'md');
  const outDir = path.join(examDir, 'data', 'analysis');
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(mdDir).filter((f) => /试卷解析.*\.md$/.test(f));
  let mathCount = 0, imgCount = 0;
  for (const f of files) {
    const title = f.replace(/\.md$/, '');
    renderFile(path.join(mdDir, f), path.join(outDir, htmlNameFor(f)), title, '../../md/images/');
    const out = fs.readFileSync(path.join(outDir, htmlNameFor(f)), 'utf8');
    mathCount += (out.match(/katex/g) || []).length;
    imgCount += (out.match(/<img /g) || []).length;
  }
  return { n: files.length, outDir, mathCount, imgCount };
}

function selftest() {
  const a = [];
  const eq = (x, y, m) => a.push((x === y ? 'ok ' : 'FAIL ') + m);
  eq(htmlNameFor('数学-试卷解析 (8).md'), '数学-试卷解析-8.html', '命名约定');
  eq(htmlNameFor('生物-试卷解析 (14).md'), '生物-试卷解析-14.html', '命名约定2');
  const r = renderMath('得 $\\sqrt{2}$ 与 $$x^2$$ 结束');
  eq((r.s.match(/%%MATH:/g) || []).length, 2, '数学抽取数');
  console.log(a.join('\n'));
  process.exitCode = a.some((x) => x.startsWith('FAIL')) ? 1 : 0;
}

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
if (argv.includes('--selftest')) selftest();
else {
  const examDir = arg('--exam');
  if (!examDir) { console.error('用法：node render-analysis.js --exam <目录> [--check]'); process.exit(2); }
  const r = run(examDir);
  console.log('rendered ' + r.n + ' html → ' + r.outDir + ' | katex spans≈' + r.mathCount + ' imgs=' + r.imgCount);
  if (argv.includes('--check')) {
    const mdFiles = fs.readdirSync(path.join(examDir, 'md')).filter((f) => /试卷解析.*\.md$/.test(f));
    const missing = mdFiles.filter((f) => !fs.existsSync(path.join(examDir, 'data', 'analysis', htmlNameFor(f))));
    console.log(missing.length ? 'CHECK FAIL 缺 ' + missing.length : 'CHECK PASS 全覆盖 ' + mdFiles.length + '/' + mdFiles.length);
    if (missing.length) process.exitCode = 1;
  }
}
