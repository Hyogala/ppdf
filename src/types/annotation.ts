export type ToolType = 'pen' | 'highlighter' | 'pencil' | 'eraser';

export interface ToolConfig {
  tool: ToolType;
  color: string;
  thickness: number;
  opacity: number;
}

export interface RawPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  pageIndex: number;
  points: RawPoint[];
  tool: ToolType;
  color: string;
  thickness: number;
  opacity: number;
  timestamp: number;
}

export interface AnnotationLayer {
  pdfHash: string;
  strokes: Stroke[];
  version: number;
  lastModified: number;
}
