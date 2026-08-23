import type { Song } from "./songs"
import type { PlayRecord, SongRecords } from "./types"
import type { SkillLevelResult } from "./skillLevel"

export type DeckPurpose =
    | "REHABILITATION"
    | "TRAINING"
    | "CHALLENGE"

export type DeckOptions = {
    purpose: DeckPurpose
    count: number
    unplayedFirst: boolean
}

export type RecommendedSong = {
    song: Song
    score: number
    reason: string
}

export type DeckLevelSource =
    | "SKILL_LEVEL"
    | "BEST_CLEAR"
    | "DEFAULT"

export type DeckLevelInfo = {
    level: number
    source: DeckLevelSource
    label: string
}

// デッキレベル範囲を取得
export function getDeckLevelRange(
    skillLevel: number,
    purpose: DeckPurpose
) {
    switch (purpose) {
        case "REHABILITATION":
            return {
                min: Math.max(1, skillLevel - 2),
                max: skillLevel,
            }

        case "TRAINING":
            return {
                min: Math.max(1, skillLevel - 1),
                max: skillLevel + 1,
            }

        case "CHALLENGE":
            return {
                min: skillLevel,
                max: skillLevel + 2,
            }
    }
}

function getModeLevel(
    song: Song,
    mode: "RANDOM" | "S-RANDOM"
): number | null {
    const value =
        mode === "RANDOM"
            ? song.randomLevel
            : song.sRandomLevel

    if (value === null) {
        return null
    }

    const match = value.match(/\d+/)

    if (!match) {
        return null
    }

    return Number(match[0])
}

// デッキ候補曲を取得
export function getDeckCandidates(
    songs: Song[],
    records: SongRecords,
    skillResult: SkillLevelResult,
    mode: "RANDOM" | "S-RANDOM",
    purpose: DeckPurpose
): Song[] {
    const deckLevelInfo = getDeckLevel(
        songs,
        records,
        skillResult,
        mode
    )

    const range = getDeckLevelRange(
        deckLevelInfo.level,
        purpose
    )

    return songs.filter((song) => {
        const level = getModeLevel(
            song,
            mode
        )

        if (level === null) {
            return false
        }

        return (
            level >= range.min &&
            level <= range.max
        )
    })
}

type SongScore = {
    song: Song
    score: number
    reason: string
}

// 曲のスコアを計算 スコアが高いほど優先度が高い
function calculateSongScore(
    song: Song,
    record: PlayRecord,
    baseLevel: number,
    purpose: DeckPurpose,
    mode: "RANDOM" | "S-RANDOM",
    unplayedFirst: boolean
): SongScore {
    const level = getModeLevel(song, mode)

    if (level === null) {
        return {
            song,
            score: -Infinity,
            reason: "",
        }
    }

    // -------------------------
    // 1. レベル適合度
    // -------------------------

    const levelDistance =
        Math.abs(level - baseLevel)

    const levelScore = Math.max(
        0,
        100 - levelDistance * 30
    )

    // -------------------------
    // 2. 未プレイ
    // -------------------------

    const isUnplayed =
        record.history.length === 0

    const unplayedScore =
        isUnplayed
            ? unplayedFirst
                ? 100
                : 0
            : 0

    // -------------------------
    // 3. プレイ回数
    // -------------------------

    const playCount =
        record.history.length

    const playCountScore = Math.max(
        0,
        100 - playCount * 20
    )

    // -------------------------
    // 4. BAD
    // -------------------------

    const bestBad =
        record.history.length > 0
            ? Math.min(
                ...record.history.map(
                    (play) => play.bad
                )
            )
            : null

    let badScore = 50

    if (bestBad !== null) {
        if (bestBad <= 10) {
            badScore = 20
        } else if (bestBad <= 30) {
            badScore = 60
        } else if (bestBad <= 60) {
            badScore = 90
        } else if (bestBad <= 100) {
            badScore = 70
        } else {
            badScore = 40
        }
    }

    // -------------------------
    // 5. CLEAR率
    // -------------------------

    const clearCount =
        record.history.filter(
            (play) => play.result === "CLEAR"
        ).length

    const totalPlays =
        record.history.length

    const clearRate =
        totalPlays > 0
            ? clearCount / totalPlays
            : null

    let clearRateScore = 50

    if (clearRate !== null) {
        if (clearRate === 0) {
            clearRateScore = 90
        } else if (clearRate < 0.5) {
            clearRateScore = 80
        } else if (clearRate < 0.8) {
            clearRateScore = 60
        } else {
            clearRateScore = 30
        }
    }

    // -------------------------
    // 6. 目的別の重み
    // -------------------------

    const weights = {
        REHABILITATION: {
            level: 0.45,
            unplayed: 0.10,
            plays: 0.10,
            bad: 0.15,
            clearRate: 0.20,
        },

        TRAINING: {
            level: 0.40,
            unplayed: 0.10,
            plays: 0.10,
            bad: 0.25,
            clearRate: 0.15,
        },

        CHALLENGE: {
            level: 0.30,
            unplayed: 0.05,
            plays: 0.05,
            bad: 0.40,
            clearRate: 0.20,
        },
    }

    const weight =
        weights[purpose]

    const score =
        levelScore * weight.level +
        unplayedScore * weight.unplayed +
        playCountScore * weight.plays +
        badScore * weight.bad +
        clearRateScore * weight.clearRate

    // -------------------------
    // 7. 選曲理由
    // -------------------------

    let reason = "適正レベル付近"

    if (isUnplayed) {
        reason = "未プレイ曲"
    } else if (
        clearRate !== null &&
        clearRate < 0.5
    ) {
        reason = "CLEAR率が低く練習向き"
    } else if (
        bestBad !== null &&
        bestBad > 50
    ) {
        reason = "BAD更新の余地あり"
    }

    return {
        song,
        score,
        reason,
    }
}

