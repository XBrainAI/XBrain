/**
 * SPEC-2026-0007：query-system 配置云端同步层测试（vitest，node 环境模拟浏览器全局）。
 * 覆盖：对账决策（未登录不消耗标记 / 新设备采用云端 / 404 初始化 / 双向新者胜）、
 * 损坏数据兜底、写入口挂钩去抖上云。
 * 每个用例通过 vi.resetModules + 动态 import 获得全新模块状态（pullDone 等）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type FetchCall = { url: string; method: string; body?: string };

const jsonResponse = (status: number, body: unknown = {}) => ({
  status,
  ok: status < 400,
  json: async () => body,
});

function makeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    _map: m,
  };
}

/* 按序列响应的 fetch stub：[status, body?][]，记录全部调用 */
function makeFetch(sequence: Array<[number, unknown?]>) {
  const calls: FetchCall[] = [];
  const fn = vi.fn((url: string, opts?: { method?: string; body?: string }) => {
    const step = sequence[Math.min(calls.length, sequence.length - 1)];
    calls.push({ url, method: opts?.method || 'GET', body: opts?.body });
    return Promise.resolve(jsonResponse(step[0], step[1]));
  }) as unknown as ReturnType<typeof vi.fn> & { calls: FetchCall[] };
  (fn as unknown as { calls: FetchCall[] }).calls = calls;
  return fn;
}

const REMOTE = {
  favorites: ['华南师范大学附属中学'],
  volunteerOrders: { 广州市协和中学: { batch2: '3', batch3: '', batch4: '' } },
  lastModified: '2026-10-11T00:00:00.000Z',
};

const flush = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
};

function login(storage: ReturnType<typeof makeStorage>) {
  storage.setItem('xbrain_auth_sub_query', JSON.stringify({
    token: 'a'.repeat(64), expires: Date.now() + 86400000, createdAt: Date.now(),
  }));
}

