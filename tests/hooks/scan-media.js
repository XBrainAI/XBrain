/**
 * pre-commit 媒体守卫：扫描暂存区视频文件，拒绝不可播编码入库。
 * 由 .git/hooks/pre-commit 调用；拦截规则与回归套件 S7 一致：
 *   - 拒绝 HEVC(hvc1/hev1)：Chrome/Edge/多数安卓无法播放
 *   - 拒绝单文件 >100MB：GitHub 硬限
 *   - 警告 moov 不在头部（可播但首帧慢，建议 -movflags +faststart）
 */
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SIGS = ['hvc1', 'hev1', 'avc1', 'avc3', 'vp09'].map((s) => Buffer.from(s));

function signatures(file) {
  const size = fs.statSync(file).size;
  const sigs = new Set();
  const buf = Buffer.alloc(5 * 1024 * 1024);
  const fd = fs.openSync(file, 'r');
  let n = fs.readSync(fd, buf, 0, buf.length, 0);
  const scan = (b) => { for (const s of SIGS) if (b.includes(s)) sigs.add(s.toString()); };
  scan(buf.subarray(0, n));
  n = fs.readSync(fd, buf, 0, buf.length, Math.max(0, size - buf.length));
  scan(buf.subarray(0, n));
  fs.closeSync(fd);
  return { sigs, hasMoovHead: fs.openSync(file, 'r') && readMoov(file) };

  function readMoov(f) {
    const fd2 = fs.openSync(f, 'r');
    const head = Buffer.alloc(1024 * 1024);
    const n2 = fs.readSync(fd2, head, 0, head.length, 0);
    fs.closeSync(fd2);
    return head.subarray(0, n2).includes(Buffer.from('moov'));
  }
}

let staged;
try {
  staged = execSync('git diff --cached --name-only -z --diff-filter=ACM', {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  }).split('\0').filter(Boolean);
} catch {
  process.exit(0); // 非 git 环境，放行
}

const videos = staged.filter((f) => /\.(mp4|mov|webm)$/i.test(f));
if (videos.length === 0) process.exit(0);

const rejects = [];
const warns = [];
for (const rel of videos) {
  const abs = path.resolve(rel);
  if (!fs.existsSync(abs)) continue;
  const { sigs, hasMoovHead } = signatures(abs);
  const sizeMb = fs.statSync(abs).size / 1048576;
  if (sigs.has('hvc1') || sigs.has('hev1')) {
    rejects.push(`${rel}\n    HEVC 编码：Chrome/安卓无法播放。请用「兼容性最佳」导出，或先转码：\n    ffmpeg -i 输入.mp4 -c:v libx264 -crf 23 -preset fast -c:a copy -movflags +faststart 输出.mp4`);
  } else if (sizeMb > 100) {
    rejects.push(`${rel}\n    ${sizeMb.toFixed(1)}MB 超 GitHub 100MB 硬限，push 将被拒绝`);
  }
  if (!hasMoovHead && !rejects.some((r) => r.startsWith(rel))) {
    warns.push(`${rel}（moov 在尾部，可播但首帧慢）`);
  }
}

if (warns.length) {
  console.log('[media-hook] ⚠️ 建议 faststart:');
  warns.forEach((w) => console.log('  ' + w));
}
if (rejects.length) {
  console.error('[media-hook] ❌ 以下暂存视频不符合入库铁律（AGENTS §10），提交被拒绝:');
  rejects.forEach((r) => console.error('  ' + r));
  console.error('  （确需跳过请用 --no-verify，但请三思）');
  process.exit(1);
}
process.exit(0);
