/* ============================================================
   grade-insight 数据文件（快照真源）
   ------------------------------------------------------------
   作用：
   1) 首次打开（localStorage 为空）时，GRADE_SNAPSHOT 作为种子数据载入；
   2) 「设置 → 导出 data.js 快照」会生成同格式文本，替换本文件内容
      并提交到仓库后，即可作为备份 / 多设备同步源（Netlify 重新部署）。
   隐私提示：快照一旦提交进 git，历史记录不受站点密码保护，请自行斟酌。
   ============================================================ */

/* ---------- 默认配置（导入旧快照缺省时的兜底） ---------- */
window.GI_DEFAULTS = {
  schema: 1,
  student: {
    name: '演示学生',
    studentId: 's1',
    enrollYear: 2025,          /* 高一入学年份，用于从考试日期自动推算学段 */
    targetRate: 0.80           /* 高考目标总分得分率（0-1） */
  },
  subjects: [
    { key: 'chinese',   name: '语文', full: 150 },
    { key: 'math',      name: '数学', full: 150 },
    { key: 'english',   name: '英语', full: 150 },
    { key: 'physics',   name: '物理', full: 100 },
    { key: 'chemistry', name: '化学', full: 100 },
    { key: 'biology',   name: '生物', full: 100 },
    { key: 'politics',  name: '政治', full: 100 },
    { key: 'history',   name: '历史', full: 100 },
    { key: 'geography', name: '地理', full: 100 }
  ],
  /* 考试性质：日常不定期 / 周期性 / 阶段性 / 大型统考（可自定义增减） */
  examTypes: ['摸底/分班', '随堂', '周测', '月考', '期中', '期末', '联考/区统考', '模考'],
  terms: ['高一上', '高一下', '高二上', '高二下', '高三上', '高三下'],
  /* 趋势页的考试性质分组筛选 */
  typeGroups: [
    { key: 'all',      name: '全部',           types: null },
    { key: 'daily',    name: '日常',           types: ['随堂', '周测'] },
    { key: 'monthly',  name: '月考',           types: ['月考'] },
    { key: 'stage',    name: '期中/期末',      types: ['期中', '期末'] },
    { key: 'joint',    name: '联考/统考',      types: ['联考/区统考'] },
    { key: 'mock',     name: '模考',           types: ['模考'] },
    { key: 'baseline', name: '摸底/分班',      types: ['摸底/分班'] }
  ]
};

