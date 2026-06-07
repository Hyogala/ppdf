import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageDimensions } from '../../types/pdf';
import type { Stroke, ToolConfig } from '../../types/annotation';
import { PdfCanvas } from './PdfCanvas';
import { AnnotationCanvas } from './AnnotationCanvas';

const PAGE_GAP = 16;
const PAGE_WIDTH = 800;

interface Props {
  proxy: PDFDocumentProxy;
  pageDimensions: PageDimensions[];
  strokes: Stroke[];
  tool: ToolConfig;
  interactionMode: 'draw' | 'navigate';
  isPinching: React.MutableRefObject<{ current: boolean }>;
  onStrokeComplete: (stroke: Stroke) => void;
  onEraseAt: (pageIndex: number, x: number, y: number) => void;
}

export function PageStack({
  proxy, pageDimensions, strokes, tool, interactionMode, isPinching,
  onStrokeComplete, onEraseAt,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: PAGE_GAP, padding: PAGE_GAP }}>
      {pageDimensions.map((dim, i) => {
        const scale = PAGE_WIDTH / dim.width;
        const w = PAGE_WIDTH;
        const h = Math.round(dim.height * scale);
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
              isPinching={isPinching}
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
