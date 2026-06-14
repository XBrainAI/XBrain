import type { SchoolRecord } from '../types';
import { TABLE_HEADER_TOOLTIPS } from '../components/tooltipData';
import { getB3Field, getB4Field } from './fieldHelpers';

const VOLUNTEER_KEY_V2 = 'school_volunteer_orders_v2';

function getVolunteerValuesForExport(schoolName: string): string {
  try {
    const raw = localStorage.getItem(VOLUNTEER_KEY_V2);
    if (!raw) return '';
    const all = JSON.parse(raw);
    const orders = all[schoolName];
    if (!orders) return '';
    const result: string[] = [];
    if (orders.batch2) result.push(`二${orders.batch2}`);
    if (orders.batch3) result.push(`三${orders.batch3}`);
    if (orders.batch4) result.push(`四${orders.batch4}`);
    return result.join('、');
  } catch {
    return '';
  }
}

// 表头配置：字段名、显示名称、获取值的函数
interface ColumnConfig {
  field: string;
  header: string;
  getValue: (r: SchoolRecord, distinguishOutside: boolean) => string;
}

function getTooltipText(field: string): string {
  const tt = TABLE_HEADER_TOOLTIPS[field];
  if (!tt) return '';
  let text = tt.desc;
  if (tt.source) text += ` [来源: ${tt.source}]`;
  if (tt.note) text += ` [注意: ${tt.note}]`;
  return text;
}

