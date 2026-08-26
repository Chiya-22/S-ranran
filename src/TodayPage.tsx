import { useState } from "react"
import type { Song } from "./songs"
import type { SkillLevelResult } from "./skillLevel"
import {
    createTodayDeck,
    type DeckPurpose,
    type RecommendedSong,
} from "./todayDeck"
import type {
    PlayRecord,
    SongRecords,
} from "./types"
import SongRow from "./SongRow"

type TodayPageProps = {
    songs: Song[]
    records: SongRecords
    randomSkillResult: SkillLevelResult
    sRandomSkillResult: SkillLevelResult

    onRecordChange: (
        songId: string,
        mode: "RANDOM" | "S-RANDOM",
        record: PlayRecord
    ) => void

    onUndo: () => void
    onRedo: () => void
    canUndo: boolean
    canRedo: boolean

    recommendedSongs: RecommendedSong[]
    onSetRecommendedSongs: (
        songs: RecommendedSong[]
    ) => void

    mode: "RANDOM" | "S-RANDOM"
    onModeChange: (
        mode: "RANDOM" | "S-RANDOM"
    ) => void
}

function TodayPage({
    songs,
    records,
    randomSkillResult,
    sRandomSkillResult,
    onRecordChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    recommendedSongs,
    onSetRecommendedSongs,
    mode,
    onModeChange,

}: TodayPageProps) {

    const [purpose, setPurpose] =
        useState<DeckPurpose>("TRAINING")

    const [count, setCount] = useState(5)

    const [unplayedFirst, setUnplayedFirst] =
        useState(true)

    const [showReasons, setShowReasons] =
        useState(false)

    const skillResult =
        mode === "RANDOM"
            ? randomSkillResult
            : sRandomSkillResult

    const TODAY_DECK_KEY = "today-deck"

const handleCreateDeck = () => {
    const newDeck = createTodayDeck(
        songs,
        records,
        skillResult,
        mode,
        {
            purpose,
            count,
            unplayedFirst,
        }
    )

    onSetRecommendedSongs(newDeck)

    const savedDeck = newDeck.map((recommended) => ({
        songId: recommended.song.id,
        reason: recommended.reason,
    }))

    localStorage.setItem(
        TODAY_DECK_KEY,
        JSON.stringify(savedDeck)
    )
}

    return (
        <div className="today-page">
            <h2>今日やる曲</h2>

            <div className="today-settings">

                <div>
                    <label>
                        モード：
                    </label>

                    <select
                        value={mode}
                        onChange={(event) =>
                            onModeChange(
                                event.target.value as
                                | "RANDOM"
                                | "S-RANDOM"
                            )
                        }
                    >
                        <option value="S-RANDOM">
                            S-RANDOM
                        </option>

                        <option value="RANDOM">
                            RANDOM
                        </option>
                    </select>
                </div>

                <div>
                    <label>
                        目的：
                    </label>

                    <select
                        value={purpose}
                        onChange={(event) =>
                            setPurpose(
                                event.target.value as DeckPurpose
                            )
                        }
                    >
                        <option value="REHABILITATION">
                            リハビリ
                        </option>

                        <option value="TRAINING">
                            地力上げ
                        </option>

                        <option value="CHALLENGE">
                            挑戦
                        </option>
                    </select>
                </div>

                <div>
                    <label>
                        曲数：
                    </label>

                    <select
                        value={count}
                        onChange={(event) =>
                            setCount(
                                Number(event.target.value)
                            )
                        }
                    >
                        <option value={3}>
                            3曲
                        </option>

                        <option value={4}>
                            4曲
                        </option>

                        <option value={5}>
                            5曲
                        </option>
                    </select>
                </div>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={unplayedFirst}
                            onChange={(event) =>
                                setUnplayedFirst(
                                    event.target.checked
                                )
                            }
                        />

                        未プレイを優先
                    </label>

                </div>

                <div>

                    <label>
                        <input
                            type="checkbox"
                            checked={showReasons}
                            onChange={(event) =>
                                setShowReasons(
                                    event.target.checked
                                )
                            }
                        />

                        選曲理由を表示
                    </label>

                </div>

            </div>

            <button
                onClick={handleCreateDeck}
            >
                🎲 今日の曲を選ぶ
            </button>

            {recommendedSongs.length > 0 && (
                <div className="today-deck">

                    <h3>
                        今日のデッキ
                    </h3>

                    <div className="today-history-actions">
                        <button
                            className="history-action-button"
                            onClick={onUndo}
                            disabled={!canUndo}
                        >
                            ↶ 元に戻す
                        </button>

                        <button
                            className="history-action-button"
                            onClick={onRedo}
                            disabled={!canRedo}
                        >
                            ↷ やり直す
                        </button>
                    </div>

                    {recommendedSongs.map((recommended) => {
                        const song = recommended.song

                        const record =
                            mode === "RANDOM"
                                ? records[song.id].random
                                : records[song.id].sRandom

                        return (
                            <div
                                className="today-song-card"
                                key={song.id}
                            >
                                <SongRow
                                    song={song}
                                    record={record}
                                    onRecordChange={(newRecord) =>
                                        onRecordChange(
                                            song.id,
                                            mode,
                                            newRecord
                                        )
                                    }
                                />

                                {showReasons && (
                                    <div className="today-song-reason">
                                        {recommended.reason}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                </div>
            )}
        </div>
    )
}

export default TodayPage