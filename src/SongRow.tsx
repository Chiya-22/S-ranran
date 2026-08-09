import { useState } from "react"

type Song = {
  title: string
  level: number
  bad: number | null
  cleared: boolean
}

type SongRowProps = {
  song: Song
}

function SongRow({ song }: SongRowProps) {
  const [bad, setBad] = useState(song.bad)  
  const [cleared, setCleared] = useState(song.cleared)

  return (
    <div>
      <h2>{song.title}</h2>
      <p>Lv {song.level}</p>
      <p>BAD {bad ?? "-"}</p>
      <input
        type="range"
        min="0"
        max="50"
        value={bad ?? 0}
        onChange={(event) => setBad(Number(event.target.value))}
        />

      <button onClick={() => setCleared(!cleared)}>
        {cleared ? "✓ クリア済み" : "× 未クリア"}
      </button>
    </div>
  )
}

export default SongRow