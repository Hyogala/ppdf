import type { Stroke } from './annotation';

export interface StoredDocument {
  hash: string;
  fileName: string;
  bytes: ArrayBuffer;
  lastOpened: number;
}

export interface StoredAnnotations {
  hash: string;
  strokes: Stroke[];
  version: number;
  lastModified: number;
}

export interface RecentDoc {
  hash: string;
  fileName: string;
  lastOpened: number;
}
