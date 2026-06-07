import { PDFDocument, rgb, BlendMode } from 'pdf-lib';
import { getStroke } from 'perfect-freehand';
import type { Stroke } from '../types/annotation';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function outlineToSvgPath(points: number[][], pdfHeight: number): string {
  if (points.length === 0) return '';
  const d: string[] = [];
  points.forEach(([x, y], i) => {
    const py = pdfHeight - y;
    d.push(i === 0 ? `M ${x.toFixed(2)} ${py.toFixed(2)}` : `L ${x.toFixed(2)} ${py.toFixed(2)}`);
  });
  d.push('Z');
  return d.join(' ');
}

export async function exportAnnotatedPdf(
  originalBytes: ArrayBuffer,
  strokes: Stroke[],
  fileName: string,
): Promise<void> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();

  for (const stroke of strokes) {
    const page = pages[stroke.pageIndex];
    if (!page) continue;

    const { width: _w, height: pdfH } = page.getSize();

    const isHighlighter = stroke.tool === 'highlighter';
    const outlinePoints = getStroke(
      stroke.points.map(p => [p.x, p.y, p.pressure]),
      {
        size: isHighlighter ? stroke.thickness * 3 : stroke.thickness,
        thinning: isHighlighter ? 0 : stroke.tool === 'pencil' ? 0.3 : 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
      },
    );

    const pathData = outlineToSvgPath(outlinePoints, pdfH);
    if (!pathData) continue;

    const color = hexToRgb(stroke.color);
    page.drawSvgPath(pathData, {
      color: rgb(color.r, color.g, color.b),
      opacity: stroke.opacity,
      blendMode: isHighlighter ? BlendMode.Multiply : BlendMode.Normal,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.pdf$/i, '') + '_annotated.pdf';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
