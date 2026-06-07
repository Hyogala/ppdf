import { useState, useCallback, useRef } from 'react';
import type { Stroke } from '../types/annotation';

const MAX_HISTORY = 50;

export function useAnnotations(initialStrokes: Stroke[] = []) {
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const past = useRef<Stroke[][]>([]);
  const future = useRef<Stroke[][]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });

  const pushHistory = useCallback((current: Stroke[]) => {
    past.current = [...past.current.slice(-MAX_HISTORY + 1), current];
    future.current = [];
    setHistorySize({ past: past.current.length, future: 0 });
  }, []);

  const addStroke = useCallback((stroke: Stroke) => {
    setStrokes(prev => {
      pushHistory(prev);
      setIsDirty(true);
      return [...prev, stroke];
    });
  }, [pushHistory]);

  const eraseAt = useCallback((pageIndex: number, x: number, y: number, radius: number) => {
    setStrokes(prev => {
      const next = prev.filter(s => {
        if (s.pageIndex !== pageIndex) return true;
        return !s.points.some(p => Math.hypot(p.x - x, p.y - y) < radius);
      });
      if (next.length !== prev.length) {
        pushHistory(prev);
        setIsDirty(true);
      }
      return next;
    });
  }, [pushHistory]);

  const clearAll = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      pushHistory(prev);
      setIsDirty(true);
      return [];
    });
  }, [pushHistory]);

  const clearPage = useCallback((pageIndex: number) => {
    setStrokes(prev => {
      const next = prev.filter(s => s.pageIndex !== pageIndex);
      if (next.length !== prev.length) {
        pushHistory(prev);
        setIsDirty(true);
      }
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    setStrokes(current => {
      const previous = past.current[past.current.length - 1];
      past.current = past.current.slice(0, -1);
      future.current = [current, ...future.current.slice(0, MAX_HISTORY - 1)];
      setHistorySize({ past: past.current.length, future: future.current.length });
      setIsDirty(true);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    setStrokes(current => {
      const next = future.current[0];
      future.current = future.current.slice(1);
      past.current = [...past.current.slice(-MAX_HISTORY + 1), current];
      setHistorySize({ past: past.current.length, future: future.current.length });
      setIsDirty(true);
      return next;
    });
  }, []);

  const loadStrokes = useCallback((loaded: Stroke[]) => {
    past.current = [];
    future.current = [];
    setHistorySize({ past: 0, future: 0 });
    setStrokes(loaded);
    setIsDirty(false);
  }, []);

  const markSaved = useCallback(() => setIsDirty(false), []);

  return {
    strokes,
    addStroke,
    eraseAt,
    clearAll,
    clearPage,
    undo,
    redo,
    canUndo: historySize.past > 0,
    canRedo: historySize.future > 0,
    isDirty,
    markSaved,
    loadStrokes,
  };
}
