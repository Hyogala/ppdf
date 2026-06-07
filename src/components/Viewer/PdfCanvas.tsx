import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  proxy: PDFDocumentProxy;
  pageIndex: number;
  width: number;
  height: number;
}

export function PdfCanvas({ proxy, pageIndex, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    proxy.getPage(pageIndex + 1).then(page => {
      if (cancelled) return;
      const vp = page.getViewport({ scale: 1 });
      const scale = width / vp.width;
      const viewport = page.getViewport({ scale });
      page.render({ canvasContext: ctx, viewport }).promise.catch(() => {});
    });

    return () => { cancelled = true; };
  }, [proxy, pageIndex, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width, height, display: 'block' }}
    />
  );
}