async function loadFresh(fetchMock?: ReturnType<typeof makeFetch>, protocol = 'http:') {
  vi.resetModules();
  const storage = makeStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('location', { protocol });
  vi.stubGlobal('document', { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} });
  const fm = fetchMock ?? makeFetch([[500]]);
  vi.stubGlobal('fetch', fm);
  const filterEngine = await import('../utils/filterEngine');
  const cloudSync = await import('../utils/cloudSync');
  return { filterEngine, cloudSync, storage, fm };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('cloudSync 对账决策（pullSoon）', () => {
  it('未登录不发请求且不消耗对账标记；登录后补跑', async () => {
    const fm = makeFetch([[200, REMOTE]]);
    const { cloudSync, storage } = await loadFresh(fm);
    cloudSync.pullSoon();
    await flush();
    expect(fm.calls.length).toBe(0);
    login(storage);
    cloudSync.onAuthReady();
    await flush();
    expect(fm.calls.length).toBe(1);
    expect(fm.calls[0].method).toBe('GET');
  });

  it('新设备（无本地锚点）+ 云端有配置 → 直接采用云端', async () => {
    const fm = makeFetch([[200, REMOTE]]);
    const { cloudSync, filterEngine, storage } = await loadFresh(fm);
    login(storage);
    cloudSync.pullSoon();
    await flush();
    expect(filterEngine.getFavorites()).toEqual(['华南师范大学附属中学']);
    expect(filterEngine.getSchoolVolunteerOrders('广州市协和中学').batch2).toBe('3');
    expect(fm.calls.filter((c) => c.method === 'PUT').length).toBe(0);
  });

  it('云端为空（404）+ 本地有数据 → PUT 初始化；示例空数据不上传', async () => {
    const fm = makeFetch([[404]]);
    const { cloudSync, filterEngine, storage } = await loadFresh(fm);
    login(storage);
    filterEngine.toggleFavorite('广东实验中学越秀学校');
    await flush();
    /* toggle 触发去抖 push（fake 定时器未用——去抖定时器 2s 后才跑；此处先验证 pullSoon） */
    cloudSync.pullSoon();
    await flush();
    const gets = fm.calls.filter((c) => c.method === 'GET');
    expect(gets.length).toBe(1);
    await new Promise((r) => setTimeout(r, 2100));
    const puts = fm.calls.filter((c) => c.method === 'PUT');
    expect(puts.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(puts[0].body!);
    expect(payload.favorites).toEqual(['广东实验中学越秀学校']);
    expect(payload.volunteerOrders).toEqual({});
    expect(typeof payload.lastModified).toBe('string');
  });

  it('云端较新覆盖本地；本地较新推送（双向新者胜）', async () => {
    /* 本地较新 → PUT */
    const oldRemote = { ...REMOTE, lastModified: '2026-10-10T00:00:00.000Z' };
    const fmA = makeFetch([[200, oldRemote], [200, { ok: true }]]);
    const a = await loadFresh(fmA);
    login(a.storage);
    a.filterEngine.toggleFavorite('某校甲'); /* touch 本地基线（当前时间） */
    a.cloudSync.pullSoon();
    await flush();
    expect(fmA.calls.filter((c) => c.method === 'PUT').length).toBe(1);

    /* 云端较新 → 采用云端 */
    const neuRemote = { ...REMOTE, lastModified: '2027-01-01T00:00:00.000Z' };
    const fmB = makeFetch([[200, neuRemote]]);
    const b = await loadFresh(fmB);
    login(b.storage);
    b.filterEngine.toggleFavorite('某校乙');
    b.cloudSync.pullSoon();
    await flush();
    expect(fmB.calls.filter((c) => c.method === 'PUT').length).toBe(0);
    expect(b.filterEngine.getFavorites()).toEqual(['华南师范大学附属中学']);
  });

  it('云端配置损坏 → apply 兜底回落空值，不抛错', async () => {
    const fm = makeFetch([[200, { lastModified: '2027-01-01T00:00:00.000Z' }]]);
    const { cloudSync, filterEngine, storage } = await loadFresh(fm);
    login(storage);
    cloudSync.pullSoon();
    await flush();
    expect(filterEngine.getFavorites()).toEqual([]);
    expect(filterEngine.getAllVolunteerOrdersV2()).toEqual({});
  });
});

describe('cloudSync 写入口挂钩与手动操作', () => {
  it('toggleFavorite/setBatchVolunteerOrder 去抖后自动 PUT（fake timers）', async () => {
    vi.useFakeTimers();
    const fm = makeFetch([[404], [200, { ok: true }], [200, { ok: true }]]);
    const { cloudSync, filterEngine, storage } = await loadFresh(fm);
    login(storage);
    cloudSync.pullSoon();
    await vi.advanceTimersByTimeAsync(0); /* flush 微任务：GET 404 发生 */
    filterEngine.toggleFavorite('华南师范大学附属中学');
    filterEngine.setBatchVolunteerOrder('广州市协和中学', 'batch3', '1');
    await vi.advanceTimersByTimeAsync(2100); /* 越过 2s 去抖 */
    const puts = fm.calls.filter((c) => c.method === 'PUT');
    expect(puts.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(puts[0].body!);
    expect(payload.favorites).toEqual(['华南师范大学附属中学']);
    expect(payload.volunteerOrders['广州市协和中学'].batch3).toBe('1');
  });

  it('手动 syncUp 在凭证缺失时拒绝；syncDown 404 报云端暂无', async () => {
    const fm = makeFetch([[404]]);
    const { cloudSync } = await loadFresh(fm);
    await expect(cloudSync.syncUp()).rejects.toThrow(/未登录/);
    await expect(cloudSync.syncDown()).rejects.toThrow(/未登录/);
    vi.stubGlobal('fetch', fm);
    /* 登录后 syncDown 404 */
    const b = await loadFresh(fm);
    /* 重新 stub（loadFresh 已重置） */
    login((globalThis.localStorage as unknown as ReturnType<typeof makeStorage>));
    await expect(b.cloudSync.syncDown()).rejects.toThrow(/云端暂无/);
  });

  it('file:// 协议整体关闭同步', async () => {
    const fm = makeFetch([[200, REMOTE]]);
    const { cloudSync } = await loadFresh(fm, 'file:');
    expect(cloudSync.syncEnabled()).toBe(false);
    cloudSync.pullSoon();
    await flush();
    expect(fm.calls.length).toBe(0);
    await expect(cloudSync.syncUp()).rejects.toThrow(/本地调试模式/);
  });
});
