import type { Song } from "./songs"

export type RecommendationPlayResult = {
  result: "CLEAR" | "FAILED"
  bad: number
  playedAt: string
}

export type RecommendationRecord = {
  history: RecommendationPlayResult[]
}

export type RecommendationMode =
  | "RANDOM"
  | "S-RANDOM"

/**
 * 曲1曲について推薦スコアを計算する
 */
export const calculateRecommendationScore = (
  song: Song,
  record: RecommendationRecord
): number => {
  const history = record.history

  // 未プレイは最優先
  if (history.length === 0) {
    return 100
  }

  let score = 0

  // 未クリアなら優先
  const hasClear = history.some(
    (play) => play.result === "CLEAR"
  )

  if (!hasClear) {
    score += 40
  }

  // 最後にプレイしてから時間が経っている曲を少し優先
  const lastPlayed =
    history[history.length - 1]

  const daysSinceLastPlay =
    (Date.now() -
      new Date(lastPlayed.playedAt).getTime()) /
    (1000 * 60 * 60 * 24)

  if (daysSinceLastPlay >= 7) {
    score += 20
  }

  if (daysSinceLastPlay >= 30) {
    score += 10
  }

  // 直近FAILEDなら少し優先
  if (lastPlayed.result === "FAILED") {
    score += 20
  }

  return score
}

/**
 * 重み付きランダムで1曲選ぶ
 */
const weightedRandom = <T,>(
  items: T[],
  getWeight: (item: T) => number
): T | null => {
  if (items.length === 0) {
    return null
  }

  const totalWeight = items.reduce(
    (sum, item) => sum + getWeight(item),
    0
  )

  if (totalWeight <= 0) {
    return items[
      Math.floor(Math.random() * items.length)
    ]
  }

  let random = Math.random() * totalWeight

  for (const item of items) {
    random -= getWeight(item)

    if (random <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

/**
 * おすすめ曲を複数選ぶ
 */
export const recommendSongs = (
  songs: Song[],
  records: {
    [songId: string]: {
      random: RecommendationRecord
      sRandom: RecommendationRecord
    }
  },
  mode: RecommendationMode,
  count = 5
): Song[] => {
  const candidates = [...songs]

  const result: Song[] = []

  while (
    result.length < count &&
    candidates.length > 0
  ) {
    const selected =
      weightedRandom(
        candidates,
        (song) => {
          const record =
            mode === "RANDOM"
              ? records[song.id].random
              : records[song.id].sRandom

          return calculateRecommendationScore(
            song,
            record
          )
        }
      )

    if (selected === null) {
      break
    }

    result.push(selected)

    const index =
      candidates.findIndex(
        (song) => song.id === selected.id
      )

    if (index !== -1) {
      candidates.splice(index, 1)
    }
  }

  return result
}