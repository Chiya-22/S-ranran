import { useRef, useState } from "react"
import type { Song } from "./songs"

const BAD_PER_SCREEN = 50

type Record = {
  plays: number
  clears: number
  badHistory: number[]
}

type SongRowProps = {
  song: Song
  record: Record
  onRecordChange: (newRecord: Record) => void
}

function SongRow({
  song,
  record,
  onRecordChange,
}: SongRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  const timerRef = useRef<number | null>(null)
  const startXRef = useRef<number | null>(null)
  const startBadRef = useRef(0)
  const hasMovedRef = useRef(false)

  const [bad, setBad] = useState<number | null>(
    record.badHistory.length > 0
      ? record.badHistory[record.badHistory.length - 1]
      : null
  )

  const [result, setResult] =
    useState<"CLEAR" | "FAILED" | null>(null)

  const handleConfirm = () => {
    if (result === null || bad === null) {
      return
    }

    const newBadHistory = [
      ...record.badHistory,
      bad,
    ].slice(-10)

    onRecordChange({
      plays: record.plays + 1,
      clears:
        record.clears +
        (result === "CLEAR" ? 1 : 0),
      badHistory: newBadHistory,
    })

    setResult(null)
  }

  const bestBad =
    record.badHistory.length > 0
      ? Math.min(...record.badHistory)
      : null

  return (
    <div className="song-row">

      {/* 曲名・レベル */}
      <div className="song-header">
        <div className="song-info">
            <div className="song-title">
            {song.title}
            </div>

            
        </div>

        </div>
      

      {/* 左：統計　　右：入力 */}
      <div className="song-content">

        {/* 統計情報 */}
        <div className="song-stats">

            <div className="song-level">
            Lv {song.level}
            </div>

          <div className="song-stat">
            CLEAR {record.clears} / {record.plays}
          </div>

          <div className="song-stat">
            <span className="stat-label">BEST BAD</span>
            <span className="stat-value">{bestBad ?? "-"}</span>
            </div>

            <div className="song-stat">
            <span className="stat-label">CLEAR率</span>
            <span className="stat-value">
                {record.plays > 0
                ? `${Math.round(
                    (record.clears / record.plays) * 100
                    )}%`
                : "-"}
            </span>
            </div>

        </div>

        {/* 入力エリア */}
        <div className="song-input">

            {isEditing && (
            <div className="bad-preview">
            BAD {bad ?? "-"}
            </div>
        )}

          {/* BAD */}
        <div className="bad-control">

        <button
            className="bad-adjust-button"
            onClick={() => setBad((prev) => Math.max(0, (prev ?? 0) - 1))}
        >
            −
        </button>

          <div
            className={`bad-display ${
              isEditing ? "editing" : ""
            }`}
            onPointerDown={(event) => {
              startXRef.current =
                event.clientX

              hasMovedRef.current = false

              timerRef.current =
                window.setTimeout(() => {
                  startBadRef.current =
                    bad ?? 0

                  setIsEditing(true)

                  console.log(
                    "編集モード開始"
                  )
                }, 500)
            }}
            onPointerMove={(event) => {
              if (
                !isEditing ||
                startXRef.current === null
              ) {
                return
              }

              const distance =
                event.clientX -
                startXRef.current

              if (Math.abs(distance) < 10) {
                return
              }

              hasMovedRef.current = true

              const screenWidth =
                window.innerWidth

              const badChange = Math.round(
                (distance / screenWidth) *
                  BAD_PER_SCREEN
              )

              const newBad = Math.max(
                0,
                startBadRef.current +
                  badChange
              )

              setBad(newBad)
            }}
            onPointerUp={() => {
              if (
                timerRef.current !== null
              ) {
                window.clearTimeout(
                  timerRef.current
                )

                timerRef.current = null
              }

              if (isEditing) {
                setIsEditing(false)
                startXRef.current = null

                console.log(
                  "編集モード終了"
                )
              }
            }}
            onPointerCancel={() => {
              if (
                timerRef.current !== null
              ) {
                window.clearTimeout(
                  timerRef.current
                )

                timerRef.current = null
              }

              if (isEditing) {
                setIsEditing(false)
                startXRef.current = null

                console.log(
                  "編集モードキャンセル"
                )
              }
            }}
          >
            {isEditing && <span>← </span>}

            BAD {bad ?? "-"}

            {isEditing && <span> →</span>}
          </div>

            <button
                className="bad-adjust-button"
                onClick={() => setBad((prev) => (prev ?? 0) + 1)}
            >
                ＋
            </button>

            </div>
          {/* スライダー */}
          <input
            className="bad-slider"
            type="range"
            min="0"
            max="50"
            value={bad ?? 0}
            onChange={(event) =>
              setBad(
                Number(event.target.value)
              )
            }
          />

          {/* CLEAR / FAILED */}
          <div className="result-buttons">

            <button
              className="result-button"
              onClick={() =>
                setResult("CLEAR")
              }
            >
              {result === "CLEAR"
                ? "● CLEAR"
                : "CLEAR"}
            </button>

            <button
              className="result-button"
              onClick={() =>
                setResult("FAILED")
              }
            >
              {result === "FAILED"
                ? "● FAILED"
                : "FAILED"}
            </button>

          </div>

          {/* 確定 */}
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={
              result === null ||
              bad === null
            }
          >
            確定
          </button>

        </div>
      </div>
    </div>
  )
}

export default SongRow