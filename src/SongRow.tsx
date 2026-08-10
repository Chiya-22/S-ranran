import { useRef, useState } from "react"


const BAD_PER_SCREEN = 50

type Song = {
  title: string
  level: number
}

type Record = {
  bad: number | null
  cleared: boolean
}

type SongRowProps = {
  song: Song
  record: Record
  onBadChange: (newBad: number | null) => void
  onClearedChange: (newCleared: boolean) => void
}

function SongRow({
  song,
  record,
  onBadChange,
  onClearedChange,
}: SongRowProps) {
    const [isEditing, setIsEditing] = useState(false)
    const timerRef = useRef<number | null>(null)
    const startXRef = useRef<number | null>(null)
    const startBadRef = useRef<number>(0)
    const hasMovedRef = useRef(false)

  return (
    <div className="song-row">
      <h2>{song.title}</h2>

      <p>Lv {song.level}</p>

      <div
        className={`bad-display ${isEditing ? "editing" : ""}`}
        onPointerDown={(event) => {
            startXRef.current = event.clientX
            hasMovedRef.current = false

            timerRef.current = window.setTimeout(() => {
            startBadRef.current = record.bad ?? 0
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
            onBadChange(newBad)

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
            BAD {record.bad ?? "-"}
            {isEditing && <span> →</span>}
                    
        </div>

      <input
        type="range"
        min="0"
        max="50"
        value={record.bad ?? 0}
        onChange={(event) => onBadChange(Number(event.target.value))}
      />

      <button onClick={() => onClearedChange(!record.cleared)}>
        {record.cleared ? "✓ クリア済み" : "× 未クリア"}
      </button>
    </div>
  )
}

export default SongRow