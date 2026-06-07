import { useState } from 'react';
import { usePdfLoader } from './hooks/usePdfLoader';
import { FileLoader } from './components/FileLoader/FileLoader';
import { Viewer } from './components/Viewer/Viewer';
import { SaveModeDialog } from './components/SaveModeDialog/SaveModeDialog';
import type { SaveMode } from './components/SaveModeDialog/SaveModeDialog';

interface PendingPdf {
  bytes: ArrayBuffer;
  fileName: string;
  fileHandle: FileSystemFileHandle | null;
}

export function App() {
  const { state, loading, loadPdf, closePdf } = usePdfLoader();
  const [pending, setPending] = useState<PendingPdf | null>(null);
  const [saveMode, setSaveMode] = useState<SaveMode>('overwrite');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

  const handleFileSelected = (bytes: ArrayBuffer, fileName: string, handle?: FileSystemFileHandle) => {
    setPending({ bytes, fileName, fileHandle: handle ?? null });
  };

  const handleSaveModeChosen = async (mode: SaveMode) => {
    if (!pending) return;
    setSaveMode(mode);
    setFileHandle(pending.fileHandle);
    setPending(null);
    await loadPdf(pending.bytes, pending.fileName);
  };

  const handleClose = () => {
    setFileHandle(null);
    setSaveMode('overwrite');
    closePdf();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: '#1a1a2e', color: '#fff',
        fontFamily: '-apple-system, sans-serif', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: '2rem' }}>📄</div>
        <div>PDFを読み込み中…</div>
      </div>
    );
  }

  if (state.loadError) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: '#1a1a2e', color: '#fff',
        fontFamily: '-apple-system, sans-serif', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <div>PDFの読み込みに失敗しました</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{state.loadError}</div>
        <button
          onClick={handleClose}
          style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
        >
          戻る
        </button>
      </div>
    );
  }

  if (state.proxy) {
    return (
      <Viewer
        pdfState={state}
        saveMode={saveMode}
        initialFileHandle={fileHandle}
        onClose={handleClose}
      />
    );
  }

  return (
    <>
      <FileLoader onLoad={handleFileSelected} />
      {pending && (
        <SaveModeDialog
          fileName={pending.fileName}
          onChoose={handleSaveModeChosen}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
