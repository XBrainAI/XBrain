import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Database, GraduationCap, ChevronDown, ExternalLink, Info, FileText } from 'lucide-react';
import type { SchoolRecord, FilterCriteria } from './types';
import { mergeAllData } from './utils/dataMerger';
import { parseGradientLines, parseMockExamGradients } from './utils/mdParser';
import { filterRecords, exportConfigToFile, importConfigFromFile } from './utils/filterEngine';
import { exportToCsv } from './utils/exportCsv';
import FilterPanel from './components/FilterPanel';
import ResultTable from './components/ResultTable';
import DetailDrawer from './components/DetailDrawer';
import GradientBar from './components/GradientBar';
import MarkdownModal from './components/MarkdownModal';
import { RAW_SCORE_BANDS, RAW_MOCK_2026 } from './utils/rawData';
import './App.css';

// 从文件名生成友好的显示名称
function formatFileName(filename: string): string {
  // 去掉扩展名
  const name = filename.replace(/\.html?$|\.md$/i, '');
  return name;
}

const DEFAULT_CRITERIA: FilterCriteria = {
  keyword: '',
  batches: [],
  years: [],
  natures: [],
  districts: [],
  categories: [],
  scopes: [],
  minScore: null,
  maxScore: null,
  gradients: [],
  showFavoritesOnly: false,
  distinguishOutside: true,
  batch2Min: null,
  batch2Max: null,
  b3_2025_Min: null, b3_2025_Max: null,
  b3_2025_hujiLastMin: null, b3_2025_hujiLastMax: null,
  b3_2025_waiquMin: null, b3_2025_waiquMax: null,
  b3_2025_waiquLastMin: null, b3_2025_waiquLastMax: null,
  b3_2024_Min: null, b3_2024_Max: null,
  b3_2024_hujiLastMin: null, b3_2024_hujiLastMax: null,
  b3_2024_waiquMin: null, b3_2024_waiquMax: null,
  b3_2024_waiquLastMin: null, b3_2024_waiquLastMax: null,
  b3_2023_Min: null, b3_2023_Max: null,
  b3_2023_hujiLastMin: null, b3_2023_hujiLastMax: null,
  b3_2023_waiquMin: null, b3_2023_waiquMax: null,
  b3_2023_waiquLastMin: null, b3_2023_waiquLastMax: null,
  b4_2025_Min: null, b4_2025_Max: null,
  b4_2025_lastMin: null, b4_2025_lastMax: null,
  b4_2024_Min: null, b4_2024_Max: null,
  b4_2024_lastMin: null, b4_2024_lastMax: null,
  b4_2023_Min: null, b4_2023_Max: null,
  b4_2023_lastMin: null, b4_2023_lastMax: null,
  quota26Min: null,
  quota26Max: null,
  xieheSendMin: null,
  xieheSendMax: null,
};

