import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentState } from '../types/pdf';
import { computePdfHash } from '../lib/pdfHash';
import { saveDocument } from '../lib/storage';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

const initialState: PDFDocumentState = {
  proxy: null,
  fileName: '',
  hash: '',
  pageCount: 0,
  pageDimensions: [],
  loadError: null,
};

export function usePdfLoader() {
  const [state, setState] = useState<PDFDocumentState>(initialState);
  const [loading, setLoading] = useState(false);

  const loadPdf = useCallback(async (bytes: ArrayBuffer, fileName: string) => {
    setLoading(true);
    setState(initialState);
    try {
      const hash = await computePdfHash(bytes);
      const copy = bytes.slice(0);
      const proxy = await pdfjsLib.getDocument({ data: copy }).promise;

      const dims = await Promise.all(
        Array.from({ length: proxy.numPages }, async (_, i) => {
          const page = await proxy.getPage(i + 1);
          const vp = page.getViewport({ scale: 1 });
          return { width: vp.width, height: vp.height };
        }),
      );

      setState({
        proxy,
        fileName,
        hash,
        pageCount: proxy.numPages,
        pageDimensions: dims,
        loadError: null,
      });

      await saveDocument({ hash, fileName, bytes, lastOpened: Date.now() });
    } catch (e) {
      setState(prev => ({ ...prev, loadError: String(e) }));
    } finally {
      setLoading(false);
    }
  }, []);

  const closePdf = useCallback(() => {
    state.proxy?.destroy();
    setState(initialState);
  }, [state.proxy]);

  return { state, loading, loadPdf, closePdf };
}
