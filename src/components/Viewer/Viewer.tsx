import { useState, useRef, useCallback, useEffect } from 'react';
import type { PDFDocumentState } from '../../types/pdf';
import type { Stroke, ToolConfig } from '../../types/annotation';
import type { SaveMode } from '../SaveModeDialog/SaveModeDialog';
import { useAnnotations } from '../../hooks/useAnnotations';
import { useGestures, type ViewTransform } from '../../hooks/useGestures';
import { useAutoSave } from '../../hooks/useAutoSave';
import { loadAnnotations, loadDocument } from '../../lib/storage';
import {
  saveAnnotatedPdfToHandle,
  saveWithFilePicker,
  exportAnnotatedPdf,
} from '../../lib/exportPdf';
import { PageStack } from './PageStack';
import { Toolbar } from '../Toolbar/Toolbar';
import './Viewer.css';

interface Props {
  pdfState: PDFDocumentState;
  saveMode: SaveMode;
  initialFileHandle: FileSystemFileHandle | null;
  onClose: () => void;
}

const DEFAULT_TOOL: ToolConfig = {
  tool: 'pen',
  color: '#ef4444',
  thickness: 4,
  opacity: 1.0,
};

function getPageWidth() {
  return Math.min(window.innerWidth - 24, 800);
}

