import type { Batch3Score, Batch4Score, QuotaControlLine, MakeupRecord, MakeupPlan2025, SchoolRecord, GradientLine, XieheQuota2026, XieheSendingRecord } from '../types';

export interface XieheControlLine2026 {
  schoolName: string;
  controlLine2026: number | null;
}

function parseNum(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === '--' || trimmed === '——' || trimmed === '-') return null;
  const n = Number.parseInt(trimmed.replace(/\*\*/g, '').replace(/\*/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function cleanText(val: string): string {
  return val.trim().replace(/\*\*/g, '');
}

export function parseMdTable(markdown: string): Record<string, string>[] {
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) return [];

  const sepIdx = lines.findIndex(l => /^\|[\s:|\-]+$/.test(l));
  if (sepIdx === -1 || sepIdx === 0) return [];

  const headerLine = lines[sepIdx - 1];
  const headers = headerLine.split('|').slice(1, -1).map(cleanText);

  const dataLines = lines.slice(sepIdx + 1);
  return dataLines.map(line => {
    const cells = line.split('|').slice(1, -1);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = i < cells.length ? cleanText(cells[i]) : '';
    });
    return record;
  }).filter(r => Object.values(r).some(v => v !== ''));
}

function extractAllTables(md: string): string[] {
  const tables: string[] = [];
  const lines = md.split('\n');
  let currentTable: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(trimmed);
    } else {
      if (inTable && currentTable.length > 0) {
        const hasDataLines = currentTable.some(l => !l.includes('---') && l.split('|').length > 2);
        if (hasDataLines) {
          tables.push(currentTable.join('\n'));
        }
        currentTable = [];
        inTable = false;
      }
    }
  }

  if (inTable && currentTable.length > 0) {
    const hasDataLines = currentTable.some(l => !l.includes('---') && l.split('|').length > 2);
    if (hasDataLines) {
      tables.push(currentTable.join('\n'));
    }
  }
  return tables.filter(t => t.split('\n').length >= 3);
}

function findLastYearBefore(text: string, endPos: number): number | null {
  const regex = /(?:^|\n)[#]*\s*(\d{4})\s*年/g;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index < endPos) {
      lastMatch = m;
    } else {
      break;
    }
  }
  return lastMatch ? parseInt(lastMatch[1], 10) : null;
}

export function parseBatch3Data(md: string): Batch3Score[] {
  const tables = extractAllTables(md);
  const results: Batch3Score[] = [];

  for (const table of tables) {
    const tableStartIdx = md.indexOf(table);
    const yearVal = findLastYearBefore(md, tableStartIdx);
    const currentYear = yearVal ?? 2025;

    const rows = parseMdTable(table);
    for (const row of rows) {
      const name = row['学校名称'] || '';
      if (!name || name.includes('说明')) continue;

      const isGongBan = row['学校性质'] === '公办';

      const record: Batch3Score = {
        schoolName: name,
        year: currentYear,
        schoolNature: row['学校性质'] || '',
        scope: row['招生范围'] || '',
        hujiMinScore: parseNum(row['户籍生 - 最低分数'] || row['户籍生最低分数'] || row['最低分数'] || ''),
        hujiMinScoreRank: parseNum(row['户籍生 - 最低分数同分序号'] || row['户籍生最低分数同分序号'] || row['最低分数同分序号'] || ''),
        hujiLastVolunteerOrder: parseNum(row['户籍生 - 末位考生志愿序号'] || row['户籍生末位考生志愿序号'] || row['末位考生志愿序号'] || ''),
        hujiLastScore: parseNum(row['户籍生 - 末位考生分数'] || row['户籍生末位考生分数'] || row['末位考生分数'] || ''),
        hujiLastScoreRank: parseNum(row['户籍生 - 末位考生分数同分序号'] || row['户籍生末位考生分数同分序号'] || row['末位考生分数同分序号'] || ''),
        waiquMinScore: isGongBan ? parseNum(row['外区生 - 最低分数'] || row['外区生最低分数'] || '') : parseNum(row['最低分数'] || ''),
        waiquMinScoreRank: isGongBan ? parseNum(row['外区生 - 最低分数同分序号'] || row['外区生最低分数同分序号'] || '') : parseNum(row['最低分数同分序号'] || ''),
        waiquLastVolunteerOrder: isGongBan ? parseNum(row['外区生 - 末位考生志愿序号'] || row['外区生末位考生志愿序号'] || '') : parseNum(row['末位考生志愿序号'] || ''),
        waiquLastScore: isGongBan ? parseNum(row['外区生 - 末位考生分数'] || row['外区生末位考生分数'] || '') : parseNum(row['末位考生分数'] || ''),
        waiquLastScoreRank: isGongBan ? parseNum(row['外区生 - 末位考生分数同分序号'] || row['外区生最低分数同分序号'] || '') : parseNum(row['末位考生分数同分序号'] || ''),
      };
      results.push(record);
    }
  }
  return results;
}

