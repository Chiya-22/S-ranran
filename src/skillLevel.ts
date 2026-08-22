import type { Song } from "./songs"

export type LevelStats = {
  level: number
  total: number
  played: number
  clears: number
  clearRate: number | null
}

export type SkillLevelResult = {
  skillLevel: number | null
  stats: LevelStats[]
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
        clearRate: null,
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

  return {
    skillLevel,
    stats,
  }
}