export function Viewer({ pdfState, saveMode, initialFileHandle, onClose }: Props) {
  const [tool, setTool] = useState<ToolConfig>(DEFAULT_TOOL);
  const [interactionMode, setInteractionMode] = useState<'draw' | 'navigate'>('draw');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [pageWidth, setPageWidth] = useState(getPageWidth);
  const [renderScale, setRenderScale] = useState(1);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(initialFileHandle);

  const transformRef = useRef(transform);
  transformRef.current = transform;
  const pageWidthRef = useRef(pageWidth);
  pageWidthRef.current = pageWidth;
  const originalBytesRef = useRef<ArrayBuffer | null>(null);

  const annotations = useAnnotations();
  const versionRef = useRef(0);

  // Keep original bytes in memory for fast saves
  useEffect(() => {
    if (!pdfState.hash) return;
    loadDocument(pdfState.hash).then(stored => {
      if (stored) originalBytesRef.current = stored.bytes;
    });
  }, [pdfState.hash]);

  // Responsive page width
  useEffect(() => {
    const onResize = () => setPageWidth(getPageWidth());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Debounce render scale
  useEffect(() => {
    const t = setTimeout(() => setRenderScale(transform.scale), 600);
    return () => clearTimeout(t);
  }, [transform.scale]);

  // Load saved annotations
  useEffect(() => {
    if (!pdfState.hash) return;
    loadAnnotations(pdfState.hash).then(saved => {
      if (saved?.strokes) {
        annotations.loadStrokes(saved.strokes);
        versionRef.current = saved.version;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfState.hash]);

  const wrappedMarkSaved = useCallback(() => {
    annotations.markSaved();
    setSaveStatus('saved');
  }, [annotations]);

  // File-save ref: called by useAutoSave every 30s when a file handle is available
  const fileSaveRef = useRef<(() => Promise<void>) | null>(null);
  const strokesRef = useRef(annotations.strokes);
  strokesRef.current = annotations.strokes;
  const fileHandleRef = useRef(fileHandle);
  fileHandleRef.current = fileHandle;

  useEffect(() => {
    fileSaveRef.current = fileHandleRef.current
      ? async () => {
          if (!originalBytesRef.current || !fileHandleRef.current) return;
          await saveAnnotatedPdfToHandle(
            fileHandleRef.current,
            originalBytesRef.current,
            strokesRef.current,
            pageWidthRef.current,
          );
        }
      : null;
  }, [fileHandle]);

  useAutoSave(pdfState.hash, annotations.strokes, annotations.isDirty, wrappedMarkSaved, versionRef, fileSaveRef);

  useEffect(() => {
    setSaveStatus(annotations.isDirty ? 'dirty' : 'saved');
  }, [annotations.isDirty]);

  const getTransform = useCallback(() => transformRef.current, []);
  const { onPointerDown, onPointerMove, onPointerUp, isPinchingRef } = useGestures(
    getTransform, setTransform, interactionMode,
  );

  const handleEraseAt = useCallback((pageIndex: number, x: number, y: number) => {
    annotations.eraseAt(pageIndex, x, y, tool.thickness * 3);
  }, [annotations, tool.thickness]);

  const handleSave = useCallback(async () => {
    if (!originalBytesRef.current) return;
    setSaveStatus('saving');
    try {
      const bytes = originalBytesRef.current;
      const strokes = strokesRef.current;
      const pw = pageWidthRef.current;
      const currentHandle = fileHandleRef.current;

      if (currentHandle) {
        // Silent overwrite via existing file handle
        await saveAnnotatedPdfToHandle(currentHandle, bytes, strokes, pw);
      } else if ('showSaveFilePicker' in window) {
        // First save on desktop: show picker, then store handle for silent future saves
        const suggestedName = saveMode === 'overwrite'
          ? pdfState.fileName
          : pdfState.fileName.replace(/\.pdf$/i, '') + '_annotated.pdf';
        const newHandle = await saveWithFilePicker(bytes, strokes, suggestedName, pw);
        if (newHandle) setFileHandle(newHandle);
        else { setSaveStatus(annotations.isDirty ? 'dirty' : 'saved'); return; }
      } else {
        // iOS: share sheet
        const suggestedName = saveMode === 'overwrite'
          ? pdfState.fileName
          : pdfState.fileName.replace(/\.pdf$/i, '') + '_annotated.pdf';
        await exportAnnotatedPdf(bytes, strokes, suggestedName, pw);
      }

      annotations.markSaved();
      setSaveStatus('saved');
    } catch (e) {
      alert(`保存に失敗しました: ${String(e)}`);
      setSaveStatus(annotations.isDirty ? 'dirty' : 'saved');
    }
  }, [saveMode, pdfState.fileName, annotations]);

  const isDrawMode = interactionMode === 'draw';

  return (
    <div className="viewer">
      {/* Floating draw/navigate toggle — top left */}
      <button
        className={`viewer__mode-btn${!isDrawMode ? ' viewer__mode-btn--active' : ''}`}
        onClick={() => setInteractionMode(isDrawMode ? 'navigate' : 'draw')}
        title={isDrawMode ? 'スクロールモードへ' : '描画モードへ'}
      >
        {isDrawMode ? '✍️' : '🖐️'}
      </button>

      {/* Floating save button — top right */}
      <button
        className={`viewer__save-btn${saveStatus === 'saving' ? ' viewer__save-btn--saving' : ''}`}
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
      >
        <span className="viewer__save-dot">
          {saveStatus === 'saving' ? '…' : saveStatus === 'dirty' ? '●' : '✓'}
        </span>
        保存
      </button>

      <div
        className="viewer__canvas-area"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="viewer__transform"
          style={{
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {pdfState.proxy && (
            <PageStack
              proxy={pdfState.proxy}
              pageDimensions={pdfState.pageDimensions}
              strokes={annotations.strokes}
              tool={tool}
              interactionMode={interactionMode}
              isPinchingRef={isPinchingRef}
              pageWidth={pageWidth}
              renderScale={renderScale}
              onStrokeComplete={(s: Stroke) => annotations.addStroke(s)}
              onEraseAt={handleEraseAt}
            />
          )}
        </div>
      </div>

      <Toolbar
        tool={tool}
        onChange={setTool}
        canUndo={annotations.canUndo}
        canRedo={annotations.canRedo}
        onUndo={annotations.undo}
        onRedo={annotations.redo}
        onClearAll={annotations.clearAll}
        onClose={onClose}
      />

      <div className="viewer__filename">{pdfState.fileName}</div>
    </div>
  );
}