export default function App() {
  const [allData] = useState<SchoolRecord[]>(() => mergeAllData());
  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_CRITERIA);
  const [selectedSchool, setSelectedSchool] = useState<SchoolRecord | null>(null);
  const [gradientYear, setGradientYear] = useState(2025);
  const [showScoreFilters, setShowScoreFilters] = useState(false);
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const [extMenuOpen, setExtMenuOpen] = useState(false);
  const [extFiles, setExtFiles] = useState<string[]>([]);
  const extMenuRef = useRef<HTMLDivElement>(null);

  // Markdown弹窗状态
  const [mdModalOpen, setMdModalOpen] = useState(false);
  const [mdModalTitle, setMdModalTitle] = useState('');
  const [mdModalUrl, setMdModalUrl] = useState('');

  // 点击外部关闭扩展菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (extMenuRef.current && !extMenuRef.current.contains(e.target as Node)) {
        setExtMenuOpen(false);
      }
    }
    if (extMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [extMenuOpen]);

  // 动态加载 other_infos 文件列表
  useEffect(() => {
    fetch('./other-infos-list.json')
      .then(res => res.json())
      .then((files: string[]) => setExtFiles(files))
      .catch(() => setExtFiles([]));
  }, []);

  const gradients = useMemo(() => parseGradientLines(RAW_SCORE_BANDS), []);
  const mockGradients = useMemo(() => parseMockExamGradients(RAW_MOCK_2026), []);
  const filteredData = useMemo(() => filterRecords(allData, criteria), [allData, criteria]);

  const handleReset = () => setCriteria(DEFAULT_CRITERIA);

  const handleExport = () => {
    if (filteredData.length > 0) {
      // 获取ResultTable当前的排序状态
      const resultTableEl = document.querySelector('.data-table tbody');
      if (resultTableEl) {
        // 从DOM中读取当前显示的行顺序
        const rows = resultTableEl.querySelectorAll('tr');
        const orderedNames: string[] = [];
        rows.forEach(row => {
          const nameCell = row.querySelector('.col-name .school-name');
          if (nameCell) {
            orderedNames.push(nameCell.textContent || '');
          }
        });
        // 根据DOM顺序重新排序数据
        if (orderedNames.length > 0) {
          const nameToRecord = new Map(filteredData.map(r => [r.schoolName, r]));
          const sortedData = orderedNames.map(name => nameToRecord.get(name)).filter((r): r is SchoolRecord => r != null);
          exportToCsv(filteredData, criteria.distinguishOutside, 'query_result.csv', sortedData);
          return;
        }
      }
      exportToCsv(filteredData, criteria.distinguishOutside);
    }
  };

  const handleExportFavorites = () => {
    exportConfigToFile();
  };

  const handleImportFavorites = async (file: File) => {
    await importConfigFromFile(file);
    setFavoritesVersion(v => v + 1);
  };

  const handleSelectSchool = useCallback((school: SchoolRecord) => setSelectedSchool(school), []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo">
              <Database size={24} />
              <h1>广州市高中录取数据查询系统</h1>
            </div>
            <p className="header-subtitle">
              <GraduationCap size={14} />
              整合6大数据源 · 跨表关联查询 · 多条件组合筛选
            </p>
          </div>
          <div className="header-right" ref={extMenuRef}>
            <button
              className={`ext-menu-toggle ${extMenuOpen ? 'active' : ''}`}
              onClick={() => setExtMenuOpen(v => !v)}
              aria-haspopup="true"
              aria-expanded={extMenuOpen}
            >
              <Info size={16} />
              <span>扩展信息</span>
              <ChevronDown size={14} className={extMenuOpen ? 'rotated' : ''} />
            </button>
            {extMenuOpen && (
              <div className="ext-menu-dropdown">
                {extFiles.length === 0 && (
                  <div className="ext-menu-empty">
                    <FileText size={14} />
                    <span>暂无扩展信息</span>
                  </div>
                )}
                {extFiles.map(file => (
                  <button
                    key={file}
                    className="ext-menu-item"
                    onClick={() => {
                      setExtMenuOpen(false);
                      if (file.toLowerCase().endsWith('.md')) {
                        setMdModalTitle(formatFileName(file));
                        setMdModalUrl(`./other_infos/${encodeURIComponent(file)}`);
                        setMdModalOpen(true);
                      } else {
                        window.open(`./other_infos/${encodeURIComponent(file)}`, '_blank');
                      }
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>{formatFileName(file)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <FilterPanel
          allData={allData}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          onReset={handleReset}
          onExport={handleExport}
          onExportFavorites={handleExportFavorites}
          onImportFavorites={handleImportFavorites}
          resultCount={filteredData.length}
          showScoreFilters={showScoreFilters}
          onShowScoreFiltersChange={setShowScoreFilters}
        />

        <GradientBar
          gradients={gradients}
          mockGradients={mockGradients}
          selectedYear={gradientYear}
          onYearChange={setGradientYear}
        />

        <ResultTable
          data={filteredData}
          onSelectSchool={handleSelectSchool}
          keyword={criteria.keyword}
          onKeywordChange={(keyword) => setCriteria(prev => ({ ...prev, keyword }))}
          favoritesVersion={favoritesVersion}
          distinguishOutside={criteria.distinguishOutside}
        />
      </main>

      <footer className="app-footer">
        <p>数据来源: 广州市教育局官方公布 | 第三批/第四批录取分数 · 学校库 · 名额分配控制线 · 分数段统计</p>
      </footer>

      <DetailDrawer school={selectedSchool} onClose={() => setSelectedSchool(null)} />

      {mdModalOpen && (
        <MarkdownModal
          title={mdModalTitle}
          url={mdModalUrl}
          onClose={() => setMdModalOpen(false)}
        />
      )}
    </div>
  );
}