const XIEHE_SCHOOL_NAME_MAP: Record<string, string> = {
  '华附知识城': '华南师范大学附属中学（知识城校区）',
  '广雅花都': '广东广雅中学（花都校区）',
  '执信越秀': '广州市执信中学（执信路校区）',
  '执信天河': '广州市执信中学（天河校区）',
  '二中': '广州市第二中学',
  '六中花都': '广州市第六中学（花都校区）',
  '广附': '广州大学附属中学',
  '清湾智慧城': '清华附中湾区学校（智慧城校区）',
  '一中': '广州市第一中学',
  '四中': '广州市第四中学',
  '南海中学': '广州市南海中学',
  '西外': '广州市西关外国语学校',
  '真光本部': '广州市真光中学（校本部）',
  '真光汾水': '广州市真光中学（汾水校区）',
  '真光广钢': '广州市真光中学（广钢校区）',
};

const XIEHE_SCHOOL_NAME_MAP_2025: Record<string, string> = {
  '华附知识城': '华南师范大学附属中学（知识城校区）',
  '省实荔湾': '广东实验中学（荔湾校区）',
  '广雅荔湾': '广东广雅中学（荔湾校区）',
  '广雅花都': '广东广雅中学（花都校区）',
  '执信越秀': '广州市执信中学（执信路校区）',
  '二中': '广州市第二中学',
  '六中花都': '广州市第六中学（花都校区）',
  '协和': '广州协和学校',
  '一中': '广州市第一中学',
  '四中': '广州市第四中学',
  '南海中学': '广州市南海中学',
  '西关外语': '广州市西关外国语学校',
  '真光本部': '广州市真光中学（校本部）',
  '真光汾水': '广州市真光中学（汾水校区）',
  '真光广钢': '广州市真光中学（广钢校区）',
};

export function parseXieheQuota2026(md: string): XieheQuota2026[] {
  const rows = parseMdTable(md);
  const results: XieheQuota2026[] = [];

  for (const row of rows) {
    const sendingSchool = row['初中学校'] || '';
    if (!sendingSchool) continue;

    for (const [shortName, fullName] of Object.entries(XIEHE_SCHOOL_NAME_MAP)) {
      const quotaVal = row[shortName];
      if (quotaVal !== undefined && quotaVal !== '' && quotaVal !== '-') {
        const num = parseNum(quotaVal);
        if (num !== null && num > 0) {
          results.push({
            schoolName: fullName,
            provinceQuota: num,
            districtQuota: num,
          });
        }
      }
    }
  }

  return results;
}

export function parseXieheQuota2025(md: string): Record<string, number> {
  const rows = parseMdTable(md);
  const results: Record<string, number> = {};

  for (const row of rows) {
    const sendingSchool = row['初中学校'] || '';
    if (!sendingSchool) continue;

    for (const [shortName, fullName] of Object.entries(XIEHE_SCHOOL_NAME_MAP_2025)) {
      const quotaVal = row[shortName];
      if (quotaVal !== undefined && quotaVal !== '' && quotaVal !== '-') {
        const num = parseNum(quotaVal);
        if (num !== null && num > 0) {
          results[fullName] = num;
        }
      }
    }
  }

  return results;
}

function parseSendingCell(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === '<br />' || trimmed === '无录取' || trimmed === '-' || trimmed === '——') return null;
  return parseNum(trimmed);
}

export function parseXieheSendingDetails(md: string): XieheSendingRecord[] {
  const sectionStart = md.indexOf('一、广州协和学校作为送生学校');
  if (sectionStart === -1) return [];

  // 截止到"### 1.5 四年对比"之前的部分（含2023/2024/2025/2026四年送生明细表）
  const sectionEnd = md.indexOf('### 1.5', sectionStart);
  const section = md.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd);

  const tables = extractAllTables(section);
  const results: XieheSendingRecord[] = [];
  // 四年送生明细表，按出现顺序对应 2023/2024/2025/2026
  const TABLE_YEARS = [2023, 2024, 2025, 2026];

  for (let ti = 0; ti < tables.length; ti++) {
    const table = tables[ti];
    const currentYear = TABLE_YEARS[ti] ?? 2026;

    const rows = parseMdTable(table);
    for (const row of rows) {
      const targetSchool = cleanText(row['招生学校'] || '');
      if (!targetSchool) continue;

      results.push({
        targetSchool,
        year: currentYear,
        minScore: parseSendingCell(row['最低分数'] || ''),
        minScoreRank: parseSendingCell(row['最低分数同分序号'] || ''),
        lastScore: parseSendingCell(row['末位考生分数'] || ''),
        lastVolunteerOrder: parseSendingCell(row['末位考生志愿序号'] || ''),
        lastScoreRank: parseSendingCell(row['末位考生分数同分序号'] || ''),
      });
    }
  }

  return results;
}

