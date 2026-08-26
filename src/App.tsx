import SongRow from "./SongRow"
import "./App.css"
import { useEffect, useState } from "react"
import { initialSongs, } from "./songs"
import TodayPage from "./TodayPage"
import DataMigrationModal from "./DataMigrationModal"
import type { FilterOption, SortOption } from "./SongListControls"
import SongListControls from "./SongListControls"
import { calculateSkillLevel } from "./skillLevel"

const STORAGE_KEY = "songRecords-v2"
const TODAY_DECK_KEY = "today-deck"

import type {
  PlayRecord,
  SongRecords,
} from "./types"
import { getDeckLevel, type RecommendedSong } from "./todayDeck"

type AppSettings = {
  levelSettings: {
    random: {
      minLevel: number
      maxLevel: number
    }
    sRandom: {
      minLevel: number
      maxLevel: number
    }
  }
  today: {
    mode: "RANDOM" | "S-RANDOM"
  }
}

const SETTINGS_KEY = "app-settings"

const DEFAULT_SETTINGS: AppSettings = {
  levelSettings: {
    random: {
      minLevel: 1,
      maxLevel: 14,
    },
    sRandom: {
      minLevel: 1,
      maxLevel: 19,
    },
  },
  today: {
    mode: "S-RANDOM",
  },
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

  const [selectedRandomLevel, setSelectedRandomLevel] =
    useState<string | null>(null)

  const [selectedSRandomLevel, setSelectedSRandomLevel] =
    useState<string | null>(null)

  const [showDataMigration, setShowDataMigration] =
    useState(false)

const [settings, setSettings] =
  useState<AppSettings>(() => {
    const saved =
      localStorage.getItem(SETTINGS_KEY)

    if (!saved) {
      return DEFAULT_SETTINGS
    }

    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(saved),
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  })

useEffect(() => {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  )
}, [settings])

const minSranLevel =
  settings.levelSettings.sRandom.minLevel

const maxSranLevel =
  settings.levelSettings.sRandom.maxLevel

const minRandomLevel =
  settings.levelSettings.random.minLevel

const maxRandomLevel =
  settings.levelSettings.random.maxLevel

const todayMode = settings.today.mode

  const [showSettings, setShowSettings] = useState(false)

  const [settingsPage, setSettingsPage] =
    useState<"MENU" | "LEVEL_INFO">("MENU")

  const [filterOption, setFilterOption] =
    useState<FilterOption>("ALL")

  const [sortOption, setSortOption] =
    useState<SortOption>("LEVEL_DESC")


  const [levelOrder, setLevelOrder] =
    useState<"ASC" | "DESC">("ASC")

  const mergeRecordsWithSongs = (
    savedRecords: SongRecords
  ): SongRecords => {
    const records = { ...savedRecords }

    for (const song of initialSongs) {
      if (!records[song.id]) {
        records[song.id] = {
          random: createEmptyRecord(),
          sRandom: createEmptyRecord(),
        }
      }
    }

    return records
  }

  type SavedTodaySong = {
    songId: string
    reason: string
}

const handleSetRecommendedSongs = (
    songs: RecommendedSong[]
) => {
    setRecommendedSongs(songs)

    const savedSongs: SavedTodaySong[] =
        songs.map((recommended) => ({
            songId: recommended.song.id,
            reason: recommended.reason,
        }))

    localStorage.setItem(
        TODAY_DECK_KEY,
        JSON.stringify(savedSongs)
    )
}

