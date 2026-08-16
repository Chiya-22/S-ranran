import SongRow from "./SongRow"
import "./App.css"
import { useEffect, useState } from "react"
import { initialSongs } from "./songs"

const STORAGE_KEY = "songRecords-v2"

type PlayResult = {
  result: "CLEAR" | "FAILED"
  bad: number
  playedAt: string
}

type PlayRecord = {
  history: PlayResult[]
}

type SongRecords = {
  [songId: string]: {
    random: PlayRecord
    sRandom: PlayRecord
  }
}

const createEmptyRecord = (): PlayRecord => ({
  history: [],
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
    useState<"ALL" | "RANDOM" | "S-RANDOM">("S-RANDOM")

  const [selectedLevel, setSelectedLevel] =
    useState<string | null>(null)

  type FilterOption =
  | "ALL"
  | "UNPLAYED"
  | "PLAYED"
  | "CLEARED"
  | "UNCLEARED"

const [filterOption, setFilterOption] =
  useState<FilterOption>("ALL")

  type SortOption =
  | "LEVEL_ASC"
  | "LEVEL_DESC"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "BEST_BAD_ASC"
  | "CLEAR_RATE_DESC"

const [sortOption, setSortOption] =
  useState<SortOption>("LEVEL_DESC")

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

const displayedSongs = songs
  .filter((song) => {
    if (page === "ALL") {
      return true
    }

    if (page === "RANDOM") {
      return song.randomLevel !== null
    }

    return song.sRandomLevel !== null
  })
  .filter((song) => {
    if (selectedLevel === null) {
      return true
    }

    const level =
      page === "RANDOM"
        ? song.randomLevel
        : song.sRandomLevel

    return String(level) === selectedLevel
  })
  .filter((song) => {
    const record =
      mode === "RANDOM"
        ? records[song.id].random
        : records[song.id].sRandom

    const plays = record.history.length

    const clears = record.history.filter(
      (play) => play.result === "CLEAR"
    ).length

    switch (filterOption) {
      case "ALL":
        return true

      case "UNPLAYED":
        return plays === 0

      case "PLAYED":
        return plays > 0

      case "CLEARED":
        return clears > 0

      case "UNCLEARED":
        return clears === 0
    }
  })

  .slice()

  displayedSongs.sort((a, b) => {
  const recordA =
    mode === "RANDOM"
      ? records[a.id].random
      : records[a.id].sRandom

  const recordB =
    mode === "RANDOM"
      ? records[b.id].random
      : records[b.id].sRandom

  switch (sortOption) {
    case "LEVEL_ASC": {
      return a.level - b.level
    }

    case "LEVEL_DESC": {
      return b.level - a.level
    }

    case "TITLE_ASC":
      return a.title.localeCompare(b.title, "ja")

    case "TITLE_DESC":
      return b.title.localeCompare(a.title, "ja")

    case "BEST_BAD_ASC": {
      const bestA =
        recordA.history.length > 0
          ? Math.min(
              ...recordA.history.map(
                (play) => play.bad
              )
            )
          : Infinity

      const bestB =
        recordB.history.length > 0
          ? Math.min(
              ...recordB.history.map(
                (play) => play.bad
              )
            )
          : Infinity

      return bestA - bestB
    }

    case "CLEAR_RATE_DESC": {
      const clearRateA =
        recordA.history.length > 0
          ? recordA.history.filter(
              (play) => play.result === "CLEAR"
            ).length /
            recordA.history.length
          : -1

      const clearRateB =
        recordB.history.length > 0
          ? recordB.history.filter(
              (play) => play.result === "CLEAR"
            ).length /
            recordB.history.length
          : -1

      return clearRateB - clearRateA
    }
  }
})

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
                  className="level-select"
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
                  className="level-select"
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
                  className="level-select"
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

            <div className="song-list-controls">

  <div className="filter-control">
    <label htmlFor="filter-select">
      フィルタ
    </label>

    <select
      id="filter-select"
      value={filterOption}
      onChange={(event) =>
        setFilterOption(
          event.target.value as FilterOption
        )
      }
    >
        <option value="ALL">
          すべて
        </option>

        <option value="UNPLAYED">
          未プレイ
        </option>

        <option value="PLAYED">
          プレイ済み
        </option>

        <option value="CLEARED">
          クリア済み
        </option>

        <option value="UNCLEARED">
          未クリア
        </option>
      </select>
    </div>

    <div className="sort-controls">
  <label htmlFor="sort-select">
    並び順
  </label>

  <select
    id="sort-select"
    value={sortOption}
    onChange={(event) =>
      setSortOption(
        event.target.value as SortOption
      )
    }
  >
    <option value="LEVEL_ASC">
      レベル昇順
    </option>

    <option value="LEVEL_DESC">
      レベル降順
    </option>

    <option value="TITLE_ASC">
      曲名順
    </option>

    <option value="TITLE_DESC">
      曲名逆順
    </option>

    <option value="BEST_BAD_ASC">
      最小BADが少ない順
    </option>

    <option value="CLEAR_RATE_DESC">
      CLEAR率が高い順
    </option>
  </select>
</div>

  </div>

            {displayedSongs.map((song) => {
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
                          : "sRandom"]: newRecord,
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