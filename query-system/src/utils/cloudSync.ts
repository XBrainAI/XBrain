/* SPEC-2026-0007：query-system 配置云端同步层
   本地 localStorage 永远第一落点，云端（Netlify Blobs，经同域端点）为异步镜像：
   收藏/志愿编排永不因网络阻塞。file:// 调试跳过；演示与本地数据语义不变。
   冲突整配置按 lastModified 新者胜：云端较新时服务端拒绝写入（409），
   本地不丢、可经 App 手动恢复——绝不静默覆盖。
   凭证复用 XBrainAuth 子站会话（brand/auth.js：session.token = sha256hex(密码)），
   键构造与 auth.js getSessionKey('sub','query') 同源，不新增任何凭证。
   数据读写经 initCloudSync 注入的 collect/apply 钩子完成（数据归属 filterEngine，
   本模块只管网络与时序，避免循环依赖）。 */

import type { SchoolVolunteerOrders } from '../types';

const SYNC_URL = '/.netlify/functions/query-store';
const STATUS_KEY = 'query_sync_status_v1';
const LM_KEY = 'query_config_last_modified';
const PUSH_DEBOUNCE_MS = 2000;

export interface ConfigSnapshot {
  favorites: string[];
  volunteerOrders: Record<string, SchoolVolunteerOrders>;
  lastModified?: string;
}

export interface CloudSyncHooks {
  collect(): { favorites: string[]; volunteerOrders: Record<string, SchoolVolunteerOrders> };
  apply(cfg: ConfigSnapshot): void;
  hasLocalData(): boolean;
}

export type SyncResult = 'ok' | 'conflict' | 'skip';
export interface SyncStatus { lastSyncAt?: string; lastError?: string }

let hooks: CloudSyncHooks | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInflight = false;
let pullDone = false;

export function initCloudSync(h: CloudSyncHooks): void {
  hooks = h;
}

export function syncEnabled(): boolean {
  try { return location.protocol !== 'file:'; } catch { return false; }
}

function authToken(): string | null {
  try {
    const raw = localStorage.getItem('xbrain_auth_sub_query');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.token ? String(s.token) : null;
  } catch {
    return null;
  }
}

export function getSyncStatus(): SyncStatus {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markSynced(): void {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify({ lastSyncAt: new Date().toISOString() }));
  } catch { /* 状态持久化失败不影响同步本身 */ }
}

function markSyncError(err: unknown): string {
  const msg = String((err as Error)?.message || err || '未知错误');
  try {
    const st = getSyncStatus();
    st.lastError = msg;
    localStorage.setItem(STATUS_KEY, JSON.stringify(st));
  } catch { /* 同上 */ }
  return msg;
}

export function getLocalLastModified(): string {
  try { return localStorage.getItem(LM_KEY) || ''; } catch { return ''; }
}

/* 用户修改本地配置时调用：刷新同步冲突基线 */
export function touchLocalLastModified(): void {
  try { localStorage.setItem(LM_KEY, new Date().toISOString()); } catch { /* ignore */ }
}

function setLocalLastModified(v: string): void {
  try { localStorage.setItem(LM_KEY, v); } catch { /* ignore */ }
}

function dispatch(name: string): void {
  try { document.dispatchEvent(new CustomEvent(name)); } catch { /* 非页面环境 */ }
}

/* 上传本地配置。resolve 'ok' | 'conflict'；网络/服务端错误 reject。
   401（会话过期）按普通错误记状态，重新过密码门后自愈。 */
export function pushNow(): Promise<SyncResult> {
  if (!hooks || pushInflight) return Promise.resolve('skip');
  const token = authToken();
  if (!token || !syncEnabled()) return Promise.resolve('skip');
  const payload: ConfigSnapshot = {
    ...hooks.collect(),
    lastModified: getLocalLastModified() || new Date().toISOString(),
  };
  pushInflight = true;
  return fetch(SYNC_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-GI-Auth': token },
    body: JSON.stringify(payload),
  }).then((res) => {
    pushInflight = false;
    if (res.ok) {
      markSynced();
      return 'ok' as const;
    }
    if (res.status === 409) {
      markSyncError(new Error('云端有更新的配置，本次未覆盖'));
      return 'conflict' as const;
    }
    return res.json().catch(() => ({})).then((body: { detail?: string[] }) => {
      throw new Error('HTTP ' + res.status + (body?.detail ? '：' + body.detail.join('；') : ''));
    });
  }).catch((err) => {
    pushInflight = false;
    markSyncError(err);
    throw err;
  });
}

