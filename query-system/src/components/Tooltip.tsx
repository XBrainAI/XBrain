import { useState, useRef } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
}

export default function Tooltip({ content, children, maxWidth = 320 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  const show = (_e: React.MouseEvent) => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const popupW = Math.min(maxWidth, 360);
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + gap;
    if (left + popupW > vw - gap) {
      left = rect.left - popupW - gap;
    }
    if (left < gap) left = gap;

    let top = rect.top + rect.height / 2;
    const estimatedH = 150;
    if (top - estimatedH / 2 < gap) top = gap + estimatedH / 2;
    if (top + estimatedH / 2 > vh - gap) top = vh - gap - estimatedH / 2;

    setPos({ top, left });
    setVisible(true);
  };

  const hide = () => setVisible(false);

  return (
    <span className="tooltip-trigger">
      {children}
      <span ref={iconRef} className="tt-icon" onMouseEnter={show} onMouseLeave={hide}>?</span>
      {visible && (
        <div
          className="tooltip-popup"
          style={{ top: pos.top, left: pos.left, maxWidth }}
          onMouseEnter={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onMouseLeave={hide}
        >
          {content}
        </div>
      )}
    </span>
  );
}
