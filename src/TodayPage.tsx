import { useState } from "react"
import type { Song } from "./songs"

type TodayPageProps = {
  songs: Song[]
  onCreateDeck: (
    mode: "RANDOM" | "S-RANDOM",
    minLevel: number,
    maxLevel: number,
    count: number,
    unplayedFirst: boolean
  ) => Song[]
}

function TodayPage({
  onCreateDeck,
}: TodayPageProps) {
  const [mode, setMode] =
    useState<"RANDOM" | "S-RANDOM">("S-RANDOM")

  const [minLevel, setMinLevel] = useState(15)
  const [maxLevel, setMaxLevel] = useState(17)

  const [count, setCount] = useState(5)

  const [unplayedFirst, setUnplayedFirst] =
    useState(true)

  const [deck, setDeck] = useState<Song[]>([])

  const handleCreateDeck = () => {
    const newDeck = onCreateDeck(
      mode,
      minLevel,
      maxLevel,
      count,
      unplayedFirst
    )

    setDeck(newDeck)
  }

  return (
    <div className="today-page">
      <h2>今日やる曲</h2>

      <div className="today-settings">

        <div>
          <label>
            モード：
          </label>

          <select
            value={mode}
            onChange={(event) =>
              setMode(
                event.target.value as
                  | "RANDOM"
                  | "S-RANDOM"
              )
            }
          >
            <option value="S-RANDOM">
              S-RANDOM
            </option>

            <option value="RANDOM">
              RANDOM
            </option>
          </select>
        </div>

        <div>
          <label>
            レベル：
          </label>

          <select
            value={minLevel}
            onChange={(event) =>
              setMinLevel(
                Number(event.target.value)
              )
            }
          >
            {Array.from(
              { length: 19 },
              (_, i) => i + 1
            ).map((level) => (
              <option
                key={level}
                value={level}
              >
                Lv{level}
              </option>
            ))}
          </select>

          {" ～ "}

          <select
            value={maxLevel}
            onChange={(event) =>
              setMaxLevel(
                Number(event.target.value)
              )
            }
          >
            {Array.from(
              { length: 19 },
              (_, i) => i + 1
            ).map((level) => (
              <option
                key={level}
                value={level}
              >
                Lv{level}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>
            曲数：
          </label>

          <select
            value={count}
            onChange={(event) =>
              setCount(
                Number(event.target.value)
              )
            }
          >
            <option value={3}>3曲</option>
            <option value={4}>4曲</option>
            <option value={5}>5曲</option>
          </select>
        </div>

        <label>
          <input
            type="checkbox"
            checked={unplayedFirst}
            onChange={(event) =>
              setUnplayedFirst(
                event.target.checked
              )
            }
          />

          未プレイを優先
        </label>

      </div>

      <button
        onClick={handleCreateDeck}
      >
        🎲 今日の曲を選ぶ
      </button>

      {deck.length > 0 && (
        <div className="today-deck">

          <h3>
            今日のデッキ
          </h3>

          {deck.map((song, index) => (
            <div
              className="today-song"
              key={song.id}
            >
              <span>
                {index + 1}.
              </span>

              <span>
                {song.title}
              </span>

              <span>
                Lv {song.level}
              </span>
            </div>
          ))}

        </div>
      )}
    </div>
  )
}

export default TodayPage