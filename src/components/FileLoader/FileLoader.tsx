import { useRef, useState, useEffect } from 'react';
import { getRecentDocs, loadDocument } from '../../lib/storage';
import type { RecentDoc } from '../../types/storage';
import './FileLoader.css';

interface Props {
  onLoad: (bytes: ArrayBuffer, fileName: string, fileHandle?: FileSystemFileHandle) => void;
}

type ShowOpenFilePickerFn = (opts?: {
  types?: { description?: string; accept: Record<string, string[]> }[];
  multiple?: boolean;
}) => Promise<FileSystemFileHandle[]>;

const hasFilePicker = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

export function FileLoader({ onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    getRecentDocs().then(setRecentDocs);
  }, []);

  // Try opening via File System Access API to get a writable file handle.
  const openWithPicker = async () => {
    if (hasFilePicker) {
      try {
        const [handle] = await (window as unknown as { showOpenFilePicker: ShowOpenFilePickerFn })
          .showOpenFilePicker({
            types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
            multiple: false,
          });
        // Request readwrite permission so we can silently save later
        const perm = await (handle as FileSystemFileHandle & {
          requestPermission: (d: { mode: string }) => Promise<string>;
        }).requestPermission({ mode: 'readwrite' });
        const file = await handle.getFile();
        const bytes = await file.arrayBuffer();
        onLoad(bytes, file.name, perm === 'granted' ? handle : undefined);
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        // Fall through to input element
      }
    }
    inputRef.current?.click();
  };

  const handleFileObject = async (file: File) => {
    const bytes = await file.arrayBuffer();
    onLoad(bytes, file.name);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileObject(file);
    e.target.value = '';
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const item = e.dataTransfer.items?.[0];
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    // Try to get a writable file handle from the drop
    if (item && 'getAsFileSystemHandle' in item) {
      try {
        const handle = await (item as DataTransferItem & {
          getAsFileSystemHandle: () => Promise<FileSystemFileHandle>;
        }).getAsFileSystemHandle();
        if (handle && handle.kind === 'file') {
          const perm = await (handle as FileSystemFileHandle & {
            requestPermission: (d: { mode: string }) => Promise<string>;
          }).requestPermission({ mode: 'readwrite' });
          const bytes = await file.arrayBuffer();
          onLoad(bytes, file.name, perm === 'granted' ? handle : undefined);
          return;
        }
      } catch {
        // Fall through
      }
    }
    handleFileObject(file);
  };

  const openRecent = async (doc: RecentDoc) => {
    const stored = await loadDocument(doc.hash);
    if (stored) onLoad(stored.bytes, stored.fileName);
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
          onClick={openWithPicker}
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
