/**
 * 回归测试共享工具（零外部依赖，Node >= 18 内置能力）
 * 原则：全部只读，不修改任何站点文件。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** 文件系统遍历时一律跳过的目录名（任一层级命中即剪枝） */
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.workbuddy', 'tests', '__pycache__',
]);

/** 递归列出指定扩展名文件（返回绝对路径数组） */
function listFiles(ext = '.html', base = ROOT) {
  const out = [];
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name)) continue;
        walk(p);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(ext)) {
        out.push(p);
      }
    }
  })(base);
  return out.sort();
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

/** 剥离 HTML 注释（<!-- -->）与 CSS 注释（/* *\/）——用于占位符/引用扫描，避免误报 */
function stripComments(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 提取 href/src/poster 属性（已剥离注释；返回 { attr, url } 数组） */
function extractAttrs(html) {
  const out = [];
  const re = /\b(href|src|poster)\s*=\s*(["'])([^"']*)\2/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ attr: m[1].toLowerCase(), url: m[3].trim() });
  }
  return out;
}

/** 提取内联 <style> 与 style=/JS 中 url(...) 引用（已剥离注释） */
function extractCssUrls(html) {
  const out = [];
  const re = /url\(\s*(['"]?)([^'")]+?)\1\s*\)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[2].trim());
  }
  return out;
}

/** 提取 <script> 内字符串字面量中的本地媒体路径（画廊 JS 数组等场景） */
function extractScriptAssets(html) {
  const out = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const strRe = /["']([^"'\n]+?\.(?:png|jpe?g|gif|webp|svg|ico|mp4|mov|webm|m4v|mp3|wav|ogg))["']/gi;
  let sm;
  while ((sm = scriptRe.exec(html)) !== null) {
    let m;
    while ((m = strRe.exec(sm[1])) !== null) out.push(m[1].trim());
  }
  return out;
}

/** 提取全部 id="..." */
function extractIds(html) {
  const ids = new Set();
  const re = /\bid\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return ids;
}

const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** 链接分类：external / hash / artifact(query-system/dist 构建产物) / local */
function classifyUrl(url) {
  if (!url || url === '#') return 'empty';
  if (url.startsWith('#')) return 'hash';
  if (EXTERNAL_RE.test(url)) return 'external';
  const norm = url.replace(/\\/g, '/');
  if (norm === 'query-system/dist' ||
      norm.startsWith('query-system/dist/') ||
      norm.includes('/query-system/dist/') ||
      norm.startsWith('../query-system/dist/') ||
      norm.includes('/../query-system/dist/')) return 'artifact';
  return 'local';
}

/** 解析本地相对引用为绝对路径；去掉 #片段 与 ?查询 */
function resolveLocal(fromFile, url) {
  let u = url.split('#')[0].split('?')[0];
  try { u = decodeURIComponent(u); } catch { /* 保留原样（%2x 异常由编码检查单独报） */ }
  if (u === '') return null;
  return path.resolve(path.dirname(fromFile), u);
}

/** 极小实体解码（&amp; 等），用于比较场景 */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** 品牌链接（<a class="xbrain-brand" ...>）的 href；找不到返回 null */
function extractBrandHref(html) {
  const re = /<a\b[^>]*class=["']xbrain-brand[^"']*["'][^>]*>/gi;
  const m = re.exec(html);
  if (!m) return null;
  const hm = /href\s*=\s*(["'])([^"']*)\1/i.exec(m[0]);
  return hm ? hm[2] : '';
}

/** 判断相对路径 file 是否位于 dirPrefix（POSIX 风格，如 '四季景点'）之下 */
function underDir(absFile, dirPrefix) {
  const rel = path.relative(ROOT, absFile).replace(/\\/g, '/');
  return rel === dirPrefix || rel.startsWith(dirPrefix + '/');
}

/** 统一转相对路径展示（POSIX 分隔符） */
function relToRoot(absFile) {
  return path.relative(ROOT, absFile).replace(/\\/g, '/');
}

module.exports = {
  ROOT, EXCLUDE_DIRS,
  listFiles, readText, stripComments,
  extractAttrs, extractCssUrls, extractScriptAssets, extractIds,
  classifyUrl, resolveLocal, decodeEntities,
  extractBrandHref, underDir, relToRoot,
};
