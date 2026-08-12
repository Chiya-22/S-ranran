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
    const startBadRef = useRef<number>(0)
    const hasMovedRef = useRef(false)

    const [bad, setBad] = useState<number | null>(
    record.badHistory.length > 0
      ? record.badHistory[record.badHistory.length - 1]
      : null
  )

  const [result, setResult] = useState<"CLEAR" | "FAILED" | null>(null)

  const handleConfirm = () => {
    if (result === null || bad === null) {
      return
    }

    const newBadHistory = [...record.badHistory, bad].slice(-10)

    onRecordChange({
      plays: record.plays + 1,
      clears: record.clears + (result === "CLEAR" ? 1 : 0),
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
      <div className="song-header">
    <div>
      <h2>{song.title}</h2>
      <p>Lv {song.level}</p>
    </div>

    <button
          onClick={() => setResult("CLEAR")}
        >
          {result === "CLEAR" ? "● CLEAR" : "CLEAR"}
        </button>

        <button
          onClick={() => setResult("FAILED")}
        >
          {result === "FAILED" ? "● FAILED" : "FAILED"}
        </button>
  </div>

        <button
        onClick={handleConfirm}
        disabled={result === null || bad === null}
      >
        確定
      </button>

      <div>
        CLEAR {record.clears} / {record.plays}
      </div>

      <div>
        BEST BAD {bestBad ?? "-"}
      </div>

      <div
        className={`bad-display ${isEditing ? "editing" : ""}`}
        onPointerDown={(event) => {
            startXRef.current = event.clientX
            hasMovedRef.current = false

            timerRef.current = window.setTimeout(() => {
            startBadRef.current = bad ?? 0
            setIsEditing(true)
            console.log("編集モード開始")
            }, 500)
        }}
        onPointerMove={(event) => {
            if (!isEditing || startXRef.current === null) {
                return
            }
            const distance = event.clientX - startXRef.current
            if (Math.abs(distance) < 10) {
                return
            }
            hasMovedRef.current = true

            const screenWidth = window.innerWidth
            const badChange = Math.round((distance / screenWidth) * BAD_PER_SCREEN)

            const newBad = Math.max(
            0,
            startBadRef.current + badChange
            )
            setBad(newBad)

            console.log("移動距離:", distance)
            console.log("BAD変化量:", badChange)
        }}
        onPointerUp={() => {
            if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current)
            timerRef.current = null
            }

            if (isEditing) {
            setIsEditing(false)
            startXRef.current = null
            console.log("編集モード終了")
        }
        }}
        onPointerCancel={() => {
            if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current)
            timerRef.current = null
            }

            if (isEditing) {
            setIsEditing(false)
            startXRef.current = null
            console.log("編集モードキャンセル")
            }
        }}
        >
            {isEditing && <span>← </span>}
            BAD {bad ?? "-"}
            {isEditing && <span> →</span>}
                    
        </div>

      <input
        type="range"
        min="0"
        max="50"
        value={bad ?? 0}
        onChange={(event) => setBad(Number(event.target.value))}
      />

    </div>
  )
}

export default SongRow