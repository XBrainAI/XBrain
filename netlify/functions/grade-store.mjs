/**
 * grade-store · Netlify Function（SPEC-2026-0006）
 *
 * grade-insight 云端快照的唯一同域端点：
 *   GET  → 读 Blobs 快照（无数据 404）
 *   PUT  → 载荷校验 + lastModified 冲突判定 → 写 Blobs
 * 两个方法都要求请求头 X-GI-Auth = sha256hex(站点密码)，
 * 期望值运行时取自站点自身 auth.config.json（与前端密码门同源，不新增凭证）。
 *
 * 前端会话 token（brand/auth.js 登录成功后保存的密码哈希）即请求凭证；
 * 校验强度与既有前端密码门同级（防误用，不防拿到明文配置的攻击者）——
 * 该定性经 SPEC-2026-0006 意图评审确认（C2 不命中）。
 */
import { getStore } from '@netlify/blobs';
import core from './lib/grade-store-core.cjs';

const STORE_NAME = 'grade_insight';
const SNAPSHOT_KEY = 'snapshot';
const CONFIG_TIMEOUT_MS = 3000;

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/* 站点自身配置里的密码哈希。走站点 URL 拉取（凭证不出站点，无需环境变量）。 */
async function expectedAuthHash(request) {
  const host = request.headers.get('host');
  if (!host) throw new Error('missing host header');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const res = await fetch(`${proto}://${host}/auth.config.json`, {
    signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`auth config HTTP ${res.status}`);
  const config = await res.json();
  if (typeof config.password !== 'string' || !config.password) {
    throw new Error('auth config missing password');
  }
  return core.passwordHash(config.password);
}

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let expected;
  try {
    expected = await expectedAuthHash(req);
  } catch (err) {
    return json({ error: 'config_unavailable', detail: String(err.message || err) }, 500);
  }
  if (!core.validateAuthHeader(req.headers.get('x-gi-auth') || '', expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const store = getStore({ name: STORE_NAME, consistency: 'strong' });

  if (req.method === 'GET') {
    const snapshot = await store.get(SNAPSHOT_KEY, { type: 'json' });
    if (!snapshot) return json({ error: 'not_found' }, 404);
    return json(snapshot);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const norm = core.normalizePayload(payload);
  if (!norm.ok) return json({ error: 'bad_payload', detail: norm.errors }, 400);

  const remote = await store.get(SNAPSHOT_KEY, { type: 'json' });
  if (core.isConflicting(remote, norm.value)) {
    return json({ error: 'conflict', snapshot: remote }, 409);
  }

  await store.setJSON(SNAPSHOT_KEY, norm.value);
  return json({ ok: true, savedAt: norm.value.lastModified });
};
