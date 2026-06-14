import { useState } from 'react';
import type { GradientLine } from '../types';
import type { MockExamGradient } from '../utils/mdParser';

interface GradientBarProps {
  gradients: GradientLine[];
  mockGradients?: MockExamGradient[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const GRADIENT_LABELS = [
  { key: 'firstGradient', label: '一梯', color: '#b91c1c' },
  { key: 'secondGradient', label: '二梯', color: '#c2410c' },
  { key: 'thirdGradient', label: '三梯', color: '#a16207' },
  { key: 'fourthGradient', label: '四梯', color: '#4d7c0f' },
  { key: 'fifthGradient', label: '五梯', color: '#0e7490' },
  { key: 'sixthGradient', label: '六梯', color: '#1d4ed8' },
  { key: 'minControlLine', label: '普高线', color: '#6b7280' },
];

const MOCK_GRADIENT_LABELS = [
  { key: 'firstGradient', label: '一梯', color: '#7c3aed' },
  { key: 'secondGradient', label: '二梯', color: '#6d28d9' },
  { key: 'thirdGradient', label: '三梯', color: '#5b21b6' },
  { key: 'fourthGradient', label: '四梯', color: '#4c1d95' },
  { key: 'fifthGradient', label: '五梯', color: '#312e81' },
  { key: 'sixthGradient', label: '六梯', color: '#1e1b4b' },
  { key: 'minControlLine', label: '普高线', color: '#6b7280' },
];

export default function GradientBar({ gradients, mockGradients, selectedYear, onYearChange }: GradientBarProps) {
  const [showMock, setShowMock] = useState(false);

  const current = gradients.find(g => g.year === selectedYear);
  const years = [...new Set(gradients.map(g => g.year))].sort((a, b) => b - a);

  const mockData = mockGradients && mockGradients.length > 0 ? mockGradients[0] : null;
  const displayData = showMock && mockData ? mockData : current;
  const displayLabels = showMock ? MOCK_GRADIENT_LABELS : GRADIENT_LABELS;

  if (!displayData) return null;

  return (
    <div className={`gradient-bar ${showMock ? 'gradient-bar--mock' : ''}`}>
      <div className="gradient-bar-header">
        <h4>
          {showMock
            ? `${mockData?.label ?? '2026年全市一模'}梯度线（总分${mockData?.totalScore ?? 690}分）`
            : '梯度线速查'}
        </h4>
        <div className="gradient-bar-controls">
          {mockData && (
            <button
              className={`mock-toggle-btn ${showMock ? 'active' : ''}`}
              onClick={() => setShowMock(!showMock)}
            >
              {showMock ? '查看历史梯度' : '一模梯度'}
            </button>
          )}
          {!showMock && (
            <div className="year-tabs">
              {years.map(y => (
                <button
                  key={y}
                  className={`year-tab ${y === selectedYear ? 'active' : ''}`}
                  onClick={() => onYearChange(y)}
                >{y}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="gradient-cards">
        {displayLabels.map(({ key, label, color }) => {
          const val = (displayData as any)[key];
          if (val === null || val === undefined) return null;
          return (
            <div
              key={key}
              className={`gradient-card ${showMock ? 'gradient-card--mock' : ''}`}
              style={{ '--g-color': color } as React.CSSProperties}
            >
              <span className="gc-label">{label}</span>
              <span className="gc-value">{val}</span>
            </div>
          );
        })}
      </div>

      {showMock && (
        <div className="mock-note">
          一模总分690分（非中考总分810分），数据仅供参考，实际梯度线以官方公布为准
        </div>
      )}
    </div>
  );
}
