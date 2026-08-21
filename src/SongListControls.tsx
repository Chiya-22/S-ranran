export type FilterOption =
  | "ALL"
  | "UNPLAYED"
  | "PLAYED"
  | "CLEARED"
  | "UNCLEARED"

export type SortOption =
  | "LEVEL_ASC"
  | "LEVEL_DESC"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "BEST_BAD_ASC"
  | "CLEAR_RATE_DESC"

type SongListControlsProps = {
  filterOption: FilterOption
  setFilterOption: (value: FilterOption) => void
  sortOption: SortOption
  setSortOption: (value: SortOption) => void
}

function SongListControls({
  filterOption,
  setFilterOption,
  sortOption,
  setSortOption,
}: SongListControlsProps) {
  return (
    <div className="song-list-controls">
      <div className="filter-control">
        <label htmlFor="filter-select">
          フィルタ
        </label>

        <select
          id="filter-select"
          value={filterOption}
          onChange={(event) =>
            setFilterOption(
              event.target.value as FilterOption
            )
          }
        >
          <option value="ALL">
            すべて
          </option>

          <option value="UNPLAYED">
            未プレイ
          </option>

          <option value="PLAYED">
            プレイ済み
          </option>

          <option value="CLEARED">
            クリア済み
          </option>

          <option value="UNCLEARED">
            未クリア
          </option>
        </select>
      </div>

      <div className="sort-controls">
        <label htmlFor="sort-select">
          並び順
        </label>

        <select
          id="sort-select"
          value={sortOption}
          onChange={(event) =>
            setSortOption(
              event.target.value as SortOption
            )
          }
        >
          <option value="LEVEL_ASC">
            レベル昇順
          </option>

          <option value="LEVEL_DESC">
            レベル降順
          </option>

          <option value="TITLE_ASC">
            曲名順
          </option>

          <option value="TITLE_DESC">
            曲名逆順
          </option>

          <option value="BEST_BAD_ASC">
            最小BADが少ない順
          </option>

          <option value="CLEAR_RATE_DESC">
            CLEAR率が高い順
          </option>
        </select>
      </div>
    </div>
  )
}

export default SongListControls