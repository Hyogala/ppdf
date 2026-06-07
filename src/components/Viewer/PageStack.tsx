import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageDimensions } from '../../types/pdf';
import type { Stroke, ToolConfig } from '../../types/annotation';
import { PdfCanvas } from './PdfCanvas';
import { AnnotationCanvas } from './AnnotationCanvas';

const PAGE_GAP = 12;

interface Props {
  proxy: PDFDocumentProxy;
  pageDimensions: PageDimensions[];
  strokes: Stroke[];
  tool: ToolConfig;
  interactionMode: 'draw' | 'navigate';
  isPinchingRef: React.MutableRefObject<boolean>;
  pageWidth: number;
  onStrokeComplete: (stroke: Stroke) => void;
  onEraseAt: (pageIndex: number, x: number, y: number) => void;
}

export function PageStack({
  proxy, pageDimensions, strokes, tool, interactionMode, isPinchingRef,
  pageWidth, onStrokeComplete, onEraseAt,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: PAGE_GAP, padding: PAGE_GAP }}>
      {pageDimensions.map((dim, i) => {
        const w = pageWidth;
        const h = Math.round(dim.height * (pageWidth / dim.width));
        return (
          <div
            key={i}
            style={{
              position: 'relative',
              width: w,
              height: h,
              flexShrink: 0,
              background: '#fff',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
            }}
          >
            <PdfCanvas proxy={proxy} pageIndex={i} width={w} height={h} />
            <AnnotationCanvas
              pageIndex={i}
              width={w}
              height={h}
              tool={tool}
              interactionMode={interactionMode}
              isPinchingRef={isPinchingRef}
              strokes={strokes}
              onStrokeComplete={onStrokeComplete}
              onEraseAt={(x, y) => onEraseAt(i, x, y)}
            />
          </div>
        );
      })}
    </div>
  );
}
