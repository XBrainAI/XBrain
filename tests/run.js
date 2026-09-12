/**
 * 回归测试分层运行器 + 测试报告生成器。
 *
 * 用法（仓库根执行）：
 *   npm run test:repo          # 静态层：全站链接/品牌/生成页/配置/语法（秒级，只读）
 *   npm run test:repo:full     # 深层：静态层 + 健康站一致性守卫 + SPA lint/test/build
 *
 * 每次运行生成 Markdown 测试报告：
 *   tests/reports/latest.md            # 固定入口（最新一份）
 *   tests/reports/report-<时间戳>.md   # 历史存档
 *
 * 实现：以 node:test 的 junit 报告器运行一次，解析结构化结果后
 * 渲染控制台摘要并产出 MD 报告（单次运行，两份输出）。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(__dirname, 'reports');

const deep = process.argv.includes('--deep');
const tiers = ['static', ...(deep ? ['deep'] : [])];
const files = tiers.flatMap((d) =>
  fs.readdirSync(path.join(__dirname, d))
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join(__dirname, d, f))
);

// —— 元信息 ——
let commit = 'unknown';
let dirty = false;
try {
  commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim() || 'unknown';
  dirty = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim().length > 0;
} catch { /* git 不可用时降级 */ }

const { KNOWN_ISSUES } = require('./config');
const baselinePath = path.join(__dirname, 'baseline.json');
const readBaseline = () => { try { return JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch { return null; } };
const baselineBefore = readBaseline();

const unescapeXml = (s) => {
  let prev = s;
  let out = s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
  // XML 值可能被多重转义（如名称内含引号 → &amp;quot;），循环还原至稳定
  while (out !== prev) { prev = out; out = unescapeOnce(out); }
  return out;
  function unescapeOnce(t) {
    return t
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&amp;/g, '&');
  }
};
const attr = (tag, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? unescapeXml(m[1]) : '';
};

// —— 运行（单次，junit 结构化输出）——
const startedAt = new Date();
const t0 = Date.now();
console.log(`[regression] 运行层级: ${tiers.join(' + ')}（${files.length} 个用例文件）\n`);

const r = spawnSync(
  process.execPath,
  ['--test', '--test-reporter', 'junit', '--test-reporter-destination', 'stdout', ...files],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);

const fmtDur = (ms) => (ms == null ? '-' : ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);
const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const fmtLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// —— 解析 junit XML ——
const xml = (r.stdout || '').slice((r.stdout || '').indexOf('<?xml'));
const results = [];
const tcRe = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
let m;
while ((m = tcRe.exec(xml)) !== null) {
  const [, attrs, body] = m;
  const name = attr(attrs, 'name');
  const fileAbs = attr(attrs, 'file');
  const timeSec = parseFloat(attr(attrs, 'time')) || 0;
  const failMatch = body ? /<failure\b([^>]*)>([\s\S]*?)<\/failure>/.exec(body) : null;
  let message = failMatch
    ? (unescapeXml(failMatch[2]) || attr(failMatch[1], 'message')).trim()
    : '';
  // 剥掉 node:test 的外层错误壳，优先展示内层断言信息与 diff
  const causeIdx = message.indexOf('cause: ');
  if (causeIdx !== -1) {
    message = message.slice(causeIdx + 'cause: '.length).replace(/\n\}\s*$/, '').trim();
  }
  results.push({
    name,
    file: fileAbs ? path.relative(ROOT, fileAbs).replace(/\\/g, '/') : '(unknown)',
    status: failMatch ? 'fail' : 'pass',
    duration: timeSec * 1000,
    message,
  });
}

const sum = (key) => {
  const c = new RegExp(`<!--\\s*${key}\\s+(\\d+)\\s*-->`).exec(xml);
  return c ? Number(c[1]) : null;
};
const counts = {
  tests: sum('tests') ?? results.length,
  pass: sum('pass') ?? results.filter((x) => x.status === 'pass').length,
  fail: sum('fail') ?? results.filter((x) => x.status === 'fail').length,
  skipped: sum('skipped') ?? 0,
};

// junit 按完成顺序输出（文件并行），重排为用例文件的给定顺序，保证控制台/报告分组稳定
const fileOrder = new Map(files.map((f, i) => [path.relative(ROOT, f).replace(/\\/g, '/'), i]));
results.sort((a, b) =>
  (fileOrder.get(a.file) ?? 1e9) - (fileOrder.get(b.file) ?? 1e9)
);

// 解析失败兜底：无任何 testcase 且子进程非 0，视为结构性故障
if (results.length === 0) {
  console.error('[regression] ❌ 运行器未能解析测试结果（结构性故障），原始输出尾部：');
  console.error((r.stderr || r.stdout || '').slice(-2000));
  process.exit(1);
}

