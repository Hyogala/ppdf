import { useState } from 'react';
import type { ToolConfig, ToolType } from '../../types/annotation';
import './Toolbar.css';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#000000',
  '#ffffff',
];

const THICKNESSES = [2, 4, 8, 16, 24];

interface Props {
  tool: ToolConfig;
  onChange: (t: ToolConfig) => void;
  interactionMode: 'draw' | 'navigate';
  onModeChange: (m: 'draw' | 'navigate') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onExport: () => void;
  onClose: () => void;
  saveStatus: 'saved' | 'dirty' | 'saving';
}

const TOOL_LABELS: Record<ToolType, string> = {
  pen: '✏️',
  highlighter: '🖍️',
  pencil: '📝',
  eraser: '⬜',
};

export function Toolbar({
  tool, onChange, interactionMode, onModeChange,
  canUndo, canRedo, onUndo, onRedo, onClearAll, onExport, onClose, saveStatus,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThickness, setShowThickness] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const setToolType = (t: ToolType) => {
    const opacity = t === 'highlighter' ? 0.4 : t === 'pencil' ? 0.7 : 1.0;
    onChange({ ...tool, tool: t, opacity });
    setShowColorPicker(false);
    setShowThickness(false);
  };

  const isDrawMode = interactionMode === 'draw';

  return (
    <>
      {/* Color picker popup */}
      {showColorPicker && tool.tool !== 'eraser' && (
        <div className="toolbar__popup toolbar__popup--colors">
          {COLORS.map(c => (
            <button
              key={c}
              className={`toolbar__color${tool.color === c ? ' toolbar__color--active' : ''}`}
              style={{ background: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.3)' : 'none' }}
              onClick={() => { onChange({ ...tool, color: c }); setShowColorPicker(false); }}
            />
          ))}
        </div>
      )}

      {/* Thickness picker popup */}
      {showThickness && tool.tool !== 'eraser' && (
        <div className="toolbar__popup toolbar__popup--thickness">
          {THICKNESSES.map(t => (
            <button
              key={t}
              className={`toolbar__thickness-btn${tool.thickness === t ? ' toolbar__thickness-btn--active' : ''}`}
              onClick={() => { onChange({ ...tool, thickness: t }); setShowThickness(false); }}
            >
              <span style={{
                width: Math.max(t, 4), height: Math.max(t, 4),
                background: '#fff', borderRadius: '50%', display: 'block',
              }} />
            </button>
          ))}
        </div>
      )}

      <div className="toolbar">
        {/* Mode toggle */}
        <button
          className={`toolbar__btn${!isDrawMode ? ' toolbar__btn--active' : ''}`}
          onClick={() => onModeChange(isDrawMode ? 'navigate' : 'draw')}
          title={isDrawMode ? 'スクロールモードへ' : '描画モードへ'}
        >
          {isDrawMode ? '✍️' : '🖐️'}
        </button>

        <div className="toolbar__divider" />

        {/* Draw tools */}
        {(['pen', 'highlighter', 'pencil', 'eraser'] as ToolType[]).map(t => (
          <button
            key={t}
            className={`toolbar__btn${tool.tool === t ? ' toolbar__btn--active' : ''}`}
            onClick={() => setToolType(t)}
          >
            {TOOL_LABELS[t]}
          </button>
        ))}

        <div className="toolbar__divider" />

        {/* Color + thickness */}
        {tool.tool !== 'eraser' && (
          <>
            <button
              className={`toolbar__color-preview${showColorPicker ? ' toolbar__btn--active' : ''}`}
              style={{ background: tool.color, border: tool.color === '#ffffff' ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent' }}
              onClick={() => { setShowColorPicker(p => !p); setShowThickness(false); }}
              title="色を選択"
            />
            <button
              className={`toolbar__btn${showThickness ? ' toolbar__btn--active' : ''}`}
              onClick={() => { setShowThickness(p => !p); setShowColorPicker(false); }}
              title="太さを選択"
            >
              <span style={{
                width: Math.min(tool.thickness + 2, 20), height: Math.min(tool.thickness + 2, 20),
                background: '#fff', borderRadius: '50%', display: 'block',
              }} />
            </button>
          </>
        )}

        <div className="toolbar__divider" />

        {/* Undo / Redo */}
        <button className="toolbar__btn" disabled={!canUndo} onClick={onUndo} title="元に戻す">↩</button>
        <button className="toolbar__btn" disabled={!canRedo} onClick={onRedo} title="やり直し">↪</button>

        <div className="toolbar__divider" />

        {/* Clear */}
        {showClearConfirm ? (
          <>
            <button
              className="toolbar__btn toolbar__btn--danger"
              onClick={() => { onClearAll(); setShowClearConfirm(false); }}
            >全消去</button>
            <button className="toolbar__btn" onClick={() => setShowClearConfirm(false)}>✕</button>
          </>
        ) : (
          <button className="toolbar__btn" onClick={() => setShowClearConfirm(true)} title="全消去">🗑️</button>
        )}

        <button className="toolbar__btn" onClick={onExport} title="PDF書き出し">⬇️</button>
        <button className="toolbar__btn" onClick={onClose} title="閉じる">✕</button>

        {/* Save status */}
        <div className="toolbar__status">
          {saveStatus === 'saving' ? '保存中' : saveStatus === 'dirty' ? '●' : '✓'}
        </div>
      </div>
    </>
  );
}
