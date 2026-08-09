import SongRow from "./SongRow"
import './App.css'

const songs = [
  {
    title: "曲A",
    level: 46,
    bad: 12,
    cleared: true,
  },
  {
    title: "曲B",
    level: 47,
    bad: 27,
    cleared: false,
  },
  {
    title: "曲C",
    level: 46,
    bad: 8,
    cleared: true,
  },
]

function App() {
  return (
  <div>
    <h1>S-ranran</h1>

    {songs.map((song) => (
      <SongRow key={song.title} song={song} />
    ))}
  </div>
)
}

export default App
