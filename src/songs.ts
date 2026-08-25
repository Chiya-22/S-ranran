import songsData from "./data/songs.updated.json"

export type Song = {
  id: string
  title: string
  genre: string | null
  level: number
  randomLevel: string | null
  sRandomLevel: string | null
}

export const initialSongs: Song[] = songsData