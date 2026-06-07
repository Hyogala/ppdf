import { useRef, useCallback } from 'react';

export interface ViewTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 8;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function useGestures(
  getTransform: () => ViewTransform,
  setTransform: (t: ViewTransform) => void,
) {
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const isPinching = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      isPinching.current = true;
      const pts = Array.from(pointers.current.values());
      lastPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const transform = getTransform();

    if (pointers.current.size === 2 && isPinching.current) {
      const pts = Array.from(pointers.current.values());
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (lastPinchDist.current !== null && lastPinchDist.current > 0) {
        const scaleDelta = newDist / lastPinchDist.current;
        const newScale = clamp(transform.scale * scaleDelta, MIN_SCALE, MAX_SCALE);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const scaleRatio = newScale / transform.scale;
        setTransform({
          scale: newScale,
          translateX: midX - scaleRatio * (midX - transform.translateX),
          translateY: midY - scaleRatio * (midY - transform.translateY),
        });
      }
      lastPinchDist.current = newDist;
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setTransform({
        ...transform,
        translateX: transform.translateX + dx,
        translateY: transform.translateY + dy,
      });
    }
  }, [getTransform, setTransform]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      isPinching.current = false;
      lastPinchDist.current = null;
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, isPinching };
}
