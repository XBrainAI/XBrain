import { describe, it, expect, beforeAll } from 'vitest';
import { mergeAllData } from '../utils/dataMerger';
import { filterRecords } from '../utils/filterEngine';
import type { SchoolRecord } from '../types';

describe('数据源吻合性验证 - 查询结果与原始数据交叉校验', () => {
  let allData: SchoolRecord[];

  beforeAll(() => {
    allData = mergeAllData();
  });

  // ============================================================
  // 1. 基础信息字段值验证（来自学校库.md）
  // ============================================================
  describe('1. 基础信息 - 学校库字段值精确匹配', () => {
    it('总记录数应在合理范围 [100, 300]', () => {
      expect(allData.length).toBeGreaterThanOrEqual(100);
      expect(allData.length).toBeLessThanOrEqual(300);
    });

    it('每条记录必须包含 schoolName', () => {
      for (const r of allData) {
        expect(r.schoolName).toBeTruthy();
      }
    });

    it('schoolName 不应重复', () => {
      const names = allData.map(r => r.schoolName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    const knownSchools: Record<string, {
      nature: string;
      district: string;
      batches: string;
      gradient?: string;
    }> = {
      '华南师范大学附属中学（石牌校区）': { nature: '公办', district: '天河区', batches: '第二批、第三批' },
      '广东实验中学（荔湾校区）': { nature: '公办', district: '荔湾区', batches: '第二批、第三批' },
      '广州市第二中学': { nature: '公办', district: '黄埔区', batches: '第二批、第三批' },
      '广州协和学校': { nature: '公办', district: '荔湾区', batches: '第二批、第三批' },
      '广东华侨中学': { nature: '公办', district: '越秀区', batches: '第三批' },
      '广州市西关培英中学': { nature: '公办', district: '荔湾区', batches: '第四批' },
      '博罗县东江广雅学校有限公司': { nature: '公办', district: '', batches: '' },
    };

    for (const [name, expected] of Object.entries(knownSchools)) {
      it(`${name}: 性质=${expected.nature}, 区域=${expected.district}, 批次=${expected.batches}`, () => {
        const r = allData.find(s => s.schoolName === name);
        expect(r).toBeDefined();
        if (!r) return;
        expect(r.schoolNature).toBe(expected.nature);
        expect(r.locationDistrict).toBe(expected.district);
        expect(r.admissionBatches).toBe(expected.batches);
        if (expected.gradient) {
          expect(r.gradient2025).toBe(expected.gradient);
        }
      });
    }

    it('民办学校的 schoolCategory 应包含"高中"', () => {
      const minban = allData.filter(r => r.schoolNature === '民办');
      expect(minban.length).toBeGreaterThan(0);
      for (const r of minban) {
        expect(r.schoolCategory).toContain('高中');
      }
    });
  });

  // ============================================================
  // 2. 第三批(统招)分数数据 - 与RAW_BATCH3逐行对照
  // ============================================================
  describe('2. 第三批(统招)分数 - 原始数据逐值校验', () => {
    const b3GroundTruth: Record<string, {
      year: number;
      hujiMin: number | null;
      hujiLast: number | null;
      waiquMin: number | null;
      waiquLast: number | null;
    }[]> = {
      '华南师范大学附属中学（石牌校区）': [
        { year: 2025, hujiMin: 740, hujiLast: 740, waiquMin: null, waiquLast: null },
      ],
      '华南师范大学附属中学（知识城校区）': [
        { year: 2025, hujiMin: 727, hujiLast: 727, waiquMin: null, waiquLast: null },
      ],
      '广东实验中学（荔湾校区）': [
        { year: 2025, hujiMin: 727, hujiLast: 727, waiquMin: null, waiquLast: null },
      ],
      '广东实验中学（白云校区）': [
        { year: 2025, hujiMin: 729, hujiLast: 729, waiquMin: null, waiquLast: null },
      ],
      '广州市第一中学': [
        { year: 2025, hujiMin: 628, hujiLast: 655, waiquMin: 633, waiquLast: 633 },
      ],
      '广州市第四中学': [
        { year: 2025, hujiMin: 627, hujiLast: 644, waiquMin: 627, waiquLast: 648 },
      ],
      '广州外国语学校': [
        { year: 2025, hujiMin: 700, hujiLast: 700, waiquMin: null, waiquLast: null },
      ],
      '广州市真光中学（校本部）': [
        { year: 2025, hujiMin: 689, hujiLast: 689, waiquMin: 689, waiquLast: 689 },
      ],
      '广州市铁一中学（白云校区）': [
        { year: 2025, hujiMin: 707, hujiLast: 716, waiquMin: null, waiquLast: null },
      ],
      '广州市第六中学（花都校区）': [
        { year: 2025, hujiMin: 667, hujiLast: 698, waiquMin: null, waiquLast: null },
      ],
      '广东华侨中学': [
        { year: 2025, hujiMin: 627, hujiLast: 665, waiquMin: null, waiquLast: null },
      ],
      '广州协和学校': [
        { year: 2025, hujiMin: 667, hujiLast: 687, waiquMin: null, waiquLast: null },
      ],
    };

    for (const [schoolName, years] of Object.entries(b3GroundTruth)) {
      describe(`${schoolName}`, () => {
        for (const y of years) {
          it(`第三批${y.year}年: 户籍最低=${y.hujiMin}, 户籍末位=${y.hujiLast}, 外区最低=${y.waiquMin}, 外区末位=${y.waiquLast}`, () => {
            const r = allData.find(s => s.schoolName === schoolName);
            expect(r).toBeDefined();
            if (!r) return;

            const b3 = r.batch3Records.find(b => b.year === y.year);
            expect(b3, `缺少第三批${y.year}年数据`).toBeDefined();
            if (!b3) return;

            expect(b3.hujiMinScore).toBe(y.hujiMin);
            expect(b3.hujiLastScore).toBe(y.hujiLast);
            expect(b3.waiquMinScore).toBe(y.waiquMin);
            expect(b3.waiquLastScore).toBe(y.waiquLast);
          });
        }
      });
    }

    it('有外区数据的学校，外区分应在合理范围内 (>400)', () => {
      for (const r of allData) {
        for (const b3 of r.batch3Records) {
          if (b3.waiquMinScore !== null && b3.hujiMinScore !== null) {
            expect(b3.waiquMinScore).toBeGreaterThan(400);
          }
        }
      }
    });
  });

  // ============================================================
  // 3. 第四批(常规兜底)分数数据 - 与RAW_BATCH4逐行对照
  // ============================================================
  describe('3. 第四批(常规兜底)分数 - 原始数据逐值校验', () => {
    const b4GroundTruth: Record<string, {
      year: number;
      min: number | null;
      last: number | null;
    }[]> = {
      '广州市西关培英中学': [
        { year: 2025, min: 604, last: 604 },
        { year: 2024, min: 608, last: 608 },
        { year: 2023, min: 627, last: 627 },
      ],
      '广州市第十三中学': [
        { year: 2025, min: 616, last: 616 },
        { year: 2024, min: 636, last: 636 },
        { year: 2023, min: 630, last: 630 },
      ],
      '广州市第六十六中学': [
        { year: 2025, min: 564, last: 564 },
        { year: 2024, min: 554, last: 554 },
        { year: 2023, min: 565, last: 565 },
      ],
      '广州石化中学': [
        { year: 2025, min: 586, last: 586 },
        { year: 2024, min: 570, last: 570 },
        { year: 2023, min: 573, last: 573 },
      ],
      '广州市为明学校': [
        { year: 2025, min: 547, last: 574 },
        { year: 2024, min: 587, last: 587 },
        { year: 2023, min: 596, last: 602 },
      ],
      '广州市爱莎文华高中有限公司': [
        { year: 2025, min: 498, last: 498 },
        { year: 2024, min: 508, last: 534 },
        { year: 2023, min: 551, last: 551 },
      ],
    };

    for (const [schoolName, years] of Object.entries(b4GroundTruth)) {
      describe(`${schoolName}`, () => {
        for (const y of years) {
          it(`第四批${y.year}年: 最低=${y.min}, 末位=${y.last}`, () => {
            const r = allData.find(s => s.schoolName === schoolName);
            expect(r).toBeDefined();
            if (!r) return;

            const b4 = r.batch4Records.find(b => b.year === y.year);
            expect(b4, `缺少第四批${y.year}年数据`).toBeDefined();
            if (!b4) return;

            expect(b4.minScore).toBe(y.min);
            expect(b4.lastScore).toBe(y.last);
          });
        }
      });
    }

    it('仅第四批的学校不应有第三批数据', () => {
      const batch4Only = ['广州市西关培英中学', '广州市第十三中学', '广州市第六十六中学'];
      for (const name of batch4Only) {
        const r = allData.find(s => s.schoolName === name);
        expect(r).toBeDefined();
        if (r) {
          expect(r.batch3Records.length).toBe(0);
          expect(r.batch4Records.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================================
  // 4. 名额分配控制线26 - 与官方控制线文件对照
  // ============================================================
  describe('4. 第二批控制线26 - 协和名额分配录取线', () => {
    it('有控制线的学校数量应在 [1, 20] 范围', () => {
      const withLine = allData.filter(r => r.xieheControlLine2026 != null);
      expect(withLine.length).toBeGreaterThanOrEqual(1);
      expect(withLine.length).toBeLessThanOrEqual(20);
    });

    it('控制线26 应在合理分数区间 [200, 750]', () => {
      for (const r of allData) {
        if (r.xieheControlLine2026 != null) {
          expect(r.xieheControlLine2026).toBeGreaterThanOrEqual(200);
          expect(r.xieheControlLine2026).toBeLessThanOrEqual(750);
        }
      }
    });
  });

  // ============================================================
  // 5. 近两年控制线对比 - 内部一致性验证
  // ============================================================
  describe('5. 近两年控制线对比(25vs26) - 字段间一致性', () => {
    it('有对比数据的学校，controlLine2025 + changeValue = controlLine2026', () => {
      for (const r of allData) {
        if (r.quotaCompare2526 && r.xieheControlLine2026 != null) {
          const expected = r.quotaCompare2526.controlLine2025 + r.quotaCompare2526.changeValue;
          expect(r.xieheControlLine2026).toBe(expected);
        }
      }
    });

    it('changeRate 约等于 changeValue / controlLine2025 * 100 (误差<0.01)', () => {
      for (const r of allData) {
        if (r.quotaCompare2526 && r.quotaCompare2526.controlLine2025 !== 0) {
          const expectedRate = (r.quotaCompare2526.changeValue / r.quotaCompare2526.controlLine2025) * 100;
          expect(Math.abs(r.quotaCompare2526.changeRate - expectedRate)).toBeLessThan(0.01);
        }
      }
    });
  });

  // ============================================================
  // 6. 筛选引擎多场景验证
  // ============================================================
  describe('6. 筛选引擎 - 多维度组合筛选正确性', () => {
    describe('6.1 关键词搜索', () => {
      it('搜"执信"应返回执信中学所有校区', () => {
        const result = filterRecords(allData, { keyword: '执信' });
        expect(result.length).toBeGreaterThanOrEqual(2);
        for (const r of result) {
          expect(r.schoolName).toContain('执信');
        }
      });

      it('搜"附中"应返回含"附中"的学校', () => {
        const result = filterRecords(allData, { keyword: '附中' });
        expect(result.length).toBeGreaterThanOrEqual(1);
        for (const r of result) {
          expect(r.schoolName).toContain('附中');
        }
      });

      it('OR分组：逗号分隔返回任一匹配', () => {
        const result = filterRecords(allData, { keyword: '执信,二中' });
        expect(result.length).toBeGreaterThanOrEqual(2);
        for (const r of result) {
          const match = r.schoolName.includes('执信') || r.schoolName.includes('二中');
          expect(match).toBe(true);
        }
      });

      it('AND组合：空格分隔需同时包含所有词', () => {
        const result = filterRecords(allData, { keyword: '实验 中学' });
        for (const r of result) {
          expect(r.schoolName).toContain('实验');
          expect(r.schoolName).toContain('中学');
        }
      });

      it('空关键词应返回全部数据', () => {
        const result = filterRecords(allData, { keyword: '' });
        expect(result.length).toBe(allData.length);
      });
    });

    describe('6.2 学校性质筛选', () => {
      it('筛选"公办"应只返回公办学校', () => {
        const result = filterRecords(allData, { natures: ['公办'] });
        expect(result.length).toBeGreaterThan(50);
        for (const r of result) {
          expect(r.schoolNature).toBe('公办');
        }
      });

      it('筛选"民办"应只返回民办学校', () => {
        const result = filterRecords(allData, { natures: ['民办'] });
        expect(result.length).toBeGreaterThan(0);
        for (const r of result) {
          expect(r.schoolNature).toBe('民办');
        }
      });
    });

    describe('6.3 录取批次筛选（使用原始数据中的批次名）', () => {
      it('筛选"第三批"应有结果', () => {
        const result = filterRecords(allData, { batches: ['第三批'] });
        expect(result.length).toBeGreaterThan(80);
      });

      it('筛选"第四批"应有结果', () => {
        const result = filterRecords(allData, { batches: ['第四批'] });
        expect(result.length).toBeGreaterThan(5);
      });

      it('筛选不存在的批次应返回空', () => {
        const result = filterRecords(allData, { batches: ['第一批'] });
        expect(result.length).toBe(0);
      });
    });

    describe('6.4 分数区间筛选 - 第二批(名额分配)', () => {
      it('batch2Min=720 + batch2Max=740 应精确匹配', () => {
        const result = filterRecords(allData, { batch2Min: 720, batch2Max: 740 });
        for (const r of result) {
          expect(r.batch2Score2025).not.toBeNull();
          expect(r.batch2Score2025!).toBeGreaterThanOrEqual(720);
          expect(r.batch2Score2025!).toBeLessThanOrEqual(740);
        }
      });

      it('无第二批数据的学校不应被命中', () => {
        const noBatch2 = allData.filter(r => r.batch2Score2025 === null);
        if (noBatch2.length > 0) {
          const hit = filterRecords(allData, { batch2Min: 500 });
          const hitNames = hit.map(h => h.schoolName);
          for (const r of noBatch2) {
            expect(hitNames).not.toContain(r.schoolName);
          }
        }
      });
    });

    describe('6.5 分数区间筛选 - 第三批(统招)各维度', () => {
      it('b3_2025_Min=730 应只返回户籍最低>=730', () => {
        const result = filterRecords(allData, { b3_2025_Min: 730 });
        expect(result.length).toBeGreaterThanOrEqual(1);
        for (const r of result) {
          const b3 = r.batch3Records.find(x => x.year === 2025);
          expect(b3).toBeDefined();
          expect(b3!.hujiMinScore).toBeGreaterThanOrEqual(730);
        }
      });

      it('b3_2025_hujiLastMin=690 应只返回户籍末位>=690', () => {
        const result = filterRecords(allData, { b3_2025_hujiLastMin: 690 });
        for (const r of result) {
          const b3 = r.batch3Records.find(x => x.year === 2025);
          if (b3) expect(b3.hujiLastScore!).toBeGreaterThanOrEqual(690);
        }
      });

      it('b3_2025_waiquMin=680 应只返回外区最低>=680', () => {
        const result = filterRecords(allData, { b3_2025_waiquMin: 680 });
        for (const r of result) {
          const b3 = r.batch3Records.find(x => x.year === 2025);
          if (b3 && b3.waiquMinScore != null) {
            expect(b3.waiquMinScore).toBeGreaterThanOrEqual(680);
          }
        }
      });

      it('b3_2024_Max=650 应只返回24年户籍最低<=650', () => {
        const result = filterRecords(allData, { b3_2024_Max: 650 });
        for (const r of result) {
          const b3 = r.batch3Records.find(x => x.year === 2024);
          if (b3) expect(b3.hujiMinScore!).toBeLessThanOrEqual(650);
        }
      });

      it('b3_2023_waiquLastMax=600 应只返回23年外区末位<=600', () => {
        const result = filterRecords(allData, { b3_2023_waiquLastMax: 600 });
        for (const r of result) {
          const b3 = r.batch3Records.find(x => x.year === 2023);
          if (b3 && b3.waiquLastScore != null) {
            expect(b3.waiquLastScore).toBeLessThanOrEqual(600);
          }
        }
      });
    });

    describe('6.6 分数区间筛选 - 第四批(常规兜底)', () => {
      it('b4_2025_Min=600 应只返回25年四批最低>=600', () => {
        const result = filterRecords(allData, { b4_2025_Min: 600 });
        for (const r of result) {
          const b4 = r.batch4Records.find(x => x.year === 2025);
          expect(b4).toBeDefined();
          expect(b4!.minScore).toBeGreaterThanOrEqual(600);
        }
      });

      it('b4_2024_lastMax=620 应只返回24年四批末位<=620', () => {
        const result = filterRecords(allData, { b4_2024_lastMax: 620 });
        for (const r of result) {
          const b4 = r.batch4Records.find(x => x.year === 2024);
          if (b4) expect(b4.lastScore!).toBeLessThanOrEqual(620);
        }
      });

      it('b4_2023_Min=550 + b4_2023_Max=580 应精确匹配区间', () => {
        const result = filterRecords(allData, { b4_2023_Min: 550, b4_2023_Max: 580 });
        for (const r of result) {
          const b4 = r.batch4Records.find(x => x.year === 2023);
          expect(b4!.minScore).toBeGreaterThanOrEqual(550);
          expect(b4!.minScore).toBeLessThanOrEqual(580);
        }
      });
    });

    describe('6.7 控制线26筛选', () => {
      it('quota26Min=280 应只返回控制线>=280', () => {
        const result = filterRecords(allData, { quota26Min: 280 });
        for (const r of result) {
          expect(r.xieheControlLine2026).not.toBeNull();
          expect(r.xieheControlLine2026!).toBeGreaterThanOrEqual(280);
        }
      });

      it('quota26Max=320 应只返回控制线<=320', () => {
        const result = filterRecords(allData, { quota26Max: 320 });
        for (const r of result) {
          expect(r.xieheControlLine2026!).toBeLessThanOrEqual(320);
        }
      });
    });

    describe('6.8 多条件AND组合筛选', () => {
      it('公办+天河区+第三批>=700 应返回天河头部公办', () => {
        const result = filterRecords(allData, {
          natures: ['公办'],
          districts: ['天河区'],
          b3_2025_Min: 700,
        });
        expect(result.length).toBeGreaterThan(0);
        for (const r of result) {
          expect(r.schoolNature).toBe('公办');
          expect(r.locationDistrict).toBe('天河区');
          const b3 = r.batch3Records.find(x => x.year === 2025);
          expect(b3!.hujiMinScore).toBeGreaterThanOrEqual(700);
        }
      });

      it('民办+第四批>=500 组合筛选', () => {
        const result = filterRecords(allData, {
          natures: ['民办'],
          b4_2025_Min: 500,
        });
        expect(result.length).toBeGreaterThan(0);
        for (const r of result) {
          expect(r.schoolNature).toBe('民办');
          const b4 = r.batch4Records.find(x => x.year === 2025);
          expect(b4!.minScore).toBeGreaterThanOrEqual(500);
        }
      });

      it('关键词+性质+梯度 三重组合', () => {
        const result = filterRecords(allData, {
          keyword: '中学',
          natures: ['公办'],
          gradients: ['第一梯度'],
        });
        expect(result.length).toBeGreaterThan(0);
        for (const r of result) {
          expect(r.schoolName).toContain('中学');
          expect(r.schoolNature).toBe('公办');
          expect(['第一梯度']).toContain(r.gradient2025);
        }
      });
    });
  });

  // ============================================================
  // 7. 排序功能验证
  // ============================================================
  describe('7. 排序功能 - 各字段排序正确性', () => {
    function sortField(data: SchoolRecord[], field: string, dir: 'asc' | 'desc'): SchoolRecord[] {
      return [...data].sort((a, b) => {
        let va: any, vb: any;
        switch (field) {
          case 'schoolName':
            va = a.schoolName; vb = b.schoolName; break;
          case 'gradient2025':
            va = a.gradient2025; vb = b.gradient2025; break;
          case 'xieheQuota26':
            va = a.xieheControlLine2026 ?? Infinity; vb = b.xieheControlLine2026 ?? Infinity; break;
          case 'batch2Score2025':
            va = a.batch2Score2025 ?? Infinity; vb = b.batch2Score2025 ?? Infinity; break;
          default:
            if (field.startsWith('b3_')) {
              const yearMatch = field.match(/b3_(\d{4})/);
              const subMatch = field.match(/hujiMin|hujiLast|waiquMin|waiquLast/);
              if (yearMatch && subMatch) {
                const yr = parseInt(yearMatch[1], 10);
                const ba = a.batch3Records.find(x => x.year === yr);
                const bb = b.batch3Records.find(x => x.year === yr);
                const sk = (subMatch[0] === 'hujiMin' ? 'hujiMinScore' : subMatch[0] === 'hujiLast' ? 'hujiLastScore' : subMatch[0] === 'waiquMin' ? 'waiquMinScore' : 'waiquLastScore') as keyof typeof ba;
                va = ba?.[sk] ?? Infinity; vb = bb?.[sk] ?? Infinity;
              }
            } else if (field.startsWith('b4_')) {
              const yearMatch = field.match(/b4_(\d{4})/);
              const isLast = field.includes('last');
              if (yearMatch) {
                const yr = parseInt(yearMatch[1], 10);
                const ba = a.batch4Records.find(x => x.year === yr);
                const bb = b.batch4Records.find(x => x.year === yr);
                va = ba?.[isLast ? 'lastScore' : 'minScore'] ?? Infinity;
                vb = bb?.[isLast ? 'lastScore' : 'minScore'] ?? Infinity;
              }
            }
            break;
        }
        if (va == null) va = Infinity;
        if (vb == null) vb = Infinity;
        if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return dir === 'asc' ? va - vb : vb - va;
      });
    }

    it('按学校名称升序排列（排除空名称）', () => {
      const validData = allData.filter(r => r.schoolName);
      const sorted = sortField(validData, 'schoolName', 'asc');
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].schoolName.localeCompare(sorted[i - 1].schoolName, 'zh-CN')).toBeGreaterThanOrEqual(0);
      }
    });

    it('按第三批25户籍最低分降序', () => {
      const hasB3 = allData.filter(r => r.batch3Records.some(b => b.year === 2025 && b.hujiMinScore != null));
      const sorted = sortField(hasB3, 'b3_2025hujiMin', 'desc');
      for (let i = 1; i < Math.min(sorted.length, 20); i++) {
        const prev = sorted[i - 1].batch3Records.find(b => b.year === 2025)!.hujiMinScore!;
        const curr = sorted[i].batch3Records.find(b => b.year === 2025)!.hujiMinScore!;
        expect(curr <= prev).toBe(true);
      }
    });

    it('按控制线26升序（null排最后）', () => {
      const sorted = sortField(allData, 'xieheQuota26', 'asc');
      let sawNull = false;
      for (const r of sorted) {
        if (r.xieheControlLine2026 === null) {
          sawNull = true;
        } else {
          expect(sawNull).toBe(false);
        }
      }
    });
  });

  // ============================================================
  // 8. 边界情况与异常处理
  // ============================================================
  describe('8. 边界情况与数据完整性', () => {
    it('全空筛选条件应返回全部数据', () => {
      const result = filterRecords(allData, {});
      expect(result.length).toBe(allData.length);
    });

    it('不可能的分数区间应返回空集', () => {
      const result = filterRecords(allData, { b3_2025_Min: 800, b3_2025_Max: 800 });
      expect(result.length).toBe(0);
    });

    it('min > max 的区间应返回空集', () => {
      const result = filterRecords(allData, { batch2Min: 750, batch2Max: 700 });
      expect(result.length).toBe(0);
    });

    it('梯度筛选值不在选项列表中应返回空集', () => {
      const result = filterRecords(allData, { gradients: ['第八梯度'] });
      expect(result.length).toBe(0);
    });

    it('补录数据的差值 = 补录分数 - 正常分数', () => {
      for (const r of allData) {
        if (r.makeupScore && r.makeupScore.normalScore != null && r.makeupScore.diff != null) {
          const expectedDiff = r.makeupScore.makeupScore - r.makeupScore.normalScore;
          expect(r.makeupScore.diff).toBe(expectedDiff);
        }
      }
    });
  });

  // ============================================================
  // 9. 数据统计汇总验证
  // ============================================================
  describe('9. 数据统计汇总 - 总量级合理性', () => {
    it('公办学校数量应大于民办', () => {
      const gongban = allData.filter(r => r.schoolNature === '公办').length;
      const minban = allData.filter(r => r.schoolNature === '民办').length;
      expect(gongban).toBeGreaterThan(minban);
    });

    it('有第三批数据的学校应占大多数', () => {
      const withB3 = allData.filter(r => r.batch3Records.length > 0).length;
      expect(withB3).toBeGreaterThan(allData.length * 0.7);
    });

    it('有第四批数据的学校数量合理', () => {
      const withB4 = allData.filter(r => r.batch4Records.length > 0).length;
      expect(withB4).toBeGreaterThan(5);
      expect(withB4).toBeLessThan(allData.length);
    });

    it('各区均有学校分布', () => {
      const districts = new Set(allData.map(r => r.locationDistrict));
      const expectedDistricts = ['越秀区', '荔湾区', '海珠区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'];
      for (const d of expectedDistricts) {
        expect(districts.has(d)).toBe(true);
      }
    });

    it('梯度分布应符合金字塔结构（越高梯度学校越少）', () => {
      const gradientCounts: Record<string, number> = {};
      for (const r of allData) {
        const g = r.gradient2025;
        if (g) {
          gradientCounts[g] = (gradientCounts[g] || 0) + 1;
        }
      }
      if (gradientCounts['第一梯度'] && gradientCounts['第二梯度']) {
        expect(gradientCounts['第一梯度']).toBeLessThan(gradientCounts['第二梯度']);
      }
      if (gradientCounts['第二梯度'] && gradientCounts['第三梯度']) {
        expect(gradientCounts['第二梯度']).toBeLessThanOrEqual(gradientCounts['第三梯度']);
      }
    });
  });
});
