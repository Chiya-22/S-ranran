import SongRow from "./SongRow"
import "./App.css"
import { useEffect, useState } from "react"
import { initialSongs } from "./songs"

const STORAGE_KEY = "songRecords"

function App() {
  const [mode, setMode] = useState<"RANDOM" | "S-RANDOM">("S-RANDOM")
  const [songs, setSongs] = useState(initialSongs)
  const [page, setPage] = useState<"ALL" | "RANDOM" | "S-RANDOM">("ALL")
  
  const displayMode =
  page === "S-RANDOM" ? "S-RANDOM" : "RANDOM"

  type PlayRecord = {
    bad: number | null
    cleared: boolean
  }

type SongRecords = {
  [songId: string]: {
    random: PlayRecord
    sRandom: PlayRecord
  }
}

  
  const [records, setRecords] = useState<SongRecords>(() => {
  const savedRecords = localStorage.getItem(STORAGE_KEY)

  if (savedRecords) {
    return JSON.parse(savedRecords)
  }

  return {
    "song-001": {
      random: {
        bad: 12,
        cleared: true,
      },
      sRandom: {
        bad: 27,
        cleared: false,
      },
    },
    "song-002": {
      random: {
        bad: null,
        cleared: false,
      },
      sRandom: {
        bad: 35,
        cleared: true,
      },
    },
  }
})
useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [records])

  return (
    <div>

    <div className="page-tabs">
  <button onClick={() => setPage("ALL")}>
    全曲
  </button>

  <button onClick={() => setPage("RANDOM")}>
    RANDOM
  </button>

  <button onClick={() => setPage("S-RANDOM")}>
    S-RANDOM
  </button>
</div>

    <div>
      <h1>S-ranran</h1>

      <button onClick={() => setMode("RANDOM")}>
        RANDOM
      </button>

      <button onClick={() => setMode("S-RANDOM")}>
        S-RANDOM
      </button>

      <p>現在のモード：{mode}</p>

      {songs
        .filter((song) => {
          if (page === "ALL") {
            return true
          }

          if (page === "RANDOM") {
            return song.randomLevel !== null
          }

          return song.sRandomLevel !== null
        })
      .map((song) => (
        <SongRow
          key={`${mode}-${song.title}`}
          song={song}
          record={
          mode === "RANDOM"
            ? records[song.id].random
            : records[song.id].sRandom
          }
          onBadChange={(newBad) => {
          setRecords({
            ...records,
            [song.id]: {
              ...records[song.id],
              [mode === "RANDOM" ? "random" : "sRandom"]: {
                ...(mode === "RANDOM"
                  ? records[song.id].random
                  : records[song.id].sRandom),
                bad: newBad,
              },
            },
          })
        }}
          onClearedChange={(newCleared) => {
        setRecords({
          ...records,
          [song.id]: {
            ...records[song.id],
            [mode === "RANDOM" ? "random" : "sRandom"]: {
              ...(mode === "RANDOM"
                ? records[song.id].random
                : records[song.id].sRandom),
              cleared: newCleared,
            },
          },
        })
      }}
        />
      ))}
    </div>

    </div>
  )
}

export default App