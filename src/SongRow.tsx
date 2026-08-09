import { useState } from "react"

type Song = {
  title: string
  level: number
  bad: number
  cleared: boolean
}

type SongRowProps = {
  song: Song
}

function SongRow({ song }: SongRowProps) {
  const [cleared, setCleared] = useState(song.cleared)

  return (
    <div>
      <h2>{song.title}</h2>
      <p>Lv {song.level}</p>
      <p>BAD {song.bad}</p>

      <button onClick={() => setCleared(!cleared)}>
        {cleared ? "✓ クリア済み" : "× 未クリア"}
      </button>
    </div>
  )
}

export default SongRow