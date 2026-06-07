import { useRef, useState, useEffect } from 'react';
import { getRecentDocs } from '../../lib/storage';
import { loadDocument } from '../../lib/storage';
import type { RecentDoc } from '../../types/storage';
import './FileLoader.css';

interface Props {
  onLoad: (bytes: ArrayBuffer, fileName: string) => void;
}

export function FileLoader({ onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    getRecentDocs().then(setRecentDocs);
  }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer) {
        onLoad(e.target.result, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf') handleFile(file);
  };

  const openRecent = async (doc: RecentDoc) => {
    const stored = await loadDocument(doc.hash);
    if (stored) {
      onLoad(stored.bytes, stored.fileName);
    }
  };

  return (
    <div className="file-loader">
      <div className="file-loader__hero">
        <div className="file-loader__logo">PDF Markup</div>
        <p className="file-loader__sub">PDFに手書きマークアップ</p>

        <div
          className={`file-loader__drop${dragging ? ' file-loader__drop--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <span className="file-loader__drop-icon">📂</span>
          <span>PDFを開く</span>
          <span className="file-loader__drop-hint">タップまたはドラッグ&amp;ドロップ</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={onInputChange}
        />
      </div>

      {recentDocs.length > 0 && (
        <div className="file-loader__recent">
          <h2>最近使用したファイル</h2>
          <ul>
            {recentDocs.map(doc => (
              <li key={doc.hash} onClick={() => openRecent(doc)}>
                <span className="file-loader__recent-icon">📄</span>
                <span className="file-loader__recent-name">{doc.fileName}</span>
                <span className="file-loader__recent-date">
                  {new Date(doc.lastOpened).toLocaleDateString('ja-JP')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
