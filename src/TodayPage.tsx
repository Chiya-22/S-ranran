import type { Song } from "./songs"

type TodayPageProps = {
  songs: Song[]
  todayDeck: string[]
  onCreateDeck: () => void
}

function TodayPage({
  songs,
  todayDeck,
  onCreateDeck,
}: TodayPageProps) {
  return (
    <div className="today-page">
      <h2>今日やる曲</h2>

      <button onClick={onCreateDeck}>
        🎲 今日の曲を選ぶ
      </button>

      {todayDeck.length > 0 && (
        <div className="today-deck">
          {todayDeck.map((songId, index) => {
            const song = songs.find(
              (song) => song.id === songId
            )

            if (!song) {
              return null
            }

            return (
              <div
                className="today-song"
                key={song.id}
              >
                <div>
                  {index + 1}. {song.title}
                </div>

                <div>
                  Lv {song.level}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TodayPage