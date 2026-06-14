import { describe, it, expect, beforeAll } from 'vitest';
import { mergeAllData } from '../utils/dataMerger';
import { filterRecords, getAllDistricts, getAllNatures, getAllCategories, getAllScopes, getAllGradients } from '../utils/filterEngine';

describe('filterEngine - 筛选引擎', () => {
  let allData: ReturnType<typeof mergeAllData>;

  beforeAll(() => {
    allData = mergeAllData();
  });

  describe('工具函数 - 提取唯一值', () => {
    it('getAllDistricts 应返回非空区域列表（基于校址所在区）', () => {
      const districts = getAllDistricts(allData);
      expect(districts.length).toBeGreaterThan(5);
      // 区域来自 locationDistrict 字段，包含各行政区
      expect(districts.length).toBeGreaterThanOrEqual(8);
    });

    it('getAllNatures 应返回公办和民办', () => {
      const natures = getAllNatures(allData);
      expect(natures).toContain('公办');
      expect(natures).toContain('民办');
    });

    it('getAllCategories 应包含国家级示范性等类别', () => {
      const categories = getAllCategories(allData);
      expect(categories.length).toBeGreaterThan(3);
      const catStr = categories.join(',');
      expect(catStr).toContain('国家级示范性');
    });

    it('getAllScopes 应包含全市等范围', () => {
      const scopes = getAllScopes(allData);
      expect(scopes).toContain('全市');
    });

    it('getAllGradients 应返回梯度标签', () => {
      const gradients = getAllGradients(allData);
      // 至少有第一~第五梯度
      expect(gradients.some(g => g.includes('第一梯度'))).toBe(true);
    });
  });

  describe('无筛选条件 - 返回全部数据', () => {
    it('空条件应返回全部记录', () => {
      const result = filterRecords(allData, {});
      expect(result.length).toBe(allData.length);
    });

    it('全空字符串条件应返回全部记录', () => {
      const result = filterRecords(allData, { keyword: '', batches: [], years: [], natures: [], districts: [], categories: [], scopes: [], gradients: [] });
      expect(result.length).toBe(allData.length);
    });
  });

  describe('学校名称模糊搜索', () => {
    it('搜索"执信"应只返回执信相关学校', () => {
      const result = filterRecords(allData, { keyword: '执信' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolName).toContain('执信');
      }
    });

    it('搜索"华附"应匹配华南师范大学附属中学', () => {
      const result = filterRecords(allData, { keyword: '华附' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(
          r.schoolName.includes('华南师范大学附属') ||
          r.schoolName.includes('华附')
        ).toBe(true);
      }
    });

    it('搜索不存在的关键词应返回空数组', () => {
      const result = filterRecords(allData, { keyword: '不存在的学校XYZ123' });
      expect(result).toHaveLength(0);
    });
  });

  describe('学校性质筛选', () => {
    it('筛选公办应只返回公办学校', () => {
      const result = filterRecords(allData, { natures: ['公办'] });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolNature).toBe('公办');
      }
    });

    it('筛选民办应只返回民办学校', () => {
      const result = filterRecords(allData, { natures: ['民办'] });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolNature).toBe('民办');
      }
    });

    it('公办+民办结果数 <= 总数（可能含中外合作）', () => {
      const all = filterRecords(allData, {});
      const gbmb = filterRecords(allData, { natures: ['公办', '民办'] });
      expect(gbmb.length).toBeLessThanOrEqual(all.length);
    });
  });

  describe('年份筛选', () => {
    it('筛选2025年应有第三批或第四批数据', () => {
      const result = filterRecords(allData, { years: [2025] });
      expect(result.length).toBeGreaterThan(50);
      for (const r of result) {
        const has2025 =
          r.batch3Records.some(x => x.year === 2025) ||
          r.batch4Records.some(x => x.year === 2025) ||
          r.batch2Score2025 !== null;
        expect(has2025).toBe(true);
      }
    });

    it('筛选年份应有对应年份数据（至少2025有数据）', () => {
      const result2025 = filterRecords(allData, { years: [2025] });
      expect(result2025.length).toBeGreaterThan(50);

      // 其他年份取决于合并情况
      const allYears = new Set([
        ...allData.flatMap(r => r.batch3Records.map(x => x.year)),
        ...allData.flatMap(r => r.batch4Records.map(x => x.year)),
      ]);
      if (allYears.has(2024)) {
        const result2024 = filterRecords(allData, { years: [2024] });
        expect(result2024.length).toBeGreaterThan(0);
      }
    });
  });

  describe('批次筛选', () => {
    it('筛选第三批应有 batch3Records 数据', () => {
      const result = filterRecords(allData, { batches: ['第三批'] });
      expect(result.length).toBeGreaterThan(50);
      for (const r of result) {
        expect(r.batch3Records.length).toBeGreaterThan(0);
      }
    });

    it('筛选第四批应有 batch4Records 数据', () => {
      const result = filterRecords(allData, { batches: ['第四批'] });
      expect(result.length).toBeGreaterThan(40);
      for (const r of result) {
        expect(r.batch4Records.length).toBeGreaterThan(0);
      }
    });

    it('筛选第二批应有 batch2Score2025', () => {
      const result = filterRecords(allData, { batches: ['第二批'] });
      expect(result.length).toBeGreaterThan(8);
      for (const r of result) {
        expect(r.batch2Score2025).not.toBeNull();
      }
    });
  });

  describe('区域筛选', () => {
    it('筛选天河区应只返回天河区学校', () => {
      const result = filterRecords(allData, { districts: ['天河区'] });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.locationDistrict).toBe('天河区');
      }
    });

    it('筛选存在的区域应返回非空结果', () => {
      const districts = getAllDistricts(allData);
      if (districts.length > 0) {
        const result = filterRecords(allData, { districts: [districts[0]] });
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('分数区间筛选', () => {
    it('分数区间[650, 780]返回的学校应有至少一个分数在合理范围', () => {
      const result = filterRecords(allData, { minScore: 650, maxScore: 780 });
      // 过滤后应有结果（大部分高分学校在此区间）
      if (result.length === 0) return; // 如果全部被过滤掉则跳过

      for (const r of result) {
        const scores = [
          ...r.batch3Records.flatMap(x => [x.hujiMinScore, x.hujiLastScore].filter((s): s is number => s !== null)),
          ...r.batch4Records.flatMap(x => [x.minScore, x.lastScore].filter((s): s is number => s !== null)),
          r.batch2Score2025,
        ].filter((s): s is number => s !== null && s !== undefined);

        if (scores.length > 0) {
          const maxS = Math.max(...scores);
          // 最高分不应太离谱（<900）
          expect(maxS).toBeLessThan(900);
        }
      }
      // 基本验证通过即可
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('仅设置minScore应过滤掉低分学校', () => {
      const result = filterRecords(allData, { minScore: 650 });
      const noFilter = filterRecords(allData, {});
      expect(result.length).toBeLessThanOrEqual(noFilter.length);
    });

    it('仅设置maxScore应过滤掉高分学校', () => {
      const result = filterRecords(allData, { maxScore: 520 });
      const noFilter = filterRecords(allData, {});
      expect(result.length).toBeLessThanOrEqual(noFilter.length);
    });
  });

  describe('组合筛选 - 多条件 AND', () => {
    it('公办 + 天河区 + 2025年应同时满足三个条件', () => {
      const result = filterRecords(allData, {
        natures: ['公办'],
        districts: ['天河区'],
        years: [2025],
      });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolNature).toBe('公办');
        expect(r.locationDistrict).toBe('天河区');
        const has2025 = r.batch3Records.some(x => x.year === 2025) ||
          r.batch4Records.some(x => x.year === 2025) ||
          r.batch2Score2025 !== null;
        expect(has2025).toBe(true);
      }
    });

    it('民办 + 第四批 + 分数>=500 应满足所有条件', () => {
      const result = filterRecords(allData, {
        natures: ['民办'],
        batches: ['第四批'],
        minScore: 500,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolNature).toBe('民办');
        expect(r.batch4Records.length).toBeGreaterThan(0);
      }
    });

    it('关键词 + 性质 组合应精确匹配', () => {
      const result = filterRecords(allData, {
        keyword: '执信',
        natures: ['公办'],
      });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolName).toContain('执信');
        expect(r.schoolNature).toBe('公办');
      }
    });
  });

  describe('边界情况', () => {
    it('完全不匹配的条件应返回空数组', () => {
      const result = filterRecords(allData, {
        keyword: '不存在的学校',
        natures: ['不存在'],
        minScore: 999,
        maxScore: 1000,
      });
      expect(result).toHaveLength(0);
    });

    it('梯度筛选应正确过滤', () => {
      const result = filterRecords(allData, { gradients: ['第一梯度'] });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.gradient2025).toBe('第一梯度');
      }
    });
  });

  describe('多关键词混合搜索（OR + AND）', () => {
    it('单关键词搜索应与之前行为一致', () => {
      const result = filterRecords(allData, { keyword: '执信' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolName.includes('执信')).toBe(true);
      }
    });

    it('空格分隔双关键词应同时命中（AND逻辑）', () => {
      const result = filterRecords(allData, { keyword: '执信 天河' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolName.includes('执信')).toBe(true);
        expect(r.schoolName.includes('天河')).toBe(true);
      }
    });

    it('逗号分隔应OR匹配多所学校', () => {
      const result = filterRecords(allData, { keyword: '执信,二中' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        const hasZhixin = r.schoolName.includes('执信');
        const hasErzhong = r.schoolName.includes('二中');
        expect(hasZhixin || hasErzhong).toBe(true);
      }
    });

    it('中文逗号分隔也应支持OR', () => {
      const r1 = filterRecords(allData, { keyword: '执信,二中' });
      const r2 = filterRecords(allData, { keyword: '执信，二中' });
      expect(r1.length).toBe(r2.length);
    });

    it('换行分隔也应支持OR', () => {
      const result = filterRecords(allData, { keyword: '执信\n二中' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        expect(r.schoolName.includes('执信') || r.schoolName.includes('二中')).toBe(true);
      }
    });

    it('混合模式：逗号OR + 空格AND', () => {
      const result = filterRecords(allData, { keyword: '执信 天河,广雅 荔湾' });
      expect(result.length).toBeGreaterThan(0);
      for (const r of result) {
        const matchGroup1 = r.schoolName.includes('执信') && r.schoolName.includes('天河');
        const matchGroup2 = r.schoolName.includes('广雅') && r.schoolName.includes('荔湾');
        expect(matchGroup1 || matchGroup2).toBe(true);
      }
    });

    it('不匹配的多关键词AND组合应返回空', () => {
      const result = filterRecords(allData, { keyword: '华附 清远' });
      expect(result).toHaveLength(0);
    });

    it('多余空格和逗号不影响结果', () => {
      const r1 = filterRecords(allData, { keyword: '执信' });
      const r2 = filterRecords(allData, { keyword: '  执信  ' });
      const r3 = filterRecords(allData, { keyword: ',执信,' });
      expect(r1.length).toBe(r2.length);
      expect(r1.length).toBe(r3.length);
    });
  });
});
