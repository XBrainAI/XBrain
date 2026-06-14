import { useRef, useState, useEffect } from 'react';
import { Search, RotateCcw, Download, ChevronDown, ChevronRight, Heart, Upload } from 'lucide-react';
import type { SchoolRecord, FilterCriteria } from '../types';
import { getAllNatures, getAllCategories, getAllGradients } from '../utils/filterEngine';
import Tooltip from './Tooltip';
import { FILTER_TOOLTIPS, SCORE_FILTER_TOOLTIPS } from './tooltipData';

interface FilterPanelProps {
  allData: SchoolRecord[];
  criteria: FilterCriteria;
  onCriteriaChange: (criteria: FilterCriteria) => void;
  onReset: () => void;
  onExport: () => void;
  onExportFavorites: () => void;
  onImportFavorites: (file: File) => Promise<void>;
  resultCount: number;
  showScoreFilters: boolean;
  onShowScoreFiltersChange: (show: boolean) => void;
}

const BATCH_OPTIONS = ['一', '二', '三', '四'];
const GRADIENT_OPTIONS = [
  '第一梯度', '第二梯度', '第三梯度', '第四梯度',
  '第五梯度', '第六梯度', '普高最低线',
];
const GRADIENT_ABBR: Record<string, string> = {
  '第一梯度': '一', '第二梯度': '二', '第三梯度': '三', '第四梯度': '四',
  '第五梯度': '五', '第六梯度': '六', '普高最低线': '普',
};