export function parseXieheControlLines(md: string): XieheControlLine2026[] {
  // 兼容旧版（### 1.5 控制线对比）与新版（### 1.6 控制线对比）文档结构
  const sectionStart = md.indexOf('### 1.6 控制线对比') !== -1
    ? md.indexOf('### 1.6 控制线对比')
    : md.indexOf('### 1.5 控制线对比');
  if (sectionStart === -1) return [];

  const section = md.slice(sectionStart);
  const tables = extractAllTables(section);
  const results: XieheControlLine2026[] = [];

  for (const table of tables) {
    const rows = parseMdTable(table);
    for (const row of rows) {
      const schoolName = cleanText(row['招生学校'] || '');
      if (!schoolName || schoolName === '招生学校') continue;

      const clVal = row['2026年第二批控制线（预测）'] || '';
      if (clVal && clVal !== '-' && clVal !== '无录取' && clVal !== '') {
        const num = parseNum(clVal);
        results.push({ schoolName, controlLine2026: num });
      } else {
        results.push({ schoolName, controlLine2026: null });
      }
    }
  }
  return results;
}

export function parseBatch4Data(md: string): Batch4Score[] {
  const tables = extractAllTables(md);
  const results: Batch4Score[] = [];

  for (const table of tables) {
    const tableStartIdx = md.indexOf(table);
    const yearVal = findLastYearBefore(md, tableStartIdx);
    const currentYear = yearVal ?? 2025;

    const rows = parseMdTable(table);
    const headers = Object.keys(rows[0] || {});
    const hasHujiPrefix = headers.some(h => h.includes('户籍生'));

    for (const row of rows) {
      const name = row['学校名称'] || '';
      if (!name || name.includes('说明')) continue;

      const record: Batch4Score = {
        schoolName: name,
        year: currentYear,
        schoolNature: row['学校性质'] || '',
        scope: row['招生范围'] || '',
        isHuji: hasHujiPrefix,
        minScore: parseNum(hasHujiPrefix ? (row['户籍生 - 最低分数'] || '') : (row['最低分数'] || '')),
        minScoreRank: parseNum(hasHujiPrefix ? (row['户籍生 - 最低分数同分序号'] || '') : (row['最低分数同分序号'] || '')),
        lastVolunteerOrder: parseNum(hasHujiPrefix ? (row['户籍生 - 末位考生志愿序号'] || '') : (row['末位考生志愿序号'] || '')),
        lastScore: parseNum(hasHujiPrefix ? (row['户籍生 - 末位考生分数'] || '') : (row['末位考生分数'] || '')),
        lastScoreRank: parseNum(hasHujiPrefix ? (row['户籍生 - 末位考生分数同分序号'] || '') : (row['末位考生分数同分序号'] || '')),
      };
      results.push(record);
    }
  }
  return results;
}

export function parseSchoolLibrary(md: string): Omit<SchoolRecord, 'batch3Records' | 'batch4Records' | 'quotaControlLine' | 'makeupScore'>[] {
  const tables = extractAllTables(md);
  const results: Omit<SchoolRecord, 'batch3Records' | 'batch4Records' | 'quotaControlLine' | 'makeupScore'>[] = [];
  const seen = new Set<string>();

  for (const table of tables) {
    const rows = parseMdTable(table);
    const hasSchoolCode = rows.length > 0 && '学校编码' in (rows[0] || {});
    if (!hasSchoolCode) continue;

    for (const row of rows) {
      const name = row['学校名称'] || '';
      if (!name || name.includes('说明') || name.includes('字段')) continue;
      if (name.includes('补录')) continue;
      if (seen.has(name)) continue;
      seen.add(name);

      const record = {
        schoolCode: row['学校编码'] || '',
        schoolName: name,
        affiliation: row['隶属'] || '',
        schoolNature: row['学校性质'] || '',
        schoolCategory: row['学校类别'] || '',
        locationDistrict: row['校址所在区'] || row['招生范围'] || '',
        admissionBatches: row['录取批次'] || '',
        batch2Score2025: parseNum(row['2025年第二批最低分'] || ''),
        gradient2025: row['2025年第三批户籍生最低分对应梯度'] || row['2025年第三批外区生最低分对应梯度'] || row['2025年第三批最低分对应梯度'] || '',
        batch3Records: [] as any[],
        batch4Records: [] as any[],
        schoolAddress2026: row['2026年学校地址'] || '',
        enrollmentPlan2026: row['2026年招生计划'] || '',
        maxWaiquPlan2026: row['2026年外区招生最大计划数'] || '',
        totalPlan2026: parseNum(row['2026年学校总计划'] || ''),
        totalDormitory2026: parseNum(row['2026年总宿位'] || ''),
      };
      results.push(record as any);
    }
  }
  return results as any;
}

