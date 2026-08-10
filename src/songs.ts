export type Song = {
  id: string
  title: string
  genre: string | null
  level: number
  randomLevel: string | null
  sRandomLevel: string | null
}


export const initialSongs: Song[] = [
  {
    id: "song-001",
    title: "曲A",
    genre: null,
    level: 46,
    randomLevel: "乱○5",
    sRandomLevel: null,
  },
  {
    id: "song-002",
    title: "曲B",
    genre: null,
    level: 47,
    randomLevel: "乱○6",
    sRandomLevel: "S乱Lv5",
  },
]