import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 学校名称到报告文件名的映射（用于处理同名多校区/多专业的学校）
const SCHOOL_NAME_TO_FILE: Record<string, string> = {
  // 综合高中：多个专业方向共用一份报告
  '广州市财经商贸职业学校（综合高中）': '广州市财经商贸职业学校深度信息专题报告.md',
  '广州市天河职业高级中学（综合高中）（计算机网络技术）': '广州市天河职业高级中学深度信息专题报告.md',
  '广州市天河职业高级中学（综合高中）（金融事务）': '广州市天河职业高级中学深度信息专题报告.md',
  '广州市天河职业高级中学（综合高中）（幼儿保育）': '广州市天河职业高级中学深度信息专题报告.md',
  '广州市贸易职业高级中学（综合高中）（电子商务）': '广州市贸易职业高级中学深度信息专题报告.md',
  '广州市贸易职业高级中学（综合高中）（大数据技术应用）': '广州市贸易职业高级中学深度信息专题报告.md',
  '广州市贸易职业高级中学（综合高中）（艺术设计与制作）': '广州市贸易职业高级中学深度信息专题报告.md',
  // 公费班/民办班：共用母体学校报告
  '广州市海珠中学（公费班）': '广州市海珠中学深度信息专题报告.md',
};

interface SchoolDetailModalProps {
  schoolName: string;
  onClose: () => void;
}

function resolveFileName(schoolName: string): string {
  // 优先使用显式映射
  if (SCHOOL_NAME_TO_FILE[schoolName]) {
    return SCHOOL_NAME_TO_FILE[schoolName];
  }
  // 默认规则：学校名 + 深度信息专题报告.md
  return `${schoolName}深度信息专题报告.md`;
}

export default function SchoolDetailModal({ schoolName, onClose }: SchoolDetailModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileName = encodeURIComponent(resolveFileName(schoolName));
    fetch(`./${fileName}`)
      .then(res => {
        if (!res.ok) throw new Error('文件不存在');
        return res.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || '加载失败');
        setLoading(false);
      });
  }, [schoolName]);

  // ESC 键关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 禁止底层滚动
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  return createPortal(
    <div className="sdm-overlay" onClick={onClose}>
      <div className="sdm-container" onClick={e => e.stopPropagation()}>
        <div className="sdm-header">
          <div className="sdm-title">
            <FileText size={18} />
            <span>{schoolName}</span>
          </div>
          <button className="sdm-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sdm-body">
          {loading && <div className="sdm-loading">加载中...</div>}
          {error && <div className="sdm-error">[ERROR] 加载失败: {error}</div>}
          {!loading && !error && (
            <div className="sdm-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
