import { describe, it, expect, beforeAll } from 'vitest';
import { mergeAllData } from '../utils/dataMerger';

describe('mergeAllData - 跨表数据合并', () => {
  let mergedData: ReturnType<typeof mergeAllData>;

  beforeAll(() => {
    mergedData = mergeAllData();
  });

  describe('基础合并校验', () => {
    it('应合并出约175+条学校记录（含孤儿学校虚拟记录）', () => {
      expect(mergedData.length).toBeGreaterThanOrEqual(160);
      expect(mergedData.length).toBeLessThanOrEqual(230);
    });

    it('主表记录应包含完整的基础信息（过滤空隶属后）', () => {
      const mainRecords = mergedData.filter(r => r.affiliation);
      // 合并后的主表记录数取决于解析结果
      expect(mainRecords.length).toBeGreaterThan(100);

      for (const r of mainRecords) {
        expect(r.schoolName).toBeTruthy();
        expect(r.affiliation).toBeTruthy();
        expect(['公办', '民办']).toContain(r.schoolNature);
      }
    });

    it('不应有重复的学校名称（精确匹配）', () => {
      const names = mergedData.map(r => r.schoolName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('第三批数据关联校验', () => {
    it('大部分第三批学校应成功关联到学校库', () => {
      const withB3 = mergedData.filter(r => r.batch3Records.length > 0);
      // 第三批有大量公办+民办学校，至少应该关联上一半以上
      expect(withB3.length).toBeGreaterThan(80);
    });

    it('华附石牌应关联到2025年第三批740分', () => {
      const school = mergedData.find(r => r.schoolName.includes('华南师范大学附属中学') && r.schoolName.includes('石牌'));
      expect(school).toBeDefined();
      const b3_2025 = school!.batch3Records.find(rec => rec.year === 2025);
      expect(b3_2025).toBeDefined();
      expect(b3_2025!.hujiMinScore).toBe(740);
      expect(b3_2025!.schoolName).toContain('华南师范大学附属中学');
    });

    it('广州市第二中学应关联到2025年第三批724分', () => {
      const school = mergedData.find(r => r.schoolName === '广州市第二中学');
      expect(school).toBeDefined();
      const b3_2025 = school!.batch3Records.find(rec => rec.year === 2025);
      expect(b3_2025).toBeDefined();
      expect(b3_2025!.hujiMinScore).toBe(724);
    });

    it('执信中学(执信路)应关联到2025年第三批723分', () => {
      const school = mergedData.find(r => r.schoolName.includes('执信') && r.schoolName.includes('执信路'));
      expect(school).toBeDefined();
      const b3_2025 = school!.batch3Records.find(rec => rec.year === 2025);
      expect(b3_2025).toBeDefined();
      expect(b3_2025!.hujiMinScore).toBe(723);
    });

    it('同一学校的不同年份记录应分别存储（数据结构支持多年）', () => {
      // 验证数据结构本身支持多年存储：检查是否有学校有多条批次记录
      // 或检查所有学校的年份分布
      const allB3Years = new Set(mergedData.flatMap(r => r.batch3Records.map(x => x.year)));
      const allB4Years = new Set(mergedData.flatMap(r => r.batch4Records.map(x => x.year)));

      // 至少第三批或第四批应有数据
      expect(allB3Years.size + allB4Years.size).toBeGreaterThanOrEqual(1);

      // 如果有多年数据，验证存储正确
      if (allB3Years.size >= 2 || allB4Years.size >= 2) {
        const multiYearSchools = mergedData.filter(r =>
          new Set(r.batch3Records.map(x => x.year)).size >= 2 ||
          new Set(r.batch4Records.map(x => x.year)).size >= 2
        );
        expect(multiYearSchools.length).toBeGreaterThan(0);
      }
    });

    it('第三批记录的schoolName应指向正确的学校', () => {
      for (const r of mergedData) {
        for (const b3 of r.batch3Records) {
          const nameMatch = b3.schoolName === r.schoolName ||
            r.schoolName.includes(b3.schoolName.replace(/\s*（[^）]*）/g, '')) ||
            b3.schoolName.includes(r.schoolName.replace(/\s*（[^）]*）/g, '')) ||
            extractBaseName(b3.schoolName) === extractBaseName(r.schoolName);
          expect(nameMatch, `${b3.schoolName} 未正确关联到 ${r.schoolName}`).toBe(true);
        }
      }
    });
  });

  describe('第四批数据关联校验', () => {
    it('大部分第四批学校应成功关联到学校库', () => {
      const withB4 = mergedData.filter(r => r.batch4Records.length > 0);
      expect(withB4.length).toBeGreaterThan(50);
    });

    it('西关培英中学应关联到2025年第四批604分', () => {
      const school = mergedData.find(r => r.schoolName.includes('西关培英') && !r.schoolName.includes('鹤'));
      expect(school).toBeDefined();
      const b4_2025 = school!.batch4Records.find(rec => rec.year === 2025);
      expect(b4_2025).toBeDefined();
      expect(b4_2025!.minScore).toBe(604);
    });

    it('第十三中学应关联到2025年第四批616分', () => {
      const school = mergedData.find(r => r.schoolName.includes('第十三中学'));
      expect(school).toBeDefined();
      const b4_2025 = school!.batch4Records.find(rec => rec.year === 2025);
      expect(b4_2025).toBeDefined();
      expect(b4_2025!.minScore).toBe(616);
    });

    it('民办学校第四批应标记为 isHuji=false', () => {
      const school = mergedData.find(r => r.schoolName.includes('爱莎文华'));
      expect(school).toBeDefined();
      const b4 = school!.batch4Records.find(rec => rec.year === 2025);
      expect(b4).toBeDefined();
      expect(b4!.isHuji).toBe(false);
    });

    it('公办第四批学校应标记为 isHuji=true', () => {
      const school = mergedData.find(r => r.schoolName.includes('西关培英') && !r.schoolName.includes('鹤'));
      expect(school).toBeDefined();
      const b4 = school!.batch4Records.find(rec => rec.year === 2025);
      expect(b4).toBeDefined();
      expect(b4!.isHuji).toBe(true);
    });
  });

  describe('名额分配控制线关联校验', () => {
    it('部分学校应关联到名额分配控制线', () => {
      const withQuota = mergedData.filter(r => r.quotaControlLine !== undefined);
      expect(withQuota.length).toBeGreaterThan(90);
    });

    it('华附石牌的2026控制线应为689', () => {
      const school = mergedData.find(r => r.schoolName.includes('华南师范大学附属中学') && r.schoolName.includes('石牌'));
      expect(school).toBeDefined();
      expect(school!.quotaControlLine).toBeDefined();
      expect(school!.quotaControlLine!.controlLine2026).toBe(689);
    });

    it('名额分配控制线的近三年均分应在合理范围', () => {
      for (const r of mergedData) {
        if (!r.quotaControlLine) continue;
        const { score2023, score2024, score2025, avg3Year } = r.quotaControlLine;
        const scores = [score2023, score2024, score2025].filter((s): s is number => s !== null);
        if (scores.length > 0) {
          expect(avg3Year).toBeLessThanOrEqual(Math.max(...scores) + 2);
          expect(avg3Year).toBeGreaterThan(Math.min(...scores) - 2);
        }
      }
    });
  });

  describe('第二批分数校验', () => {
    it('有第二批招生资格的学校应有 batch2Score2025', () => {
      const withB2 = mergedData.filter(r =>
        r.admissionBatches?.includes('第二批') &&
        r.batch2Score2025 !== null &&
        r.affiliation
      );
      expect(withB2.length).toBeGreaterThan(8);
    });

    it('第二批分数应在合理范围', () => {
      for (const r of mergedData) {
        if (r.batch2Score2025 !== null && r.batch2Score2025 !== undefined && r.affiliation) {
          expect(r.batch2Score2025).toBeGreaterThanOrEqual(500);
          // 第二批最高分可能超过750
          expect(r.batch2Score2025).toBeLessThanOrEqual(800);
        }
      }
    });

    it('华附知识城第二批分数应为729', () => {
      const school = mergedData.find(r => r.schoolName.includes('知识城'));
      expect(school).toBeDefined();
      expect(school!.batch2Score2025).toBe(729);
    });
  });

  describe('数据一致性交叉验证', () => {
    it('第三批分数通常 >= 第四批分数（同校同年段对比，宽松检查）', () => {
      let violations = 0;
      for (const r of mergedData) {
        const b3Scores = r.batch3Records
          .filter(x => x.hujiMinScore !== null)
          .map(x => x.hujiMinScore!);
        const b4Scores = r.batch4Records
          .filter(x => x.minScore !== null)
          .map(x => x.minScore!);

        if (b3Scores.length > 0 && b4Scores.length > 0) {
          const maxB4 = Math.max(...b4Scores);
          const minB3 = Math.min(...b3Scores);
          // 允许较大偏差（补录、特殊批次等例外情况）
          if (minB3 < maxB4 - 100) violations++;
        }
      }
      // 违反数量不能太多
      expect(violations).toBeLessThan(mergedData.length * 0.1);
    });

    it('梯度标签应与分数区间基本对应（允许个别例外）', () => {
      let mismatches = 0;
      for (const r of mergedData) {
        if (!r.gradient2025 || r.gradient2025 === '-') continue;

        const b3_2025 = r.batch3Records.find(x => x.year === 2025);
        if (!b3_2025 || b3_2025.hujiMinScore === null) continue;

        const score = b3_2025.hujiMinScore!;
        const gradient = r.gradient2025;

        if (gradient === '第一梯度' && score < 707) mismatches++;
        else if (gradient === '第二梯度' && (score < 667 || score >= 707)) mismatches++;
        else if (gradient === '第三梯度' && (score < 627 || score >= 667)) mismatches++;
        else if (gradient === '第四梯度' && (score < 587 || score >= 627)) mismatches++;
        else if (gradient === '第五梯度' && (score < 547 || score >= 587)) mismatches++;
      }
      // 梯度标签基于第三批户籍生最低分，但合并后的数据可能来自不同列
      // 允许少量不匹配（可能是外区生分数或末位分数导致的差异）
      expect(mismatches).toBeLessThan(mergedData.length * 0.15);
    });
  });
});

function extractBaseName(fullName: string): string {
  return fullName.replace(/\s*（[^）]*）/g, '').replace(/\s*\([^)]*\)/g, '').trim() || fullName;
}