export function parseQuotaControlLines(md: string): QuotaControlLine[] {
  const tables = extractAllTables(md);
  const results: QuotaControlLine[] = [];

  for (const table of tables) {
    const rows = parseMdTable(table);
    for (const row of rows) {
      const name = row['学校名称'] || '';
      if (!name || name.includes('#')) continue;

      results.push({
        schoolName: name,
        affiliation: row['隶属'] || '',
        category: row['类别'] || '',
        score2023: parseNum(row['2023年'] || ''),
        score2024: parseNum(row['2024年'] || ''),
        score2025: parseNum(row['2025年'] || ''),
        avg3Year: parseNum(row['近三年平均分'] || '') || 0,
        controlLine2026: parseNum(row['2026年名额分配控制线'] || '') || 0,
      });
    }
  }
  return results;
}

export interface QuotaCompare2526 {
  schoolName: string;
  controlLine2025: number;
  controlLine2026: number;
  changeValue: number;
  changeRate: number;
}

export function parseQuotaCompare2526(md: string): QuotaCompare2526[] {
  const tables = extractAllTables(md);
  const results: QuotaCompare2526[] = [];

  for (const table of tables) {
    const rows = parseMdTable(table);
    for (const row of rows) {
      const name = (row['学校名称'] || '').trim();
      if (!name) continue;
      results.push({
        schoolName: name,
        controlLine2025: Number(row['2025第二批最低控制线']) || 0,
        controlLine2026: Number(row['2026第二批最低控制线']) || 0,
        changeValue: Number(row['最低控制线变化值']) || 0,
        changeRate: Number(row['最低控制线变化率(%)']) || 0,
      });
    }
  }
  return results;
}

export function parseMakeupScores(md: string): MakeupRecord[] {
  const tables = extractAllTables(md);
  const results: MakeupRecord[] = [];

  for (const table of tables) {
    const rows = parseMdTable(table);
    for (const row of rows) {
      const code = row['学校编码'] || '';
      const name = row['学校名称'] || '';
      if (!code || !name || name.includes('正常录取')) continue;

      results.push({
        schoolName: name,
        normalBatch: row['正常录取批次'] || '',
        normalScore: parseNum(row['正常录取分数'] || ''),
        makeupScore: parseNum(row['补录最低分'] || '') || 0,
        diff: (() => { const d = row['差值']?.trim(); if (d === '-' || d === '') return null; return d ? parseInt(d.replace(/[+-]/g, ''), 10) : null; })(),
      });
    }
  }
  return results;
}

export function parseMakeupPlan2025(md: string): MakeupPlan2025[] {
  const tables = extractAllTables(md);
  const results: MakeupPlan2025[] = [];

  for (const table of tables) {
    const rows = parseMdTable(table);
    for (const row of rows) {
      const name = row['学校名称'] || '';
      const nature = row['学校性质'] || '';
      const plan = parseNum(row['补录计划'] || '');
      const score = parseNum(row['补录最低控制分数线'] || '');
      if (!name || plan == null || score == null) continue;
      if (nature !== '公办' && nature !== '民办') continue;
      results.push({
        schoolName: name,
        schoolNature: nature,
        makeupPlan: plan,
        makeupControlLine: score,
      });
    }
  }
  return results;
}

