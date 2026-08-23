import type { Song } from "./songs"

export type LevelStats = {
    level: number
    total: number
    played: number
    clears: number
    estimatedClears: number
    effectiveClears: number
    clearRate: number | null
    confidence: "LOW" | "MEDIUM" | "HIGH"
}

export type SkillLevelRange = {
    stableMax: number | null
    suitable: number | null
    challengeMin: number | null
}

export type SkillLevelResult = {
    skillLevel: number | null
    stats: LevelStats[]
    range: SkillLevelRange
}

export function calculateSkillLevel(
    songs: Song[],
    records: {
        [songId: string]: {
            random: {
                history: {
                    result: "CLEAR" | "FAILED"
                    bad: number
                    playedAt: string
                }[]
            }
            sRandom: {
                history: {
                    result: "CLEAR" | "FAILED"
                    bad: number
                    playedAt: string
                }[]
            }
        }
    },
    mode: "RANDOM" | "S-RANDOM",
    targetClearRate = 0.5
): SkillLevelResult {
    const statsMap = new Map<number, LevelStats>()

    for (const song of songs) {
        const levelString =
            mode === "RANDOM"
                ? song.randomLevel
                : song.sRandomLevel

        if (levelString === null) {
            continue
        }

        const match = levelString.match(/(\d+)/)

        if (!match) {
            continue
        }

        const level = Number(match[1])

        if (!statsMap.has(level)) {
            statsMap.set(level, {
                level,
                total: 0,
                played: 0,
                clears: 0,
                estimatedClears: 0,
                effectiveClears: 0,
                clearRate: null,
                confidence: "LOW",
            })
        }

        const stats = statsMap.get(level)!

        stats.total += 1

        const record =
            mode === "RANDOM"
                ? records[song.id]?.random
                : records[song.id]?.sRandom

        if (!record || record.history.length === 0) {
            continue
        }

        stats.played += 1

        const hasClear = record.history.some(
            (play) => play.result === "CLEAR"
        )

        if (hasClear) {
            stats.clears += 1
        }
    }

    const stats = Array.from(statsMap.values())
        .sort((a, b) => a.level - b.level)

    for (const stat of stats) {
        stat.clearRate =
            stat.total > 0
                ? stat.clears / stat.total
                : null
    }

    for (const stat of stats) {
        const playRate =
            stat.total > 0
                ? stat.played / stat.total
                : 0

        const estimatedRatio =
            stat.effectiveClears > 0
                ? stat.estimatedClears /
                stat.effectiveClears
                : 0

        if (
            playRate >= 0.5 &&
            estimatedRatio < 0.3
        ) {
            stat.confidence = "HIGH"
        } else if (
            playRate >= 0.2 ||
            estimatedRatio < 0.6
        ) {
            stat.confidence = "MEDIUM"
        } else {
            stat.confidence = "LOW"
        }
    }

    const estimateRates = [
        0,
        0.5,
        0.25,
        0.1,
    ]

    for (const stat of stats) {
        let estimatedClears = 0

        for (const higherStat of stats) {
            const levelDifference =
                higherStat.level - stat.level

            if (
                levelDifference <= 0 ||
                levelDifference > 3
            ) {
                continue
            }

            const rate =
                estimateRates[levelDifference]

            estimatedClears +=
                higherStat.clears * rate
        }

        const maxEstimatedClears =
            stat.total * 0.8

        stat.estimatedClears = Math.min(
            estimatedClears,
            Math.max(
                0,
                maxEstimatedClears - stat.clears
            )
        )

        stat.effectiveClears =
            stat.clears +
            stat.estimatedClears

        stat.clearRate =
            stat.total > 0
                ? stat.effectiveClears / stat.total
                : null
    }

    const eligibleLevels = stats.filter(
        (stat) =>
            stat.clearRate !== null &&
            stat.clearRate >= targetClearRate
    )

    const skillLevel =
        eligibleLevels.length > 0
            ? eligibleLevels[
                eligibleLevels.length - 1
            ].level
            : null

    const range =
        skillLevel !== null
            ? {
                stableMax: skillLevel - 1,
                suitable: skillLevel,
                challengeMin: skillLevel + 1,
            }
            : {
                stableMax: null,
                suitable: null,
                challengeMin: null,
            }

    return {
        skillLevel,
        stats,
        range,
    }
}