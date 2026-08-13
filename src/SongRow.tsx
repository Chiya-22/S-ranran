import { useRef, useState } from "react"
import type { Song } from "./songs"

const BAD_PER_SCREEN = 50

type PlayResult = {
  result: "CLEAR" | "FAILED"
  bad: number
  playedAt: string
}

type Record = {
  history: PlayResult[]
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

  //userefを使って、BADの編集モード中の状態を管理する
  const timerRef = useRef<number | null>(null)
  const startXRef = useRef<number | null>(null)
  const startBadRef = useRef(0)
  const hasMovedRef = useRef(false)

  // BADの状態を管理する
  const [bad, setBad] = useState<number | null>(
    record.history.length > 0
      ? record.history[record.history.length - 1].bad
      : null
  )

  const [result, setResult] =
    useState<"CLEAR" | "FAILED" | null>(null)

    // 確定ボタンが押されたときの処理
  const handleConfirm = () => {
    if (result === null || bad === null) {
      return
    }

    const newResult: PlayResult = {
    result,
    bad,
    playedAt: new Date().toISOString(),
    }

    onRecordChange({
    history: [...record.history, newResult],
    })

    setResult(null)
  }

    // =========================
    // ★ 統計情報はここ
    // =========================

  const plays = record.history.length

const clears = record.history.filter(
  (play) => play.result === "CLEAR"
).length

const clearRate =
  plays > 0
    ? Math.round((clears / plays) * 100)
    : null

const bestBad =
  record.history.length > 0
    ? Math.min(...record.history.map((play) => play.bad))
    : null

const recent10 = record.history.slice(-10)

const recent10AverageBad =
  recent10.length > 0
    ? Math.round(
        recent10.reduce((sum, play) => sum + play.bad, 0) /
          recent10.length
      )
    : null


  // =========================
  // ★ ここから画面
  // =========================

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
            CLEAR {clears} / {plays}
          </div>

          <div className="song-stat">
            <span className="stat-label">CLEAR率</span>
            <span className="stat-value">
                {clearRate !== null
                ? `${clearRate}%`
                : "-"}
            </span>
            </div>

          <div className="song-stat">
            <span className="stat-label">最小BAD</span>
            <span className="stat-value">{bestBad ?? "-"}</span>
            </div>

            <div className="song-stat">
          <span className="stat-label">
            平均BAD
          </span>

          <span className="stat-value">
            {recent10AverageBad ?? "-"}
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
                event.preventDefault()
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
                }, 300)
            }}
            onPointerMove={(event) => {
              event.preventDefault()
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