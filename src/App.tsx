import SongRow from "./SongRow"
import './App.css'
import { useState } from "react"

const songs = [
  {
    title: "曲A",
    level: 46,
    bad: null,
    cleared: true,
  },
  {
    title: "曲B",
    level: 47,
    bad: 27,
    cleared: false,
  },
  {
    title: "曲C",
    level: 46,
    bad: 8,
    cleared: true,
  },
]

function App() {
  const [mode, setMode] = useState<"RANDOM" | "S-RANDOM">("S-RANDOM")

  return (
  <div>
    <h1>S-ranran</h1>
    <div>
  <button onClick={() => setMode("RANDOM")}>
    RANDOM
  </button>

  <button onClick={() => setMode("S-RANDOM")}>
    S-RANDOM
  </button>
  </div>

  <p>現在のモード：{mode}</p> 

    {songs.map((song) => (
      <SongRow key={song.title} song={song} />
    ))}
  </div>
)
}

export default App
