import songsData from "./data/songs.json"

export type Song = {
  id: string
  title: string
  genre: string | null
  level: number
  randomLevel: string | null
  sRandomLevel: string | null
}

export const initialSongs: Song[] = songsData