export function parseGradientLines(md: string): GradientLine[] {
  const tables = extractAllTables(md);
  const results: GradientLine[] = [];

  for (const table of tables) {
    const text = table.toLowerCase();
    if (!text.includes('梯度') && !text.includes('第一梯度')) continue;

    const rows = parseMdTable(table);
    for (const row of rows) {
      const g1 = row['第一梯度'] || row['第一梯度 '] || '';
      if (!g1) continue;

      results.push({
        year: 2025,
        firstGradient: parseNum(g1) || 0,
        secondGradient: parseNum(row['第二梯度'] || row['第二梯度 '] || '') || 0,
        thirdGradient: parseNum(row['第三梯度'] || row['第三梯度 '] || '') || 0,
        fourthGradient: parseNum(row['第四梯度'] || row['第四梯度 '] || '') || 0,
        fifthGradient: parseNum(row['第五梯度'] || row['第五梯度 '] || '') || 0,
        sixthGradient: parseNum(row['第六梯度'] || row['第六梯度 '] || ''),
        minControlLine: parseNum(row['普通高中录取最低控制线'] || '') || 0,
      });
    }
  }

  const yearMatches = md.matchAll(/##\s*\d+\.?\d*\s*(\d{4})/g);
  for (const m of yearMatches) {
    const y = parseInt(m[1], 10);
    if (results.some(r => r.year === y)) continue;

    const sectionStart = m.index || 0;
    const sectionEnd = md.indexOf('##', sectionStart + 1);
    const section = md.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd);
    const secTables = extractAllTables(section);

    for (const t of secTables) {
      const tRows = parseMdTable(t);
      for (const r of tRows) {
        if (r['第一梯度'] || r['第一梯度 ']) {
          results.push({
            year: y,
            firstGradient: parseNum(r['第一梯度'] || r['第一梯度 '] || '') || 0,
            secondGradient: parseNum(r['第二梯度'] || r['第二梯度 '] || '') || 0,
            thirdGradient: parseNum(r['第三梯度'] || r['第三梯度 '] || '') || 0,
            fourthGradient: parseNum(r['第四梯度'] || r['第四梯度 '] || '') || 0,
            fifthGradient: parseNum(r['第五梯度'] || r['第五梯度 '] || '') || 0,
            sixthGradient: parseNum(r['第六梯度'] || r['第六梯度 '] || ''),
            minControlLine: parseNum(r['普通高中录取最低控制线'] || '') || 0,
          });
          break;
        }
      }
    }
  }
  return results;
}

export interface MockExamGradient {
  year: number;
  label: string;
  totalScore: number;
  firstGradient: number;
  secondGradient: number;
  thirdGradient: number;
  fourthGradient: number;
  fifthGradient: number;
  sixthGradient: number | null;
  minControlLine: number;
}

export function parseMockExamGradients(md: string): MockExamGradient[] {
  const results: MockExamGradient[] = [];
  const tables = extractAllTables(md);

  for (const table of tables) {
    const rows = parseMdTable(table);

    const hasGradientXianColumn = rows.length > 0 && '梯度线' in (rows[0] || {});
    const hasGradientColumn = rows.length > 0 && '梯度' in (rows[0] || {});

    if (hasGradientXianColumn) {
      const gradientRows = rows.filter(r => r['梯度线'] && r['梯度线'].trim() && r['梯度线'].trim() !== '<br />');
      if (gradientRows.length === 0) continue;

      const gradients: Record<string, number | null> = {};
      for (const row of gradientRows) {
        const label = row['梯度线'].trim();
        const score = parseNum(row['分点'] || '');
        if (label && score !== null) {
          gradients[label] = score;
        }
      }

      if (gradients['第一梯度'] !== undefined && gradients['第一梯度'] !== null) {
        const lastRow = rows[rows.length - 1];
        const minLine = parseNum(lastRow?.['分点'] || '');

        results.push({
          year: 2026,
          label: '2026年全市一模',
          totalScore: 690,
          firstGradient: gradients['第一梯度'] || 0,
          secondGradient: gradients['第二梯度'] || 0,
          thirdGradient: gradients['第三梯度'] || 0,
          fourthGradient: gradients['第四梯度'] || 0,
          fifthGradient: gradients['第五梯度'] || 0,
          sixthGradient: gradients['第六梯度'] ?? null,
          minControlLine: minLine || 0,
        });
      }
    } else if (hasGradientColumn) {
      const lookup: Record<string, string> = {};
      for (const row of rows) {
        const key = (row['梯度'] || '').trim();
        const val = (row['分数'] || '').trim();
        if (key) lookup[key] = val;
      }

      if (lookup['第一梯度']) {
        results.push({
          year: 2026,
          label: '2026年全市一模',
          totalScore: 690,
          firstGradient: parseNum(lookup['第一梯度'] || '') || 0,
          secondGradient: parseNum(lookup['第二梯度'] || '') || 0,
          thirdGradient: parseNum(lookup['第三梯度'] || '') || 0,
          fourthGradient: parseNum(lookup['第四梯度'] || '') || 0,
          fifthGradient: parseNum(lookup['第五梯度'] || '') || 0,
          sixthGradient: parseNum(lookup['第六梯度'] || ''),
          minControlLine: parseNum(lookup['普通高中录取最低控制线'] || '') || 0,
        });
      }
    }
  }

  return results;
}