useEffect(() => {
    const saved =
        localStorage.getItem(TODAY_DECK_KEY)

    if (!saved) {
        return
    }

    try {
        const savedSongs: SavedTodaySong[] =
            JSON.parse(saved)

        const restoredSongs: RecommendedSong[] =
            savedSongs
                .map((savedSong) => {
                    const song = songs.find(
                        (song) =>
                            song.id === savedSong.songId
                    )

                    if (!song) {
                        return null
                    }

                    return {
                        song,
                        reason: savedSong.reason,
                    }
                })
                .filter(
                    (
                        item
                    ): item is RecommendedSong =>
                        item !== null
                )

        setRecommendedSongs(restoredSongs)
    } catch (error) {
        console.error(
            "今日のデッキの復元に失敗しました",
            error
        )
    }
}, [songs])

  const [records, setRecords] = useState<SongRecords>(() => {
    const savedRecords =
      localStorage.getItem(STORAGE_KEY)

    if (savedRecords) {
      return mergeRecordsWithSongs(
        JSON.parse(savedRecords)
      )
    }

    return createInitialRecords()
  })

  const [undoStack, setUndoStack] =
    useState<SongRecords[]>([])

  const [redoStack, setRedoStack] =
    useState<SongRecords[]>([])

  const [randomSongId, setRandomSongId] =
    useState<string | null>(null)

  const [recommendedSongs, setRecommendedSongs] =
    useState<RecommendedSong[]>(() => {
        const saved =
            localStorage.getItem(TODAY_DECK_KEY)

        if (!saved) {
            return []
        }

        try {
            const savedSongs = JSON.parse(saved)

            return savedSongs
        } catch {
            return []
        }
    })

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    )
  }, [records])

  const handleRecordChange = (
    songId: string,
    mode: "RANDOM" | "S-RANDOM",
    newRecord: PlayRecord
  ) => {
    const newRecords = {
      ...records,
      [songId]: {
        ...records[songId],
        [mode === "RANDOM"
          ? "random"
          : "sRandom"]: newRecord,
      },
    }

    setUndoStack((prev) => [
      ...prev,
      records,
    ])

    setRedoStack([])

    setRecords(newRecords)
  }

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

        setRecords(
          mergeRecordsWithSongs(data.records)
        )

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

  const handleUndo = () => {
    if (undoStack.length === 0) {
      return
    }

    const confirmed = window.confirm(
      "直前のプレイ記録を元に戻しますか？"
    )

    if (!confirmed) {
      return
    }

    const previousRecords =
      undoStack[undoStack.length - 1]

    setUndoStack((prev) =>
      prev.slice(0, -1)
    )

    setRedoStack((prev) => [
      ...prev,
      records,
    ])

    setRecords(previousRecords)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) {
      return
    }

    const confirmed = window.confirm(
      "取り消した操作をやり直しますか？"
    )

    if (!confirmed) {
      return
    }

    const nextRecords =
      redoStack[redoStack.length - 1]

    setRedoStack((prev) =>
      prev.slice(0, -1)
    )

    setUndoStack((prev) => [
      ...prev,
      records,
    ])

    setRecords(nextRecords)
  }

  const randomSkillResult = calculateSkillLevel(
    songs,
    records,
    "RANDOM",
    0.5
  )

  const sRandomSkillResult = calculateSkillLevel(
    songs,
    records,
    "S-RANDOM",
    0.5
  )

  const randomDeckLevel = getDeckLevel(
    songs,
    records,
    randomSkillResult,
    "RANDOM"
  )

  const sRandomDeckLevel = getDeckLevel(
    songs,
    records,
    sRandomSkillResult,
    "S-RANDOM"
  )


  const randomRange =
    randomSkillResult.skillLevel !== null
      ? randomSkillResult.range
      : {
        stableMax: Math.max(
          1,
          randomDeckLevel.level - 1
        ),
        suitable: randomDeckLevel.level,
        challengeMin:
          randomDeckLevel.level + 1,
      }

  const sRandomRange =
    sRandomSkillResult.skillLevel !== null
      ? sRandomSkillResult.range
      : {
        stableMax: Math.max(
          1,
          sRandomDeckLevel.level - 1
        ),
        suitable: sRandomDeckLevel.level,
        challengeMin:
          sRandomDeckLevel.level + 1,
      }

  const displayedSongs = songs
    // ページでフィルタ
    .filter((song) => {
      if (page === "ALL") {
        return true
      }

      if (page === "RANDOM") {
        return song.randomLevel !== null
      }

      return song.sRandomLevel !== null
    })
    // フォルダのレベルでフィルタ
    .filter((song) => {
      // ALLではレベルによる絞り込みをしない
      if (page === "ALL") {
        return true
      }

      const selectedLevel =
        page === "RANDOM"
          ? selectedRandomLevel
          : selectedSRandomLevel

      if (selectedLevel === null) {
        return true
      }


      const level =
        page === "RANDOM"
          ? song.randomLevel
          : song.sRandomLevel

      return String(level) === selectedLevel
    })
    // フィルタオプションでフィルタ
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

  const randomLevels = Array.from(
    new Set(
      songs
        .map((song) => song.randomLevel)
        .filter(
          (level): level is string =>
            level !== null
        )
    )
  )

  const filteredRandomLevels = randomLevels
    .filter((level) => {
      const levelNumber =
        Number(level.replace("乱Lv", ""))

      return (
        levelNumber >= minRandomLevel &&
        levelNumber <= maxRandomLevel
      )
    })
    .sort((a, b) => {
      const aNumber =
        Number(a.replace("乱Lv", ""))

      const bNumber =
        Number(b.replace("乱Lv", ""))

      return levelOrder === "ASC"
        ? aNumber - bNumber
        : bNumber - aNumber
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
        levelNumber >= minSranLevel &&
        levelNumber <= maxSranLevel
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
            setSelectedRandomLevel(null)
            setSelectedSRandomLevel(null)
          }}
        >
          全曲
        </button>

        <button
          onClick={() => {
            setPage("RANDOM")
            setMode("RANDOM")
            setSelectedRandomLevel(null)
            setSelectedSRandomLevel(null)
          }}
        >
          RANDOM
        </button>

        <button
          onClick={() => {
            setPage("S-RANDOM")
            setMode("S-RANDOM")
            setSelectedRandomLevel(null)
            setSelectedSRandomLevel(null)
          }}
        >
          S-RANDOM
        </button>

        <button
          onClick={() => {
            setPage("TODAY")
            setSelectedRandomLevel(null)
            setSelectedSRandomLevel(null)
            setRandomSongId(null)
          }}
        >
          今日やる曲
        </button>

      </div>

      <div>
        <div className="app-title-area">
          <h1>S-ranran</h1>

          <button
            className="settings-button"
            onClick={() => setShowSettings(true)}
            aria-label="設定"
          >
            ⚙
          </button>
        </div>

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
            records={records}
            randomSkillResult={randomSkillResult}
            sRandomSkillResult={sRandomSkillResult}
            onRecordChange={handleRecordChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            recommendedSongs={recommendedSongs}
            onSetRecommendedSongs={handleSetRecommendedSongs}
            mode={todayMode}
  onModeChange={(newMode) => {
    setSettings((prev) => ({
      ...prev,
      today: {
        ...prev.today,
        mode: newMode,
      },
    }))
  }}
          />
        ) : (
          <div>
            {page === "RANDOM" &&
              selectedRandomLevel === null && (
                <div>
                  <h2>RANDOM レベル一覧</h2>

                  <div> {/* レベルの範囲を選択するUI folder filter */}
                    <label>
                      表示レベル：

                      <select
                        className="level-select"
                        value={minRandomLevel}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            levelSettings: {
                              ...prev.levelSettings,
                              random: {
                                ...prev.levelSettings.random,
                                minLevel: Number(event.target.value),
                              },
                            },
                          }))
                        }
                      >
                        {Array.from(
                          { length: 14 },
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
                        value={maxRandomLevel}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            levelSettings: {
                              ...prev.levelSettings,
                              random: {
                                ...prev.levelSettings.random,
                                maxLevel: Number(event.target.value),
                              },
                            },
                          }))
                        }
                      >
                        {Array.from(
                          { length: 14 },
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

                  <div className="folder-list"> {/* レベルの一覧を表示するUI folder list */}
                    {filteredRandomLevels.map((level) => {
                      const levelSongs = songs.filter((song) => {
                        return song.randomLevel === level
                      })

                      const clearCount = levelSongs.filter((song) => {
                        const record = records[song.id].random

                        return record.history.some(
                          (play) => play.result === "CLEAR"
                        )
                      }).length

                      return (
                        <button
                          className="folder-button"
                          key={level}
                          onClick={() =>
                            setSelectedRandomLevel(level)
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
              )}
            {page === "S-RANDOM" &&
              selectedSRandomLevel === null && (
                <div>

                  <h2>S-RANDOM レベル一覧</h2>

                  <div> {/* レベルの範囲を選択するUI folder filter */}
                    <label>
                      表示レベル：
                      <select
                        className="level-select"
                        value={minSranLevel}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            levelSettings: {
                              ...prev.levelSettings,
                              sRandom: {
                                ...prev.levelSettings.sRandom,
                                minLevel: Number(event.target.value),
                              },
                            },
                          }))
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
                        value={maxSranLevel}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            levelSettings: {
                              ...prev.levelSettings,
                              sRandom: {
                                ...prev.levelSettings.sRandom,
                                maxLevel: Number(event.target.value),
                              },
                            },
                          }))
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


                  <div className="folder-list"> {/* レベルの一覧を表示するUI folder list */}
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
                            setSelectedSRandomLevel(level)
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

              )}
            {
              <>
                {(selectedRandomLevel !== null
                  || selectedSRandomLevel !== null) && (
                    <>
                      {(
                        <>
                          <button
                            onClick={() => {
                              setSelectedSRandomLevel(null)
                              setSelectedRandomLevel(null)
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
                                  setRecords((prev) => {
                                    setUndoStack((undoPrev) => [
                                      ...undoPrev,
                                      prev,
                                    ])

                                    setRedoStack([])

                                    return {
                                      ...prev,
                                      [randomSong.id]: {
                                        ...prev[randomSong.id],
                                        [mode === "RANDOM"
                                          ? "random"
                                          : "sRandom"]: newRecord,
                                      },
                                    }
                                  })
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

                          <div className="history-actions">
                            <button
                              className="history-action-button"
                              onClick={handleUndo}
                              disabled={undoStack.length === 0}
                            >
                              ↶ 元に戻す
                            </button>

                            <button
                              className="history-action-button"
                              onClick={handleRedo}
                              disabled={redoStack.length === 0}
                            >
                              ↷ やり直す
                            </button>
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
                                  // 現在の状態をUNDO用に保存
                                  setUndoStack((prev) => [
                                    ...prev,
                                    records,
                                  ])

                                  // 新しい操作をしたのでREDOは消す
                                  setRedoStack([])

                                  // recordsを更新
                                  setRecords({
                                    ...records,
                                    [song.id]: {
                                      ...records[song.id],
                                      [mode === "RANDOM"
                                        ? "random"
                                        : "sRandom"]: newRecord,
                                    },
                                  })
                                }}
                              />
                            )
                          })}
                        </>
                      )}
                    </>
                  )}
              </>
            }
          </div>
        )}




      </div>

      {/* 設定画面のUIを表示する */}
      {showSettings && (
        <div
          className="settings-overlay"
          onClick={() => {
            setSettingsPage("MENU")
            setShowSettings(false)
          }}
        >
          <div
            className="settings-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-header">
              <h2>設定</h2>

              <button
                onClick={() => {
                  setSettingsPage("MENU")
                  setShowSettings(false)
                }}
              >
                ×
              </button>
            </div>

            <div className="settings-content">

              {settingsPage === "MENU" && (
                <>
                  <button
                    className="settings-item"
                    onClick={() =>
                      setSettingsPage("LEVEL_INFO")
                    }
                  >
                    適正レベル関連
                  </button>

                  <button
                    className="settings-item"
                    onClick={() => {
                      setShowSettings(false)
                      setShowDataMigration(true)
                    }}
                  >
                    データを移行する
                  </button>
                </>
              )}

              {settingsPage === "LEVEL_INFO" && (
                <>
                  <button
                    className="settings-back-button"
                    onClick={() =>
                      setSettingsPage("MENU")
                    }
                  >
                    ← 設定に戻る
                  </button>

                  <h3>適正レベル関連</h3>

                  {/* ここに適正レベル情報 */}
                  <div className="level-info">


                    <div className="skill-level-debug">
                      {/* RANDOMの詳細を折りたたみで表示する */}
                      <div>
                        <strong>RANDOM</strong>

                        <p>
                          安定：Lv{randomRange.stableMax}
                        </p>

                        <p>
                          適正：Lv{randomRange.suitable}
                        </p>

                        <p>
                          挑戦：Lv{randomRange.challengeMin}
                        </p>

                        {randomSkillResult.skillLevel === null &&
                          randomDeckLevel.source === "BEST_CLEAR" && (
                            <p className="provisional-label">
                              ※最高CLEARを基準にした暫定値です
                            </p>
                          )}

                        <details className="level-info-section">
                          <summary>RANDOM</summary>
                          {/* ここにRANDOMの詳細を折りたたみで表示する*/}
                          <div className="level-info-detail">
                            <div className="skill-stats-debug">
                              {randomSkillResult.stats.map((stat) => (
                                <div key={stat.level}>
                                  Lv{stat.level}：
                                  実CLEAR {stat.clears} / {stat.total}
                                  {" / "}
                                  推定 +{stat.estimatedClears.toFixed(1)}
                                  {" / "}
                                  判定 {stat.effectiveClears.toFixed(1)}
                                  {" / "}
                                  {stat.clearRate !== null
                                    ? `${Math.round(stat.clearRate * 100)}%`
                                    : "-"}
                                  {" / "}
                                  信頼度 {stat.confidence}
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>


                      </div>
                      {/* S-RANDOMの詳細を折りたたみで表示する */}
                      <div>
                        <strong>S-RANDOM</strong>

                        <p>
                          安定：Lv{sRandomRange.stableMax}
                        </p>

                        <p>
                          適正：Lv{sRandomRange.suitable}
                        </p>

                        <p>
                          挑戦：Lv{sRandomRange.challengeMin}
                        </p>

                        {sRandomSkillResult.skillLevel === null &&
                          sRandomDeckLevel.source === "BEST_CLEAR" && (
                            <p className="provisional-label">
                              ※最高CLEARを基準にした暫定値です
                            </p>
                          )}
                      </div>

                      {/* S-RANDOMの詳細を折りたたみで表示する */}
                      <details className="level-info-section">
                        <summary>S-RANDOM</summary>

                        <div className="level-info-detail">

                          <div>

                            <div className="skill-stats-debug">
                              {sRandomSkillResult.stats.map((stat) => (
                                <div key={stat.level}>
                                  Lv{stat.level}：
                                  実CLEAR {stat.clears} / {stat.total}
                                  {" / "}
                                  推定 +{stat.estimatedClears.toFixed(1)}
                                  {" / "}
                                  判定 {stat.effectiveClears.toFixed(1)}
                                  {" / "}
                                  {stat.clearRate !== null
                                    ? `${Math.round(stat.clearRate * 100)}%`
                                    : "-"}
                                  {" / "}
                                  信頼度 {stat.confidence}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>



                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

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