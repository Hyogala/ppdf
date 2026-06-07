import { useEffect, useRef } from 'react';
import { saveAnnotations } from '../lib/storage';
import type { Stroke } from '../types/annotation';

const AUTOSAVE_INTERVAL = 30_000;

export function useAutoSave(
  hash: string,
  strokes: Stroke[],
  isDirty: boolean,
  markSaved: () => void,
  version: React.MutableRefObject<number>,
  // Optional: called every 30s to also save the annotated PDF to a file handle.
  // Use a ref so callers can update the function without re-mounting the effect.
  fileSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>,
) {
  const strokesRef = useRef(strokes);
  const isDirtyRef = useRef(isDirty);
  strokesRef.current = strokes;
  isDirtyRef.current = isDirty;

  const doSave = useRef(async () => {
    if (!hash) return;
    if (isDirtyRef.current) {
      version.current += 1;
      await saveAnnotations(hash, strokesRef.current, version.current);
      markSaved();
    }
    // File-based save runs alongside IndexedDB save (silent, best-effort)
    if (fileSaveRef?.current) {
      try {
        await fileSaveRef.current();
      } catch {
        // Silently ignore file save errors during auto-save
      }
    }
  });
  doSave.current = async () => {
    if (!hash) return;
    if (isDirtyRef.current) {
      version.current += 1;
      await saveAnnotations(hash, strokesRef.current, version.current);
      markSaved();
    }
    if (fileSaveRef?.current) {
      try {
        await fileSaveRef.current();
      } catch {
        // Silently ignore
      }
    }
  };

  useEffect(() => {
    if (!hash) return;
    const id = setInterval(() => doSave.current(), AUTOSAVE_INTERVAL);

    const onVisChange = () => {
      if (document.visibilityState === 'hidden') doSave.current();
    };
    const onUnload = () => doSave.current();

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [hash]);
}
