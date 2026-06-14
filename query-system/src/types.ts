export interface Batch3Score {
  schoolName: string;
  year: number;
  schoolNature: string;
  scope: string;
  hujiMinScore: number | null;
  hujiMinScoreRank: number | null;
  hujiLastVolunteerOrder: number | null;
  hujiLastScore: number | null;
  hujiLastScoreRank: number | null;
  waiquMinScore: number | null;
  waiquMinScoreRank: number | null;
  waiquLastVolunteerOrder: number | null;
  waiquLastScore: number | null;
  waiquLastScoreRank: number | null;
}

export interface Batch4Score {
  schoolName: string;
  year: number;
  schoolNature: string;
  scope: string;
  isHuji: boolean;
  minScore: number | null;
  minScoreRank: number | null;
  lastVolunteerOrder: number | null;
  lastScore: number | null;
  lastScoreRank: number | null;
}

export interface QuotaControlLine {
  schoolName: string;
  affiliation: string;
  category: string;
  score2023: number | null;
  score2024: number | null;
  score2025: number | null;
  avg3Year: number;
  controlLine2026: number;
}

export interface MakeupRecord {
  schoolName?: string;
  normalBatch: string;
  normalScore: number | null;
  makeupScore: number;
  diff: number | null;
}

export interface MakeupPlan2025 {
  schoolName: string;
  schoolNature: string;
  makeupPlan: number;
  makeupControlLine: number;
}

export interface XieheQuota2026 {
  schoolName: string;
  provinceQuota: number;
  districtQuota: number;
}

export interface XieheSendingRecord {
  targetSchool: string;
  year: number;
  minScore: number | null;
  minScoreRank: number | null;
  lastScore: number | null;
  lastVolunteerOrder: number | null;
  lastScoreRank: number | null;
}

export interface SchoolRecord {
  schoolCode: string;
  schoolName: string;
  affiliation: string;
  schoolNature: string;
  schoolCategory: string;
  locationDistrict: string;
  admissionBatches: string;
  batch3Records: Batch3Score[];
  batch4Records: Batch4Score[];
  quotaControlLine?: QuotaControlLine;
  makeupScore?: MakeupRecord;
  batch2Score2025: number | null;
  gradient2025: string;
  xieheQuota2026?: XieheQuota2026;
  xieheQuota2025?: number;
  xieheSendingRecords?: XieheSendingRecord[];
  xieheControlLine2026?: number;
  quotaCompare2526?: {
    controlLine2025: number;
    changeValue: number;
    changeRate: number;
  };
  schoolAddress2026: string;
  enrollmentPlan2026: string;
  maxWaiquPlan2026: string;
  totalPlan2026: number | null;
  totalDormitory2026: number | null;
  makeupPlan2025?: MakeupPlan2025;
}

export interface GradientLine {
  year: number;
  firstGradient: number;
  secondGradient: number;
  thirdGradient: number;
  fourthGradient: number;
  fifthGradient: number;
  sixthGradient: number | null;
  minControlLine: number;
}

export interface ScoreBand {
  score: number;
  cumulativeCount: number;
  cumulativeRatio: string;
  gradientMark?: string;
}

export interface FilterCriteria {
  keyword: string;
  batches: string[];
  years: number[];
  natures: string[];
  districts: string[];
  categories: string[];
  scopes: string[];
  minScore: number | null;
  maxScore: number | null;
  gradients: string[];
  showFavoritesOnly: boolean;
  distinguishOutside: boolean;
  batch2Min: number | null;
  batch2Max: number | null;
  b3_2025_Min: number | null; b3_2025_Max: number | null;
  b3_2025_hujiLastMin: number | null; b3_2025_hujiLastMax: number | null;
  b3_2025_waiquMin: number | null; b3_2025_waiquMax: number | null;
  b3_2025_waiquLastMin: number | null; b3_2025_waiquLastMax: number | null;
  b3_2024_Min: number | null; b3_2024_Max: number | null;
  b3_2024_hujiLastMin: number | null; b3_2024_hujiLastMax: number | null;
  b3_2024_waiquMin: number | null; b3_2024_waiquMax: number | null;
  b3_2024_waiquLastMin: number | null; b3_2024_waiquLastMax: number | null;
  b3_2023_Min: number | null; b3_2023_Max: number | null;
  b3_2023_hujiLastMin: number | null; b3_2023_hujiLastMax: number | null;
  b3_2023_waiquMin: number | null; b3_2023_waiquMax: number | null;
  b3_2023_waiquLastMin: number | null; b3_2023_waiquLastMax: number | null;
  b4_2025_Min: number | null; b4_2025_Max: number | null;
  b4_2025_lastMin: number | null; b4_2025_lastMax: number | null;
  b4_2024_Min: number | null; b4_2024_Max: number | null;
  b4_2024_lastMin: number | null; b4_2024_lastMax: number | null;
  b4_2023_Min: number | null; b4_2023_Max: number | null;
  b4_2023_lastMin: number | null; b4_2023_lastMax: number | null;
  quota26Min: number | null;
  quota26Max: number | null;
  xieheSendMin: number | null;
  xieheSendMax: number | null;
}

export type VolunteerOrder = '' | '二1' | '二2' | '二3' | '三1' | '三2' | '三3' | '三4' | '三5' | '三6' | '四1' | '四2' | '四3' | '四4' | '四5' | '四6';

export interface VolunteerAssignment {
  schoolName: string;
  order: VolunteerOrder;
}

// 多批次志愿（v2）
export type BatchVolunteerOrder = '' | '1' | '2' | '3' | '4' | '5' | '6';

export interface SchoolVolunteerOrders {
  batch2: BatchVolunteerOrder;
  batch3: BatchVolunteerOrder;
  batch4: BatchVolunteerOrder;
}

// 显示行（排序展开后使用）
export interface DisplayRow {
  school: SchoolRecord;
  volunteerKey: 'batch2' | 'batch3' | 'batch4';
  volunteerValue: string; // 如 "二1", "三2", ""
  isPrimary: boolean; // 是否是主行（非排序时只显示主行）
}
