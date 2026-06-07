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
  highlighter: '🖍',
  pencil: '📝',
  eraser: '⬜',
};

export function Toolbar({
  tool, onChange, interactionMode, onModeChange,
  canUndo, canRedo, onUndo, onRedo, onClearAll, onExport, onClose, saveStatus,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const setToolType = (t: ToolType) => {
    const opacity = t === 'highlighter' ? 0.4 : t === 'pencil' ? 0.7 : 1.0;
    onChange({ ...tool, tool: t, opacity });
  };

  return (
    <div className={`toolbar${expanded ? ' toolbar--expanded' : ''}`}>
      <div className="toolbar__handle" onClick={() => setExpanded(p => !p)}>
        <span className="toolbar__handle-icon">{expanded ? '◀' : '▶'}</span>
      </div>

      {expanded && (
        <div className="toolbar__body">
          {/* Mode toggle */}
          <div className="toolbar__section">
            <button
              className={`toolbar__btn${interactionMode === 'navigate' ? ' toolbar__btn--active' : ''}`}
              onClick={() => onModeChange(interactionMode === 'navigate' ? 'draw' : 'navigate')}
              title="スクロール/描画切替"
            >
              {interactionMode === 'navigate' ? '🖐' : '✍️'}
            </button>
          </div>

          {/* Draw tools */}
          <div className="toolbar__section">
            {(['pen', 'highlighter', 'pencil', 'eraser'] as ToolType[]).map(t => (
              <button
                key={t}
                className={`toolbar__btn${tool.tool === t ? ' toolbar__btn--active' : ''}`}
                onClick={() => setToolType(t)}
                title={t}
              >
                {TOOL_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Color picker */}
          {tool.tool !== 'eraser' && (
            <div className="toolbar__section toolbar__colors">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`toolbar__color${tool.color === c ? ' toolbar__color--active' : ''}`}
                  style={{ background: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.3)' : undefined }}
                  onClick={() => onChange({ ...tool, color: c })}
                />
              ))}
            </div>
          )}

          {/* Thickness */}
          {tool.tool !== 'eraser' && (
            <div className="toolbar__section toolbar__thicknesses">
              {THICKNESSES.map(t => (
                <button
                  key={t}
                  className={`toolbar__thickness${tool.thickness === t ? ' toolbar__thickness--active' : ''}`}
                  onClick={() => onChange({ ...tool, thickness: t })}
                >
                  <span style={{ width: t, height: t, background: '#fff', borderRadius: '50%', display: 'block' }} />
                </button>
              ))}
            </div>
          )}

          {/* Undo / Redo */}
          <div className="toolbar__section">
            <button className="toolbar__btn" disabled={!canUndo} onClick={onUndo} title="元に戻す">↩</button>
            <button className="toolbar__btn" disabled={!canRedo} onClick={onRedo} title="やり直し">↪</button>
          </div>

          {/* Actions */}
          <div className="toolbar__section">
            {showClearConfirm ? (
              <>
                <button className="toolbar__btn toolbar__btn--danger" onClick={() => { onClearAll(); setShowClearConfirm(false); }}>
                  全消去
                </button>
                <button className="toolbar__btn" onClick={() => setShowClearConfirm(false)}>✕</button>
              </>
            ) : (
              <button className="toolbar__btn" onClick={() => setShowClearConfirm(true)} title="全消去">🗑</button>
            )}
            <button className="toolbar__btn" onClick={onExport} title="書き出し">⬇</button>
            <button className="toolbar__btn" onClick={onClose} title="閉じる">✕</button>
          </div>

          {/* Save status */}
          <div className="toolbar__status">
            {saveStatus === 'saving' ? '保存中…' : saveStatus === 'dirty' ? '未保存' : '保存済'}
          </div>
        </div>
      )}
    </div>
  );
}