// 重み付きランダム選択
function weightedRandomPick<T extends { score: number }>(
    items: T[]
): T | null {
    if (items.length === 0) {
        return null
    }

    const minScore = Math.min(
        ...items.map((item) => item.score)
    )

    // すべての重みを正の値にする
    const weights = items.map(
        (item) =>
            Math.max(1, item.score - minScore + 10)
    )

    const totalWeight =
        weights.reduce(
            (sum, weight) => sum + weight,
            0
        )

    let random =
        Math.random() * totalWeight

    for (let i = 0; i < items.length; i++) {
        random -= weights[i]

        if (random <= 0) {
            return items[i]
        }
    }

    return items[items.length - 1]
}

// デッキ作り
export function createTodayDeck(
    songs: Song[],
    records: SongRecords,
    skillResult: SkillLevelResult,
    mode: "RANDOM" | "S-RANDOM",
    options: DeckOptions
): RecommendedSong[] {
    const deckLevelInfo = getDeckLevel(
        songs,
        records,
        skillResult,
        mode
    )

    const candidates =
        getDeckCandidates(
            songs,
            records,
            skillResult,
            mode,
            options.purpose
        )

    if (
        candidates.length === 0
    ) {
        return []
    }

    const scored =
        candidates.map((song) => {
            const record =
                mode === "RANDOM"
                    ? records[song.id].random
                    : records[song.id].sRandom

            return calculateSongScore(
                song,
                record,
                deckLevelInfo.level,
                options.purpose,
                mode,
                options.unplayedFirst,
            )
        })

    scored.sort((a, b) => {
        return b.score - a.score
    })

    const candidatePool =
        scored.slice(
            0,
            Math.min(12, scored.length)
        )

    const selected: RecommendedSong[] = []

    while (
        selected.length < options.count &&
        candidatePool.length > 0
    ) {
        const picked =
            weightedRandomPick(candidatePool)

        if (!picked) {
            break
        }

        selected.push(picked)

        const index =
            candidatePool.indexOf(picked)

        if (index !== -1) {
            candidatePool.splice(index, 1)
        }
    }

    return selected
}

// 最高CLEARレベルを取得
function getBestClearLevel(
    songs: Song[],
    records: SongRecords,
    mode: "RANDOM" | "S-RANDOM"
): number | null {
    const clearLevels = songs
        .filter((song) => {
            const level = getModeLevel(song, mode)

            if (level === null) {
                return false
            }

            const record =
                mode === "RANDOM"
                    ? records[song.id]?.random
                    : records[song.id]?.sRandom

            if (!record) {
                return false
            }

            return record.history.some(
                (play) => play.result === "CLEAR"
            )
        })
        .map((song) => getModeLevel(song, mode))
        .filter(
            (level): level is number =>
                level !== null
        )

    if (clearLevels.length === 0) {
        return null
    }

    return Math.max(...clearLevels)
}

// デッキレベルを決定 適正・最高CLEAR・暫定の順で決定 
export function getDeckLevel(
    songs: Song[],
    records: SongRecords,
    skillResult: SkillLevelResult,
    mode: "RANDOM" | "S-RANDOM",
    defaultLevel = 1
): DeckLevelInfo {
    if (skillResult.skillLevel !== null) {
        return {
            level: skillResult.skillLevel,
            source: "SKILL_LEVEL",
            label: "適正Lv",
        }
    }

    const bestClearLevel =
        getBestClearLevel(
            songs,
            records,
            mode
        )

    if (bestClearLevel !== null) {
        return {
            level: bestClearLevel - 2,
            source: "BEST_CLEAR",
            label: "最高CLEAR Lv",
        }
    }

    return {
        level: defaultLevel,
        source: "DEFAULT",
        label: "暫定Lv",
    }
}