import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getStroke } from 'perfect-freehand';
import type { Stroke, ToolConfig, RawPoint } from '../../types/annotation';

export interface AnnotationCanvasHandle {
  redraw: (strokes: Stroke[]) => void;
}

interface Props {
  pageIndex: number;
  width: number;
  height: number;
  tool: ToolConfig;
  interactionMode: 'draw' | 'navigate';
  isPinchingRef: React.MutableRefObject<boolean>;
  onStrokeComplete: (stroke: Stroke) => void;
  onEraseAt: (x: number, y: number) => void;
  strokes: Stroke[];
}

function getOutlineOptions(tool: ToolConfig) {
  const isHighlighter = tool.tool === 'highlighter';
  return {
    size: isHighlighter ? tool.thickness * 3 : tool.thickness,
    thinning: isHighlighter ? 0 : tool.tool === 'pencil' ? 0.3 : 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
  };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, dpr: number) {
  const opts = getOutlineOptions(stroke);
  const outline = getStroke(
    stroke.points.map(p => [p.x * dpr, p.y * dpr, p.pressure]),
    { ...opts, size: opts.size * dpr },
  );
  if (outline.length === 0) return;

  const path = new Path2D();
  outline.forEach(([x, y], i) => {
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();

  ctx.save();
  ctx.globalAlpha = stroke.opacity;
  ctx.globalCompositeOperation = stroke.tool === 'highlighter' ? 'multiply' : 'source-over';
  ctx.fillStyle = stroke.color;
  ctx.fill(path);
  ctx.restore();
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, Props>(
  ({ pageIndex, width, height, tool, interactionMode, isPinchingRef, onStrokeComplete, onEraseAt, strokes }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const currentPointsRef = useRef<RawPoint[]>([]);
    const hasStylusRef = useRef(false);
    const dpr = window.devicePixelRatio || 1;

    const redraw = useCallback((strokeList: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of strokeList) {
        if (s.pageIndex === pageIndex) {
          drawStroke(ctx, s, dpr);
        }
      }
    }, [pageIndex, dpr]);

    useImperativeHandle(ref, () => ({ redraw }), [redraw]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      redraw(strokes);
    }, [width, height, dpr, redraw, strokes]);

    const getPageCoords = useCallback((e: React.PointerEvent): RawPoint => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / dpr / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / dpr / rect.height),
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };
    }, [dpr]);

    const isStylusPointer = (e: React.PointerEvent) => (e.pointerType as string) === 'stylus';

    const shouldDraw = useCallback((e: React.PointerEvent) => {
      // Stylus always draws
      if (isStylusPointer(e)) return true;
      // Touch only draws in draw mode (not navigate)
      if (e.pointerType === 'touch' && interactionMode === 'draw') {
        // Reject if 2-finger pinch is active
        if (isPinchingRef.current) return false;
        // Palm rejection: ignore touch if stylus is active
        if (hasStylusRef.current) return false;
        return true;
      }
      return false;
    }, [interactionMode, isPinchingRef]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
      if (isStylusPointer(e)) hasStylusRef.current = true;
      if (!shouldDraw(e)) return;

      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const pt = getPageCoords(e);
      currentPointsRef.current = [pt];

      if (tool.tool === 'eraser') {
        onEraseAt(pt.x, pt.y);
      }
    }, [tool, shouldDraw, getPageCoords, onEraseAt]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
      if (!drawingRef.current) return;
      // Cancel if pinch started mid-stroke
      if (isPinchingRef.current && !isStylusPointer(e)) {
        drawingRef.current = false;
        currentPointsRef.current = [];
        redraw(strokes);
        return;
      }
      e.preventDefault();

      const pt = getPageCoords(e);
      currentPointsRef.current.push(pt);

      if (tool.tool === 'eraser') {
        onEraseAt(pt.x, pt.y);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;

      redraw(strokes);

      const previewStroke: Stroke = {
        id: 'preview',
        pageIndex,
        points: currentPointsRef.current,
        tool: tool.tool,
        color: tool.color,
        thickness: tool.thickness,
        opacity: tool.opacity,
        timestamp: 0,
      };
      drawStroke(ctx, previewStroke, dpr);
    }, [tool, pageIndex, getPageCoords, redraw, strokes, onEraseAt, dpr, isPinchingRef]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
      if (isStylusPointer(e)) {
        setTimeout(() => { hasStylusRef.current = false; }, 300);
      }
      if (!drawingRef.current) return;
      drawingRef.current = false;

      if (tool.tool === 'eraser') {
        currentPointsRef.current = [];
        return;
      }

      const points = currentPointsRef.current;
      currentPointsRef.current = [];

      if (points.length < 1) return;

      onStrokeComplete({
        id: crypto.randomUUID(),
        pageIndex,
        points,
        tool: tool.tool,
        color: tool.color,
        thickness: tool.thickness,
        opacity: tool.opacity,
        timestamp: Date.now(),
      });
    }, [tool, pageIndex, onStrokeComplete]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          display: 'block',
          touchAction: 'none',
          cursor: tool.tool === 'eraser' ? 'cell' : 'crosshair',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    );
  },
);

AnnotationCanvas.displayName = 'AnnotationCanvas';
