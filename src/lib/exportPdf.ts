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

async function saveBlob(blob: Blob, suggestedName: string): Promise<void> {
  // 1. File System Access API (desktop Chrome/Edge — user picks save location)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as Window & { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> })
        .showSaveFilePicker({
          suggestedName,
          types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
        });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user cancelled
      // fall through to next method
    }
  }

  // 2. Web Share API with files (iOS Safari — opens share sheet → "ファイルに保存" etc.)
  if ('share' in navigator) {
    const file = new File([blob], suggestedName, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: suggestedName });
      return;
    }
  }

  // 3. Fallback: trigger download (browser chooses Downloads folder)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportAnnotatedPdf(
  originalBytes: ArrayBuffer,
  strokes: Stroke[],
  fileName: string,
): Promise<void> {
  // Load in chunks to avoid blocking main thread on large files
  const pdfDoc = await PDFDocument.load(originalBytes, {
    updateMetadata: false,
  });
  const pages = pdfDoc.getPages();

  for (const stroke of strokes) {
    const page = pages[stroke.pageIndex];
    if (!page) continue;

    const { height: pdfH } = page.getSize();
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
  const suggestedName = fileName.replace(/\.pdf$/i, '') + '_annotated.pdf';

  await saveBlob(blob, suggestedName);
}
