import SongRow from "./SongRow"
import "./App.css"
import { useEffect, useState } from "react"
import { initialSongs } from "./songs"

const STORAGE_KEY = "songRecords"

type PlayRecord = {
  plays: number
  clears: number
  badHistory: number[]
}

type SongRecords = {
  [songId: string]: {
    random: PlayRecord
    sRandom: PlayRecord
  }
}

const createEmptyRecord = (): PlayRecord => ({
  plays: 0,
  clears: 0,
  badHistory: [],
})

const createInitialRecords = (): SongRecords => {
  const records: SongRecords = {}

  for (const song of initialSongs) {
    records[song.id] = {
      random: createEmptyRecord(),
      sRandom: createEmptyRecord(),
    }
  }

  return records
}

function App() {
  const [mode, setMode] =
    useState<"RANDOM" | "S-RANDOM">("S-RANDOM")

  const [songs] = useState(initialSongs)

  const [page, setPage] =
    useState<"ALL" | "RANDOM" | "S-RANDOM">("ALL")

  const [selectedLevel, setSelectedLevel] =
    useState<string | null>(null)

  const [minLevel, setMinLevel] = useState(10)
  const [maxLevel, setMaxLevel] = useState(19)

  const [levelOrder, setLevelOrder] =
    useState<"ASC" | "DESC">("ASC")

  const [records, setRecords] = useState<SongRecords>(() => {
    const savedRecords =
      localStorage.getItem(STORAGE_KEY)

    if (savedRecords) {
      return JSON.parse(savedRecords)
    }

    return createInitialRecords()
  })

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    )
  }, [records])

  const sRandomLevels = Array.from(
    new Set(
      songs
        .map((song) => song.sRandomLevel)
        .filter(
          (level): level is string =>
            level !== null
        )
    )
  )

  const filteredSRandomLevels = sRandomLevels
    .filter((level) => {
      const levelNumber =
        Number(level.replace("S乱Lv", ""))

      return (
        levelNumber >= minLevel &&
        levelNumber <= maxLevel
      )
    })
    .sort((a, b) => {
      const aNumber =
        Number(a.replace("S乱Lv", ""))

      const bNumber =
        Number(b.replace("S乱Lv", ""))

      return levelOrder === "ASC"
        ? aNumber - bNumber
        : bNumber - aNumber
    })

  return (
    <div>
      <div className="page-tabs">
        <button
          onClick={() => {
            setPage("ALL")
            setSelectedLevel(null)
          }}
        >
          全曲
        </button>

        <button
          onClick={() => {
            setPage("RANDOM")
            setSelectedLevel(null)
          }}
        >
          RANDOM
        </button>

        <button
          onClick={() => {
            setPage("S-RANDOM")
            setSelectedLevel(null)
          }}
        >
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

        {page === "S-RANDOM" &&
        selectedLevel === null ? (
          <div>
            <h2>S-RANDOM レベル一覧</h2>

            <div>
              <label>
                表示レベル：
                <select
                  value={minLevel}
                  onChange={(event) =>
                    setMinLevel(
                      Number(event.target.value)
                    )
                  }
                >
                  {Array.from(
                    { length: 19 },
                    (_, i) => i + 1
                  ).map((level) => (
                    <option
                      key={level}
                      value={level}
                    >
                      Lv{level}
                    </option>
                  ))}
                </select>

                {" ～ "}

                <select
                  value={maxLevel}
                  onChange={(event) =>
                    setMaxLevel(
                      Number(event.target.value)
                    )
                  }
                >
                  {Array.from(
                    { length: 19 },
                    (_, i) => i + 1
                  ).map((level) => (
                    <option
                      key={level}
                      value={level}
                    >
                      Lv{level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label>
                並び順：
                <select
                  value={levelOrder}
                  onChange={(event) =>
                    setLevelOrder(
                      event.target.value as
                        | "ASC"
                        | "DESC"
                    )
                  }
                >
                  <option value="ASC">
                    昇順
                  </option>
                  <option value="DESC">
                    降順
                  </option>
                </select>
              </label>
            </div>

            <div className="folder-list">
              {filteredSRandomLevels.map(
                (level) => (
                  <button
                    className="folder-button"
                    key={level}
                    onClick={() =>
                      setSelectedLevel(level)
                    }
                  >
                    📁 {level}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            {page === "S-RANDOM" && (
              <button
                onClick={() =>
                  setSelectedLevel(null)
                }
              >
                ← レベル一覧に戻る
              </button>
            )}

            {songs
              .filter((song) => {
                if (page === "ALL") {
                  return true
                }

                if (page === "RANDOM") {
                  return song.randomLevel !== null
                }

                return (
                  song.sRandomLevel ===
                  selectedLevel
                )
              })
              .map((song) => {
                const record =
                  mode === "RANDOM"
                    ? records[song.id].random
                    : records[song.id].sRandom

                return (
                  <SongRow
                    key={`${mode}-${song.id}`}
                    song={song}
                    record={record}
                    onRecordChange={(newRecord) => {
                      setRecords((prev) => ({
                        ...prev,
                        [song.id]: {
                          ...prev[song.id],
                          [mode === "RANDOM"
                            ? "random"
                            : "sRandom"]:
                            newRecord,
                        },
                      }))
                    }}
                  />
                )
              })}
          </>
        )}
      </div>
    </div>
  )
}

export default App