export function schedulePush(): void {
  if (!syncEnabled()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushNow().then((r) => {
      if (r === 'conflict') dispatch('qs:sync-conflict');
    }).catch(() => { /* 失败已记状态，下次修改自动重试 */ });
  }, PUSH_DEBOUNCE_MS);
}

/* 远端配置落本地：经 apply 钩子兜底写入（损坏/缺字段回落空值），不回推 */
function applyRemote(snapshot: ConfigSnapshot): void {
  if (!hooks) return;
  hooks.apply(snapshot);
  setLocalLastModified(String(snapshot.lastModified || new Date().toISOString()));
  dispatch('qs:remote-applied');
}

/* 打开/登录/首次修改时与云端对账一次：云端空且有本地数据则初始化上传；
   本地无锚点（新设备）或云端较新则采用云端；本地较新则推上去。 */
export function pullSoon(): void {
  if (pullDone || !syncEnabled() || !hooks) return;
  const token = authToken();
  if (!token) return; /* 未登录：不消耗对账标记，登录回调或下次修改再试 */
  pullDone = true;
  fetch(SYNC_URL, { method: 'GET', headers: { 'X-GI-Auth': token } })
    .then(async (res) => {
      if (res.status === 404) {
        if (hooks!.hasLocalData()) return pushNow();
        return undefined;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const remote = (await res.json()) as ConfigSnapshot;
      const remoteLM = new Date(String(remote?.lastModified || 0)).getTime();
      const localLM = getLocalLastModified();
      /* 本地无锚点（新设备）或云端较新 → 采用云端 */
      if (!localLM || remoteLM > new Date(localLM).getTime()) {
        applyRemote(remote);
        markSynced();
        return undefined;
      }
      if (new Date(localLM).getTime() > remoteLM && hooks!.hasLocalData()) {
        return pushNow();
      }
      return undefined;
    })
    .catch((err) => markSyncError(err));
}

/* 密码门登录成功回调触发（index.html 内联 onAuthSuccess） */
export function onAuthReady(): void {
  pullSoon();
}

/* 手动操作（App 同步状态入口） */
export function syncUp(): Promise<void> {
  if (!syncEnabled()) return Promise.reject(new Error('本地调试模式，云同步不可用'));
  if (!authToken()) return Promise.reject(new Error('未登录，请先通过站点密码门'));
  return pushNow().then((r) => {
    if (r === 'conflict') throw new Error('云端有更新的配置，未覆盖；可点「从云端恢复」取回');
  });
}

export function syncDown(): Promise<void> {
  if (!syncEnabled()) return Promise.reject(new Error('本地调试模式，云同步不可用'));
  const token = authToken();
  if (!token) return Promise.reject(new Error('未登录，请先通过站点密码门'));
  return fetch(SYNC_URL, { method: 'GET', headers: { 'X-GI-Auth': token } })
    .then((res) => {
      if (res.status === 404) throw new Error('云端暂无配置');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json() as Promise<ConfigSnapshot>;
    })
    .then((remote) => {
      applyRemote(remote);
      markSynced();
    });
}

export function syncStatusText(): string {
  if (!syncEnabled()) return '本地调试模式（file://），云同步不可用';
  const st = getSyncStatus();
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  let txt: string;
  if (st.lastSyncAt) {
    const d = new Date(st.lastSyncAt);
    txt = `最近同步：${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } else {
    txt = '尚未同步过（登录后打开或修改配置时自动进行）';
  }
  if (st.lastError) txt += ` · ⚠️ 上次同步：${st.lastError}`;
  return txt;
}

/* 应用启动自检：auth init（经典脚本）早于本 bundle 执行，已有会话的设备
   此处直接对账；新设备登录经 onAuthSuccess → GICloudSync.onAuthReady 双向触发 */
export function bootstrap(): void {
  try {
    (window as unknown as { GICloudSync?: { onAuthReady(): void } }).GICloudSync = { onAuthReady };
  } catch { /* 非页面环境 */ }
  pullSoon();
}
