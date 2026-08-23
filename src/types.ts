export type PlayResult = {
  result: "CLEAR" | "FAILED"
  bad: number
  playedAt: string
}

export type PlayRecord = {
  history: PlayResult[]
}

export type SongRecords = {
  [songId: string]: {
    random: PlayRecord
    sRandom: PlayRecord
  }
}