import './SaveModeDialog.css';

export type SaveMode = 'overwrite' | 'copy';

interface Props {
  fileName: string;
  onChoose: (mode: SaveMode) => void;
  onCancel: () => void;
}

export function SaveModeDialog({ fileName, onChoose, onCancel }: Props) {
  const baseName = fileName.replace(/\.pdf$/i, '');

  return (
    <div className="smd__overlay">
      <div className="smd__card">
        <h2 className="smd__title">保存方法を選択</h2>
        <p className="smd__file">{fileName}</p>

        <button className="smd__btn smd__btn--primary" onClick={() => onChoose('overwrite')}>
          <span className="smd__btn-label">このファイルを上書き保存</span>
          <span className="smd__btn-hint">{fileName}</span>
        </button>

        <button className="smd__btn" onClick={() => onChoose('copy')}>
          <span className="smd__btn-label">コピーとして保存</span>
          <span className="smd__btn-hint">{baseName}_annotated.pdf</span>
        </button>

        <button className="smd__cancel" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}