// —— 控制台渲染 ——
for (const res of results) {
  console.log(`${res.status === 'pass' ? '✔' : '✖'} ${res.name} (${fmtDur(res.duration)})`);
  if (res.status === 'fail' && res.message) {
    console.log('    ' + res.message.split('\n').slice(0, 6).join('\n    ').slice(0, 600));
  }
}

const totalMs = Date.now() - t0;
const verdict = counts.fail === 0 ? '✅ 全绿，可提交推送' : `❌ ${counts.fail} 项失败，禁止推送`;
console.log(`\nℹ tests ${counts.tests} · pass ${counts.pass} · fail ${counts.fail} · skipped ${counts.skipped} · ${fmtDur(totalMs)}`);
console.log(`[regression] ${verdict}`);

// 棘轮基线收紧提示（junit 模式下用例 stdout 不可见，改为对比文件）
const baselineAfter = readBaseline();
if (baselineBefore && baselineAfter && JSON.stringify(baselineBefore) !== JSON.stringify(baselineAfter)) {
  console.log('[regression] [ratchet] 棘轮基线已自动收紧（tests/baseline.json 更新）');
}

// —— 生成 Markdown 报告 ——
const byFile = new Map();
for (const res of results) {
  if (!byFile.has(res.file)) byFile.set(res.file, []);
  byFile.get(res.file).push(res);
}

const md = [];
md.push('# XBrain 回归测试报告');
md.push('');
md.push(`- **结论**：${verdict}`);
md.push(`- 运行时间：${fmtLocal(startedAt)}`);
md.push(`- 层级：${tiers.join(' + ')}（命令 \`npm run test:repo${deep ? ':full' : ''}\`，用例文件 ${files.length} 个）`);
md.push(`- 代码基线：commit ${commit}${dirty ? '（⚠️ 工作区存在未提交改动）' : ''}`);
md.push(`- 运行环境：Node ${process.version} · ${process.platform}`);
md.push(`- 总耗时：${fmtDur(totalMs)}`);
md.push('');
md.push('## 结果概览');
md.push('');
md.push('| 总数 | 通过 | 失败 | 跳过 |');
md.push('|---:|---:|---:|---:|');
md.push(`| ${counts.tests} | ${counts.pass} | ${counts.fail} | ${counts.skipped} |`);
md.push('');
md.push('## 用例明细');
for (const [file, list] of byFile) {
  md.push('');
  md.push(`### ${file}`);
  md.push('');
  md.push('| 用例 | 结果 | 耗时 |');
  md.push('|------|------|---:|');
  for (const res of list) {
    md.push(`| ${res.name} | ${res.status === 'pass' ? '✅ 通过' : '❌ 失败'} | ${fmtDur(res.duration)} |`);
  }
}
const failures = results.filter((x) => x.status === 'fail');
if (failures.length) {
  md.push('');
  md.push('## 失败详情');
  for (const res of failures) {
    md.push('');
    md.push(`#### ❌ ${res.name}`);
    md.push(`- 文件：\`${res.file}\``);
    md.push('```');
    md.push(res.message.slice(0, 2000) || '(无错误信息)');
    md.push('```');
  }
}
md.push('');
md.push('## 已知债务快照（豁免/基线，不计入失败）');
md.push('');
md.push(`- KNOWN_ISSUES 豁免：${KNOWN_ISSUES.length} 条（明细见 \`tests/config.js\`；对应重构项落地后必须删除条目）`);
for (const k of KNOWN_ISSUES) {
  md.push(`  - ${k.id} [${k.rule}] ${k.file}${k.ref ? ` → ${k.ref}` : ''}：${k.reason}`);
}
if (baselineAfter) {
  md.push(`- 棘轮基线（基线提交 ${baselineAfter.recordedCommit}）：SPA lint 错误 ≤ ${baselineAfter.spaLintErrors}、单测失败 ≤ ${baselineAfter.spaTestsFailed}（${baselineAfter.spaTestFilesFailed} 个文件）、通过数 ≥ ${baselineAfter.spaTestsPassed}`);
}
md.push('');
md.push('> 报告由 `tests/run.js` 自动生成（目录已 gitignore）；重构留档时可拷贝本文件随重构提交。');

fs.mkdirSync(REPORT_DIR, { recursive: true });
const stampedName = `report-${stamp(startedAt)}.md`;
fs.writeFileSync(path.join(REPORT_DIR, stampedName), md.join('\n'), 'utf8');
fs.writeFileSync(path.join(REPORT_DIR, 'latest.md'), md.join('\n'), 'utf8');
console.log(`[regression] 测试报告已生成: tests/reports/latest.md（存档 ${stampedName}）`);

process.exitCode = counts.fail === 0 && r.status === 0 ? 0 : 1;
