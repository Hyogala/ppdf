import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  proxy: PDFDocumentProxy;
  pageIndex: number;
  width: number;
  height: number;
  renderScale: number; // viewer zoom level for adaptive quality
}

// Maximum physical canvas dimension to prevent OOM on large zooms
const MAX_CANVAS_PX = 4096;

export function PdfCanvas({ proxy, pageIndex, width, height, renderScale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const lastRenderKey = useRef('');
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Lazy: only render when page is near the viewport
  useEffect(() => {
    const el = placeholderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    // Effective pixel density: zoom scale × device pixel ratio, capped
    const effectiveDpr = Math.min(renderScale * dpr, MAX_CANVAS_PX / width);
    const renderKey = `${pageIndex}-${width}-${Math.round(effectiveDpr * 10)}`;
    if (renderKey === lastRenderKey.current) return;
    lastRenderKey.current = renderKey;

    // Cancel previous in-flight render
    renderTaskRef.current?.cancel();
    let cancelled = false;

    proxy.getPage(pageIndex + 1).then(page => {
      if (cancelled) return;

      const nativeVp = page.getViewport({ scale: 1 });
      // Scale to fill display width, then multiply for retina + zoom quality
      const pdfScale = (width / nativeVp.width) * effectiveDpr;
      const viewport = page.getViewport({ scale: pdfScale });

      const pw = Math.min(Math.round(viewport.width), MAX_CANVAS_PX);
      const ph = Math.min(Math.round(viewport.height), MAX_CANVAS_PX);
      canvas.width = pw;
      canvas.height = ph;

      const ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, pw, ph);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      task.promise.catch(e => {
        if (e?.name !== 'RenderingCancelledException') console.error('PDF render error', e);
      });
    }).catch(e => {
      if (!cancelled) console.error('getPage error', e);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [isVisible, proxy, pageIndex, width, height, renderScale]);

  return (
    <div ref={placeholderRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Placeholder shown while not yet rendered */}
      {!isVisible && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#aaa', fontSize: '0.8rem',
        }}>
          {pageIndex + 1}
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width, height, display: 'block' }}
      />
    </div>
  );
}
