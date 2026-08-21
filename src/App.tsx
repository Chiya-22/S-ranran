import SongRow from "./SongRow"
import "./App.css"
import { useEffect, useState } from "react"
import { initialSongs } from "./songs"
import { recommendSongs } from "./recommendation"
import TodayPage from "./TodayPage"
import DataMigrationModal from "./DataMigrationModal"
import type { FilterOption, SortOption } from "./SongListControls"
import SongListControls from "./SongListControls"

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
    useState<"ALL" | "RANDOM" | "S-RANDOM" | "TODAY">("S-RANDOM")

  const [selectedLevel, setSelectedLevel] =
    useState<string | null>(null)

  const [showDataMigration, setShowDataMigration] =
    useState(false)

  const [todayDeck, setTodayDeck] =
    useState<string[]>([])

  const createTodayDeck = () => {
    const shuffled = [...songs]
      .sort(() => Math.random() - 0.5)

    const selected = shuffled.slice(0, 5)

    setTodayDeck(
      selected.map((song) => song.id)
    )
  }

  const [filterOption, setFilterOption] =
    useState<FilterOption>("ALL")

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

  const [randomSongId, setRandomSongId] =
    useState<string | null>(null)

  const [recommendedSongs, setRecommendedSongs] =
    useState<typeof initialSongs>([])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    )
  }, [records])

  const handleExport = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    }

    const json = JSON.stringify(exportData, null, 2)

    const blob = new Blob(
      [json],
      { type: "application/json" }
    )

    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = "s-ranran-backup.json"

    link.click()

    URL.revokeObjectURL(url)
  }

  const handleImport = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const text = reader.result

        if (typeof text !== "string") {
          throw new Error("ファイルを読み込めませんでした")
        }

        const data = JSON.parse(text)

        if (data.version !== 1) {
          throw new Error(
            "対応していないバックアップ形式です"
          )
        }

        if (!data.records) {
          throw new Error(
            "recordsが存在しません"
          )
        }

        setRecords(data.records)

        alert("データを読み込みました")
      } catch (error) {
        console.error(error)

        alert(
          "データの読み込みに失敗しました"
        )
      }
    }

    reader.readAsText(file)

    // 同じファイルを再度選択できるようにする
    event.target.value = ""
  }

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

  const randomSong =
    randomSongId !== null
      ? displayedSongs.find(
        (song) => song.id === randomSongId
      ) ?? null
      : null

  const handleRandomSong = () => {
    if (displayedSongs.length === 0) {
      alert("条件に合う曲がありません")
      return
    }

    const randomIndex = Math.floor(
      Math.random() * displayedSongs.length
    )

    const selectedSong =
      displayedSongs[randomIndex]

    setRandomSongId(selectedSong.id)
  }

  const handleRecommend = () => {
    const recommendations =
      recommendSongs(
        displayedSongs,
        records,
        mode,
        5
      )

    setRecommendedSongs(recommendations)
  }

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
            setMode("RANDOM")
            setSelectedLevel(null)
          }}
        >
          RANDOM
        </button>

        <button
          onClick={() => {
            setPage("S-RANDOM")
            setMode("S-RANDOM")
            setSelectedLevel(null)
          }}
        >
          S-RANDOM
        </button>

        <button
          onClick={() => {
            setPage("TODAY")
            setSelectedLevel(null)
            setRandomSongId(null)
          }}
        >
          今日やる曲
        </button>

      </div>

      <div className="data-migration-container">
        <button
          className="data-migration-button"
          onClick={() => setShowDataMigration(true)}
        >
          データを移行する
        </button>
      </div>

      <div>
        <h1>S-ranran</h1>

        {page === "ALL" && (
          <>
            <p>現在のモード：{mode}</p>

            <button onClick={() => setMode("RANDOM")}>
              RANDOM
            </button>

            <button onClick={() => setMode("S-RANDOM")}>
              S-RANDOM
            </button>
          </>
        )}

        {page === "TODAY" ? (
          <TodayPage
            songs={songs}
            todayDeck={todayDeck}
            onCreateDeck={createTodayDeck}
          />
        ) : (
          page === "S-RANDOM" &&
            selectedLevel === null ? (
            <div>
              <h2>S-RANDOM レベル一覧</h2>

              <div> {/* レベルの範囲を選択するUI folder filter */}
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

              <div> {/* レベルの並び順を選択するUI folder sort */}
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

              {/* レベルの一覧を表示するUI folder list */}
              <div className="folder-list">
                {filteredSRandomLevels.map((level) => {
                  const levelSongs = songs.filter((song) => {
                    return song.sRandomLevel === level
                  })

                  const clearCount = levelSongs.filter((song) => {
                    const record = records[song.id].sRandom

                    return record.history.some(
                      (play) => play.result === "CLEAR"
                    )
                  }).length

                  return (
                    <button
                      className="folder-button"
                      key={level}
                      onClick={() =>
                        setSelectedLevel(level)
                      }
                    >
                      <div className="folder-level">
                        📁 {level}
                      </div>

                      <div className="folder-progress">
                        {clearCount} / {levelSongs.length}
                      </div>
                    </button>
                  )
                })}
              </div>

            </div>
          ) : (
            <>
              {page === "S-RANDOM" && (
                <>
                  <button
                    onClick={() => {
                      setSelectedLevel(null)
                      setRandomSongId(null)
                    }}
                  >
                    ← レベル一覧に戻る
                  </button>

                  <button
                    className="random-song-button"
                    onClick={handleRandomSong}
                  >
                    🎲 ランダム選曲
                  </button>
                </>
              )}

              {randomSongId !== null && (
                <div className="random-song-result">
                  <div className="random-song-label">
                    ランダム選曲
                  </div>

                  {(() => {
                    const song = displayedSongs.find(
                      (song) => song.id === randomSongId
                    )

                    if (!song) {
                      return null
                    }

                    return (
                      <div className="random-song-card">
                        <div className="random-song-title">
                          {song.title}
                        </div>

                        <div className="random-song-level">
                          Lv {song.level}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {randomSong ? (
                <>
                  <div className="random-song-controls">
                    <button

                      onClick={() => setRandomSongId(null)}
                    >
                      ← 一覧に戻る
                    </button>

                    <button
                      className="random-song-button"
                      onClick={handleRandomSong}
                    >
                      🎲 もう一度
                    </button>
                  </div>


                  {(() => {
                    const record =
                      mode === "RANDOM"
                        ? records[randomSong.id].random
                        : records[randomSong.id].sRandom

                    return (
                      <SongRow
                        key={`${mode}-${randomSong.id}`}
                        song={randomSong}
                        record={record}
                        onRecordChange={(newRecord) => {
                          setRecords((prev) => ({
                            ...prev,
                            [randomSong.id]: {
                              ...prev[randomSong.id],
                              [mode === "RANDOM"
                                ? "random"
                                : "sRandom"]: newRecord,
                            },
                          }))
                        }}
                      />
                    )
                  })()}
                </>
              ) : (
                <>
                  {/* 通常時だけフィルタ・並び順 */}
                  <SongListControls
                    filterOption={filterOption}
                    setFilterOption={setFilterOption}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                  />


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
            </>
          )
        )}


      </div>

      {/* データのimport/exportのUIを表示する*/}
      <DataMigrationModal
        isOpen={showDataMigration}
        onClose={() => setShowDataMigration(false)}
        onExport={handleExport}
        onImport={handleImport}
      />
    </div>
  )
}
export default App