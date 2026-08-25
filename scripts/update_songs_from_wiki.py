#!/usr/bin/env python3
"""
songs.json updater for S-ranran.

What this script does:
- Keeps every existing song ID unchanged.
- Reads S-random difficulty from the current S-random tables.
- Reads random difficulty from the current "新乱ノック表".
- Uses the linked individual song pages when possible to split genre/title.
- Adds songs that are not already in songs.json.
- Writes a new JSON file instead of overwriting the original by default.
- Uses a local cache so repeated runs do not repeatedly fetch song pages.

Install:
    pip install requests beautifulsoup4

Example:
    python scripts/update_songs_from_wiki.py songs.json songs.updated.json

Review first:
    python scripts/update_songs_from_wiki.py songs.json songs.updated.json --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag


BASE_URL = "https://popn.wiki"

RANDOM_URL = (
    BASE_URL
    + "/その他/乱ノックのススメ/新乱ノック表"
)

SRANDOM_URLS = [
    (
        1,
        BASE_URL
        + "/その他/s乱クリア難易度表/s乱クリア難易度表1"
    ),
    (
        2,
        BASE_URL
        + "/その他/s乱クリア難易度表/s乱クリア難易度表2"
    ),
    (
        3,
        BASE_URL
        + "/その他/s乱クリア難易度表/s乱クリア難易度表3"
    ),
    (
        4,
        BASE_URL
        + "/その他/s乱クリア難易度表/s乱クリア難易度表4"
    ),
]

DEFAULT_CACHE = Path(".wiki_song_cache.json")
DEFAULT_TIMEOUT = 20
REQUEST_DELAY = 0.35

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "S-ranran song data updater/1.0 "
            "(personal project; respectful low-rate requests)"
        )
    }
)


@dataclass
class WikiSong:
    key: str
    display_name: str
    url: str
    official_level: int | None = None
    genre: str | None = None
    title: str | None = None
    random_level: int | None = None
    srandom_level: int | None = None


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("’", "'").replace("‘", "'")
    value = value.replace("‐", "-").replace("‑", "-").replace("–", "-")
    value = value.replace("　", " ")
    value = re.sub(r"\s+", " ", value).strip().lower()
    return value


def strip_difficulty(value: str) -> str:
    value = normalize_text(value)
    value = re.sub(r"\s*\((?:upper\s*)?(?:ex|h|n)\)\s*$", "", value, flags=re.I)
    value = re.sub(r"\s*(?:upper)\s*$", "", value, flags=re.I)
    return value.strip()


def make_new_id(title: str, genre: str | None, existing_ids: set[str]) -> str:
    base = strip_difficulty(title or genre or "song")
    base = unicodedata.normalize("NFKC", base)
    base = base.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base)
    base = base.strip("-") or "song"

    candidate = base
    suffix = 2
    while candidate in existing_ids:
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def fetch_html(url: str) -> str:
    response = SESSION.get(url, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    time.sleep(REQUEST_DELAY)
    return response.text


def clean_cell(cell: Tag) -> str:
    return re.sub(r"\s+", " ", cell.get_text(" ", strip=True)).strip()


def iter_rows(soup: BeautifulSoup) -> Iterable[list[Tag]]:
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"], recursive=False)
            if cells:
                yield cells


def parse_level_marker(text: str, marker: str) -> int | None:
    text = normalize_text(text)

    if marker == "random":
        match = re.search(r"●\s*(1[0-4]|[1-9])\b", text)
        return int(match.group(1)) if match else None

    # Accept Lv19, Lv19弱, Lv2強, etc.
    match = re.search(r"\blv\s*(\d{1,2})", text)
    return int(match.group(1)) if match else None


def extract_linked_song(row: list[Tag]) -> tuple[str, str] | None:
    """
    Find a popn.wiki song-page link in a table row.

    We deliberately prefer links under /難易度表/ because these pages
    contain the separate genre/title information.
    """
    for cell in row:
        for link in cell.find_all("a", href=True):
            href = link["href"]
            if "/難易度表/" not in href:
                continue

            text = clean_cell(link)
            if not text:
                continue

            return text, urljoin(BASE_URL, href)

    # Fallback: any non-navigation link in the row.
    for cell in row:
        for link in cell.find_all("a", href=True):
            href = link["href"]
            if href.startswith("#") or "/その他/" in href:
                continue
            text = clean_cell(link)
            if text:
                return text, urljoin(BASE_URL, href)

    return None


def parse_random_table(html: str) -> list[WikiSong]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[WikiSong] = []
    current_random: int | None = None

    for row in iter_rows(soup):
        row_text = " ".join(clean_cell(c) for c in row)

        marker = parse_level_marker(row_text, "random")
        if marker is not None and "●" in row_text:
            current_random = marker
            continue

        linked = extract_linked_song(row)
        if not linked or current_random is None:
            continue

        display_name, url = linked

        official_level = None
        first = clean_cell(row[0])
        level_match = re.fullmatch(r"\d{1,2}", first)
        if level_match:
            official_level = int(first)

        results.append(
            WikiSong(
                key=normalize_text(url),
                display_name=display_name,
                url=url,
                official_level=official_level,
                random_level=current_random,
            )
        )

    return dedupe_wiki_songs(results)


def parse_srandom_table(html: str, page_number: int) -> list[WikiSong]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[WikiSong] = []
    current_srandom: int | None = None

    # Some versions of the page use headings; others may put the
    # difficulty marker directly in table rows. We support both.
    for element in soup.find_all(["h2", "h3", "h4", "h5", "h6", "table"]):
        if element.name != "table":
            level = parse_level_marker(element.get_text(" ", strip=True), "srandom")
            if level is not None:
                current_srandom = level
            continue

        for row in element.find_all("tr"):
            cells = row.find_all(["th", "td"], recursive=False)
            if not cells:
                continue

            row_text = " ".join(clean_cell(c) for c in cells)

            # A row-level marker such as "Lv19" should update the
            # current S-random section.
            marker = parse_level_marker(row_text, "srandom")
            if marker is not None and len(cells) <= 2:
                current_srandom = marker
                continue

            linked = extract_linked_song(cells)
            if not linked or current_srandom is None:
                continue

            display_name, url = linked

            official_level = None
            first = clean_cell(cells[0])
            level_match = re.fullmatch(r"\d{1,2}", first)
            if level_match:
                official_level = int(first)

            results.append(
                WikiSong(
                    key=normalize_text(url),
                    display_name=display_name,
                    url=url,
                    official_level=official_level,
                    srandom_level=current_srandom,
                )
            )

    return dedupe_wiki_songs(results)


def dedupe_wiki_songs(items: list[WikiSong]) -> list[WikiSong]:
    merged: dict[str, WikiSong] = {}

    for item in items:
        if item.key not in merged:
            merged[item.key] = item
            continue

        old = merged[item.key]
        old.official_level = old.official_level or item.official_level
        old.genre = old.genre or item.genre
        old.title = old.title or item.title
        old.random_level = old.random_level or item.random_level
        old.srandom_level = old.srandom_level or item.srandom_level

    return list(merged.values())


def detect_chart_suffix(url: str, page_title: str = "") -> str:
    text = f"{url} {page_title}".lower()

    if "upper" in text:
        if re.search(r"[_\-/ ]ex\b", text) or "(ex)" in text:
            return "(UPPER)(EX)"
        if re.search(r"[_\-/ ]h\b", text) or "(h)" in text:
            return "(UPPER)(H)"

    if re.search(r"[_\-/ ]ex\b", text) or "(ex)" in text:
        return "(EX)"
    if re.search(r"[_\-/ ]h\b", text) or "(h)" in text:
        return "(H)"
    if re.search(r"[_\-/ ]n\b", text) or "(n)" in text:
        return "(N)"

    return ""


def parse_song_page(html: str, url: str) -> tuple[str | None, str | None, int | None]:
    """
    Extract genre, song title, and official level from a linked song page.

    The current wiki uses a first table whose columns are:
      [genre/type], [song title], ...
    followed by a "レベル" section.
    """
    soup = BeautifulSoup(html, "html.parser")

    genre: str | None = None
    title: str | None = None
    official_level: int | None = None

    # First data table: take the first row with at least two non-empty cells.
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"], recursive=False)
            if len(cells) < 2:
                continue

            values = [clean_cell(c) for c in cells]
            if values[0] in {"[カテゴリ]ジャンル(タイプ)", "ジャンル(タイプ)"}:
                continue

            if values[0] and values[1]:
                genre = values[0]
                title = values[1]
                break

        if genre or title:
            break

    # Find a heading containing "レベル", then the first plain integer nearby.
    level_heading = None
    for heading in soup.find_all(["h2", "h3", "h4", "h5", "h6"]):
        if clean_cell(heading) == "レベル":
            level_heading = heading
            break

    if level_heading:
        for node in level_heading.find_all_next():
            if isinstance(node, Tag):
                text = clean_cell(node)
                match = re.fullmatch(r"\d{1,2}", text)
                if match:
                    official_level = int(match.group(0))
                    break

            # Do not search too far into the page.
            if node.name in {"h2", "h3", "h4", "h5", "h6"}:
                break

    suffix = detect_chart_suffix(url, soup.title.get_text(" ", strip=True) if soup.title else "")

    if title and suffix and not re.search(r"\((?:UPPER\))?\w+\)\s*$", title, re.I):
        title = f"{title}{suffix}"

    return genre, title, official_level


def load_cache(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_cache(path: Path, cache: dict) -> None:
    path.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def song_match_keys(song: dict) -> set[str]:
    keys: set[str] = set()

    for field in ("title", "genre"):
        value = song.get(field)
        if not value:
            continue

        normalized = normalize_text(str(value))
        keys.add(normalized)
        keys.add(strip_difficulty(normalized))

    return keys


def wiki_match_keys(item: WikiSong) -> set[str]:
    keys: set[str] = set()

    for value in (item.title, item.genre, item.display_name):
        if not value:
            continue
        normalized = normalize_text(value)
        keys.add(normalized)
        keys.add(strip_difficulty(normalized))

    return keys


def build_existing_index(songs: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}

    for song in songs:
        for key in song_match_keys(song):
            index.setdefault(key, []).append(song)

    return index


def merge_wiki_data(
    songs: list[dict],
    wiki_songs: list[WikiSong],
    cache: dict,
    fetch_song_pages: bool,
) -> tuple[list[dict], list[dict]]:
    existing_ids = {str(song["id"]) for song in songs}
    index = build_existing_index(songs)

    added: list[dict] = []
    ambiguous: list[dict] = []

    for item in wiki_songs:
        if fetch_song_pages:
            cached = cache.get(item.url)
            if cached is None:
                try:
                    html = fetch_html(item.url)
                    genre, title, level = parse_song_page(html, item.url)
                    cached = {
                        "genre": genre,
                        "title": title,
                        "level": level,
                    }
                    cache[item.url] = cached
                except Exception as exc:
                    cached = {"error": str(exc)}

            if "error" not in cached:
                item.genre = cached.get("genre") or item.genre
                item.title = cached.get("title") or item.title
                item.official_level = (
                    item.official_level or cached.get("level")
                )

        keys = wiki_match_keys(item)
        matches: list[dict] = []

        for key in keys:
            for song in index.get(key, []):
                if song not in matches:
                    matches.append(song)

        if len(matches) > 1:
            ambiguous.append(
                {
                    "wiki_name": item.display_name,
                    "url": item.url,
                    "matches": [
                        {
                            "id": song["id"],
                            "title": song.get("title"),
                            "genre": song.get("genre"),
                        }
                        for song in matches
                    ],
                }
            )
            continue

        if len(matches) == 1:
            song = matches[0]

            # Existing ID and record compatibility are preserved.
            if item.random_level is not None:
                song["randomLevel"] = f"乱Lv{item.random_level}"

            if item.srandom_level is not None:
                song["sRandomLevel"] = f"S乱Lv{item.srandom_level}"

            if song.get("level") is None and item.official_level is not None:
                song["level"] = item.official_level

            if not song.get("genre") and item.genre:
                song["genre"] = item.genre

            # Do not overwrite an existing title.
            continue

        title = item.title or item.display_name
        genre = item.genre

        if not title:
            continue

        new_song = {
            "id": make_new_id(title, genre, existing_ids),
            "title": title,
            "genre": genre,
            "level": item.official_level,
            "randomLevel": (
                f"乱Lv{item.random_level}"
                if item.random_level is not None
                else None
            ),
            "sRandomLevel": (
                f"S乱Lv{item.srandom_level}"
                if item.srandom_level is not None
                else None
            ),
        }

        songs.append(new_song)
        added.append(new_song)
        existing_ids.add(new_song["id"])

        for key in song_match_keys(new_song):
            index.setdefault(key, []).append(new_song)

    return added, ambiguous


def collect_wiki_data(fetch_song_pages: bool) -> list[WikiSong]:
    print("新乱ノック表を取得しています...")
    random_items = parse_random_table(fetch_html(RANDOM_URL))
    print(f"  乱: {len(random_items)} 曲")

    srandom_items: list[WikiSong] = []

    for page_number, url in SRANDOM_URLS:
        print(f"S乱クリア難易度表{page_number}を取得しています...")
        items = parse_srandom_table(fetch_html(url), page_number)
        print(f"  表{page_number}: {len(items)} 曲")
        srandom_items.extend(items)

    merged: dict[str, WikiSong] = {}

    for item in random_items + srandom_items:
        if item.key not in merged:
            merged[item.key] = item
            continue

        old = merged[item.key]
        old.official_level = old.official_level or item.official_level
        old.genre = old.genre or item.genre
        old.title = old.title or item.title
        old.random_level = old.random_level or item.random_level
        old.srandom_level = old.srandom_level or item.srandom_level

    return list(merged.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument(
        "--no-song-pages",
        action="store_true",
        help="Do not fetch individual song pages; use table data only.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not write output; print a summary instead.",
    )
    args = parser.parse_args()

    songs = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(songs, list):
        raise ValueError("songs.json must contain a JSON array.")

    cache = load_cache(args.cache)

    wiki_songs = collect_wiki_data(
        fetch_song_pages=not args.no_song_pages
    )

    print(f"\nWiki上の候補曲: {len(wiki_songs)}")

    added, ambiguous = merge_wiki_data(
        songs=songs,
        wiki_songs=wiki_songs,
        cache=cache,
        fetch_song_pages=not args.no_song_pages,
    )

    save_cache(args.cache, cache)

    print(f"新規追加: {len(added)}")
    print(f"照合できず新規扱い: {len(added)}")
    print(f"曖昧な照合: {len(ambiguous)}")

    if ambiguous:
        print("\n=== 曖昧な照合（手動確認が必要） ===")
        for item in ambiguous:
            print(f"- {item['wiki_name']}")
            print(f"  {item['url']}")
            for match in item["matches"]:
                print(
                    f"    {match['id']}: "
                    f"{match['genre']} / {match['title']}"
                )

    if added:
        print("\n=== 新規追加 ===")
        for song in added:
            print(
                f"- {song['id']}: "
                f"{song['genre']} / {song['title']} "
                f"(Lv{song['level']}, "
                f"{song['randomLevel']}, "
                f"{song['sRandomLevel']})"
            )

    if args.dry_run:
        print("\nDRY RUN: JSONは書き込みません。")
        return

    args.output.write_text(
        json.dumps(songs, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"\n出力しました: {args.output}")


if __name__ == "__main__":
    main()
