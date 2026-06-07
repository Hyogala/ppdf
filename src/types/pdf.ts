import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface PageDimensions {
  width: number;
  height: number;
}

export interface PDFDocumentState {
  proxy: PDFDocumentProxy | null;
  fileName: string;
  hash: string;
  pageCount: number;
  pageDimensions: PageDimensions[];
  loadError: string | null;
}
