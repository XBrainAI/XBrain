import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownModal.css';

interface MarkdownModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export default function MarkdownModal({ title, url, onClose }: MarkdownModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(url)
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
  }, [url]);

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
    <div className="mdm-overlay" onClick={onClose}>
      <div className="mdm-container" onClick={e => e.stopPropagation()}>
        <div className="mdm-header">
          <div className="mdm-title">
            <FileText size={18} />
            <span>{title}</span>
          </div>
          <button className="mdm-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="mdm-body">
          {loading && <div className="mdm-loading">加载中...</div>}
          {error && <div className="mdm-error">[ERROR] 加载失败: {error}</div>}
          {!loading && !error && (
            <div className="mdm-markdown">
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