export default function FilterPanel({ allData, criteria, onCriteriaChange, onReset, onExport, onExportFavorites, onImportFavorites, resultCount, showScoreFilters, onShowScoreFiltersChange }: FilterPanelProps) {
  const natures = getAllNatures(allData);
  const categories = getAllCategories(allData);
  const gradients = getAllGradients(allData);
  const keywordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localKeyword, setLocalKeyword] = useState(criteria.keyword);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 同步外部 keyword 到本地状态
  useEffect(() => {
    setLocalKeyword(criteria.keyword);
  }, [criteria.keyword]);

  const update = (patch: Partial<FilterCriteria>) => {
    onCriteriaChange({ ...criteria, ...patch });
  };

  const updateKeyword = (keyword: string) => {
    setLocalKeyword(keyword);
    if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
    keywordTimerRef.current = setTimeout(() => {
      onCriteriaChange({ ...criteria, keyword });
    }, 200);
  };

  const toggleMulti = (field: keyof FilterCriteria, value: string) => {
    const current = (criteria[field] as string[]) || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    update({ [field]: next } as Partial<FilterCriteria>);
  };

  const ttLabel = (key: string, text: string, inline = false) => {
    const tt = FILTER_TOOLTIPS[key] || SCORE_FILTER_TOOLTIPS[key];
    if (!tt) return <label>{text}</label>;
    const labelEl = inline ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{text}</span> : <label>{text}</label>;
    return (
      <Tooltip content={
        <div>
          <div className="tt-title">{tt.label}</div>
          <div className="tt-desc">{tt.desc}</div>
          {tt.source && <div className="tt-source">{tt.source}</div>}
          {tt.note && <div className="tt-note">{tt.note}</div>}
        </div>
      }>
        {labelEl}
      </Tooltip>
    );
  };

  const ttSf = (key: string, text: string) => {
    const tt = SCORE_FILTER_TOOLTIPS[key];
    if (!tt) return <span className="sf-label">{text}</span>;
    return (
      <Tooltip content={
        <div>
          <div className="tt-title">{tt.label}</div>
          <div className="tt-desc">{tt.desc}</div>
          {tt.source && <div className="tt-source">{tt.source}</div>}
          {tt.note && <div className="tt-note">{tt.note}</div>}
        </div>
      }>
        <span className="sf-label">{text}</span>
      </Tooltip>
    );
  };

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h2 className="filter-title">筛选条件</h2>
        <div className="filter-actions">
          <span className="result-count">共 <strong>{resultCount}</strong> 条结果</span>
          <button className="btn btn-outline" onClick={onReset}>
            <RotateCcw size={14} /> 重置
          </button>
          <button className="btn btn-outline" onClick={onExportFavorites} title="导出配置（含收藏和志愿）">
            <Download size={14} /> 导出配置
          </button>
          <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} title="导入配置（含收藏和志愿）">
            <Upload size={14} /> 导入配置
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onImportFavorites(file).catch(err => alert(err.message));
                e.target.value = '';
              }
            }}
          />
          <button className="btn btn-primary" onClick={onExport}>
            <Download size={14} /> 导出CSV
          </button>
        </div>
      </div>

      {/* ===== 常用筛选区域（始终展开）===== */}
      <div className="filter-section-common">

        {/* 第一行：学校名称搜索（标签与输入框同行） */}
        <div className="filter-row-inline">
          <div className="filter-field-inline filter-field-keyword">
            {ttLabel('keyword', '基础信息-学校名称')}
            <div className="input-wrapper">
              <Search size={14} className="input-icon" />
              <textarea
                rows={1}
                placeholder="多校用逗号/换行分隔(OR)，空格分隔关键词(AND)..."
                value={localKeyword}
                onChange={e => updateKeyword(e.target.value)}
                onFocus={() => onShowScoreFiltersChange(false)}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
          </div>
        </div>

        {/* 第二行：批次、性质、梯度 横向同行排列（不换行） */}
        <div className="filter-row-inline">
          <div className="filter-field-inline">
            {ttLabel('batches', '基础信息-批次')}
            <div className="tag-group">
              {BATCH_OPTIONS.map(b => (
                <button
                  key={b}
                  className={`tag ${criteria.batches?.includes(b) ? 'active' : ''}`}
                  onClick={() => toggleMulti('batches', b)}
                >{b}</button>
              ))}
            </div>
          </div>

          <div className="filter-field-inline">
            {ttLabel('natures', '基础信息-性质')}
            <div className="tag-group">
              {natures.map(n => (
                <button
                  key={n}
                  className={`tag ${criteria.natures?.includes(n) ? 'active' : ''}`}
                  onClick={() => toggleMulti('natures', n)}
                >{n}</button>
              ))}
            </div>
          </div>

          <div className="filter-field-inline">
            {ttLabel('gradients', '梯度-统招25')}
            <div className="tag-group">
              {GRADIENT_OPTIONS.filter(g => gradients.includes(g) || g === '普高最低线').map(g => (
                <button
                  key={g}
                  className={`tag gradient-tag ${criteria.gradients?.includes(g) ? 'active' : ''}`}
                  onClick={() => toggleMulti('gradients', g)}
                >{GRADIENT_ABBR[g]}</button>
              ))}
            </div>
          </div>

          <div className="filter-field-inline">
            {ttLabel('showFavoritesOnly', '收藏', true)}
            <button
              className={`tag ${criteria.showFavoritesOnly ? 'active' : ''}`}
              onClick={() => update({ showFavoritesOnly: !criteria.showFavoritesOnly })}
            >
              <Heart size={12} style={{ marginRight: 3, verticalAlign: 'middle', fill: criteria.showFavoritesOnly ? 'currentColor' : 'none' }} />
              {criteria.showFavoritesOnly ? '显示收藏' : '显示收藏'}
            </button>
          </div>

          <div className="filter-field-inline">
            {ttLabel('distinguishOutside', '区域区分', true)}
            <button
              className={`tag ${criteria.distinguishOutside ? 'active' : ''}`}
              onClick={() => update({ distinguishOutside: !criteria.distinguishOutside })}
            >
              区分外区
            </button>
          </div>
        </div>

        {/* 第三行：区域独占一行，选项可换行 */}
        <div className="filter-row-district">
          <div className="filter-field-district">
            {ttLabel('districts', '基础信息-区域')}
            <div className="tag-group">
              <button
                className={`tag ${criteria.districts?.includes('老三区') ? 'active' : ''}`}
                onClick={() => toggleMulti('districts', '老三区')}
              >老三区</button>
              {['荔湾', '越秀', '海珠', '天河', '黄埔', '花都', '白云', '番禺', '南沙', '增城', '从化', '佛山', '清远', '肇庆'].map(d => (
                <button
                  key={d}
                  className={`tag ${criteria.districts?.includes(d + '区') || criteria.districts?.includes(d + '市') ? 'active' : ''}`}
                  onClick={() => toggleMulti('districts', d + (['佛山', '清远', '肇庆'].includes(d) ? '市' : '区'))}
                >{d}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 第四行：类别独占一行，选项左对齐到区域选项位置 */}
        <div className="filter-row-category-indented">
          <div className="filter-field-category-indented">
            {ttLabel('categories', '基础信息-类别')}
            <div className="tag-group">
              {categories.map(c => (
                <button
                  key={c}
                  className={`tag ${criteria.categories?.includes(c) ? 'active' : ''}`}
                  onClick={() => toggleMulti('categories', c)}
                >{c}</button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ===== 各列分数筛选（默认折叠）===== */}
      <div className="filter-section-more">
        <button className="more-toggle" type="button" onClick={() => onShowScoreFiltersChange(!showScoreFilters)}>
          {showScoreFilters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>各列分数筛选</span>
          <span className="more-hint">{showScoreFilters ? '收起' : '展开'}</span>
        </button>

        {showScoreFilters && (
          <div className="score-filters-grid">
            <div className="score-filters-row">
              <div className="score-filter-item">
                {ttSf('quota26Min', '第二批（名额分配）-控·26')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={500} max={700} value={criteria.quota26Min ?? ''} onChange={e => update({ quota26Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={500} max={700} value={criteria.quota26Max ?? ''} onChange={e => update({ quota26Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('batch2Min', '第二批（名额分配）-控·25')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.batch2Min ?? ''} onChange={e => update({ batch2Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.batch2Max ?? ''} onChange={e => update({ batch2Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            </div>
            <div className="score-filters-row">
              <div className="score-filter-item">
                {ttSf('b3_2025_Min', '第三批（统招）-户·录分25')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2025_Min ?? ''} onChange={e => update({ b3_2025_Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2025_Max ?? ''} onChange={e => update({ b3_2025_Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2025_hujiLastMin', '第三批（统招）-户·末分25')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2025_hujiLastMin ?? ''} onChange={e => update({ b3_2025_hujiLastMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2025_hujiLastMax ?? ''} onChange={e => update({ b3_2025_hujiLastMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2025_waiquMin', '第三批（统招）-外·录分25')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2025_waiquMin ?? ''} onChange={e => update({ b3_2025_waiquMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2025_waiquMax ?? ''} onChange={e => update({ b3_2025_waiquMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2025_waiquLastMin', '第三批（统招）-外·末分25')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2025_waiquLastMin ?? ''} onChange={e => update({ b3_2025_waiquLastMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2025_waiquLastMax ?? ''} onChange={e => update({ b3_2025_waiquLastMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            </div>
            <div className="score-filters-row">
              <div className="score-filter-item">
                {ttSf('b3_2024_Min', '第三批（统招）-户·录分24')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2024_Min ?? ''} onChange={e => update({ b3_2024_Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2024_Max ?? ''} onChange={e => update({ b3_2024_Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2024_hujiLastMin', '第三批（统招）-户·末分24')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2024_hujiLastMin ?? ''} onChange={e => update({ b3_2024_hujiLastMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2024_hujiLastMax ?? ''} onChange={e => update({ b3_2024_hujiLastMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2024_waiquMin', '第三批（统招）-外·录分24')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2024_waiquMin ?? ''} onChange={e => update({ b3_2024_waiquMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2024_waiquMax ?? ''} onChange={e => update({ b3_2024_waiquMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2024_waiquLastMin', '第三批（统招）-外·末分24')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2024_waiquLastMin ?? ''} onChange={e => update({ b3_2024_waiquLastMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2024_waiquLastMax ?? ''} onChange={e => update({ b3_2024_waiquLastMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            </div>
            <div className="score-filters-row">
              <div className="score-filter-item">
                {ttSf('b3_2023_Min', '第三批（统招）-户·录分23')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2023_Min ?? ''} onChange={e => update({ b3_2023_Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2023_Max ?? ''} onChange={e => update({ b3_2023_Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2023_hujiLastMin', '第三批（统招）-户·末分23')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2023_hujiLastMin ?? ''} onChange={e => update({ b3_2023_hujiLastMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2023_hujiLastMax ?? ''} onChange={e => update({ b3_2023_hujiLastMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2023_waiquMin', '第三批（统招）-外·录分23')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2023_waiquMin ?? ''} onChange={e => update({ b3_2023_waiquMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2023_waiquMax ?? ''} onChange={e => update({ b3_2023_waiquMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b3_2023_waiquLastMin', '第三批（统招）-外·末分23')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b3_2023_waiquLastMin ?? ''} onChange={e => update({ b3_2023_waiquLastMin: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b3_2023_waiquLastMax ?? ''} onChange={e => update({ b3_2023_waiquLastMax: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            </div>
            <div className="score-filters-row">
              <div className="score-filter-item">
                {ttSf('b4_2025_Min', '第四批（常规兜底）-录分25')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b4_2025_Min ?? ''} onChange={e => update({ b4_2025_Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b4_2025_Max ?? ''} onChange={e => update({ b4_2025_Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b4_2024_Min', '第四批（常规兜底）-录分24')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b4_2024_Min ?? ''} onChange={e => update({ b4_2024_Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b4_2024_Max ?? ''} onChange={e => update({ b4_2024_Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="score-filter-item">
                {ttSf('b4_2023_Min', '第四批（常规兜底）-录分23')}
                <div className="sf-inputs">
                  <input type="number" placeholder="min" min={400} max={800} value={criteria.b4_2023_Min ?? ''} onChange={e => update({ b4_2023_Min: e.target.value ? Number(e.target.value) : null })} />
                  <input type="number" placeholder="max" min={400} max={800} value={criteria.b4_2023_Max ?? ''} onChange={e => update({ b4_2023_Max: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