export function exportToCsv(data: SchoolRecord[], distinguishOutside: boolean, filename = 'query_result.csv', sortedData?: SchoolRecord[]): void {
  // 使用传入的排序后数据，否则使用原始数据
  const exportData = sortedData && sortedData.length > 0 ? sortedData : data;
  // 定义所有列的配置
  const columns: ColumnConfig[] = [
    {
      field: 'volunteerOrder',
      header: '志愿',
      getValue: (r) => getVolunteerValuesForExport(r.schoolName),
    },
    {
      field: 'schoolName',
      header: '学校名称',
      getValue: (r) => r.schoolName,
    },
    {
      field: 'schoolNature',
      header: '性质',
      getValue: (r) => r.schoolNature,
    },
    {
      field: 'schoolCategory',
      header: '类别',
      getValue: (r) => r.schoolCategory,
    },
    {
      field: 'locationDistrict',
      header: '区域',
      getValue: (r) => r.locationDistrict,
    },
    {
      field: 'admissionBatches',
      header: '批次',
      getValue: (r) => r.admissionBatches,
    },
    {
      field: 'gradient2025',
      header: '梯度·统招25',
      getValue: (r) => r.gradient2025 || '',
    },
    // 第二批
    {
      field: 'xieheQuota26',
      header: '控·26',
      getValue: (r) => r.xieheControlLine2026?.toString() || '',
    },
    {
      field: 'xieheQuotaNum',
      header: '名额数·26',
      getValue: (r) => r.xieheQuota2026?.provinceQuota?.toString() || '',
    },
    {
      field: 'quotaCompare25',
      header: '控·25',
      getValue: (r) => r.quotaCompare2526?.controlLine2025?.toString() || '',
    },
    {
      field: 'batch2Score2025',
      header: '录·25',
      getValue: (r) => r.batch2Score2025?.toString() || '',
    },
    {
      field: 'xieheSendLast25',
      header: '末分·25',
      getValue: (r) => r.xieheSendingRecords?.find(s => s.year === 2025)?.lastScore?.toString() || '',
    },
    {
      field: 'xieheSendLastVol25',
      header: '末志·25',
      getValue: (r) => r.xieheSendingRecords?.find(s => s.year === 2025)?.lastVolunteerOrder?.toString() || '',
    },
    {
      field: 'xieheQuotaNum25',
      header: '名额数·25',
      getValue: (r) => r.xieheQuota2025?.toString() || '',
    },
    {
      field: 'quotaChangeValue',
      header: '控变化·26vs25',
      getValue: (r) => r.quotaCompare2526?.changeValue?.toString() || '',
    },
    {
      field: 'b2Min3y',
      header: '录分·三年',
      getValue: (r) => {
        const vals = [2025, 2024, 2023].map(y => r.xieheSendingRecords?.find(s => s.year === y)?.minScore);
        return vals.map(v => v?.toString() ?? '--').join('->');
      },
    },
    {
      field: 'b2MinAvg',
      header: '录分·均值',
      getValue: (r) => {
        const vals = [2025, 2024, 2023].map(y => r.xieheSendingRecords?.find(s => s.year === y)?.minScore).filter((v): v is number => v != null);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      },
    },
    {
      field: 'b2Last3y',
      header: '末分·三年',
      getValue: (r) => {
        const vals = [2025, 2024, 2023].map(y => r.xieheSendingRecords?.find(s => s.year === y)?.lastScore);
        return vals.map(v => v?.toString() ?? '--').join('->');
      },
    },
    {
      field: 'b2LastAvg',
      header: '末分·均值',
      getValue: (r) => {
        const vals = [2025, 2024, 2023].map(y => r.xieheSendingRecords?.find(s => s.year === y)?.lastScore).filter((v): v is number => v != null);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      },
    },
    {
      field: 'b2LastVol3y',
      header: '末志·三年',
      getValue: (r) => {
        const vals = [2025, 2024, 2023].map(y => r.xieheSendingRecords?.find(s => s.year === y)?.lastVolunteerOrder);
        return vals.map(v => v?.toString() ?? '--').join('->');
      },
    },
    // 第三批 2025
    {
      field: 'b3_2025hujiMin',
      header: '户·录分25',
      getValue: (r, d) => getB3Field(r, 2025, 'hujiMin', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2025hujiLast',
      header: '户·末分25',
      getValue: (r, d) => getB3Field(r, 2025, 'hujiLast', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2025hujiLastVol',
      header: '户·末志25',
      getValue: (r, d) => getB3Field(r, 2025, 'hujiLastVol', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2025waiquMin',
      header: '外·录分25',
      getValue: (r, d) => getB3Field(r, 2025, 'waiquMin', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2025waiquLast',
      header: '外·末分25',
      getValue: (r, d) => getB3Field(r, 2025, 'waiquLast', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2025waiquLastVol',
      header: '外·末志25',
      getValue: (r, d) => getB3Field(r, 2025, 'waiquLastVol', d).value?.toString() ?? '',
    },
    // 第三批 2024
    {
      field: 'b3_2024hujiMin',
      header: '户·录分24',
      getValue: (r, d) => getB3Field(r, 2024, 'hujiMin', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2024hujiLast',
      header: '户·末分24',
      getValue: (r, d) => getB3Field(r, 2024, 'hujiLast', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2024hujiLastVol',
      header: '户·末志24',
      getValue: (r, d) => getB3Field(r, 2024, 'hujiLastVol', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2024waiquMin',
      header: '外·录分24',
      getValue: (r, d) => getB3Field(r, 2024, 'waiquMin', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2024waiquLast',
      header: '外·末分24',
      getValue: (r, d) => getB3Field(r, 2024, 'waiquLast', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2024waiquLastVol',
      header: '外·末志24',
      getValue: (r, d) => getB3Field(r, 2024, 'waiquLastVol', d).value?.toString() ?? '',
    },
    // 第三批 2023
    {
      field: 'b3_2023hujiMin',
      header: '户·录分23',
      getValue: (r, d) => getB3Field(r, 2023, 'hujiMin', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2023hujiLast',
      header: '户·末分23',
      getValue: (r, d) => getB3Field(r, 2023, 'hujiLast', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2023hujiLastVol',
      header: '户·末志23',
      getValue: (r, d) => getB3Field(r, 2023, 'hujiLastVol', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2023waiquMin',
      header: '外·录分23',
      getValue: (r, d) => getB3Field(r, 2023, 'waiquMin', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2023waiquLast',
      header: '外·末分23',
      getValue: (r, d) => getB3Field(r, 2023, 'waiquLast', d).value?.toString() ?? '',
    },
    {
      field: 'b3_2023waiquLastVol',
      header: '外·末志23',
      getValue: (r, d) => getB3Field(r, 2023, 'waiquLastVol', d).value?.toString() ?? '',
    },
    // 第三批均值
    {
      field: 'b3HujiMinAvg',
      header: '户录·均值',
      getValue: (r, d) => {
        const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'hujiMin', d).value).filter((v): v is number => v != null);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      },
    },
    {
      field: 'b3HujiLastAvg',
      header: '户末分·均值',
      getValue: (r, d) => {
        const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'hujiLast', d).value).filter((v): v is number => v != null);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      },
    },
    {
      field: 'b3WaiquMinAvg',
      header: '外录·均值',
      getValue: (r, d) => {
        const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'waiquMin', d).value).filter((v): v is number => v != null);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      },
    },
    {
      field: 'b3WaiquLastAvg',
      header: '外末分·均值',
      getValue: (r, d) => {
        const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'waiquLast', d).value).filter((v): v is number => v != null);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      },
    },
    // 第四批
    {
      field: 'b4_2025min',
      header: '录分25',
      getValue: (r) => getB4Field(r, 2025, 'min')?.toString() ?? '',
    },
    {
      field: 'b4_2025last',
      header: '末分25',
      getValue: (r) => getB4Field(r, 2025, 'last')?.toString() ?? '',
    },
    {
      field: 'b4_2025lastVol',
      header: '末志25',
      getValue: (r) => getB4Field(r, 2025, 'lastVol')?.toString() ?? '',
    },
    {
      field: 'b4_2024min',
      header: '录分24',
      getValue: (r) => getB4Field(r, 2024, 'min')?.toString() ?? '',
    },
    {
      field: 'b4_2024last',
      header: '末分24',
      getValue: (r) => getB4Field(r, 2024, 'last')?.toString() ?? '',
    },
    {
      field: 'b4_2024lastVol',
      header: '末志24',
      getValue: (r) => getB4Field(r, 2024, 'lastVol')?.toString() ?? '',
    },
    {
      field: 'b4_2023min',
      header: '录分23',
      getValue: (r) => getB4Field(r, 2023, 'min')?.toString() ?? '',
    },
    {
      field: 'b4_2023last',
      header: '末分23',
      getValue: (r) => getB4Field(r, 2023, 'last')?.toString() ?? '',
    },
    {
      field: 'b4_2023lastVol',
      header: '末志23',
      getValue: (r) => getB4Field(r, 2023, 'lastVol')?.toString() ?? '',
    },
    // 补录
    {
      field: 'makeupNormal',
      header: '补正常分',
      getValue: (r) => r.makeupScore?.normalScore?.toString() ?? '',
    },
    {
      field: 'makeupScore',
      header: '补录分',
      getValue: (r) => r.makeupScore?.makeupScore?.toString() ?? '',
    },
    {
      field: 'makeupDiff',
      header: '补差值',
      getValue: (r) => r.makeupScore?.diff?.toString() ?? '',
    },
    {
      field: 'makeupPlan2025',
      header: '补录计划',
      getValue: (r) => r.makeupPlan2025?.makeupPlan?.toString() ?? '',
    },
    {
      field: 'makeupControlLine2025',
      header: '补录控制线',
      getValue: (r) => r.makeupPlan2025?.makeupControlLine?.toString() ?? '',
    },
    // 计划
    {
      field: 'enrollmentPlan2026',
      header: '第三批计划人数',
      getValue: (r) => r.enrollmentPlan2026?.toString() ?? '',
    },
    {
      field: 'maxWaiquPlan2026',
      header: '外区人数',
      getValue: (r) => r.maxWaiquPlan2026?.toString() ?? '',
    },
    {
      field: 'totalPlan2026',
      header: '总计划',
      getValue: (r) => r.totalPlan2026?.toString() ?? '',
    },
    {
      field: 'totalDormitory2026',
      header: '总宿位',
      getValue: (r) => r.totalDormitory2026?.toString() ?? '',
    },
  ];

  // 构建表头行（包含tips）
  const headerNames = columns.map(c => c.header);
  const headerTips = columns.map(c => getTooltipText(c.field));

  const rows: string[][] = [headerNames, headerTips];

  // 构建数据行
  const debugVolunteers: { name: string; val: string }[] = [];
  for (const r of exportData) {
    const row = columns.map(c => c.getValue(r, distinguishOutside));
    rows.push(row);
    // 调试志愿列
    const volunteerIdx = columns.findIndex(c => c.field === 'volunteerOrder');
    if (volunteerIdx >= 0) {
      debugVolunteers.push({ name: r.schoolName, val: row[volunteerIdx] });
    }
  }
  console.log('[DEBUG] 志愿导出结果:', debugVolunteers.filter(v => v.val).slice(0, 5), `... 共${debugVolunteers.length}所学校, ${debugVolunteers.filter(v => v.val).length}所有志愿`);
  console.log('[DEBUG] localStorage 原始数据:', localStorage.getItem(VOLUNTEER_KEY_V2)?.substring(0, 200));
  console.log('[DEBUG] data 第一所学校名:', exportData[0]?.schoolName);

  // 使用Excel XML格式实现表格框线和粗体表头
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Vertical="Center" ss:Horizontal="Center"/>
      <Font ss:Bold="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
      <Interior ss:Color="#D9E1F2" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="TipRow">
      <Alignment ss:Vertical="Center"/>
      <Font ss:Italic="1" ss:Color="#666666" ss:Size="9"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="查询结果">
    <Table>`;

  const xmlFooter = `
    </Table>
  </Worksheet>
</Workbook>`;

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  let xmlRows = '';
  rows.forEach((row, rowIdx) => {
    const styleId = rowIdx === 0 ? 'Header' : rowIdx === 1 ? 'TipRow' : 'Default';
    xmlRows += '\n      <Row>';
    row.forEach(cell => {
      const val = cell ?? '';
      // 尝试解析为数字
      const numVal = Number(val);
      const isNum = val !== '' && !isNaN(numVal) && String(numVal) === val;
      if (isNum) {
        xmlRows += `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${numVal}</Data></Cell>`;
      } else {
        xmlRows += `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
      }
    });
    xmlRows += '</Row>';
  });

  const xmlContent = xmlHeader + xmlRows + xmlFooter;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  // 修改扩展名为.xls以便Excel直接打开
  const xlsFilename = filename.replace(/\.csv$/i, '.xls');
  link.setAttribute('download', xlsFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
