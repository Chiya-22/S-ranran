import SongRow from "./SongRow"
import "./App.css"
import { useRef, useState } from "react"
import { initialSongs } from "./songs"


function App() {
  const [mode, setMode] = useState<"RANDOM" | "S-RANDOM">("S-RANDOM")
  const [songs, setSongs] = useState(initialSongs)

  return (
    <div>
      <h1>S-ranran</h1>

      <button onClick={() => setMode("RANDOM")}>
        RANDOM
      </button>

      <button onClick={() => setMode("S-RANDOM")}>
        S-RANDOM
      </button>

      <p>現在のモード：{mode}</p>

      {songs.map((song) => (
        <SongRow
          key={`${mode}-${song.title}`}
          song={song}
          record={mode === "RANDOM" ? song.random : song.sRandom}
          onBadChange={(newBad) => {
            setSongs(
              songs.map((s) =>
                s.title === song.title
                  ? {
                      ...s,
                      [mode === "RANDOM" ? "random" : "sRandom"]: {
                        ...(mode === "RANDOM" ? s.random : s.sRandom),
                        bad: newBad,
                      },
                    }
                  : s
              )
            )
          }}
          onClearedChange={(newCleared) => {
            setSongs(
              songs.map((s) =>
                s.title === song.title
                  ? {
                      ...s,
                      [mode === "RANDOM" ? "random" : "sRandom"]: {
                        ...(mode === "RANDOM" ? s.random : s.sRandom),
                        cleared: newCleared,
                      },
                    }
                  : s
              )
            )
          }}
        />
      ))}
    </div>
  )
}

export default App