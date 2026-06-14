import type { SchoolRecord } from '../types';

export interface B3FieldResult {
  value: number | null;
  masked: boolean;
}

const LAOSANQU = ['荔湾区', '越秀区', '海珠区'];

export function isLaosanqu(district: string): boolean {
  return LAOSANQU.includes(district);
}

export function getB3Field(r: SchoolRecord, year: number, sub: string, distinguishOutside = true): B3FieldResult {
  const rec = r.batch3Records.find(x => x.year === year);
  if (!rec) return { value: null, masked: false };

  // 区分外区逻辑：老三区学校屏蔽外区字段，其它区学校屏蔽户类字段
  let masked = false;
  if (distinguishOutside) {
    const isLsq = isLaosanqu(r.locationDistrict);
    if (isLsq && sub.startsWith('waiqu')) masked = true;
    if (!isLsq && sub.startsWith('huji')) masked = true;
  }

  let val: number | null = null;
  switch (sub) {
    case 'hujiMin': val = rec.hujiMinScore; break;
    case 'hujiLast': val = rec.hujiLastScore; break;
    case 'hujiLastVol': val = rec.hujiLastVolunteerOrder; break;
    case 'waiquMin': val = rec.waiquMinScore; break;
    case 'waiquLast': val = rec.waiquLastScore; break;
    case 'waiquLastVol': val = rec.waiquLastVolunteerOrder; break;
  }
  return { value: val, masked };
}

export function getB4Field(r: SchoolRecord, year: number, sub: string): number | null {
  const rec = r.batch4Records.find(x => x.year === year);
  if (!rec) return null;
  switch (sub) {
    case 'min': return rec.minScore;
    case 'last': return rec.lastScore;
    case 'lastVol': return rec.lastVolunteerOrder;
    default: return null;
  }
}
