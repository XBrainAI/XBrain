/**
 * grade-store 纯逻辑核心（SPEC-2026-0006）
 *
 * 与平台/存储解耦的可测逻辑：凭证等值校验、载荷校验、冲突判定。
 * 被 netlify/functions/grade-store.mjs（ESM）与 tests/static 用例共同消费，
 * 因此保持 CJS、零外部依赖。
 */
'use strict';

const crypto = require('node:crypto');

/* ---------- 凭证 ---------- */

/* 与 brand/auth.js 登录链路同源：sha256hex(密码)。前端会话 token 即此值。 */
function passwordHash(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

/* 请求头凭证等值校验：非 hex64/缺失/大小写不符一律拒绝 */
function validateAuthHeader(headerValue, expectedHash) {
  if (typeof headerValue !== 'string' || !headerValue) return false;
  if (!/^[0-9a-f]{64}$/.test(headerValue)) return false;
  /* 计时安全比较，防逐位探测 */
  const a = Buffer.from(headerValue, 'utf8');
  const b = Buffer.from(expectedHash, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- 载荷校验 ---------- */

/* 快照最小结构校验（深度归一化在前端 normalizeState 完成，服务端只挡垃圾写入）。
   合法 → { ok: true, value }；非法 → { ok: false, errors: [..] } */
function normalizePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['载荷必须是 JSON 对象'] };
  }
  if (!Array.isArray(payload.exams)) errors.push('缺少 exams 数组');
  if (typeof payload.lastModified !== 'string' || !payload.lastModified) {
    errors.push('缺少 lastModified（同步冲突判据）');
  } else if (Number.isNaN(new Date(payload.lastModified).getTime())) {
    errors.push('lastModified 不是可解析的时间');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: payload };
}

/* ---------- 冲突判定 ---------- */

/* 整档案按 lastModified 新者胜（单用户家庭场景，字段级合并在规格非目标内）。
   时间戳缺失/解析失败按不冲突处理——避免坏数据把写入永久卡死。 */
function isConflicting(remote, incoming) {
  if (!remote || typeof remote !== 'object') return false;
  if (!remote.lastModified || !incoming || typeof incoming.lastModified !== 'string') return false;
  const r = new Date(remote.lastModified).getTime();
  const i = new Date(incoming.lastModified).getTime();
  if (Number.isNaN(r) || Number.isNaN(i)) return false;
  return r > i; /* 相等视为同一版本，允许覆盖 */
}

module.exports = { passwordHash, validateAuthHeader, normalizePayload, isConflicting };
