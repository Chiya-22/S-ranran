//import { useState } from "react"

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
  return (
    <div className="song-row">
      <h2>{song.title}</h2>

      <p>Lv {song.level}</p>

      <div className="bad-display">
        BAD {record.bad ?? "-"}
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