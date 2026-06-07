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
) {
  const strokesRef = useRef(strokes);
  const isDirtyRef = useRef(isDirty);
  strokesRef.current = strokes;
  isDirtyRef.current = isDirty;

  const doSave = useRef(async () => {
    if (!hash || !isDirtyRef.current) return;
    version.current += 1;
    await saveAnnotations(hash, strokesRef.current, version.current);
    markSaved();
  });
  doSave.current = async () => {
    if (!hash || !isDirtyRef.current) return;
    version.current += 1;
    await saveAnnotations(hash, strokesRef.current, version.current);
    markSaved();
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
