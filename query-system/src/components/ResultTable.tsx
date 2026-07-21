import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, Search } from 'lucide-react';
import { TABLE_HEADER_TOOLTIPS } from './tooltipData';
import { isFavorite, toggleFavorite, getSchoolVolunteerOrders, setBatchVolunteerOrder, getSchoolVolunteerValues, isBatchOrderUsed } from '../utils/filterEngine';
import { getB3Field, getB4Field, isLaosanqu } from '../utils/fieldHelpers';
import type { BatchVolunteerOrder, SchoolRecord } from '../types';
import SchoolDetailModal from './SchoolDetailModal';

interface ResultTableProps {
  data: SchoolRecord[];
  onSelectSchool: (school: SchoolRecord) => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  favoritesVersion?: number;
  distinguishOutside?: boolean;
}

// 辅助组件：根据字段折叠状态决定是否渲染单元格
// 该组件需在 ResultTable 内部使用，通过闭包访问 getFieldCollapseState
// 此处仅作类型定义，实际逻辑在组件内部实现

function ScoreBadge({ score, label, masked = false }: { score: number | null | undefined; label?: string; masked?: boolean }) {
  if (score === null || score === undefined) return <span className="score-empty">--</span>;
  if (masked) return <span className="score-masked" title={label}>{score}</span>;
  let cls = 'score-value';
  if (score >= 707) cls += ' score-g1';
  else if (score >= 667) cls += ' score-g2';
  else if (score >= 627) cls += ' score-g3';
  else if (score >= 587) cls += ' score-g4';
  else if (score >= 547) cls += ' score-g5';
  else if (score >= 507) cls += ' score-g6';
  else cls += ' score-min';

  return <span className={cls} title={label}>{score}</span>;
}

function GradientTag({ gradient }: { gradient: string }) {
  if (!gradient || gradient === '-') return null;
  const map: Record<string, string> = {
    '第一梯度': 'g1', '第二梯度': 'g2', '第三梯度': 'g3',
    '第四梯度': 'g4', '第五梯度': 'g5', '第六梯度': 'g6',
    '普高最低线': 'gmin',
  };
  const shortMap: Record<string, string> = {
    '第一梯度': '一', '第二梯度': '二', '第三梯度': '三',
    '第四梯度': '四', '第五梯度': '五', '第六梯度': '六',
    '普高最低线': '普',
  };
  return <span className={`gtag ${map[gradient] || ''}`} title={gradient}>{shortMap[gradient] || gradient}</span>;
}



function formatBatchShort(batches: string): string {
  return batches
    .replace(/第一批/g, '一')
    .replace(/第二批/g, '二')
    .replace(/第三批/g, '三')
    .replace(/第四批/g, '四');
}

