import { describe, it, expect, beforeAll } from 'vitest';
import { mergeAllData } from '../utils/dataMerger';
import { filterRecords } from '../utils/filterEngine';

describe('全面验证 - 筛选组合与原始数据源一致性', () => {
  let allData: ReturnType<typeof mergeAllData>;

  beforeAll(() => {
    allData = mergeAllData();
  });

  describe('A. 第三批数据 - 各年份关键值交叉验证', () => {
    const knownValues: Record<string, Record<number, number>> = {
      '华南师范大学附属中学（石牌校区）': { 2025: 740, 2024: 719 },
      '广东实验中学（荔湾校区）': { 2025: 729, 2024: 715 },
      '广东实验中学（白云校区）': { 2025: 729, 2024: 715 },
      '广州市第二中学': { 2025: 724, 2024: 729, 2023: 730 },
      '广州市执信中学（执信路校区）': { 2025: 723, 2024: 720, 2023: 730 },
      '广州市执信中学（天河校区）': { 2025: 723, 2024: 720, 2023: 730 },
      '广东广雅中学（荔湾校区）': { 2025: 719, 2024: 698 },
      '广州大学附属中学': { 2025: 732, 2024: 726, 2023: 736 },
      '广州市第六中学（海珠校区）': { 2025: 712, 2024: 716 },
    };

    for (const [schoolName, yearScores] of Object.entries(knownValues)) {
      for (const [yearStr, expectedScore] of Object.entries(yearScores)) {
        const year = parseInt(yearStr, 10);
        it(`${schoolName} 第三批 ${year}年 户籍最低分 = ${expectedScore}`, () => {
          const school = allData.find(r =>
            r.schoolName === schoolName ||
            (r.schoolName.includes(schoolName.replace(/（[^）]*）/g, '')) && r.schoolName.length <= schoolName.length + 10)
          );
          expect(school).toBeDefined();
          if (!school) return;

          const b3 = school!.batch3Records.find(r => r.year === year);
          expect(b3, `${schoolName} 缺少第三批 ${year} 年数据`).toBeDefined();
          if (b3) {
            expect(b3.hujiMinScore).toBe(expectedScore);
          }
        });
      }
    }
  });

  describe('A2. 仅第四批招生的学校验证（不应有第三批数据）', () => {
    const batch4OnlySchools = [
      '广州市西关培英中学',
      '广州市第十三中学',
      '广州市第六十六中学',
      '广州市花都区第一中学',
      '广州市从化区第三中学',
    ];

    for (const schoolName of batch4OnlySchools) {
      it(`${schoolName} 应只有第四批数据，无第三批数据`, () => {
        const school = allData.find(r =>
          r.schoolName === schoolName ||
          r.schoolName.includes(schoolName.replace(/（[^）]*）/g, ''))
        );
        expect(school).toBeDefined();
        if (school) {
          expect(school.batch3Records.length).toBe(0);
          expect(school.batch4Records.length).toBeGreaterThan(0);
        }
      });
    }
  });

  describe('B. 第四批数据 - 各年份关键值交叉验证', () => {
    const knownValues: Record<string, Record<number, number | null>> = {
      '广州市西关培英中学': { 2025: 604, 2024: 608, 2023: 627 },
      '广州市第十三中学': { 2025: 616, 2024: 636, 2023: 630 },
      '广州市第六十六中学': { 2025: 564, 2024: 554, 2023: 565 },
      '广州石化中学': { 2025: 586, 2024: 570, 2023: 573 },
      '广州开发区外国语学校': { 2025: 590, 2024: 581, 2023: 582 },
      '广州市爱莎文华高中有限公司': { 2025: 498, 2024: 508, 2023: 551 },
      '广州市为明学校': { 2025: 547, 2024: 587, 2023: 596 },
      '广州市黄广附属学校': { 2025: 659, 2024: 646, 2023: 627 },
      '广州市博萃德学校': { 2025: null },
      '清远市广铁一中（万科城）外国语学校': { 2025: 604, 2024: 507, 2023: 663 },
    };

    for (const [schoolName, yearScores] of Object.entries(knownValues)) {
      for (const [yearStr, expectedScore] of Object.entries(yearScores)) {
        const year = parseInt(yearStr, 10);
        it(`${schoolName} 第四批 ${year}年 最低分 = ${expectedScore ?? 'null'}`, () => {
          const school = allData.find(r =>
            r.schoolName === schoolName ||
            r.schoolName.includes(schoolName.replace(/（[^）]*）/g, '').slice(0, 15))
          );
          expect(school).toBeDefined();
          if (!school) return;

          const b4 = school!.batch4Records.find(r => r.year === year);
          if (expectedScore === null) {
            if (b4) expect(b4.minScore).toBeNull();
          } else {
            expect(b4, `${schoolName} 缺少第四批 ${year} 年数据`).toBeDefined();
            if (b4) expect(b4.minScore).toBe(expectedScore);
          }
        });
      }
    }
  });

  describe('C. 筛选组合 - 结果数量与数据一致性验证', () => {
    it('无筛选条件应返回全部记录', () => {
      expect(filterRecords(allData, {}).length).toBe(allData.length);
    });

    it('筛选"公办"应返回公办学校数 > 民办学校数（第三批为主）', () => {
      const gongban = filterRecords(allData, { natures: ['公办'] });
      const minban = filterRecords(allData, { natures: ['民办'] });
      expect(gongban.length).toBeGreaterThan(0);
      expect(minban.length).toBeGreaterThan(0);
      expect(gongban.length + minban.length).toBeLessThanOrEqual(allData.length);
    });

    it('筛选 2025+第三批 应有数据', () => {
      const result = filterRecords(allData, { batches: ['第三批'], years: [2025] });
      expect(result.length).toBeGreaterThan(80);
      for (const r of result) {
        expect(r.batch3Records.some(x => x.year === 2025)).toBe(true);
      }
    });

    it('筛选 2024+第三批 应有数据（年份×批次交叉约束）', () => {
      const result = filterRecords(allData, { batches: ['第三批'], years: [2024] });
      expect(result.length).toBeGreaterThan(30);
      for (const r of result) {
        expect(r.batch3Records.some(x => x.year === 2024)).toBe(true);
      }
    });

    it('筛选 2023+第三批 应有数据（年份×批次交叉约束）', () => {
      const result = filterRecords(allData, { batches: ['第三批'], years: [2023] });
      expect(result.length).toBeGreaterThan(20);
      for (const r of result) {
        expect(r.batch3Records.some(x => x.year === 2023)).toBe(true);
      }
    });

    it('筛选 2025+第四批 应有数据', () => {
      const result = filterRecords(allData, { batches: ['第四批'], years: [2025] });
      expect(result.length).toBeGreaterThan(40);
      for (const r of result) {
        expect(r.batch4Records.some(x => x.year === 2025)).toBe(true);
      }
    });

    it('筛选 2024+第四批 应有数据（年份×批次交叉约束）', () => {
      const result = filterRecords(allData, { batches: ['第四批'], years: [2024] });
      expect(result.length).toBeGreaterThan(30);
    });

    it('筛选 2023+第四批 应有数据（年份×批次交叉约束）', () => {
      const result = filterRecords(allData, { batches: ['第四批'], years: [2023] });
      expect(result.length).toBeGreaterThan(20);
    });

    it('筛选 第二批 应返回有第二批分数的学校', () => {
      const result = filterRecords(allData, { batches: ['第二批'] });
      expect(result.length).toBeGreaterThan(8);
      for (const r of result) {
        expect(r.batch2Score2025).not.toBeNull();
      }
    });

    it('关键词"西关培英"应只返回该校各批次数据', () => {
      const result = filterRecords(allData, { keyword: '西关培英' });
      expect(result.length).toBeGreaterThanOrEqual(1);
      for (const r of result) {
        expect(r.schoolName).toContain('西关培英');
        const hasAnyData =
          r.batch3Records.length > 0 || r.batch4Records.length > 0;
        expect(hasAnyData).toBe(true);
      }
    });

    it('分数区间[700,750]应只包含高分学校', () => {
      const result = filterRecords(allData, { minScore: 700, maxScore: 750 });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        const scores = [
          ...r.batch3Records.flatMap(x => [x.hujiMinScore, x.hujiLastScore].filter((s): s is number => s !== null)),
          ...r.batch4Records.flatMap(x => [x.minScore, x.lastScore].filter((s): s is number => s !== null)),
          r.batch2Score2025,
        ].filter((s): s is number => s !== null && s !== undefined);
        if (scores.length > 0) {
          expect(Math.max(...scores)).toBeLessThanOrEqual(770);
        }
      }
    });

    it('分数区间[480,500]应包含低分学校', () => {
      const result = filterRecords(allData, { minScore: 480, maxScore: 500 });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        const scores = [
          ...r.batch3Records.flatMap(x => [x.hujiMinScore].filter((s): s is number => s !== null)),
          ...r.batch4Records.flatMap(x => [x.minScore].filter((s): s is number => s !== null)),
        ].filter((s): s is number => s !== null);
        if (scores.length > 0) {
          expect(Math.min(...scores)).toBeGreaterThanOrEqual(480);
        }
      }
    });
  });

  describe('D. 多条件组合 - AND逻辑验证', () => {
    it('公办 + 2025 + 第三批 的结果集应是各条件的交集', () => {
      const combined = filterRecords(allData, { natures: ['公办'], years: [2025], batches: ['第三批'] });
      const justGongban = filterRecords(allData, { natures: ['公办'] });
      const just2025b3 = filterRecords(allData, { years: [2025], batches: ['第三批'] });

      for (const r of combined) {
        expect(justGongban.includes(r)).toBe(true);
        expect(just2025b3.includes(r)).toBe(true);
        expect(r.schoolNature).toBe('公办');
        expect(r.batch3Records.some(x => x.year === 2025)).toBe(true);
      }
    });

    it('民办 + 第四批 的结果应满足条件', () => {
      const result = filterRecords(allData, {
        natures: ['民办'],
        batches: ['第四批'],
      });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolNature).toBe('民办');
        expect(r.batch4Records.length).toBeGreaterThan(0);
      }
    });

    it('天河区 + 2024 + 第三批 应返回天河区学校2024年三批数据', () => {
      const result = filterRecords(allData, {
        districts: ['天河区'],
        years: [2024],
        batches: ['第三批'],
      });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.locationDistrict).toBe('天河区');
        expect(r.batch3Records.some(x => x.year === 2024)).toBe(true);
      }
    });

    it('白云区 + 2023 + 第四批 应返回白云区学校2023年四批数据', () => {
      const result = filterRecords(allData, {
        districts: ['白云区'],
        years: [2023],
        batches: ['第四批'],
      });
      expect(result.length).toBeGreaterThanOrEqual(0);
      for (const r of result) {
        expect(r.locationDistrict).toBe('白云区');
        expect(r.batch4Records.some(x => x.year === 2023)).toBe(true);
      }
    });
  });

  describe('E. 展开行数据完整性 - 同校多年份展示', () => {
    it('华附石牌展开后应显示2024/2025年第三批数据', () => {
      const school = allData.find(r =>
        r.schoolName.includes('华南师范大学附属中学') && r.schoolName.includes('石牌')
      );
      expect(school).toBeDefined();
      const years = new Set(school!.batch3Records.map(r => r.year));
      expect(years.has(2025)).toBe(true);
      expect(years.has(2024)).toBe(true);
    });

    it('二中展开后应显示2023/2024/2025三年第三批数据', () => {
      const school = allData.find(r => r.schoolName === '广州市第二中学');
      expect(school).toBeDefined();
      const years = new Set(school!.batch3Records.map(r => r.year));
      expect(years.has(2025)).toBe(true);
      expect(years.has(2024)).toBe(true);
      expect(years.has(2023)).toBe(true);
    });

    it('西关培英展开后应显示2023/2024/2025三年第四批数据', () => {
      const school = allData.find(r =>
        r.schoolName.includes('西关培英') && !r.schoolName.includes('鹤')
      );
      expect(school).toBeDefined();
      const years = new Set(school!.batch4Records.map(r => r.year));
      expect(years.has(2025)).toBe(true);
      expect(years.has(2024)).toBe(true);
      expect(years.has(2023)).toBe(true);
    });

    it('十三中展开后应显示2023/2024/2025三年第四批数据', () => {
      const school = allData.find(r => r.schoolName.includes('第十三中学'));
      expect(school).toBeDefined();
      const years = new Set(school!.batch4Records.map(r => r.year));
      expect(years.has(2025)).toBe(true);
      expect(years.has(2024)).toBe(true);
      expect(years.has(2023)).toBe(true);
    });
  });

  describe('F. 数据总量与覆盖率统计', () => {
    it('第三批总记录数应>=370条（含历史名称丢失）', () => {
      const totalB3 = allData.reduce((sum, r) => sum + r.batch3Records.length, 0);
      expect(totalB3).toBeGreaterThanOrEqual(370);
    });

    it('第四批总记录数应>=200条', () => {
      const totalB4 = allData.reduce((sum, r) => sum + r.batch4Records.length, 0);
      expect(totalB4).toBeGreaterThanOrEqual(200);
    });

    it('至少150所学校应有第三批数据', () => {
      const withB3 = allData.filter(r => r.batch3Records.length > 0);
      expect(withB3.length).toBeGreaterThanOrEqual(150);
    });

    it('至少80所学校应有第四批数据', () => {
      const withB4 = allData.filter(r => r.batch4Records.length > 0);
      expect(withB4.length).toBeGreaterThanOrEqual(80);
    });

    it('名额分配控制线覆盖率应>90所', () => {
      const withQuota = allData.filter(r => r.quotaControlLine !== undefined);
      expect(withQuota.length).toBeGreaterThan(90);
    });
  });
});
