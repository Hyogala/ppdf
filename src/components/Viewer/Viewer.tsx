import { useState, useRef, useCallback, useEffect } from 'react';
import type { PDFDocumentState } from '../../types/pdf';
import type { Stroke, ToolConfig } from '../../types/annotation';
import { useAnnotations } from '../../hooks/useAnnotations';
import { useGestures, type ViewTransform } from '../../hooks/useGestures';
import { useAutoSave } from '../../hooks/useAutoSave';
import { loadAnnotations, loadDocument } from '../../lib/storage';
import { exportAnnotatedPdf } from '../../lib/exportPdf';
import { PageStack } from './PageStack';
import { Toolbar } from '../Toolbar/Toolbar';
import './Viewer.css';

interface Props {
  pdfState: PDFDocumentState;
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

export function Viewer({ pdfState, onClose }: Props) {
  const [tool, setTool] = useState<ToolConfig>(DEFAULT_TOOL);
  const [interactionMode, setInteractionMode] = useState<'draw' | 'navigate'>('draw');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [pageWidth, setPageWidth] = useState(getPageWidth);
  // renderScale is debounced: only updates 600ms after zoom stops
  // This triggers high-quality re-render of vector PDF content at the new zoom level
  const [renderScale, setRenderScale] = useState(1);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const annotations = useAnnotations();
  const versionRef = useRef(0);

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

  // Debounce render scale: re-render PDF at higher resolution after zoom settles
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

  useAutoSave(pdfState.hash, annotations.strokes, annotations.isDirty, wrappedMarkSaved, versionRef);

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

  const handleExport = useCallback(async () => {
    const stored = await loadDocument(pdfState.hash);
    if (!stored) return;
    setSaveStatus('saving');
    try {
      await exportAnnotatedPdf(stored.bytes, annotations.strokes, pdfState.fileName);
    } finally {
      setSaveStatus(annotations.isDirty ? 'dirty' : 'saved');
    }
  }, [pdfState, annotations.strokes, annotations.isDirty]);

  return (
    <div className="viewer">
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
        interactionMode={interactionMode}
        onModeChange={setInteractionMode}
        canUndo={annotations.canUndo}
        canRedo={annotations.canRedo}
        onUndo={annotations.undo}
        onRedo={annotations.redo}
        onClearAll={annotations.clearAll}
        onExport={handleExport}
        onClose={onClose}
        saveStatus={saveStatus}
      />

      <div className="viewer__filename">{pdfState.fileName}</div>
    </div>
  );
}
