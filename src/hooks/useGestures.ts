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

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function useGestures(
  getTransform: () => ViewTransform,
  setTransform: (t: ViewTransform) => void,
  interactionMode: 'draw' | 'navigate',
) {
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const isPinchingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle touch (not stylus — stylus always goes to annotation canvas)
    if ((e.pointerType as string) === 'stylus') return;

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      isPinchingRef.current = true;
      const pts = Array.from(pointers.current.values());
      lastPinchDist.current = dist(pts[0], pts[1]);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if ((e.pointerType as string) === 'stylus') return;
    if (!pointers.current.has(e.pointerId)) return;

    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const transform = getTransform();

    if (pointers.current.size >= 2 && isPinchingRef.current) {
      // Pinch zoom — always active with 2 fingers
      const pts = Array.from(pointers.current.values());
      const newDist = dist(pts[0], pts[1]);
      if (lastPinchDist.current && lastPinchDist.current > 0) {
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
    } else if (pointers.current.size === 1 && interactionMode === 'navigate') {
      // Single-finger pan — only in navigate mode
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setTransform({
        ...transform,
        translateX: transform.translateX + dx,
        translateY: transform.translateY + dy,
      });
    }
  }, [getTransform, setTransform, interactionMode]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if ((e.pointerType as string) === 'stylus') return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      isPinchingRef.current = false;
      lastPinchDist.current = null;
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, isPinchingRef };
}
