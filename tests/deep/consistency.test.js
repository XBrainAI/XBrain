/**
 * D1 健康/妈 深层校验：运行一致性守卫 check_consistency.py（只读脚本，退出码必须为 0）。
 * 对应 AGENTS.md §8.1：FAIL 时禁止推送。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { ROOT } = require('../helpers');

test('D1.1 健康/妈 一致性守卫全绿（python check_consistency.py）', { timeout: 120_000 }, () => {
  const r = spawnSync('python', ['check_consistency.py'], {
    cwd: path.join(ROOT, '健康', '妈'),
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    assert.fail(
      `一致性守卫未通过（exit=${r.status}）：\n${r.stdout || ''}\n${r.stderr || ''}\n` +
      'FAIL 时禁止推送；请同步 个人健康档案与深度医学分析报告.md 的派生统计后重跑。'
    );
  }
  assert.match(r.stdout || '', /PASS/, '守卫输出应含 PASS');
});
