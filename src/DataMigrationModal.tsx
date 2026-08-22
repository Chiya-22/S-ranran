type DataMigrationModalProps = {
  isOpen: boolean
  onClose: () => void
  onExport: () => void
  onImport: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void
}

function DataMigrationModal({
  isOpen,
  onClose,
  onExport,
  onImport,
}: DataMigrationModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      className="data-migration-overlay"
      onClick={onClose}
    >
      <div
        className="data-migration-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="data-migration-header">
          <h2>データを移行する</h2>

          <button onClick={onClose}>
            ×
          </button>
        </div>

        <div className="data-migration-content">
          <p>
            プレイ履歴などのデータを
            バックアップ・復元できます。
          </p>

          <button
            onClick={onExport}
            className="migration-action-button"
          >
            データを書き出す
          </button>

          <label className="migration-action-button">
            データを読み込む

            <input
              type="file"
              accept=".json,application/json"
              onChange={onImport}
              hidden
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default DataMigrationModal