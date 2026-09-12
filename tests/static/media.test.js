/**
 * S7 媒体编码守卫：入库视频必须全浏览器可播。
 * 背景：iPhone「高效」(HEVC/hvc1) 视频在 Chrome/Edge/多数安卓无法播放，
 * 2026-09 已将 37 个存量 HEVC 批量转码为 H.264；本用例防止再次入库不可播编码。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, listFiles, relToRoot } = require('../helpers');

const SIGS = ['hvc1', 'hev1', 'avc1', 'avc3', 'vp09'].map((s) => Buffer.from(s));

function signatures(file) {
  const size = fs.statSync(file).size;
  const sigs = new Set();
  const buf = Buffer.alloc(5 * 1024 * 1024);
  const fd = fs.openSync(file, 'r');
  let n = fs.readSync(fd, buf, 0, buf.length, 0);
  scan(buf.subarray(0, n));
  n = fs.readSync(fd, buf, 0, buf.length, Math.max(0, size - buf.length));
  scan(buf.subarray(0, n));
  fs.closeSync(fd);
  return sigs;
  function scan(b) {
    for (const s of SIGS) if (b.includes(s)) sigs.add(s.toString());
  }
}

const videos = listFiles('.mp4').concat(listFiles('.mov'), listFiles('.webm'));

test('S7.0 扫描覆盖面守卫：跟踪的视频文件数不低于基线', () => {
  assert.ok(videos.length >= 40, `仅发现 ${videos.length} 个视频，疑似扫描范围异常`);
});

test('S7.1 视频编码必须全浏览器可播：禁止 HEVC(hvc1/hev1)', () => {
  const bad = [];
  for (const f of videos) {
    const sigs = signatures(f);
    if (sigs.has('hvc1') || sigs.has('hev1')) bad.push(relToRoot(f));
  }
  assert.deepEqual(bad, [], `存在 HEVC 编码视频（Chrome/安卓不可播，需转码为 H.264）:\n  ${bad.join('\n  ')}`);
});

test('S7.2 MP4 必须 faststart（moov 前置，支持流式秒开）', () => {
  const bad = [];
  for (const f of videos.filter((x) => x.toLowerCase().endsWith('.mp4'))) {
    const fd = fs.openSync(f, 'r');
    const head = Buffer.alloc(1024 * 1024);
    const n = fs.readSync(fd, head, 0, head.length, 0);
    fs.closeSync(fd);
    if (!head.subarray(0, n).includes(Buffer.from('moov'))) bad.push(relToRoot(f));
  }
  assert.deepEqual(bad, [], `moov 不在头部（网页加载需下完整个文件才能播）:\n  ${bad.join('\n  ')}`);
});
