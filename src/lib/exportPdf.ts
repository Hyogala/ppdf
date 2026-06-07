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

function outlineToSvgPath(points: number[][]): string {
  if (points.length === 0) return '';
  const d: string[] = [];
  points.forEach(([x, y], i) => {
    d.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
  });
  d.push('Z');
  return d.join(' ');
}

// Builds annotated PDF bytes without saving to any destination.
async function buildAnnotatedPdfBytes(
  originalBytes: ArrayBuffer,
  strokes: Stroke[],
  pageWidth: number,
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(originalBytes, { updateMetadata: false });
  const pages = pdfDoc.getPages();

  for (const stroke of strokes) {
    const page = pages[stroke.pageIndex];
    if (!page) continue;

    const { width: pdfW, height: pdfH } = page.getSize();
    const coordScale = pdfW / pageWidth;

    const isHighlighter = stroke.tool === 'highlighter';
    const baseSize = isHighlighter ? stroke.thickness * 3 : stroke.thickness;

    const outlinePoints = getStroke(
      stroke.points.map(p => [p.x * coordScale, p.y * coordScale, p.pressure]),
      {
        size: baseSize * coordScale,
        thinning: isHighlighter ? 0 : stroke.tool === 'pencil' ? 0.3 : 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
      },
    );

    const pathData = outlineToSvgPath(outlinePoints);
    if (!pathData) continue;

    const color = hexToRgb(stroke.color);
    // x:0, y:pdfH places the SVG origin at the top-left of the page.
    // pdf-lib applies scale(1,-1) internally so SVG Y (going down) maps correctly to PDF Y (going up).
    page.drawSvgPath(pathData, {
      x: 0,
      y: pdfH,
      color: rgb(color.r, color.g, color.b),
      opacity: stroke.opacity,
      blendMode: isHighlighter ? BlendMode.Multiply : BlendMode.Normal,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
}

// Save annotated PDF silently to a file handle (desktop File System Access API).
export async function saveAnnotatedPdfToHandle(
  handle: FileSystemFileHandle,
  originalBytes: ArrayBuffer,
  strokes: Stroke[],
  pageWidth: number,
): Promise<void> {
  const pdfBuffer = await buildAnnotatedPdfBytes(originalBytes, strokes, pageWidth);
  const writable = await handle.createWritable();
  await writable.write(pdfBuffer);
  await writable.close();
}

// Save annotated PDF via download link or Web Share (iOS fallback).
export async function exportAnnotatedPdf(
  originalBytes: ArrayBuffer,
  strokes: Stroke[],
  suggestedName: string,
  pageWidth: number,
): Promise<void> {
  const pdfBuffer = await buildAnnotatedPdfBytes(originalBytes, strokes, pageWidth);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });

  // Web Share API with files (iOS Safari — opens share sheet)
  if ('share' in navigator) {
    const file = new File([blob], suggestedName, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Attempt to save via showSaveFilePicker and return the obtained handle for future silent saves.
// Returns null if the API is unavailable or the user cancels.
export async function saveWithFilePicker(
  originalBytes: ArrayBuffer,
  strokes: Stroke[],
  suggestedName: string,
  pageWidth: number,
): Promise<FileSystemFileHandle | null> {
  if (!('showSaveFilePicker' in window)) return null;
  try {
    const handle = await (window as Window & {
      showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
    }).showSaveFilePicker({
      suggestedName,
      types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
    });
    await saveAnnotatedPdfToHandle(handle, originalBytes, strokes, pageWidth);
    return handle;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return null;
    throw e;
  }
}
