import type { SchoolRecord, Batch3Score, Batch4Score, QuotaControlLine, XieheSendingRecord } from '../types';
import { parseSchoolLibrary, parseBatch3Data, parseBatch4Data, parseQuotaControlLines, parseXieheQuota2026, parseXieheQuota2025, parseXieheSendingDetails, parseQuotaCompare2526, parseMakeupScores, parseMakeupPlan2025 } from './mdParser';
import { RAW_BATCH3, RAW_BATCH4, RAW_SCHOOL_LIB, RAW_QUOTA, RAW_XIEHE_QUOTA_2026, RAW_XIEHE_QUOTA_2025, RAW_XIEHE_SENDING_DETAILS, RAW_QUOTA_COMPARE_2526, RAW_MAKEUP_PLAN_2025 } from './rawData';

export function mergeAllData(): SchoolRecord[] {
  const schoolLib = parseSchoolLibrary(RAW_SCHOOL_LIB);
  const batch3Data = parseBatch3Data(RAW_BATCH3);
  const batch4Data = parseBatch4Data(RAW_BATCH4);
  const quotaData = parseQuotaControlLines(RAW_QUOTA);

  const schoolMap = new Map<string, Omit<SchoolRecord, 'batch3Records' | 'batch4Records' | 'quotaControlLine' | 'makeupScore'>>();
  for (const s of schoolLib) {
    schoolMap.set(s.schoolName, s);
    const baseKey = extractBaseName(s.schoolName);
    if (baseKey !== s.schoolName && !schoolMap.has(baseKey)) {
      schoolMap.set(baseKey, s);
    }
  }

  const b3Map = new Map<string, Batch3Score[]>();
  for (const r of batch3Data) {
    const key = r.schoolName;
    if (!b3Map.has(key)) b3Map.set(key, []);
    b3Map.get(key)!.push(r);

    const baseKey = extractBaseName(r.schoolName);
    if (baseKey !== key) {
      if (!b3Map.has(baseKey)) b3Map.set(baseKey, []);
      if (!b3Map.get(baseKey)!.some(x => x.year === r.year)) {
        b3Map.get(baseKey)!.push(r);
      }
    }
  }

  const b4Map = new Map<string, Batch4Score[]>();
  for (const r of batch4Data) {
    const key = r.schoolName;
    if (!b4Map.has(key)) b4Map.set(key, []);
    b4Map.get(key)!.push(r);

    const baseKey = extractBaseName(r.schoolName);
    if (baseKey !== key) {
      if (!b4Map.has(baseKey)) b4Map.set(baseKey, []);
      if (!b4Map.get(baseKey)!.some(x => x.year === r.year)) {
        b4Map.get(baseKey)!.push(r);
      }
    }
  }

  const qMap = new Map<string, QuotaControlLine>();
  for (const q of quotaData) {
    qMap.set(q.schoolName, q);
  }

  // 批次全称→简称映射
  const BATCH_ABBR: Record<string, string> = {
    '第一批': '一', '第二批': '二', '第三批': '三', '第四批': '四',
    '1': '一', '2': '二', '3': '三', '4': '四',
  };
  function normalizeBatch(s: string): string {
    return BATCH_ABBR[s] || s;
  }

  const results: SchoolRecord[] = [];
  for (const [name, base] of schoolMap) {
    if (name === extractBaseName(name) && name !== base.schoolName) continue;

    // 根据数据推断批次
    const batches: Set<string> = new Set();
    if (base.admissionBatches) {
      // 从学校库读取的批次信息，标准化为简称
      const libBatches = base.admissionBatches.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
      libBatches.forEach(b => batches.add(normalizeBatch(b)));
    }
    const b3List = b3Map.get(name) || b3Map.get(extractBaseName(name)) || [];
    const b4List = b4Map.get(name) || b4Map.get(extractBaseName(name)) || [];
    const hasQuota = qMap.get(name) || qMap.get(extractBaseName(name));
    // 推断批次：有名额分配控制线 → 二；有batch3记录 → 三；有batch4记录 → 四
    if (hasQuota) batches.add('二');
    if (b3List.length > 0) batches.add('三');
    if (b4List.length > 0) batches.add('四');
    // 去重并排序
    const inferredBatches = [...batches].sort().join('、');

    const record: SchoolRecord = {
      ...base,
      admissionBatches: inferredBatches || base.admissionBatches || '',
      batch3Records: b3List,
      batch4Records: b4List,
      quotaControlLine: qMap.get(name) || qMap.get(extractBaseName(name)),
      makeupScore: undefined,
      schoolAddress2026: base.schoolAddress2026 || '',
      enrollmentPlan2026: base.enrollmentPlan2026 || '',
      maxWaiquPlan2026: base.maxWaiquPlan2026 || '',
      totalPlan2026: base.totalPlan2026 ?? null,
      totalDormitory2026: base.totalDormitory2026 ?? null,
    };
    results.push(record);
  }

  const matchedB3Names = new Set<string>();
  const matchedB4Names = new Set<string>();

  for (const b3 of batch3Data) {
    if (!schoolMap.has(b3.schoolName) && !schoolMap.has(extractBaseName(b3.schoolName))) {
      const baseKey = extractBaseName(b3.schoolName);
      const found = results.find(r =>
        r.schoolName.includes(baseKey) ||
        baseKey.includes(r.schoolName.replace(/\s*（[^）]*）/g, ''))
      );
      if (found && !found.batch3Records.some(r => r.year === b3.year && r.schoolName === b3.schoolName)) {
        found.batch3Records.push(b3);
        matchedB3Names.add(b3.schoolName);
      }
    } else {
      matchedB3Names.add(b3.schoolName);
    }
  }

  for (const b4 of batch4Data) {
    if (!schoolMap.has(b4.schoolName) && !schoolMap.has(extractBaseName(b4.schoolName))) {
      const baseKey = extractBaseName(b4.schoolName);
      const found = results.find(r =>
        r.schoolName.includes(baseKey) ||
        baseKey.includes(r.schoolName.replace(/\s*（[^）]*）/g, ''))
      );
      if (found && !found.batch4Records.some(r => r.year === b4.year && r.schoolName === b4.schoolName)) {
        found.batch4Records.push(b4);
        matchedB4Names.add(b4.schoolName);
      }
    } else {
      matchedB4Names.add(b4.schoolName);
    }
  }

  const orphanB3 = batch3Data.filter(b => !matchedB3Names.has(b.schoolName));
  const orphanB4 = batch4Data.filter(b => !matchedB4Names.has(b.schoolName));

  const orphanSchools = new Map<string, { b3: Batch3Score[]; b4: Batch4Score[] }>();
  for (const b3 of orphanB3) {
    const key = b3.schoolName;
    if (!orphanSchools.has(key)) orphanSchools.set(key, { b3: [], b4: [] });
    orphanSchools.get(key)!.b3.push(b3);
  }
  for (const b4 of orphanB4) {
    const key = b4.schoolName;
    if (!orphanSchools.has(key)) orphanSchools.set(key, { b3: [], b4: [] });
    orphanSchools.get(key)!.b4.push(b4);
  }

  for (const [schoolName, data] of orphanSchools) {
    const isMinban = schoolName.includes('民办') || schoolName.includes('附属') ||
      schoolName.includes('博萃德') || schoolName.includes('为明') || schoolName.includes('爱莎') ||
      schoolName.includes('新侨') || schoolName.includes('海华') || schoolName.includes('黄广');
    const isZhonghe = schoolName.includes('综合高中') || schoolName.includes('职业高级');

    let nature = '公办';
    let category = '普通高中';
    if (isMinban) nature = '民办';
    if (isZhonghe) category = '综合高中';

    let district = '';
    if (schoolName.includes('天河')) district = '天河区';
    else if (schoolName.includes('越秀')) district = '越秀区';
    else if (schoolName.includes('海珠')) district = '海珠区';
    else if (schoolName.includes('荔湾')) district = '荔湾区';
    else if (schoolName.includes('白云')) district = '白云区';
    else if (schoolName.includes('黄埔')) district = '黄埔区';
    else if (schoolName.includes('番禺')) district = '番禺区';
    else if (schoolName.includes('花都')) district = '花都区';
    else if (schoolName.includes('南沙')) district = '南沙区';
    else if (schoolName.includes('从化')) district = '从化区';
    else if (schoolName.includes('增城')) district = '增城区';

    // orphan 学校推断批次
    const orphanBatches: string[] = [];
    if (data.b3.length > 0) orphanBatches.push('三');
    if (data.b4.length > 0) orphanBatches.push('四');

    const record: SchoolRecord = {
      schoolCode: '',
      schoolName,
      affiliation: '',
      schoolNature: nature,
      schoolCategory: category,
      locationDistrict: district,
      admissionBatches: orphanBatches.sort().join('、'),
      batch2Score2025: null,
      gradient2025: '-',
      batch3Records: data.b3,
      batch4Records: data.b4,
      schoolAddress2026: '',
      enrollmentPlan2026: '',
      maxWaiquPlan2026: '',
      totalPlan2026: null,
      totalDormitory2026: null,
    };
    results.push(record);
  }

  const quota2026Data = parseXieheQuota2026(RAW_XIEHE_QUOTA_2026);
  const quota2025Data = parseXieheQuota2025(RAW_XIEHE_QUOTA_2025);
  const sendingData = parseXieheSendingDetails(RAW_XIEHE_SENDING_DETAILS);

  for (const q of quota2026Data) {
    const found = results.find(r => r.schoolName === q.schoolName);
    if (found) {
      found.xieheQuota2026 = q;
    }
  }

  // 2025年名额数（仅协和有名额的学校）
  for (const [schoolName, quota] of Object.entries(quota2025Data)) {
    const found = results.find(r => r.schoolName === schoolName);
    if (found) {
      found.xieheQuota2025 = quota;
    }
  }

  const sendingMap = new Map<string, XieheSendingRecord[]>();
  for (const s of sendingData) {
    if (!sendingMap.has(s.targetSchool)) sendingMap.set(s.targetSchool, []);
    sendingMap.get(s.targetSchool)!.push(s);
  }
  for (const [targetSchool, records] of sendingMap) {
    const found = results.find(r => r.schoolName === targetSchool);
    if (found) {
      found.xieheSendingRecords = records;
    }
  }

  const controlLineData = parseQuotaControlLines(RAW_QUOTA);
  const clNameMap: Record<string, string> = {
    '华南师范大学附属中学（石牌校区）': '华南师范大学附属中学（石牌校区）',
    '华南师范大学附属中学（知识城校区）': '华南师范大学附属中学（知识城校区）',
    '广东实验中学（荔湾校区）': '广东实验中学（荔湾校区）',
    '广东实验中学（白云校区）': '广东实验中学（白云校区）',
    '广东广雅中学（荔湾校区）': '广东广雅中学（荔湾校区）',
    '广东广雅中学（花都校区）': '广东广雅中学（花都校区）',
    '广州市执信中学（执信路校区）': '广州市执信中学（执信路校区）',
    '广州市执信中学（天河校区）': '广州市执信中学（天河校区）',
    '广州市第二中学': '广州市第二中学',
    '广州市第六中学（花都校区）': '广州市第六中学（花都校区）',
    '广州大学附属中学': '广州大学附属中学',
    '清华附中湾区学校（智慧城校区）': '清华附中湾区学校（智慧城校区）',
    '广州市第一中学': '广州市第一中学',
    '广州市第四中学': '广州市第四中学',
    '广州市南海中学': '广州市南海中学',
    '广州市西关外国语学校': '广州市西关外国语学校',
    '广州市真光中学（校本部）': '广州市真光中学（校本部）',
    '广州市真光中学（汾水校区）': '广州市真光中学（汾水校区）',
    '广州市真光中学（广钢校区）': '广州市真光中学（广钢校区）',
    '广州协和学校': '广州协和学校',
  };
  for (const cl of controlLineData) {
    const mappedName = clNameMap[cl.schoolName] || cl.schoolName;
    const found = results.find(r => r.schoolName === mappedName);
    if (found && found.xieheQuota2026 && cl.controlLine2026 !== null) {
      found.xieheControlLine2026 = cl.controlLine2026;
    }
  }

  // 步骤4: 近两年控制线对比数据（2025 vs 2026）
  const compareData = parseQuotaCompare2526(RAW_QUOTA_COMPARE_2526);
  for (const cp of compareData) {
    const found = results.find(r => r.schoolName === cp.schoolName);
    if (found) {
      found.quotaCompare2526 = {
        controlLine2025: cp.controlLine2025,
        changeValue: cp.changeValue,
        changeRate: cp.changeRate,
      };
    }
  }

  // 步骤5: 补录数据（嵌入在学校库2.18节）
  const makeupData = parseMakeupScores(RAW_SCHOOL_LIB);
  for (const mu of makeupData) {
    if (!mu.schoolName) continue;
    const found = results.find(r =>
      r.schoolName === mu.schoolName ||
      r.schoolName.includes(mu.schoolName!) ||
      mu.schoolName!.includes(r.schoolName.replace(/\s*（[^）]*）/g, ''))
    );
    if (found) {
      found.makeupScore = {
        normalBatch: mu.normalBatch,
        normalScore: mu.normalScore,
        makeupScore: mu.makeupScore,
        diff: mu.diff,
      };
    }
  }

  // 步骤6: 民办公费班/普通班批次数据清理
  for (const r of results) {
    if (r.schoolNature !== '民办') continue;
    if (r.schoolName.includes('（公费班）')) {
      r.batch4Records = [];
    } else {
      const baseName = extractBaseName(r.schoolName);
      const gfbName = baseName + '（公费班）';
      const hasGfbPair = results.some(x => x.schoolName === gfbName);
      if (hasGfbPair) {
        r.batch3Records = [];
      }
    }
  }

  // 步骤7: 2025年补录计划数据
  const makeupPlanData = parseMakeupPlan2025(RAW_MAKEUP_PLAN_2025);
  for (const mp of makeupPlanData) {
    const found = results.find(r => r.schoolName === mp.schoolName);
    if (found) {
      found.makeupPlan2025 = mp;
    } else {
      // 无法匹配现有学校，新增一行
      const district = extractDistrictFromName(mp.schoolName);
      const record: SchoolRecord = {
        schoolCode: '',
        schoolName: mp.schoolName,
        affiliation: '',
        schoolNature: mp.schoolNature,
        schoolCategory: '普通高中',
        locationDistrict: district,
        admissionBatches: '',
        batch2Score2025: null,
        gradient2025: '-',
        batch3Records: [],
        batch4Records: [],
        schoolAddress2026: '',
        enrollmentPlan2026: '',
        maxWaiquPlan2026: '',
        totalPlan2026: null,
        totalDormitory2026: null,
        makeupPlan2025: mp,
      };
      results.push(record);
    }
  }

  return results;
}

function extractDistrictFromName(schoolName: string): string {
  if (schoolName.includes('天河')) return '天河区';
  if (schoolName.includes('越秀')) return '越秀区';
  if (schoolName.includes('海珠')) return '海珠区';
  if (schoolName.includes('荔湾')) return '荔湾区';
  if (schoolName.includes('白云')) return '白云区';
  if (schoolName.includes('黄埔')) return '黄埔区';
  if (schoolName.includes('番禺')) return '番禺区';
  if (schoolName.includes('花都')) return '花都区';
  if (schoolName.includes('南沙')) return '南沙区';
  if (schoolName.includes('从化')) return '从化区';
  if (schoolName.includes('增城')) return '增城区';
  if (schoolName.includes('清远')) return '清远市';
  if (schoolName.includes('肇庆')) return '肇庆市';
  return '';
}

function extractBaseName(fullName: string): string {
  let name = fullName
    .replace(/\s*（[^）]*）\s*/g, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim();
  if (name.length < 4) name = fullName;
  return name;
}