function getBatchStyle(batch: 'batch2' | 'batch3' | 'batch4'): { bg: string; color: string; border: string } {
  switch (batch) {
    case 'batch2': return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' };
    case 'batch3': return { bg: '#dcfce7', color: '#166534', border: '#86efac' };
    case 'batch4': return { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' };
  }
}

function batchToPrefix(batch: 'batch2' | 'batch3' | 'batch4'): string {
  return batch === 'batch2' ? '二' : batch === 'batch3' ? '三' : '四';
}

function getVolunteerSortKey(values: string[]): string {
  if (values.length === 0) return 'Z';
  // 按批次+序号排序，返回第一个（最小的）作为排序键
  const batchMap: Record<string, number> = { '二': 2, '三': 3, '四': 4 };
  const sorted = [...values].sort((a, b) => {
    const ba = batchMap[a.charAt(0)] || 9;
    const bb = batchMap[b.charAt(0)] || 9;
    if (ba !== bb) return ba - bb;
    return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
  });
  return sorted[0];
}

function VolunteerSelect({ schoolName, admissionBatches, quotaNum26, activeBatch, onChange }: { schoolName: string; admissionBatches: string; quotaNum26?: number; activeBatch?: 'batch2' | 'batch3' | 'batch4' | null; onChange?: () => void }) {
  const [orders, setOrders] = useState(() => getSchoolVolunteerOrders(schoolName));
  const [openBatch, setOpenBatch] = useState<'batch2' | 'batch3' | 'batch4' | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 判断学校是否有某批次招生
  const hasBatch = (batch: 'batch2' | 'batch3' | 'batch4') => {
    const prefix = batchToPrefix(batch);
    return admissionBatches.includes(prefix);
  };

  // 判断是否允许选择第二批次志愿：名额数·26有值
  const canSelectBatch2 = quotaNum26 != null && quotaNum26 > 0;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenBatch(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (openBatch && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 200; // 下拉框最大高度
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top: number;
      let left: number;

      // 如果下方空间不足且上方空间充足，则向上弹出
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = rect.top - dropdownHeight - gap;
      } else {
        top = rect.bottom + gap;
      }

      left = rect.left;

      // 确保不超出视口右边界
      const dropdownWidth = 80;
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - gap;
      }
      // 确保不超出视口左边界
      if (left < gap) left = gap;

      // 确保不超出视口底部
      if (top + dropdownHeight > window.innerHeight) {
        top = window.innerHeight - dropdownHeight - gap;
      }
      // 确保不超出视口顶部
      if (top < gap) top = gap;

      setPos({ top, left });
    }
  }, [openBatch]);

  const handleSelect = (batch: 'batch2' | 'batch3' | 'batch4', order: BatchVolunteerOrder) => {
    setBatchVolunteerOrder(schoolName, batch, order);
    setOrders(getSchoolVolunteerOrders(schoolName));
    setOpenBatch(null);
    onChange?.();
  };

  // 判断是否淡化：当排序状态下，当前行的 activeBatch 与标签批次不同时淡化
  const isDimmed = (batch: 'batch2' | 'batch3' | 'batch4') => {
    if (activeBatch == null) return false; // 非排序状态不淡化
    return activeBatch !== batch;
  };

  const renderTag = (batch: 'batch2' | 'batch3' | 'batch4') => {
    const order = orders[batch];
    if (!order) return null;
    const style = getBatchStyle(batch);
    const prefix = batchToPrefix(batch);
    const dimmed = isDimmed(batch);
    return (
      <button
        key={batch}
        className="volunteer-tag"
        onClick={(e) => { e.stopPropagation(); setOpenBatch(batch); }}
        style={{
          display: 'inline-block',
          width: '32px',
          height: '18px',
          fontSize: '10px',
          padding: '0',
          border: `1px solid ${dimmed ? '#d1d5db' : style.border}`,
          borderRadius: '3px',
          background: dimmed ? '#f3f4f6' : style.bg,
          color: dimmed ? '#9ca3af' : style.color,
          cursor: 'pointer',
          textAlign: 'center',
          fontWeight: dimmed ? 400 : 600,
          lineHeight: '16px',
          opacity: dimmed ? 0.5 : 1,
        }}
      >
        {prefix}{order}
      </button>
    );
  };

  const renderAddBtn = (batch: 'batch2' | 'batch3' | 'batch4') => {
    if (!hasBatch(batch)) return null;
    // 第二批次额外检查：名额数·26必须有值
    if (batch === 'batch2' && !canSelectBatch2) return null;
    const order = orders[batch];
    if (order) return null; // 已选则不显示+
    const style = getBatchStyle(batch);
    const dimmed = isDimmed(batch);
    return (
      <button
        key={`add-${batch}`}
        className="volunteer-add"
        onClick={(e) => { e.stopPropagation(); setOpenBatch(batch); }}
        style={{
          display: 'inline-block',
          width: '32px',
          height: '18px',
          fontSize: '12px',
          padding: '0',
          border: `1px dashed ${dimmed ? '#d1d5db' : style.border}`,
          borderRadius: '3px',
          background: 'transparent',
          color: dimmed ? '#9ca3af' : style.color,
          cursor: 'pointer',
          textAlign: 'center',
          lineHeight: '16px',
          opacity: dimmed ? 0.3 : 0.6,
        }}
        title={`选择${batchToPrefix(batch)}批志愿`}
      >
        +
      </button>
    );
  };

  const batchOrder = ['batch2', 'batch3', 'batch4'] as const;

  return (
    <div ref={containerRef} className="volunteer-select" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {batchOrder.map(batch => renderTag(batch))}
      {batchOrder.map(batch => renderAddBtn(batch))}
      {openBatch && (() => {
        const batch = openBatch;
        const style = getBatchStyle(batch);
        const currentOrder = orders[batch];
        // 根据批次动态生成志愿选项：第二批只有1-3志愿，第三批和第四批有1-6志愿
        const numOptions: BatchVolunteerOrder[] = batch === 'batch2' ? ['', '1', '2', '3'] : ['', '1', '2', '3', '4', '5', '6'];
        const prefix = batchToPrefix(batch);
        return createPortal(
          <div className="volunteer-dropdown" style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 10000,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '56px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            <div style={{ padding: '4px 8px', fontSize: '10px', color: '#64748b', borderBottom: '1px solid #f1f5f9', background: style.bg }}>
              第{prefix}批
            </div>
            {numOptions.map(opt => {
              const isUsed = opt !== '' && opt !== currentOrder && isBatchOrderUsed(batch, opt, schoolName);
              const isSelected = opt === currentOrder;
              return (
                <div
                  key={opt}
                  className={`volunteer-option ${isUsed ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); if (!isUsed) handleSelect(batch, opt); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    cursor: isUsed ? 'not-allowed' : 'pointer',
                    color: isUsed ? '#94a3b8' : isSelected ? style.color : '#334155',
                    background: isUsed ? '#f1f5f9' : isSelected ? style.bg : '#fff',
                    borderBottom: '1px solid #f1f5f9',
                    fontWeight: isSelected ? 600 : 400,
                    textDecoration: isUsed ? 'line-through' : 'none',
                    textAlign: 'center',
                  }}
                >
                  {opt === '' ? '不选' : `${prefix}${opt}`}
                </div>
              );
            })}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

// 表头列定义：每个分组包含的字段列表，用于动态计算 colSpan
const HEADER_GROUPS = [
  { key: 'volunteer', label: '志愿', fields: ['volunteerOrder'] },
  { key: 'base', label: '基础信息', fields: ['schoolName', 'schoolNature', 'schoolCategory', 'locationDistrict', 'admissionBatches'] },
  { key: 'gradient', label: '梯度', fields: ['gradient2025'] },
  { key: 'batch2', label: '第二批（名额分配）', fields: ['xieheQuota26', 'xieheSendMin26', 'xieheSendLast26', 'xieheSendLastVol26', 'xieheQuotaNum', 'quotaCompare25', 'batch2Score2025', 'xieheSendLast25', 'xieheSendLastVol25', 'xieheQuotaNum25', 'quotaChangeValue', 'b2Min3y', 'b2MinAvg', 'b2Last3y', 'b2LastAvg', 'b2LastVol3y'] },
  { key: 'batch3', label: '第三批（统招）', fields: ['b3_2025hujiMin', 'b3_2025hujiLast', 'b3_2025hujiLastVol', 'b3_2025waiquMin', 'b3_2025waiquLast', 'b3_2025waiquLastVol', 'b3_2024hujiMin', 'b3_2024hujiLast', 'b3_2024hujiLastVol', 'b3_2024waiquMin', 'b3_2024waiquLast', 'b3_2024waiquLastVol', 'b3_2023hujiMin', 'b3_2023hujiLast', 'b3_2023hujiLastVol', 'b3_2023waiquMin', 'b3_2023waiquLast', 'b3_2023waiquLastVol', 'b3HujiMinAvg', 'b3HujiLastAvg', 'b3WaiquMinAvg', 'b3WaiquLastAvg'] },
  { key: 'batch4', label: '第四批（常规兜底）', fields: ['b4_2025min', 'b4_2025last', 'b4_2025lastVol', 'b4_2024min', 'b4_2024last', 'b4_2024lastVol', 'b4_2023min', 'b4_2023last', 'b4_2023lastVol'] },
  { key: 'makeup', label: '补录', fields: ['makeupNormal', 'makeupScore', 'makeupDiff', 'makeupPlan2025', 'makeupControlLine2025'] },
  { key: 'plan', label: '计划信息', fields: ['enrollmentPlan2026', 'maxWaiquPlan2026', 'totalPlan2026', 'totalDormitory2026'] },
  { key: 'action', label: '', fields: ['action'] },
] as const;

const TOTAL_COLS = HEADER_GROUPS.reduce((sum, g) => sum + g.fields.length, 0);

export default function ResultTable({ data, onSelectSchool, keyword, onKeywordChange, favoritesVersion, distinguishOutside = true }: ResultTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | ''>('asc');
  const [volunteerVersion, setVolunteerVersion] = useState(0);
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const keywordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);

  // 一级表头折叠状态：batch2, batch3, batch4, makeup
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // 收藏状态本地缓存（用于触发重渲染）
  const [localFavoritesVersion, setLocalFavoritesVersion] = useState(0);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; schoolName: string }>({
    visible: false,
    x: 0,
    y: 0,
    schoolName: '',
  });

  // 学校详情弹窗状态
  const [detailModal, setDetailModal] = useState<{ visible: boolean; schoolName: string }>({
    visible: false,
    schoolName: '',
  });

  // 辅助函数：判断字段是否属于折叠的组
  // 返回 'hidden' | 'placeholder' | 'visible'
  // - hidden: 该字段在折叠组中且不是第一个字段，应完全隐藏（不渲染）
  // - placeholder: 该字段在折叠组中且是第一个字段，应渲染为占位列
  // - visible: 该字段不在折叠组中，正常渲染
  const getFieldCollapseState = useCallback((field: string): 'hidden' | 'placeholder' | 'visible' => {
    for (const g of HEADER_GROUPS) {
      if (collapsedGroups.has(g.key) && g.fields.includes(field as never)) {
        return g.fields[0] === field ? 'placeholder' : 'hidden';
      }
    }
    return 'visible';
  }, [collapsedGroups]);

  // 辅助函数：渲染可折叠的单元格
  // 如果字段在折叠组中且不是第一个字段，返回 null（不渲染）
  // 如果是折叠组的第一个字段，渲染为占位列（width: 0）
  const renderCollapsibleTd = useCallback((field: string, className: string, colIdx: number, children: React.ReactNode): React.ReactNode => {
    const state = getFieldCollapseState(field);
    if (state === 'hidden') return null;
    if (state === 'placeholder') {
      return <td key={`ph-${field}`} className={className} data-col-index={colIdx} style={{ width: 0, minWidth: 0, maxWidth: 0, padding: 0, border: 'none', overflow: 'hidden' }} />;
    }
    return <td className={className} data-col-index={colIdx}>{children}</td>;
  }, [getFieldCollapseState]);

  // 缓存有深度报告的学校列表
  const [schoolsWithDetail, setSchoolsWithDetail] = useState<Set<string>>(new Set());

  // 预加载哪些学校有深度信息专题报告
  useEffect(() => {
    const checkFiles = async () => {
      const valid = new Set<string>();
      try {
        // 获取 school_files 目录下的文件列表
        const res = await fetch('./school-files-list.json');
        if (res.ok) {
          const files: string[] = await res.json();
          for (const file of files) {
            if (file.endsWith('深度信息专题报告.md')) {
              const schoolName = file.replace('深度信息专题报告.md', '');
              valid.add(schoolName);
            }
          }
        }
      } catch {
        // 如果获取列表失败，使用备用方案：逐个尝试已知文件
        const fallbackFiles = [
          '广州市真光中学（广钢校区）深度信息专题报告.md',
          '广州市真光中学（汾水校区）深度信息专题报告.md',
          '广州市第一中学深度信息专题报告.md',
          '广州市第四中学深度信息专题报告.md',
          '广州市南海中学深度信息专题报告.md',
          '广州市西关外国语学校深度信息专题报告.md',
        ];
        for (const file of fallbackFiles) {
          try {
            const res = await fetch(`./${encodeURIComponent(file)}`, { method: 'HEAD' });
            if (res.ok) {
              const schoolName = file.replace('深度信息专题报告.md', '');
              valid.add(schoolName);
            }
          } catch {
            // 忽略错误
          }
        }
      }
      // 根据文件名反推哪些学校名（含专业后缀）可以匹配到报告
      // 综合高中：多个专业方向共用一份学校报告
      const mappedSchools = [
        // 广州市财经商贸职业学校
        '广州市财经商贸职业学校（综合高中）',
        // 广州市天河职业高级中学
        '广州市天河职业高级中学（综合高中）（计算机网络技术）',
        '广州市天河职业高级中学（综合高中）（金融事务）',
        '广州市天河职业高级中学（综合高中）（幼儿保育）',
        // 广州市贸易职业高级中学
        '广州市贸易职业高级中学（综合高中）（电子商务）',
        '广州市贸易职业高级中学（综合高中）（大数据技术应用）',
        '广州市贸易职业高级中学（综合高中）（艺术设计与制作）',
        // 公费班/民办班：共用母体学校报告
        '广州市海珠中学（公费班）',
      ];
      for (const name of mappedSchools) {
        valid.add(name);
      }
      setSchoolsWithDetail(valid);
    };
    checkFiles();
  }, []);

  // 同步外部 keyword 到本地状态（筛选面板修改时）
  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  // 点击页面其他地方关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  // 预缓存列元素引用：colIndex → 该列所有 TD 元素数组 + 表头 TH 元素
  interface ColCache { tds: HTMLElement[]; th: HTMLElement | null }
  const colMapRef = useRef<Map<number, ColCache>>(new Map());
  const prevColIndexRef = useRef<number | null>(null);

  // 纯DOM操作实现列高亮，零React重渲染
  useEffect(() => {
    const tbody = tbodyRef.current;
    const thead = theadRef.current;
    if (!tbody || !thead) return;

    const updateColHighlight = (newIndex: number | null) => {
      const prevIndex = prevColIndexRef.current;
      if (prevIndex === newIndex) return;
      // 从缓存中直接取列元素，O(1) 查找
      if (prevIndex !== null) {
        colMapRef.current.get(prevIndex)?.tds.forEach(el => el.classList.remove('col-hovered'));
        colMapRef.current.get(prevIndex)?.th?.classList.remove('col-hovered');
      }
      if (newIndex !== null) {
        colMapRef.current.get(newIndex)?.tds.forEach(el => el.classList.add('col-hovered'));
        colMapRef.current.get(newIndex)?.th?.classList.add('col-hovered');
      }
      prevColIndexRef.current = newIndex;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const td = (e.target as HTMLElement).closest('td[data-col-index]') as HTMLElement | null;
      if (td) {
        const colIndex = parseInt(td.getAttribute('data-col-index') || '-1', 10);
        if (colIndex >= 0) updateColHighlight(colIndex);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const td = (e.target as HTMLElement).closest('td[data-col-index]') as HTMLElement | null;
      if (td && !td.contains((e.relatedTarget as Node | null))) {
        updateColHighlight(null);
      }
    };

    tbody.addEventListener('mouseover', handleMouseOver);
    tbody.addEventListener('mouseout', handleMouseOut);

    return () => {
      tbody.removeEventListener('mouseover', handleMouseOver);
      tbody.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  // Runtime style injection to bypass ALL CSS caching issues
  useEffect(() => {
    const styleId = 'critical-styles-v3';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      .th-2line { font-size:9px!important; line-height:1.2!important; white-space:normal!important; vertical-align:middle!important; padding:2px 3px!important; }
      .tooltip-popup { transform:none!important; animation:none!important; -webkit-transform:none!important; }
    `;
    document.head.appendChild(styleEl);
    console.log('[ResultTable] Critical styles injected');
  }, []);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let va: any, vb: any;

      if (sortField.startsWith('b3_')) {
        const rest = sortField.slice(3);
        const year = parseInt(rest.slice(0, 4), 10);
        const sub = rest.slice(4);
        va = getB3Field(a, year, sub, distinguishOutside).value;
        vb = getB3Field(b, year, sub, distinguishOutside).value;
      } else if (sortField.startsWith('b4_')) {
        const rest = sortField.slice(3);
        const year = parseInt(rest.slice(0, 4), 10);
        const sub = rest.slice(4);
        va = getB4Field(a, year, sub);
        vb = getB4Field(b, year, sub);
      } else if (sortField === 'xieheQuota26') {
        const qa = a.xieheControlLine2026 ?? null;
        const qb = b.xieheControlLine2026 ?? null;
        if (qa !== null && qb !== null) { va = qa; vb = qb; }
        else if (qa !== null) { va = qa; vb = -999; }
        else if (qb !== null) { va = -999; vb = qb; }
        else { va = -999; vb = -999; }
      } else if (sortField === 'xieheQuotaProvince') {
        va = a.xieheQuota2026?.provinceQuota ?? -999;
        vb = b.xieheQuota2026?.provinceQuota ?? -999;
      } else if (sortField === 'xieheQuotaDistrict') {
        va = a.xieheQuota2026?.districtQuota ?? -999;
        vb = b.xieheQuota2026?.districtQuota ?? -999;
      } else if (sortField === 'xieheQuotaNum') {
        const qa = a.xieheQuota2026?.provinceQuota ?? -999;
        const qb = b.xieheQuota2026?.provinceQuota ?? -999;
        va = qa; vb = qb;
      } else if (sortField === 'quotaCompare25') {
        va = a.quotaCompare2526?.controlLine2025 ?? -999;
        vb = b.quotaCompare2526?.controlLine2025 ?? -999;
      } else if (sortField === 'quotaChangeValue') {
        va = a.quotaCompare2526?.changeValue ?? -999;
        vb = b.quotaCompare2526?.changeValue ?? -999;
      } else if (sortField === 'xieheSendMin26') {
        va = a.xieheSendingRecords?.find(s => s.year === 2026)?.minScore ?? -999;
        vb = b.xieheSendingRecords?.find(s => s.year === 2026)?.minScore ?? -999;
      } else if (sortField === 'xieheSendLast26') {
        va = a.xieheSendingRecords?.find(s => s.year === 2026)?.lastScore ?? -999;
        vb = b.xieheSendingRecords?.find(s => s.year === 2026)?.lastScore ?? -999;
      } else if (sortField === 'xieheSendLastVol26') {
        va = a.xieheSendingRecords?.find(s => s.year === 2026)?.lastVolunteerOrder ?? -999;
        vb = b.xieheSendingRecords?.find(s => s.year === 2026)?.lastVolunteerOrder ?? -999;
      } else if (sortField === 'xieheSendLast25') {
        va = a.xieheSendingRecords?.find(s => s.year === 2025)?.lastScore ?? -999;
        vb = b.xieheSendingRecords?.find(s => s.year === 2025)?.lastScore ?? -999;
      } else if (sortField === 'xieheSendLastVol25') {
        va = a.xieheSendingRecords?.find(s => s.year === 2025)?.lastVolunteerOrder ?? -999;
        vb = b.xieheSendingRecords?.find(s => s.year === 2025)?.lastVolunteerOrder ?? -999;
      } else if (sortField === 'xieheQuotaNum25') {
        va = a.xieheQuota2025 ?? -999;
        vb = b.xieheQuota2025 ?? -999;
      } else if (sortField === 'b2MinAvg') {
        // 录分·四年均值：四年 (2026/2025/2024/2023) 有数据的年份参与计算
        const getAvg = (rec: SchoolRecord) => {
          const vals = [2026, 2025, 2024, 2023].map(y => rec.xieheSendingRecords?.find(s => s.year === y)?.minScore).filter((v): v is number => v != null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : -999;
        };
        va = getAvg(a); vb = getAvg(b);
      } else if (sortField === 'b2LastAvg') {
        // 末分·四年均值：四年 (2026/2025/2024/2023) 有数据的年份参与计算
        const getAvg = (rec: SchoolRecord) => {
          const vals = [2026, 2025, 2024, 2023].map(y => rec.xieheSendingRecords?.find(s => s.year === y)?.lastScore).filter((v): v is number => v != null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : -999;
        };
        va = getAvg(a); vb = getAvg(b);
      } else if (sortField === 'b3HujiMinAvg') {
        const getAvg = (rec: SchoolRecord) => {
          const vals = [2025, 2024, 2023].map(y => getB3Field(rec, y, 'hujiMin', distinguishOutside).value).filter((v): v is number => v != null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : -999;
        };
        va = getAvg(a); vb = getAvg(b);
      } else if (sortField === 'b3HujiLastAvg') {
        const getAvg = (rec: SchoolRecord) => {
          const vals = [2025, 2024, 2023].map(y => getB3Field(rec, y, 'hujiLast', distinguishOutside).value).filter((v): v is number => v != null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : -999;
        };
        va = getAvg(a); vb = getAvg(b);
      } else if (sortField === 'b3WaiquMinAvg') {
        const getAvg = (rec: SchoolRecord) => {
          const vals = [2025, 2024, 2023].map(y => getB3Field(rec, y, 'waiquMin', distinguishOutside).value).filter((v): v is number => v != null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : -999;
        };
        va = getAvg(a); vb = getAvg(b);
      } else if (sortField === 'b3WaiquLastAvg') {
        const getAvg = (rec: SchoolRecord) => {
          const vals = [2025, 2024, 2023].map(y => getB3Field(rec, y, 'waiquLast', distinguishOutside).value).filter((v): v is number => v != null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : -999;
        };
        va = getAvg(a); vb = getAvg(b);
      } else if (sortField === 'makeupNormal') {
        va = a.makeupScore?.normalScore ?? -999;
        vb = b.makeupScore?.normalScore ?? -999;
      } else if (sortField === 'makeupScore') {
        va = a.makeupScore?.makeupScore ?? -999;
        vb = b.makeupScore?.makeupScore ?? -999;
      } else if (sortField === 'makeupDiff') {
        va = a.makeupScore?.diff ?? -999;
        vb = b.makeupScore?.diff ?? -999;
      } else if (sortField === 'makeupPlan2025') {
        va = a.makeupPlan2025?.makeupPlan ?? -999;
        vb = b.makeupPlan2025?.makeupPlan ?? -999;
      } else if (sortField === 'makeupControlLine2025') {
        va = a.makeupPlan2025?.makeupControlLine ?? -999;
        vb = b.makeupPlan2025?.makeupControlLine ?? -999;
      } else if (sortField === 'volunteerOrder') {
        // 排序时按每个学校的每个志愿值独立排序
        const vka = getVolunteerSortKey(getSchoolVolunteerValues(a.schoolName));
        const vkb = getVolunteerSortKey(getSchoolVolunteerValues(b.schoolName));
        if (vka !== vkb) return sortDir === 'asc' ? vka.localeCompare(vkb) : vkb.localeCompare(vka);
        // 同优先级按学校名排序保持稳定性
        return a.schoolName.localeCompare(b.schoolName);
      } else {
        va = (a as any)[sortField] ?? '';
        vb = (b as any)[sortField] ?? '';
      }

      if (va == null || va === undefined || va === '') va = -999;
      if (vb == null || vb === undefined || vb === '') vb = -999;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDir, distinguishOutside]);

  // 当按志愿排序时，将多批次学校展开为多行
  const displayRows = useMemo(() => {
    if (sortField !== 'volunteerOrder') {
      return sortedData.map(school => ({
        school,
        volunteerKey: null as 'batch2' | 'batch3' | 'batch4' | null,
        volunteerValue: '',
        isPrimary: true,
        activeBatch: null as 'batch2' | 'batch3' | 'batch4' | null,
      }));
    }
    // 排序状态：收集所有学校的所有志愿值，扁平后按字典序全局排序
    const allEntries: { school: SchoolRecord; volunteerKey: 'batch2' | 'batch3' | 'batch4' | null; volunteerValue: string; isPrimary: boolean; activeBatch: 'batch2' | 'batch3' | 'batch4' | null }[] = [];
    for (const school of sortedData) {
      const values = getSchoolVolunteerValues(school.schoolName);
      if (values.length === 0) {
        // 未选任何志愿的学校排在最后
        allEntries.push({ school, volunteerKey: null, volunteerValue: '', isPrimary: true, activeBatch: null });
      } else {
        values.forEach((val, idx) => {
          const batch = val.charAt(0) === '二' ? 'batch2' : val.charAt(0) === '三' ? 'batch3' : 'batch4';
          allEntries.push({ school, volunteerKey: batch, volunteerValue: val, isPrimary: idx === 0, activeBatch: batch });
        });
      }
    }
    // 按志愿值的字典序全局排序："二1" < "二2" < ... < "三1" < "三2" < ...
    const batchOrderMap: Record<string, number> = { '二': 2, '三': 3, '四': 4 };
    allEntries.sort((a, b) => {
      if (!a.volunteerValue && !b.volunteerValue) return a.school.schoolName.localeCompare(b.school.schoolName);
      if (!a.volunteerValue) return 1;
      if (!b.volunteerValue) return -1;
      const ba = batchOrderMap[a.volunteerValue.charAt(0)] || 9;
      const bb = batchOrderMap[b.volunteerValue.charAt(0)] || 9;
      if (ba !== bb) return sortDir === 'asc' ? ba - bb : bb - ba;
      const na = parseInt(a.volunteerValue.slice(1), 10);
      const nb = parseInt(b.volunteerValue.slice(1), 10);
      return sortDir === 'asc' ? na - nb : nb - na;
    });
    return allEntries;
  }, [sortedData, sortField, sortDir, volunteerVersion]);

  // 外部 favoritesVersion 变化时同步刷新本地状态（用于导入后刷新）
  useEffect(() => {
    setLocalFavoritesVersion(v => v + 1);
  }, [favoritesVersion]);

  // 数据变化后重建缓存（排序、筛选、展开折叠都会触发 DOM 变更）
  useEffect(() => {
    const tbody = tbodyRef.current;
    const thead = theadRef.current;
    if (!tbody || !thead) return;

    const map = new Map<number, ColCache>();
    tbody.querySelectorAll('td[data-col-index]').forEach(td => {
      const idx = parseInt((td as HTMLElement).dataset.colIndex!, 10);
      if (idx >= 0) {
        if (!map.has(idx)) map.set(idx, { tds: [], th: null });
        map.get(idx)!.tds.push(td as HTMLElement);
      }
    });
    thead.querySelectorAll('th[data-col-index]').forEach(th => {
      const idx = parseInt((th as HTMLElement).dataset.colIndex!, 10);
      if (idx >= 0 && map.has(idx)) {
        map.get(idx)!.th = th as HTMLElement;
      }
    });
    colMapRef.current = map;
  }, [displayRows, expandedRows, localFavoritesVersion]);

  const toggleRow = (name: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortField('');
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, schoolName: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, schoolName });
  };

  const handleToggleFavorite = (schoolName: string) => {
    toggleFavorite(schoolName);
    setLocalFavoritesVersion(v => v + 1);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const SortHeader = ({ field, children, className: thClassName, colIdx }: { field: string; children: React.ReactNode; colIdx?: number; className?: string }) => {
    const collapseState = getFieldCollapseState(field);
    // 如果字段在折叠组中且不是第一个字段，则不渲染（保持列数一致）
    if (collapseState === 'hidden') {
      return null;
    }
    const isActive = sortField === field;
    const tt = TABLE_HEADER_TOOLTIPS[field];
    const [ttVisible, setTtVisible] = useState(false);
    const [ttPos, setTtPos] = useState({ top: 0, left: 0 });
    const thRef = useRef<HTMLTableCellElement>(null);

    const showTt = () => {
      if (!thRef.current || !tt) return;
      const rect = thRef.current.getBoundingClientRect();
      const gap = 4;
      const popupW = 300;

      // 紧贴表头底部弹出
      let top = rect.bottom + gap;
      let left = rect.left;
      if (left + popupW > window.innerWidth - gap) {
        left = window.innerWidth - popupW - gap;
      }
      if (left < gap) left = gap;

      setTtPos({ top, left });
      setTtVisible(true);
    };
    const hideTt = () => setTtVisible(false);

    // 占位列：折叠组的第一个字段，显示为空
    if (collapseState === 'placeholder') {
      return (
        <th
          ref={thRef}
          data-col-index={colIdx}
          className={`sortable ${thClassName ?? ''}`.trim()}
          style={{ width: 0, minWidth: 0, maxWidth: 0, padding: 0, border: 'none', overflow: 'hidden' }}
        />
      );
    }

    return (
      <th
        ref={thRef}
        data-col-index={colIdx}
        onClick={() => handleSort(field)}
        className={`sortable ${thClassName ?? ''}`.trim()}
        onMouseEnter={tt ? showTt : undefined}
        onMouseLeave={tt ? hideTt : undefined}
      >
        {children}
        {isActive && sortDir === 'asc' && <span className="sort-icon">▲</span>}
        {isActive && sortDir === 'desc' && <span className="sort-icon">▼</span>}
        {tt && ttVisible && createPortal(
          <div
            className="tt-popover-v2"
            style={{
              position: 'fixed',
              top: ttPos.top,
              left: ttPos.left,
              zIndex: 10000,
              background: '#1e293b',
              color: '#f1f5f9',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              lineHeight: '1.65',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
              maxWidth: '360px',
              pointerEvents: 'auto',
              transform: 'none',
              animation: 'none !important',
              WebkitTransform: 'none',
            }}
            onMouseEnter={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseLeave={hideTt}
          >
            <div style={{ fontWeight: 700, color: '#d69e2e', marginBottom: 4, fontSize: 13 }}>{tt.label}</div>
            <div style={{ marginBottom: 4 }}>{tt.desc}</div>
            {tt.source && <div style={{ color: '#94a3b8', fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 5, marginTop: 4 }}>{tt.source}</div>}
            {tt.note && <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 3 }}>{tt.note}</div>}
          </div>,
          document.body
        )}
      </th>
    );
  };

  const hasData = data.length > 0;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead ref={theadRef} className={`${collapsedGroups.has('batch2') ? 'hide-batch2' : ''} ${collapsedGroups.has('batch3') ? 'hide-batch3' : ''} ${collapsedGroups.has('batch4') ? 'hide-batch4' : ''} ${collapsedGroups.has('makeup') ? 'hide-makeup' : ''}`.trim()}>
          <tr className="batch-group-row">
            {HEADER_GROUPS.map(g => {
              const isCollapsible = ['batch2', 'batch3', 'batch4', 'makeup'].includes(g.key);
              const isCollapsed = collapsedGroups.has(g.key);
              return (
                <th
                  key={g.key}
                  colSpan={isCollapsed ? 1 : g.fields.length}
                  className={`g-${g.key} ${isCollapsible ? 'collapsible' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                  onClick={() => {
                    if (!isCollapsible) return;
                    setCollapsedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(g.key)) next.delete(g.key);
                      else next.add(g.key);
                      return next;
                    });
                  }}
                  title={isCollapsible ? (isCollapsed ? '点击展开' : '点击折叠') : ''}
                  data-group={g.key}
                >
                  {isCollapsed ? (
                    ({ 'batch2': '二', 'batch3': '三', 'batch4': '四', 'makeup': '补' } as Record<string, string>)[g.key] ?? g.label
                  ) : g.label}
                </th>
              );
            })}
          </tr>
          <tr>
            <SortHeader field="volunteerOrder" colIdx={0} className="col-volunteer c-volunteer">志愿</SortHeader>
            <th className="col-name c-base th-search" data-col-index="1" style={{ padding: 2 }}>
              <div className="th-search-box">
                <Search size={10} className="th-search-icon" />
                <input
                  type="text"
                  value={localKeyword}
                  onChange={e => {
                    e.stopPropagation();
                    const val = e.target.value;
                    setLocalKeyword(val);
                    if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
                    keywordTimerRef.current = setTimeout(() => {
                      onKeywordChange(val);
                    }, 200);
                  }}
                  placeholder="学校名称"
                  className="th-search-input"
                  onClick={e => e.stopPropagation()}
                  onFocus={e => { e.stopPropagation(); e.preventDefault(); }}
                  onKeyDown={e => e.stopPropagation()}
                  onKeyUp={e => e.stopPropagation()}
                  onCompositionStart={e => e.stopPropagation()}
                  onCompositionEnd={e => e.stopPropagation()}
                />
              </div>
            </th>
            <SortHeader field="schoolNature" colIdx={2} className="c-base">性质</SortHeader>
            <SortHeader field="schoolCategory" colIdx={3} className="c-base th-2line">类别</SortHeader>
            <SortHeader field="locationDistrict" colIdx={4} className="c-base">区域</SortHeader>
            <SortHeader field="admissionBatches" colIdx={5} className="c-base">批次</SortHeader>
            <SortHeader field="gradient2025" colIdx={6} className="col-gradient c-gradient th-2line">梯度<br />·25</SortHeader>
            <SortHeader field="xieheQuota26" colIdx={7} className="c-batch2">控·26</SortHeader>
            <SortHeader field="xieheSendMin26" colIdx={8} className="c-batch2">录·26</SortHeader>
            <SortHeader field="xieheSendLast26" colIdx={9} className="c-batch2">末分·26</SortHeader>
            <SortHeader field="xieheSendLastVol26" colIdx={10} className="c-batch2 th-2line">末<br />志·26</SortHeader>
            <SortHeader field="xieheQuotaNum" colIdx={11} className="c-batch2">名额数·26</SortHeader>
            <SortHeader field="quotaCompare25" colIdx={12} className="c-batch2">控·25</SortHeader>
            <SortHeader field="batch2Score2025" colIdx={13} className="c-batch2">录·25</SortHeader>
            <SortHeader field="xieheSendLast25" colIdx={14} className="c-batch2">末分·25</SortHeader>
            <SortHeader field="xieheSendLastVol25" colIdx={15} className="c-batch2 th-2line">末<br />志·25</SortHeader>
            <SortHeader field="xieheQuotaNum25" colIdx={16} className="c-batch2">名额数·25</SortHeader>
            <SortHeader field="quotaChangeValue" colIdx={17} className="c-batch2">控变化·26vs25</SortHeader>
            <SortHeader field="b2Min3y" colIdx={18} className="c-batch2">录分·四年</SortHeader>
            <SortHeader field="b2MinAvg" colIdx={19} className="c-batch2">录分·均值</SortHeader>
            <SortHeader field="b2Last3y" colIdx={20} className="c-batch2">末分·四年</SortHeader>
            <SortHeader field="b2LastAvg" colIdx={21} className="c-batch2">末分·均值</SortHeader>
            <SortHeader field="b2LastVol3y" colIdx={22} className="c-batch2">末志·四年</SortHeader>
            <SortHeader field="b3_2025hujiMin" colIdx={23} className="c-b3-25">户·录分25</SortHeader>
            <SortHeader field="b3_2025hujiLast" colIdx={24} className="c-b3-25">户·末分25</SortHeader>
            <SortHeader field="b3_2025hujiLastVol" colIdx={25} className="c-b3-25 th-2line">户·末<br />志25</SortHeader>
            <SortHeader field="b3_2025waiquMin" colIdx={26} className="c-b3-25">外·录分25</SortHeader>
            <SortHeader field="b3_2025waiquLast" colIdx={27} className="c-b3-25">外·末分25</SortHeader>
            <SortHeader field="b3_2025waiquLastVol" colIdx={28} className="c-b3-25 th-2line">外·末<br />志25</SortHeader>
            <SortHeader field="b3_2024hujiMin" colIdx={29} className="c-b3-24">户·录分24</SortHeader>
            <SortHeader field="b3_2024hujiLast" colIdx={30} className="c-b3-24">户·末分24</SortHeader>
            <SortHeader field="b3_2024hujiLastVol" colIdx={31} className="c-b3-24 th-2line">户·末<br />志24</SortHeader>
            <SortHeader field="b3_2024waiquMin" colIdx={32} className="c-b3-24">外·录分24</SortHeader>
            <SortHeader field="b3_2024waiquLast" colIdx={33} className="c-b3-24">外·末分24</SortHeader>
            <SortHeader field="b3_2024waiquLastVol" colIdx={34} className="c-b3-24 th-2line">外·末<br />志24</SortHeader>
            <SortHeader field="b3_2023hujiMin" colIdx={35} className="c-b3-23">户·录分23</SortHeader>
            <SortHeader field="b3_2023hujiLast" colIdx={36} className="c-b3-23">户·末分23</SortHeader>
            <SortHeader field="b3_2023hujiLastVol" colIdx={37} className="c-b3-23 th-2line">户·末<br />志23</SortHeader>
            <SortHeader field="b3_2023waiquMin" colIdx={38} className="c-b3-23">外·录分23</SortHeader>
            <SortHeader field="b3_2023waiquLast" colIdx={39} className="c-b3-23">外·末分23</SortHeader>
            <SortHeader field="b3_2023waiquLastVol" colIdx={40} className="c-b3-23 th-2line">外·末<br />志23</SortHeader>
            <SortHeader field="b3HujiMinAvg" colIdx={41} className="c-b3-25">户录·均值</SortHeader>
            <SortHeader field="b3HujiLastAvg" colIdx={42} className="c-b3-25">户末分·均值</SortHeader>
            <SortHeader field="b3WaiquMinAvg" colIdx={43} className="c-b3-25">外录·均值</SortHeader>
            <SortHeader field="b3WaiquLastAvg" colIdx={44} className="c-b3-25">外末分·均值</SortHeader>
            <SortHeader field="b4_2025min" colIdx={45} className="c-b4-25">录分25</SortHeader>
            <SortHeader field="b4_2025last" colIdx={46} className="c-b4-25">末分25</SortHeader>
            <SortHeader field="b4_2025lastVol" colIdx={47} className="c-b4-25 th-2line">末<br />志25</SortHeader>
            <SortHeader field="b4_2024min" colIdx={48} className="c-b4-24">录分24</SortHeader>
            <SortHeader field="b4_2024last" colIdx={49} className="c-b4-24">末分24</SortHeader>
            <SortHeader field="b4_2024lastVol" colIdx={50} className="c-b4-24 th-2line">末<br />志24</SortHeader>
            <SortHeader field="b4_2023min" colIdx={51} className="c-b4-23">录分23</SortHeader>
            <SortHeader field="b4_2023last" colIdx={52} className="c-b4-23">末分23</SortHeader>
            <SortHeader field="b4_2023lastVol" colIdx={53} className="c-b4-23 th-2line">末<br />志23</SortHeader>
            <SortHeader field="makeupNormal" colIdx={54} className="c-makeup">补正常分</SortHeader>
            <SortHeader field="makeupScore" colIdx={55} className="c-makeup">补录分</SortHeader>
            <SortHeader field="makeupDiff" colIdx={56} className="c-makeup">补差值</SortHeader>
            <SortHeader field="makeupPlan2025" colIdx={57} className="c-makeup th-2line">补录<br />计划</SortHeader>
            <SortHeader field="makeupControlLine2025" colIdx={58} className="c-makeup th-2line">补录<br />控制线</SortHeader>
            <SortHeader field="enrollmentPlan2026" colIdx={59} className="c-plan th-2line">批三<br />计划</SortHeader>
            <SortHeader field="maxWaiquPlan2026" colIdx={60} className="c-plan">外区人数</SortHeader>
            <SortHeader field="totalPlan2026" colIdx={61} className="c-plan">总计划</SortHeader>
            <SortHeader field="totalDormitory2026" colIdx={62} className="c-plan">总宿位</SortHeader>
            <th className="col-action c-base" data-col-index="63"></th>
          </tr>
        </thead>
        <tbody ref={tbodyRef} className={`${collapsedGroups.has('batch2') ? 'hide-batch2' : ''} ${collapsedGroups.has('batch3') ? 'hide-batch3' : ''} ${collapsedGroups.has('batch4') ? 'hide-batch4' : ''} ${collapsedGroups.has('makeup') ? 'hide-makeup' : ''}`.trim()}>
          {!hasData && (
            <tr>
              <td colSpan={TOTAL_COLS} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <Info size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>没有匹配的记录，请调整筛选条件</p>
              </td>
            </tr>
          )}
          {hasData && displayRows.map((row) => {
            const r = row.school;
            const isExpanded = expandedRows.has(r.schoolName);
            const fav = isFavorite(r.schoolName);
            const rowKey = `${r.schoolName}-${row.volunteerValue}-${localFavoritesVersion}-${favoritesVersion ?? 0}`;

            return (
              <React.Fragment key={rowKey}>
                <tr className={`${isExpanded ? 'expanded-row' : ''} ${isExpanded && (r.batch3Records.length > 0 || r.batch4Records.length > 0) ? 'row-has-detail' : ''}`}>
                  {renderCollapsibleTd('volunteerOrder', 'col-volunteer d-volunteer', 0, <VolunteerSelect schoolName={r.schoolName} admissionBatches={r.admissionBatches} quotaNum26={r.xieheQuota2026?.provinceQuota} activeBatch={row.activeBatch} onChange={() => setVolunteerVersion(v => v + 1)} />)}
                  {renderCollapsibleTd('schoolName', 'col-name sticky-col d-base', 1, <span
                    className={`school-name ${fav ? 'school-favorite' : ''} ${schoolsWithDetail.has(r.schoolName) ? 'has-detail' : ''}`}
                    title={r.schoolName}
                    onClick={() => {
                      if (schoolsWithDetail.has(r.schoolName)) {
                        setDetailModal({ visible: true, schoolName: r.schoolName });
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, r.schoolName)}
                  >{r.schoolName}</span>)}
                  {renderCollapsibleTd('schoolNature', 'd-base', 2, <span className={`nature-badge ${r.schoolName.includes('中外合作') ? 'zhongwai' : r.schoolNature === '公办' ? 'gongban' : 'minban'}`}>{r.schoolNature}</span>)}
                  {renderCollapsibleTd('schoolCategory', 'd-base', 3, <>{r.schoolCategory || '--'}</>)}
                  {renderCollapsibleTd('locationDistrict', 'd-base', 4, <>{r.locationDistrict}</>)}
                  {renderCollapsibleTd('admissionBatches', 'd-base', 5, <>{formatBatchShort(r.admissionBatches)}</>)}
                  {renderCollapsibleTd('gradient2025', 'col-gradient d-gradient', 6, <GradientTag gradient={r.gradient2025} />)}
                  {renderCollapsibleTd('xieheQuota26', 'd-batch2', 7, <>
                    {r.xieheControlLine2026 != null ? (
                      <span className="quota-line">{r.xieheControlLine2026}</span>
                    ) : '--'}
                  </>)}
                  {/* 2026年送生录取数据（录·26、末分·26、末志·26） */}
                  {renderCollapsibleTd('xieheSendMin26', 'd-batch2', 8, <ScoreBadge score={r.xieheSendingRecords?.find(s => s.year === 2026)?.minScore} />)}
                  {renderCollapsibleTd('xieheSendLast26', 'd-batch2', 9, <ScoreBadge score={r.xieheSendingRecords?.find(s => s.year === 2026)?.lastScore} />)}
                  {renderCollapsibleTd('xieheSendLastVol26', 'd-batch2', 10, <>{r.xieheSendingRecords?.find(s => s.year === 2026)?.lastVolunteerOrder ?? '--'}</>)}
                  {renderCollapsibleTd('xieheQuotaNum', 'd-batch2', 11, <>
                    {r.xieheQuota2026 != null ? (
                      <span className="quota-num">{r.xieheQuota2026.provinceQuota}</span>
                    ) : '--'}
                  </>)}
                  {renderCollapsibleTd('quotaCompare25', 'd-batch2', 12, <ScoreBadge score={r.quotaCompare2526?.controlLine2025} />)}
                  {renderCollapsibleTd('batch2Score2025', 'd-batch2', 13, <ScoreBadge score={r.batch2Score2025} />)}
                  {renderCollapsibleTd('xieheSendLast25', 'd-batch2', 14, <ScoreBadge score={r.xieheSendingRecords?.find(s => s.year === 2025)?.lastScore} />)}
                  {renderCollapsibleTd('xieheSendLastVol25', 'd-batch2', 15, <>{r.xieheSendingRecords?.find(s => s.year === 2025)?.lastVolunteerOrder ?? '--'}</>)}
                  {renderCollapsibleTd('xieheQuotaNum25', 'd-batch2', 16, <>{r.xieheQuota2025 != null ? r.xieheQuota2025 : '--'}</>)}
                  {renderCollapsibleTd('quotaChangeValue', 'd-batch2', 17, <>{r.quotaCompare2526?.changeValue != null ? (
                    <span className={r.quotaCompare2526.changeValue >= 0 ? 'change-pos' : 'change-neg'}>
                      {r.quotaCompare2526.changeValue > 0 ? '+' : ''}{r.quotaCompare2526.changeValue}
                    </span>
                  ) : '--'}</>)}
                  {/* 第二批 四年汇总（2026/2025/2024/2023） */}
                  {((): React.ReactElement => {
                    const recs = r.xieheSendingRecords ?? [];
                    const s23 = recs.find(s => s.year === 2023)?.minScore;
                    const s24 = recs.find(s => s.year === 2024)?.minScore;
                    const s25 = recs.find(s => s.year === 2025)?.minScore;
                    const s26 = recs.find(s => s.year === 2026)?.minScore;
                    return <>{renderCollapsibleTd('b2Min3y', 'd-batch2', 18, <div className="three-year-row">
                      <ScoreBadge score={s23} /><span className="three-year-sep">{'->'}</span><ScoreBadge score={s24} /><span className="three-year-sep">{'->'}</span><ScoreBadge score={s25} /><span className="three-year-sep">{'->'}</span><ScoreBadge score={s26} />
                    </div>)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const recs = r.xieheSendingRecords ?? [];
                    const vals = [2026, 2025, 2024, 2023].map(y => recs.find(s => s.year === y)?.minScore).filter((v): v is number => v != null);
                    const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                    return <>{renderCollapsibleTd('b2MinAvg', 'd-batch2', 19, <ScoreBadge score={avg} />)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const recs = r.xieheSendingRecords ?? [];
                    const s23 = recs.find(s => s.year === 2023)?.lastScore;
                    const s24 = recs.find(s => s.year === 2024)?.lastScore;
                    const s25 = recs.find(s => s.year === 2025)?.lastScore;
                    const s26 = recs.find(s => s.year === 2026)?.lastScore;
                    return <>{renderCollapsibleTd('b2Last3y', 'd-batch2', 20, <div className="three-year-row">
                      <ScoreBadge score={s23} /><span className="three-year-sep">{'->'}</span><ScoreBadge score={s24} /><span className="three-year-sep">{'->'}</span><ScoreBadge score={s25} /><span className="three-year-sep">{'->'}</span><ScoreBadge score={s26} />
                    </div>)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const recs = r.xieheSendingRecords ?? [];
                    const vals = [2026, 2025, 2024, 2023].map(y => recs.find(s => s.year === y)?.lastScore).filter((v): v is number => v != null);
                    const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                    return <>{renderCollapsibleTd('b2LastAvg', 'd-batch2', 21, <ScoreBadge score={avg} />)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const recs = r.xieheSendingRecords ?? [];
                    const s23 = recs.find(s => s.year === 2023)?.lastVolunteerOrder;
                    const s24 = recs.find(s => s.year === 2024)?.lastVolunteerOrder;
                    const s25 = recs.find(s => s.year === 2025)?.lastVolunteerOrder;
                    const s26 = recs.find(s => s.year === 2026)?.lastVolunteerOrder;
                    const text = [s23, s24, s25, s26].map(s => s ?? '--').join('->');
                    return <>{renderCollapsibleTd('b2LastVol3y', 'd-batch2', 22, <span title={text}>{text}</span>)}</>;
                  })()}
                  {/* 第三批2025 (6列) */}
                  {((): React.ReactElement => { const f = getB3Field(r, 2025, 'hujiMin', distinguishOutside); return <>{renderCollapsibleTd('b3_2025hujiMin', 'd-b3-25', 23, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2025, 'hujiLast', distinguishOutside); return <>{renderCollapsibleTd('b3_2025hujiLast', 'd-b3-25', 24, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2025, 'hujiLastVol', distinguishOutside); return <>{renderCollapsibleTd('b3_2025hujiLastVol', 'd-b3-25', 25, <span className={f.masked ? 'score-masked' : ''}>{f.value ?? '--'}</span>)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2025, 'waiquMin', distinguishOutside); return <>{renderCollapsibleTd('b3_2025waiquMin', 'd-b3-25', 26, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2025, 'waiquLast', distinguishOutside); return <>{renderCollapsibleTd('b3_2025waiquLast', 'd-b3-25', 27, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2025, 'waiquLastVol', distinguishOutside); return <>{renderCollapsibleTd('b3_2025waiquLastVol', 'd-b3-25', 28, <span className={f.masked ? 'score-masked' : ''}>{f.value ?? '--'}</span>)}</>; })()}
                  {/* 第三批2024 (6列) */}
                  {((): React.ReactElement => { const f = getB3Field(r, 2024, 'hujiMin', distinguishOutside); return <>{renderCollapsibleTd('b3_2024hujiMin', 'd-b3-24', 29, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2024, 'hujiLast', distinguishOutside); return <>{renderCollapsibleTd('b3_2024hujiLast', 'd-b3-24', 30, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2024, 'hujiLastVol', distinguishOutside); return <>{renderCollapsibleTd('b3_2024hujiLastVol', 'd-b3-24', 31, <span className={f.masked ? 'score-masked' : ''}>{f.value ?? '--'}</span>)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2024, 'waiquMin', distinguishOutside); return <>{renderCollapsibleTd('b3_2024waiquMin', 'd-b3-24', 32, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2024, 'waiquLast', distinguishOutside); return <>{renderCollapsibleTd('b3_2024waiquLast', 'd-b3-24', 33, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2024, 'waiquLastVol', distinguishOutside); return <>{renderCollapsibleTd('b3_2024waiquLastVol', 'd-b3-24', 34, <span className={f.masked ? 'score-masked' : ''}>{f.value ?? '--'}</span>)}</>; })()}
                  {/* 第三批2023 (6列) */}
                  {((): React.ReactElement => { const f = getB3Field(r, 2023, 'hujiMin', distinguishOutside); return <>{renderCollapsibleTd('b3_2023hujiMin', 'd-b3-23', 35, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2023, 'hujiLast', distinguishOutside); return <>{renderCollapsibleTd('b3_2023hujiLast', 'd-b3-23', 36, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2023, 'hujiLastVol', distinguishOutside); return <>{renderCollapsibleTd('b3_2023hujiLastVol', 'd-b3-23', 37, <span className={f.masked ? 'score-masked' : ''}>{f.value ?? '--'}</span>)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2023, 'waiquMin', distinguishOutside); return <>{renderCollapsibleTd('b3_2023waiquMin', 'd-b3-23', 38, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2023, 'waiquLast', distinguishOutside); return <>{renderCollapsibleTd('b3_2023waiquLast', 'd-b3-23', 39, <ScoreBadge score={f.value} masked={f.masked} />)}</>; })()}
                  {((): React.ReactElement => { const f = getB3Field(r, 2023, 'waiquLastVol', distinguishOutside); return <>{renderCollapsibleTd('b3_2023waiquLastVol', 'd-b3-23', 40, <span className={f.masked ? 'score-masked' : ''}>{f.value ?? '--'}</span>)}</>; })()}
                  {/* 第三批 均值列 */}
                  {((): React.ReactElement => {
                    const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'hujiMin', distinguishOutside));
                    const valid = vals.filter(v => v.value != null);
                    const avg = valid.length > 0 ? Math.round(valid.reduce((a, v) => a + (v.value ?? 0), 0) / valid.length) : null;
                    const masked = vals.some(v => v.masked);
                    return <>{renderCollapsibleTd('b3HujiMinAvg', 'd-b3-25', 41, <ScoreBadge score={avg} masked={masked} />)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'hujiLast', distinguishOutside));
                    const valid = vals.filter(v => v.value != null);
                    const avg = valid.length > 0 ? Math.round(valid.reduce((a, v) => a + (v.value ?? 0), 0) / valid.length) : null;
                    const masked = vals.some(v => v.masked);
                    return <>{renderCollapsibleTd('b3HujiLastAvg', 'd-b3-25', 42, <ScoreBadge score={avg} masked={masked} />)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'waiquMin', distinguishOutside));
                    const valid = vals.filter(v => v.value != null);
                    const avg = valid.length > 0 ? Math.round(valid.reduce((a, v) => a + (v.value ?? 0), 0) / valid.length) : null;
                    const masked = vals.some(v => v.masked);
                    return <>{renderCollapsibleTd('b3WaiquMinAvg', 'd-b3-25', 43, <ScoreBadge score={avg} masked={masked} />)}</>;
                  })()}
                  {((): React.ReactElement => {
                    const vals = [2025, 2024, 2023].map(y => getB3Field(r, y, 'waiquLast', distinguishOutside));
                    const valid = vals.filter(v => v.value != null);
                    const avg = valid.length > 0 ? Math.round(valid.reduce((a, v) => a + (v.value ?? 0), 0) / valid.length) : null;
                    const masked = vals.some(v => v.masked);
                    return <>{renderCollapsibleTd('b3WaiquLastAvg', 'd-b3-25', 44, <ScoreBadge score={avg} masked={masked} />)}</>;
                  })()}
                  {/* 第四批2025 (3列) */}
                  {renderCollapsibleTd('b4_2025min', 'd-b4-25', 45, <ScoreBadge score={getB4Field(r, 2025, 'min')} />)}
                  {renderCollapsibleTd('b4_2025last', 'd-b4-25', 46, <ScoreBadge score={getB4Field(r, 2025, 'last')} />)}
                  {renderCollapsibleTd('b4_2025lastVol', 'd-b4-25', 47, <>{getB4Field(r, 2025, 'lastVol') ?? '--'}</>)}
                  {/* 第四批2024 (3列) */}
                  {renderCollapsibleTd('b4_2024min', 'd-b4-24', 48, <ScoreBadge score={getB4Field(r, 2024, 'min')} />)}
                  {renderCollapsibleTd('b4_2024last', 'd-b4-24', 49, <ScoreBadge score={getB4Field(r, 2024, 'last')} />)}
                  {renderCollapsibleTd('b4_2024lastVol', 'd-b4-24', 50, <>{getB4Field(r, 2024, 'lastVol') ?? '--'}</>)}
                  {/* 第四批2023 (3列) */}
                  {renderCollapsibleTd('b4_2023min', 'd-b4-23', 51, <ScoreBadge score={getB4Field(r, 2023, 'min')} />)}
                  {renderCollapsibleTd('b4_2023last', 'd-b4-23', 52, <ScoreBadge score={getB4Field(r, 2023, 'last')} />)}
                  {renderCollapsibleTd('b4_2023lastVol', 'd-b4-23', 53, <>{getB4Field(r, 2023, 'lastVol') ?? '--'}</>)}
                  {/* 补录 */}
                  {renderCollapsibleTd('makeupNormal', 'd-makeup', 54, <ScoreBadge score={r.makeupScore?.normalScore} />)}
                  {renderCollapsibleTd('makeupScore', 'd-makeup', 55, <ScoreBadge score={r.makeupScore?.makeupScore} />)}
                  {renderCollapsibleTd('makeupDiff', 'd-makeup', 56, <>{r.makeupScore?.diff != null ? (
                    <span className={r.makeupScore.diff >= 0 ? 'change-pos' : 'change-neg'}>
                      {r.makeupScore.diff > 0 ? '+' : ''}{r.makeupScore.diff}
                    </span>
                  ) : '--'}</>)}
                  {renderCollapsibleTd('makeupPlan2025', 'd-makeup', 57, <>{r.makeupPlan2025?.makeupPlan ?? '--'}</>)}
                  {renderCollapsibleTd('makeupControlLine2025', 'd-makeup', 58, <ScoreBadge score={r.makeupPlan2025?.makeupControlLine} />)}
                  {/* 计划信息 */}
                  {renderCollapsibleTd('enrollmentPlan2026', 'd-plan', 59, <>{r.enrollmentPlan2026 && r.enrollmentPlan2026 !== '-' ? r.enrollmentPlan2026 : '--'}</>)}
                  {renderCollapsibleTd('maxWaiquPlan2026', 'd-plan', 60, <>{r.maxWaiquPlan2026 && r.maxWaiquPlan2026 !== '-' ? r.maxWaiquPlan2026 : '--'}</>)}
                  {renderCollapsibleTd('totalPlan2026', 'd-plan', 61, <>{r.totalPlan2026 != null ? r.totalPlan2026 : '--'}</>)}
                  {renderCollapsibleTd('totalDormitory2026', 'd-plan', 62, <>{r.totalDormitory2026 != null ? r.totalDormitory2026 : '--'}</>)}
                  {renderCollapsibleTd('action', 'col-action d-base', 63, <button
                    className="btn-detail"
                    onClick={() => onSelectSchool(r)}
                  >详情</button>)}
                </tr>
                {isExpanded && (
                  <tr className="detail-row">
                    <td colSpan={TOTAL_COLS}>
                      <div className="detail-content">
                        {r.quotaControlLine && (
                          <div className="detail-section">
                            <h4>名额分配控制线（109所官方）</h4>
                            <div className="quota-info">
                              <span>隶属: {r.quotaControlLine.affiliation}</span>
                              <span>类别: {r.quotaControlLine.category}</span>
                              <span>2023: {r.quotaControlLine.score2023 ?? '--'}</span>
                              <span>2024: {r.quotaControlLine.score2024 ?? '--'}</span>
                              <span>2025: {r.quotaControlLine.score2025 ?? '--'}</span>
                              <span>近三年均分: {r.quotaControlLine.avg3Year}</span>
                              <strong className="quota-line-highlight">2026控制线: {r.quotaControlLine.controlLine2026}</strong>
                              {r.quotaCompare2526 && (
                                <>
                                  <strong>2025控制线: {r.quotaCompare2526.controlLine2025}</strong>
                                  <span className={r.quotaCompare2526.changeValue >= 0 ? 'change-pos' : 'change-neg'}>
                                    近两年变化: {r.quotaCompare2526.changeValue > 0 ? '+' : ''}{r.quotaCompare2526.changeValue} ({r.quotaCompare2526.changeRate > 0 ? '+' : ''}{r.quotaCompare2526.changeRate}%)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        {r.xieheSendingRecords && r.xieheSendingRecords.length > 0 && (
                          <div className="detail-section">
                            <h4>协和送生录取明细（协和→该校）</h4>
                            <table className="detail-table">
                              <thead>
                                <tr>
                                  <th>年份</th><th>最低分</th><th>同分序号</th>
                                  <th>末位分</th><th>末位志愿</th><th>末位同分序</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.xieheSendingRecords.map((rec, i) => (
                                  <tr key={i}>
                                    <td>{rec.year}</td>
                                    <td><ScoreBadge score={rec.minScore} /></td>
                                    <td>{rec.minScoreRank ?? '--'}</td>
                                    <td><ScoreBadge score={rec.lastScore} /></td>
                                    <td>{rec.lastVolunteerOrder ?? '--'}</td>
                                    <td>{rec.lastScoreRank ?? '--'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {r.batch3Records.length > 0 && (
                          <div className="detail-section">
                            <h4>第三批录取分数明细</h4>
                            <table className="detail-table">
                              <thead>
                                <tr>
                                  <th>年份</th><th>性质</th><th>范围</th>
                                  <th>户籍最低分</th><th>同分序号</th><th>末位志愿</th><th>末位分数</th>
                                  <th>外区最低分</th><th>外区末位分数</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.batch3Records.map((b3, i) => {
                                  const isLsq = isLaosanqu(r.locationDistrict);
                                  const maskHuji = distinguishOutside && !isLsq;
                                  const maskWaiqu = distinguishOutside && isLsq;
                                  return (
                                    <tr key={i}>
                                      <td>{b3.year}</td><td>{b3.schoolNature}</td><td>{b3.scope}</td>
                                      <td><ScoreBadge score={b3.hujiMinScore} masked={maskHuji} /></td>
                                      <td><span className={maskHuji ? 'score-masked' : ''}>{b3.hujiMinScoreRank ?? '--'}</span></td>
                                      <td><span className={maskHuji ? 'score-masked' : ''}>{b3.hujiLastVolunteerOrder ?? '--'}</span></td>
                                      <td><ScoreBadge score={b3.hujiLastScore} masked={maskHuji} /></td>
                                      <td><ScoreBadge score={b3.waiquMinScore} masked={maskWaiqu} /></td>
                                      <td><ScoreBadge score={b3.waiquLastScore} masked={maskWaiqu} /></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {r.batch4Records.length > 0 && (
                          <div className="detail-section">
                            <h4>第四批录取分数明细</h4>
                            <table className="detail-table">
                              <thead>
                                <tr>
                                  <th>年份</th><th>性质</th><th>范围</th><th>类型</th>
                                  <th>最低分</th><th>同分序号</th><th>末位志愿</th><th>末位分数</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.batch4Records.map((b4, i) => (
                                  <tr key={i}>
                                    <td>{b4.year}</td><td>{b4.schoolNature}</td><td>{b4.scope}</td>
                                    <td>{b4.isHuji ? '户籍生' : '统招'}</td>
                                    <td><ScoreBadge score={b4.minScore} /></td>
                                    <td>{b4.minScoreRank ?? '--'}</td>
                                    <td>{b4.lastVolunteerOrder ?? '--'}</td>
                                    <td><ScoreBadge score={b4.lastScore} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {r.makeupScore && (
                          <div className="detail-section">
                            <h4>补录信息</h4>
                            <div className="quota-info">
                              <span>正常录取批次: {r.makeupScore.normalBatch}</span>
                              <span>正常录取分数: {r.makeupScore.normalScore ?? '--'}</span>
                              <span>补录分数: {r.makeupScore.makeupScore}</span>
                              <span>差值: {r.makeupScore.diff != null ? (r.makeupScore.diff > 0 ? '+' : '') + r.makeupScore.diff : '--'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* 右键菜单 */}
      {contextMenu.visible && createPortal(
        <div
          className="context-menu"
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 10001 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className={`context-menu-item ${isFavorite(contextMenu.schoolName) ? 'context-menu-item-active' : ''}`}
            onClick={() => handleToggleFavorite(contextMenu.schoolName)}
          >
            {isFavorite(contextMenu.schoolName) ? '取消收藏' : '收藏'}
          </button>
        </div>,
        document.body
      )}

      {detailModal.visible && (
        <SchoolDetailModal
          schoolName={detailModal.schoolName}
          onClose={() => setDetailModal({ visible: false, schoolName: '' })}
        />
      )}
    </div>
  );
}
