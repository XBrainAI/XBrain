import type { SchoolRecord, FilterCriteria, VolunteerOrder, SchoolVolunteerOrders, BatchVolunteerOrder } from '../types';

const FAVORITES_KEY = 'school_favorites';
const VOLUNTEER_KEY = 'school_volunteer_orders';
const VOLUNTEER_KEY_V2 = 'school_volunteer_orders_v2';

// ===== 旧版志愿（单值）兼容 =====

export function getVolunteerOrders(): Record<string, VolunteerOrder> {
  try {
    const raw = localStorage.getItem(VOLUNTEER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setVolunteerOrder(schoolName: string, order: VolunteerOrder): void {
  const orders = getVolunteerOrders();
  if (order === '') {
    delete orders[schoolName];
  } else {
    orders[schoolName] = order;
  }
  try {
    localStorage.setItem(VOLUNTEER_KEY, JSON.stringify(orders));
  } catch {
    // ignore
  }
}

export function getVolunteerOrder(schoolName: string): VolunteerOrder {
  return getVolunteerOrders()[schoolName] ?? '';
}

// ===== 新版志愿（多批次） =====

function migrateOldVolunteerData(): Record<string, SchoolVolunteerOrders> {
  const oldOrders = getVolunteerOrders();
  const migrated: Record<string, SchoolVolunteerOrders> = {};
  for (const [schoolName, order] of Object.entries(oldOrders)) {
    if (order === '') continue;
    const batch = order.charAt(0);
    const num = order.slice(1);
    const newOrder: SchoolVolunteerOrders = { batch2: '', batch3: '', batch4: '' };
    if (batch === '二') newOrder.batch2 = num as BatchVolunteerOrder;
    else if (batch === '三') newOrder.batch3 = num as BatchVolunteerOrder;
    else if (batch === '四') newOrder.batch4 = num as BatchVolunteerOrder;
    migrated[schoolName] = newOrder;
  }
  try {
    localStorage.setItem(VOLUNTEER_KEY_V2, JSON.stringify(migrated));
    localStorage.removeItem(VOLUNTEER_KEY);
  } catch {
    // ignore
  }
  return migrated;
}

export function getAllVolunteerOrdersV2(): Record<string, SchoolVolunteerOrders> {
  try {
    const raw = localStorage.getItem(VOLUNTEER_KEY_V2);
    if (raw) return JSON.parse(raw);
    // 尝试迁移旧数据
    return migrateOldVolunteerData();
  } catch {
    return {};
  }
}

export function getSchoolVolunteerOrders(schoolName: string): SchoolVolunteerOrders {
  return getAllVolunteerOrdersV2()[schoolName] ?? { batch2: '', batch3: '', batch4: '' };
}

export function setBatchVolunteerOrder(
  schoolName: string,
  batch: 'batch2' | 'batch3' | 'batch4',
  order: BatchVolunteerOrder
): void {
  const all = getAllVolunteerOrdersV2();
  if (!all[schoolName]) all[schoolName] = { batch2: '', batch3: '', batch4: '' };
  all[schoolName][batch] = order;
  // 如果全部为空，删除该学校记录
  const s = all[schoolName];
  if (s.batch2 === '' && s.batch3 === '' && s.batch4 === '') {
    delete all[schoolName];
  }
  try {
    localStorage.setItem(VOLUNTEER_KEY_V2, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// 获取学校已选的所有志愿值数组（如 ["二1", "三2"]）
export function getSchoolVolunteerValues(schoolName: string): string[] {
  const orders = getSchoolVolunteerOrders(schoolName);
  const result: string[] = [];
  if (orders.batch2) result.push(`二${orders.batch2}`);
  if (orders.batch3) result.push(`三${orders.batch3}`);
  if (orders.batch4) result.push(`四${orders.batch4}`);
  return result;
}

// 检查某批次某序号是否已被占用（排除指定学校）
export function isBatchOrderUsed(batch: 'batch2' | 'batch3' | 'batch4', order: BatchVolunteerOrder, excludeSchool?: string): boolean {
  if (order === '') return false;
  const all = getAllVolunteerOrdersV2();
  for (const [schoolName, orders] of Object.entries(all)) {
    if (excludeSchool && schoolName === excludeSchool) continue;
    const val = orders[batch];
    if (val === order) return true;
  }
  return false;
}

// ===== 收藏 =====

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // ignore
  }
}

export function toggleFavorite(schoolName: string): boolean {
  const favorites = getFavorites();
  const idx = favorites.indexOf(schoolName);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    setFavorites(favorites);
    return false;
  } else {
    favorites.push(schoolName);
    setFavorites(favorites);
    return true;
  }
}

export function isFavorite(schoolName: string): boolean {
  return getFavorites().includes(schoolName);
}

/* ===== 导出/导入配置（收藏 + 志愿v2） ===== */

export interface AppConfig {
  favorites: string[];
  volunteerOrders: Record<string, SchoolVolunteerOrders>;
}

export function exportConfigToFile(): void {
  const config: AppConfig = {
    favorites: getFavorites(),
    volunteerOrders: getAllVolunteerOrdersV2(),
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `school_config_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importConfigFromFile(file: File): Promise<AppConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        // 兼容旧格式：纯数组表示收藏列表
        if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
          setFavorites(data);
          resolve({ favorites: data, volunteerOrders: {} });
          return;
        }
        // 兼容旧格式v1：含 favorites 和 volunteerOrders（单值）的对象
        if (data && typeof data === 'object') {
          const favorites = Array.isArray(data.favorites) ? data.favorites : [];
          setFavorites(favorites);

          // 检测志愿数据格式
          const volData = data.volunteerOrders;
          if (volData && typeof volData === 'object') {
            const firstVal = Object.values(volData)[0];
            if (typeof firstVal === 'string') {
              // 旧格式v1：单值字符串，需要迁移
              const migrated: Record<string, SchoolVolunteerOrders> = {};
              for (const [schoolName, order] of Object.entries(volData as Record<string, string>)) {
                if (!order || order === '') continue;
                const batch = order.charAt(0);
                const num = order.slice(1);
                const newOrder: SchoolVolunteerOrders = { batch2: '', batch3: '', batch4: '' };
                if (batch === '二') newOrder.batch2 = num as BatchVolunteerOrder;
                else if (batch === '三') newOrder.batch3 = num as BatchVolunteerOrder;
                else if (batch === '四') newOrder.batch4 = num as BatchVolunteerOrder;
                migrated[schoolName] = newOrder;
              }
              try {
                localStorage.setItem(VOLUNTEER_KEY_V2, JSON.stringify(migrated));
                localStorage.removeItem(VOLUNTEER_KEY);
              } catch {
                // ignore
              }
              resolve({ favorites, volunteerOrders: migrated });
              return;
            } else if (firstVal && typeof firstVal === 'object' && ('batch2' in firstVal || 'batch3' in firstVal || 'batch4' in firstVal)) {
              // 新格式v2：多批次对象
              try {
                localStorage.setItem(VOLUNTEER_KEY_V2, JSON.stringify(volData));
              } catch {
                // ignore
              }
              resolve({ favorites, volunteerOrders: volData as Record<string, SchoolVolunteerOrders> });
              return;
            }
          }
          resolve({ favorites, volunteerOrders: {} });
        } else {
          reject(new Error('文件格式错误：应为配置对象或学校名称数组'));
        }
      } catch {
        reject(new Error('文件解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

const DEFAULT_CRITERIA: FilterCriteria = {
  keyword: '',
  batches: [],
  years: [],
  natures: [],
  districts: [],
  categories: [],
  scopes: [],
  minScore: null,
  maxScore: null,
  gradients: [],
  showFavoritesOnly: false,
  distinguishOutside: true,
  batch2Min: null,
  batch2Max: null,
  b3_2025_Min: null, b3_2025_Max: null,
  b3_2025_hujiLastMin: null, b3_2025_hujiLastMax: null,
  b3_2025_waiquMin: null, b3_2025_waiquMax: null,
  b3_2025_waiquLastMin: null, b3_2025_waiquLastMax: null,
  b3_2024_Min: null, b3_2024_Max: null,
  b3_2024_hujiLastMin: null, b3_2024_hujiLastMax: null,
  b3_2024_waiquMin: null, b3_2024_waiquMax: null,
  b3_2024_waiquLastMin: null, b3_2024_waiquLastMax: null,
  b3_2023_Min: null, b3_2023_Max: null,
  b3_2023_hujiLastMin: null, b3_2023_hujiLastMax: null,
  b3_2023_waiquMin: null, b3_2023_waiquMax: null,
  b3_2023_waiquLastMin: null, b3_2023_waiquLastMax: null,
  b4_2025_Min: null, b4_2025_Max: null,
  b4_2025_lastMin: null, b4_2025_lastMax: null,
  b4_2024_Min: null, b4_2024_Max: null,
  b4_2024_lastMin: null, b4_2024_lastMax: null,
  b4_2023_Min: null, b4_2023_Max: null,
  b4_2023_lastMin: null, b4_2023_lastMax: null,
  quota26Min: null,
  quota26Max: null,
  xieheSendMin: null,
  xieheSendMax: null,
};

function checkB3Field(rec: SchoolRecord, year: number, field: 'hujiMinScore' | 'hujiLastScore' | 'waiquMinScore' | 'waiquLastScore', minKey: keyof FilterCriteria, maxKey: keyof FilterCriteria, c: FilterCriteria): boolean {
  const r = rec.batch3Records.find(b => b.year === year);
  const val = r ? (r[field] as number | null) : null;
  const cmin = c[minKey] as number | null;
  const cmax = c[maxKey] as number | null;
  if (cmin !== null && (val === null || val < cmin)) return false;
  if (cmax !== null && (val === null || val > cmax)) return false;
  return true;
}

function checkB4Field(rec: SchoolRecord, year: number, field: 'minScore' | 'lastScore', minKey: keyof FilterCriteria, maxKey: keyof FilterCriteria, c: FilterCriteria): boolean {
  const r = rec.batch4Records.find(b => b.year === year);
  const val = r ? (r[field] as number | null) : null;
  const cmin = c[minKey] as number | null;
  const cmax = c[maxKey] as number | null;
  if (cmin !== null && (val === null || val < cmin)) return false;
  if (cmax !== null && (val === null || val > cmax)) return false;
  return true;
}

export function filterRecords(data: SchoolRecord[], criteria: Partial<FilterCriteria>): SchoolRecord[] {
  // 合并默认值，确保 undefined 被替换为 null
  const c: FilterCriteria = { ...DEFAULT_CRITERIA };
  for (const [key, val] of Object.entries(criteria)) {
    (c as any)[key] = val ?? null;
  }

  return data.filter(record => {
    if (c.keyword) {
      const orGroups = c.keyword
        .split(/[,，\n]+/)
        .map(g => g.trim())
        .filter(Boolean);
      const nameText = record.schoolName.toLowerCase();
      const codeText = record.schoolCode.toLowerCase();
      const matchAnyGroup = orGroups.some(group => {
        const andKeywords = group.split(/\s+/).filter(Boolean);
        return andKeywords.every(kw => nameText.includes(kw) || codeText.includes(kw));
      });
      if (!matchAnyGroup) return false;
    }

    if (c.natures.length > 0 && !c.natures.includes(record.schoolNature)) {
      return false;
    }

    if (c.districts.length > 0) {
      const LAOSANQU = ['荔湾区', '越秀区', '海珠区'];
      const hasLaosanqu = c.districts.includes('老三区');
      const selectedRealDistricts = c.districts.filter(d => d !== '老三区');
      const matchLaosanqu = hasLaosanqu && LAOSANQU.includes(record.locationDistrict);
      const matchReal = selectedRealDistricts.includes(record.locationDistrict);
      if (!matchLaosanqu && !matchReal) return false;
    }

    if (c.categories.length > 0 && !c.categories.includes(record.schoolCategory)) {
      return false;
    }

    if (c.gradients.length > 0 && !c.gradients.includes(record.gradient2025)) {
      return false;
    }

    if (c.showFavoritesOnly) {
      const favorites = getFavorites();
      if (!favorites.includes(record.schoolName)) return false;
    }

    if (c.batches.length > 0) {
      let hasMatch = false;
      if (c.batches.includes('三')) {
        hasMatch = hasMatch || record.batch3Records.length > 0;
      }
      if (c.batches.includes('四')) {
        hasMatch = hasMatch || record.batch4Records.length > 0;
      }
      if (c.batches.includes('二')) {
        hasMatch = hasMatch || (record.batch2Score2025 !== null && record.batch2Score2025 !== undefined);
      }
      if (!hasMatch) return false;
    }



    if (c.batch2Min !== null && (record.batch2Score2025 === null || record.batch2Score2025 < c.batch2Min)) return false;
    if (c.batch2Max !== null && (record.batch2Score2025 === null || record.batch2Score2025 > c.batch2Max)) return false;

    // 第三批 2025 四维度
    if (!checkB3Field(record, 2025, 'hujiMinScore', 'b3_2025_Min', 'b3_2025_Max', c)) return false;
    if (!checkB3Field(record, 2025, 'hujiLastScore', 'b3_2025_hujiLastMin', 'b3_2025_hujiLastMax', c)) return false;
    if (!checkB3Field(record, 2025, 'waiquMinScore', 'b3_2025_waiquMin', 'b3_2025_waiquMax', c)) return false;
    if (!checkB3Field(record, 2025, 'waiquLastScore', 'b3_2025_waiquLastMin', 'b3_2025_waiquLastMax', c)) return false;

    // 第三批 2024 四维度
    if (!checkB3Field(record, 2024, 'hujiMinScore', 'b3_2024_Min', 'b3_2024_Max', c)) return false;
    if (!checkB3Field(record, 2024, 'hujiLastScore', 'b3_2024_hujiLastMin', 'b3_2024_hujiLastMax', c)) return false;
    if (!checkB3Field(record, 2024, 'waiquMinScore', 'b3_2024_waiquMin', 'b3_2024_waiquMax', c)) return false;
    if (!checkB3Field(record, 2024, 'waiquLastScore', 'b3_2024_waiquLastMin', 'b3_2024_waiquLastMax', c)) return false;

    // 第三批 2023 四维度
    if (!checkB3Field(record, 2023, 'hujiMinScore', 'b3_2023_Min', 'b3_2023_Max', c)) return false;
    if (!checkB3Field(record, 2023, 'hujiLastScore', 'b3_2023_hujiLastMin', 'b3_2023_hujiLastMax', c)) return false;
    if (!checkB3Field(record, 2023, 'waiquMinScore', 'b3_2023_waiquMin', 'b3_2023_waiquMax', c)) return false;
    if (!checkB3Field(record, 2023, 'waiquLastScore', 'b3_2023_waiquLastMin', 'b3_2023_waiquLastMax', c)) return false;

    // 第四批 2025 (最低分 + 末位分)
    if (!checkB4Field(record, 2025, 'minScore', 'b4_2025_Min', 'b4_2025_Max', c)) return false;
    if (!checkB4Field(record, 2025, 'lastScore', 'b4_2025_lastMin', 'b4_2025_lastMax', c)) return false;

    // 第四批 2024
    if (!checkB4Field(record, 2024, 'minScore', 'b4_2024_Min', 'b4_2024_Max', c)) return false;
    if (!checkB4Field(record, 2024, 'lastScore', 'b4_2024_lastMin', 'b4_2024_lastMax', c)) return false;

    // 第四批 2023
    if (!checkB4Field(record, 2023, 'minScore', 'b4_2023_Min', 'b4_2023_Max', c)) return false;
    if (!checkB4Field(record, 2023, 'lastScore', 'b4_2023_lastMin', 'b4_2023_lastMax', c)) return false;

    if (c.quota26Min !== null || c.quota26Max !== null) {
      const q26 = record.xieheControlLine2026 ?? null;
      if (q26 === null) return false;
      if (c.quota26Min !== null && q26 < c.quota26Min) return false;
      if (c.quota26Max !== null && q26 > c.quota26Max) return false;
    }

    if (c.xieheSendMin !== null || c.xieheSendMax !== null) {
      if (!record.xieheSendingRecords || record.xieheSendingRecords.length === 0) return false;
      const sendScores = record.xieheSendingRecords
        .map(r => r.minScore)
        .filter((s): s is number => s !== null);
      if (sendScores.length === 0) return false;
      if (c.xieheSendMin !== null && Math.max(...sendScores) < c.xieheSendMin) return false;
      if (c.xieheSendMax !== null && Math.min(...sendScores) > c.xieheSendMax) return false;
    }

    return true;
  });
}

export function getUniqueValues(data: SchoolRecord[], field: keyof SchoolRecord): string[] {
  return [...new Set(data.map(r => r[field] as string).filter(Boolean))].sort();
}

export function getAllDistricts(data: SchoolRecord[]): string[] {
  return getUniqueValues(data, 'locationDistrict');
}

export function getAllNatures(data: SchoolRecord[]): string[] {
  return getUniqueValues(data, 'schoolNature');
}

export function getAllCategories(data: SchoolRecord[]): string[] {
  return getUniqueValues(data, 'schoolCategory');
}

export function getAllScopes(data: SchoolRecord[]): string[] {
  const scopes = new Set<string>();
  data.forEach(r => {
    r.batch3Records.forEach(s => { if (s.scope) scopes.add(s.scope); });
    r.batch4Records.forEach(s => { if (s.scope) scopes.add(s.scope); });
  });
  return [...scopes].sort();
}

export function getAllGradients(data: SchoolRecord[]): string[] {
  return getUniqueValues(data, 'gradient2025').filter(g => g && g !== '-');
}
