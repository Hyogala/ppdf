import { useState } from 'react';
import { usePdfLoader } from './hooks/usePdfLoader';
import { FileLoader } from './components/FileLoader/FileLoader';
import { Viewer } from './components/Viewer/Viewer';

export function App() {
  const { state, loading, loadPdf, closePdf } = usePdfLoader();
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleLoad = async (bytes: ArrayBuffer, fileName: string) => {
    setLoadError(null);
    await loadPdf(bytes, fileName);
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

  if (state.loadError || loadError) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: '#1a1a2e', color: '#fff',
        fontFamily: '-apple-system, sans-serif', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <div>PDFの読み込みに失敗しました</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{state.loadError ?? loadError}</div>
        <button
          onClick={closePdf}
          style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
        >
          戻る
        </button>
      </div>
    );
  }

  if (state.proxy) {
    return <Viewer pdfState={state} onClose={closePdf} />;
  }

  return <FileLoader onLoad={handleLoad} />;
}