/* ---------- 数据快照（种子 / 手动同步源） ----------
   字段说明（exam.subjects 每项）：
   key 科目key · full 本次满分（可与默认不同） · score 得分（null=缺考/未考）
   avgClass 班级均分 · avgGrade 年级均分 · rank 年级排名 · rankSize 年级人数
   level 等级（选填，如 A/B/C）；exam.totalRank/totalRankSize 总分年级排名
------------------------------------------------------------- */
window.GRADE_SNAPSHOT = {
  schema: 1,
  sample: true,
  exportedAt: '2026-09-06T09:00:00',
  student: {
    name: '演示学生',
    studentId: 's1',
    enrollYear: 2025,
    targetRate: 0.80
  },
  subjects: [
    { key: 'chinese',   name: '语文', full: 150 },
    { key: 'math',      name: '数学', full: 150 },
    { key: 'english',   name: '英语', full: 150 },
    { key: 'physics',   name: '物理', full: 100 },
    { key: 'chemistry', name: '化学', full: 100 },
    { key: 'biology',   name: '生物', full: 100 },
    { key: 'politics',  name: '政治', full: 100 },
    { key: 'history',   name: '历史', full: 100 },
    { key: 'geography', name: '地理', full: 100 }
  ],
  exams: [
    {
      id: 'ex-2025-08-25',
      name: '高一入学摸底考',
      date: '2025-08-25',
      term: '高一上',
      type: '摸底/分班',
      note: '初中衔接摸底，用于分班参考',
      subjects: [
        { key: 'chinese', full: 150, score: 132, avgGrade: 118.5, rank: 45,  rankSize: 540 },
        { key: 'math',    full: 150, score: 118, avgGrade: 102.3, rank: 88,  rankSize: 540 },
        { key: 'english', full: 150, score: 128, avgGrade: 115.8, rank: 38,  rankSize: 540 },
        { key: 'physics', full: 100, score: 82,  avgGrade: 71.2,  rank: 76,  rankSize: 540 },
        { key: 'chemistry', full: 100, score: 78, avgGrade: 68.5, rank: 92, rankSize: 540 }
      ],
      totalRank: 96, totalRankSize: 540
    },
    {
      id: 'ex-2025-10-08',
      name: '高一上第一次月考',
      date: '2025-10-08',
      term: '高一上',
      type: '月考',
      note: '数学满分 120（与期末 150 不同），已按得分率归一',
      subjects: [
        { key: 'chinese', full: 150, score: 126, avgGrade: 112.4, rank: 88,  rankSize: 540 },
        { key: 'math',    full: 120, score: 95,  avgGrade: 88.6,  rank: 156, rankSize: 540 },
        { key: 'english', full: 150, score: 119, avgGrade: 108.2, rank: 52,  rankSize: 540 },
        { key: 'physics', full: 100, score: 76,  avgGrade: 66.8,  rank: 120, rankSize: 540 }
      ],
      totalRank: 138, totalRankSize: 540
    },
    {
      id: 'ex-2025-11-12',
      name: '高一上期中考试',
      date: '2025-11-12',
      term: '高一上',
      type: '期中',
      note: '九科全考',
      subjects: [
        { key: 'chinese',   full: 150, score: 129, avgGrade: 115.6, rank: 61,  rankSize: 540 },
        { key: 'math',      full: 120, score: 102, avgGrade: 90.1,  rank: 132, rankSize: 540 },
        { key: 'english',   full: 150, score: 131, avgGrade: 114.0, rank: 40,  rankSize: 540 },
        { key: 'physics',   full: 100, score: 84,  avgGrade: 70.9,  rank: 95,  rankSize: 540 },
        { key: 'chemistry', full: 100, score: 81,  avgGrade: 69.3,  rank: 118, rankSize: 540 },
        { key: 'biology',   full: 100, score: 86,  avgGrade: 72.5,  rank: 84,  rankSize: 540 },
        { key: 'politics',  full: 100, score: 83,  avgGrade: 74.8,  rank: 102, rankSize: 540 },
        { key: 'history',   full: 100, score: 85,  avgGrade: 76.2,  rank: 90,  rankSize: 540 },
        { key: 'geography', full: 100, score: 79,  avgGrade: 71.4,  rank: 138, rankSize: 540 }
      ],
      totalRank: 84, totalRankSize: 540
    },
    {
      id: 'ex-2025-12-08',
      name: '高一上第二次月考',
      date: '2025-12-08',
      term: '高一上',
      type: '月考',
      note: '数学发挥失常，需要重点关注',
      subjects: [
        { key: 'chinese', full: 150, score: 122, avgClass: 110.8, avgGrade: 113.1, rank: 110, rankSize: 540 },
        { key: 'math',    full: 120, score: 88,  avgClass: 87.4,  avgGrade: 91.2,  rank: 210, rankSize: 540 },
        { key: 'english', full: 150, score: 135, avgClass: 112.6, avgGrade: 115.3, rank: 22,  rankSize: 540 },
        { key: 'physics', full: 100, score: 80,  avgClass: 65.9,  avgGrade: 68.4,  rank: 130, rankSize: 540 }
      ],
      totalRank: 158, totalRankSize: 540
    },
    {
      id: 'ex-2026-01-19',
      name: '高一上期末考试',
      date: '2026-01-19',
      term: '高一上',
      type: '期末',
      note: '区统一命题，数学期末恢复 150 分制',
      subjects: [
        { key: 'chinese',   full: 150, score: 130, avgGrade: 117.8, rank: 72,  rankSize: 540 },
        { key: 'math',      full: 150, score: 108, avgGrade: 96.5,  rank: 120, rankSize: 540 },
        { key: 'english',   full: 150, score: 138, avgGrade: 118.6, rank: 18,  rankSize: 540 },
        { key: 'physics',   full: 100, score: 87,  avgGrade: 72.6,  rank: 78,  rankSize: 540 },
        { key: 'chemistry', full: 100, score: 84,  avgGrade: 70.8,  rank: 105, rankSize: 540 },
        { key: 'biology',   full: 100, score: 88,  avgGrade: 74.1,  rank: 76,  rankSize: 540 },
        { key: 'politics',  full: 100, score: 80,  avgGrade: 75.6,  rank: 145, rankSize: 540 },
        { key: 'history',   full: 100, score: 86,  avgGrade: 77.3,  rank: 82,  rankSize: 540 },
        { key: 'geography', full: 100, score: 82,  avgGrade: 73.5,  rank: 115, rankSize: 540 }
      ],
      totalRank: 68, totalRankSize: 540
    },
    {
      id: 'ex-2026-03-10',
      name: '高一下第一次月考',
      date: '2026-03-10',
      term: '高一下',
      type: '月考',
      note: '',
      subjects: [
        { key: 'chinese', full: 150, score: 127, avgClass: 113.5, avgGrade: 116.2, rank: 95,  rankSize: 540 },
        { key: 'math',    full: 150, score: 102, avgClass: 96.2,  avgGrade: 99.8,  rank: 175, rankSize: 540 },
        { key: 'english', full: 150, score: 133, avgClass: 117.4, avgGrade: 119.0, rank: 35,  rankSize: 540 },
        { key: 'physics', full: 100, score: 85,  avgClass: 70.3,  avgGrade: 73.2,  rank: 88,  rankSize: 540 },
        { key: 'chemistry', full: 100, score: 82, avgClass: 69.1, avgGrade: 71.5, rank: 112, rankSize: 540 },
        { key: 'biology', full: 100, score: 87,  avgClass: 72.0,  avgGrade: 74.6,  rank: 80,  rankSize: 540 }
      ],
      totalRank: 102, totalRankSize: 540
    },
    {
      id: 'ex-2026-04-22',
      name: '高一下期中考试',
      date: '2026-04-22',
      term: '高一下',
      type: '期中',
      note: '九科全考，选科分班前最后一次全科排名',
      subjects: [
        { key: 'chinese',   full: 150, score: 131, avgGrade: 117.0, rank: 68,  rankSize: 540 },
        { key: 'math',      full: 150, score: 111, avgGrade: 101.4, rank: 130, rankSize: 540 },
        { key: 'english',   full: 150, score: 136, avgGrade: 120.2, rank: 25,  rankSize: 540 },
        { key: 'physics',   full: 100, score: 89,  avgGrade: 74.8,  rank: 65,  rankSize: 540 },
        { key: 'chemistry', full: 100, score: 86,  avgGrade: 72.9,  rank: 92,  rankSize: 540 },
        { key: 'biology',   full: 100, score: 90,  avgGrade: 75.3,  rank: 58,  rankSize: 540 },
        { key: 'politics',  full: 100, score: 82,  avgGrade: 76.0,  rank: 130, rankSize: 540 },
        { key: 'history',   full: 100, score: 87,  avgGrade: 77.8,  rank: 75,  rankSize: 540 },
        { key: 'geography', full: 100, score: 81,  avgGrade: 72.9,  rank: 120, rankSize: 540 }
      ],
      totalRank: 62, totalRankSize: 540
    },
    {
      id: 'ex-2026-06-24',
      name: '高一下期末区统考',
      date: '2026-06-24',
      term: '高一下',
      type: '联考/区统考',
      note: '区统一阅卷，排名口径为全区分母（2380 人）',
      subjects: [
        { key: 'chinese', full: 150, score: 129, avgGrade: 112.6, rank: 71,  rankSize: 2380 },
        { key: 'math',    full: 150, score: 118, avgGrade: 103.5, rank: 118, rankSize: 2380 },
        { key: 'english', full: 150, score: 140, avgGrade: 121.3, rank: 15,  rankSize: 2380 },
        { key: 'physics', full: 100, score: 90,  avgGrade: 72.1,  rank: 70,  rankSize: 2380 },
        { key: 'chemistry', full: 100, score: 87, avgGrade: 70.4, rank: 85, rankSize: 2380 },
        { key: 'biology', full: 100, score: 91,  avgGrade: 73.8,  rank: 55,  rankSize: 2380 }
      ],
      totalRank: 58, totalRankSize: 2380
    },
    {
      id: 'ex-2026-09-03',
      name: '高二开学摸底考',
      date: '2026-09-03',
      term: '高二上',
      type: '摸底/分班',
      note: '选科（物化生）后首考',
      subjects: [
        { key: 'chinese', full: 150, score: 134, avgGrade: 118.9, rank: 44,  rankSize: 540 },
        { key: 'math',    full: 150, score: 109, avgGrade: 105.8, rank: 140, rankSize: 540 },
        { key: 'english', full: 150, score: 137, avgGrade: 122.0, rank: 30,  rankSize: 540 },
        { key: 'physics', full: 100, score: 88,  avgGrade: 74.6,  rank: 72,  rankSize: 540 },
        { key: 'chemistry', full: 100, score: 85, avgGrade: 71.8, rank: 100, rankSize: 540 },
        { key: 'biology', full: 100, score: 89,  avgGrade: 75.0,  rank: 62,  rankSize: 540 }
      ],
      totalRank: 55, totalRankSize: 540
    }
  ]
};
