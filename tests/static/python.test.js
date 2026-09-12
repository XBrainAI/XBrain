/**
 * S6 Python 脚本健康：全部仓库内 .py 语法可解析（AST，只读无副作用）。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const { ROOT, listFiles, relToRoot } = require('../helpers');

test('S6.1 全部 Python 脚本语法有效（ast.parse 只读检查）', () => {
  const files = listFiles('.py');
  assert.ok(files.length >= 4, `仅发现 ${files.length} 个 .py，疑似扫描范围异常`);
  const checker = [
    'import ast, sys',
    'for f in sys.argv[1:]:',
    '    with open(f, encoding="utf-8") as fh:',
    '        ast.parse(fh.read(), filename=f)',
  ].join('\n');
  try {
    execFileSync('python', ['-c', checker, ...files], { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    const stderr = (e.stderr && e.stderr.toString()) || e.message;
    assert.fail(`Python 语法检查失败:\n${stderr}`);
  }
});
