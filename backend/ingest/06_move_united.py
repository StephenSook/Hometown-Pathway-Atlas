"""
06_move_united.py — Scrape Move United chapter locations and count chapters
within 50 miles of each county centroid.

Source: Move United public chapter directory (https://moveunitedsport.org/locations/?view_type=list)
  Fetches the SSR listing page which renders all ~268 chapters in one HTML response.
  Each chapter card has: chapter name (h2.post_title) + city/state (div.post_description).
  Coordinates are obtained via Nominatim (OSM) geocoding of city+state strings.
  Geocode results are cached per chapter to avoid re-hitting Nominatim on re-runs.

Decision D2 (locked): Move United data is display-only. Never enters similarity matrix.

Outputs:
  backend/data/processed/move_united_chapters.parquet
    Columns: chapter_name, chapter_lat, chapter_lng, chapter_city, chapter_state

  Patches county_profiles.parquet in-place if it already exists, adding:
    move_united_chapters_50mi  (int)
    adaptive_access_confidence (str: "high" | "medium" | "none")

Run order: after 1.5 (zip crosswalk) and ideally after 1.8 (county_profiles exist).
"""

from __future__ import annotations

import json
import math
import re
import time
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CHAPTERS_PAGE_CACHE = RAW_DIR / "move_united_listing.html"
GEOCODE_CACHE_FILE = RAW_DIR / "move_united_geocode_cache.json"
CHAPTERS_OUT = PROCESSED_DIR / "move_united_chapters.parquet"
COUNTY_PROFILES = PROCESSED_DIR / "county_profiles.parquet"

MOVE_UNITED_LIST_URL = (
    "https://moveunitedsport.org/locations/"
    "?page_=1&search=&location=&sport_=&view_type=list"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; HomepathwayAtlas/1.0; "
        "research project; contact: binepzai2004@gmail.com)"
    )
}

RADIUS_MILES = 50
RADIUS_KM = RADIUS_MILES * 1.60934
EARTH_RADIUS_KM = 6371.0

# Nominatim ToS: >= 1s between requests
NOMINATIM_SLEEP = 1.1


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Fetch listing page
# ---------------------------------------------------------------------------

def fetch_listing_html() -> str:
    if CHAPTERS_PAGE_CACHE.exists():
        print(f"  [cache] {CHAPTERS_PAGE_CACHE.name}")
        return CHAPTERS_PAGE_CACHE.read_text(encoding="utf-8", errors="replace")
    print(f"  [fetch] {MOVE_UNITED_LIST_URL}")
    for attempt in range(4):
        try:
            resp = requests.get(MOVE_UNITED_LIST_URL, headers=HEADERS, timeout=30)
            if resp.status_code == 429:
                wait = 20 * (2 ** attempt)
                print(f"  [429] waiting {wait}s (attempt {attempt+1}/4)")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            CHAPTERS_PAGE_CACHE.write_text(resp.text, encoding="utf-8")
            time.sleep(1.0)
            return resp.text
        except requests.exceptions.ConnectionError as exc:
            wait = 10 * (2 ** attempt)
            print(f"  [conn-err] {exc} — waiting {wait}s (attempt {attempt+1}/4)")
            time.sleep(wait)
    raise RuntimeError("Failed to fetch Move United listing page after 4 attempts")


# ---------------------------------------------------------------------------
# Parse chapter cards from HTML
# ---------------------------------------------------------------------------

def parse_chapters_html(html: str) -> list[dict]:
    """
    Parse Move United chapter listing page.
    Each chapter is in <a class="post_holder"> with structure:
      <h2 class="post_title">Chapter Name</h2>
      <div class="post_description"><p>City, ST, ZIP</p></div>
    """
    soup = BeautifulSoup(html, "lxml")
    city_state_re = re.compile(
        r'^([A-Z][a-zA-Z\s\.\-\']+?),\s*([A-Z]{2})(?:,\s*\d{5}(?:-\d{4})?)?$'
    )

    chapters: list[dict] = []
    seen: set[str] = set()

    for a in soup.find_all("a", class_="post_holder"):
        # Name
        h2 = a.find("h2", class_="post_title")
        name = h2.get_text(strip=True) if h2 else ""
        if not name:
            continue

        # City/state from description paragraph
        desc = a.find("div", class_="post_description")
        city_text = desc.get_text(strip=True) if desc else ""
        m = city_state_re.match(city_text)
        if not m:
            continue
        city = m.group(1).strip()
        state = m.group(2)

        key = f"{name}|{city}|{state}"
        if key in seen:
            continue
        seen.add(key)

        chapters.append({
            "chapter_name": name,
            "chapter_city": city,
            "chapter_state": state,
            "chapter_lat": None,
            "chapter_lng": None,
        })

    return chapters


# ---------------------------------------------------------------------------
# Geocode chapters via Nominatim (with cache)
# ---------------------------------------------------------------------------

def load_geocode_cache() -> dict[str, tuple[float, float] | None]:
    if GEOCODE_CACHE_FILE.exists():
        raw = json.loads(GEOCODE_CACHE_FILE.read_text(encoding="utf-8"))
        return {k: (tuple(v) if v is not None else None) for k, v in raw.items()}  # type: ignore
    return {}


def save_geocode_cache(cache: dict) -> None:
    GEOCODE_CACHE_FILE.write_text(
        json.dumps({k: list(v) if v is not None else None for k, v in cache.items()}, indent=2),
        encoding="utf-8",
    )


def geocode_nominatim(city: str, state: str, cache: dict) -> tuple[float | None, float | None]:
    key = f"{city}, {state}"
    if key in cache:
        result = cache[key]
        return (result[0], result[1]) if result is not None else (None, None)

    query = f"{city}, {state}, USA"
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            lat, lng = float(results[0]["lat"]), float(results[0]["lon"])
            cache[key] = (lat, lng)
            time.sleep(NOMINATIM_SLEEP)
            return lat, lng
    except Exception as exc:
        print(f"    [geocode-err] {query}: {exc}")

    cache[key] = None
    time.sleep(NOMINATIM_SLEEP)
    return None, None


def geocode_all(chapters: list[dict]) -> list[dict]:
    cache = load_geocode_cache()
    resolved = sum(1 for c in chapters if f"{c['chapter_city']}, {c['chapter_state']}" in cache and cache[f"{c['chapter_city']}, {c['chapter_state']}"] is not None)
    total = len(chapters)
    print(f"  Geocode cache: {resolved}/{total} already cached")

    for i, chapter in enumerate(chapters, 1):
        city, state = chapter["chapter_city"], chapter["chapter_state"]
        lat, lng = geocode_nominatim(city, state, cache)
        chapter["chapter_lat"] = lat
        chapter["chapter_lng"] = lng
        if i % 25 == 0 or i == total:
            geocoded = sum(1 for c in chapters[:i] if c["chapter_lat"] is not None)
            print(f"  [{i}/{total}] geocoded: {geocoded}")
            save_geocode_cache(cache)

    save_geocode_cache(cache)
    return chapters


# ---------------------------------------------------------------------------
# Count chapters per county (50-mile radius)
# ---------------------------------------------------------------------------

def count_chapters_per_county(
    chapters: list[dict],
    county_profiles: pd.DataFrame,
) -> pd.Series:
    lat_deg_per_km = 1.0 / 111.0
    lng_deg_per_km = 1.0 / (111.0 * math.cos(math.radians(38.0)))
    lat_margin = RADIUS_KM * lat_deg_per_km
    lng_margin = RADIUS_KM * lng_deg_per_km

    valid_chapters = [
        (c["chapter_lat"], c["chapter_lng"])
        for c in chapters
        if c["chapter_lat"] is not None and c["chapter_lng"] is not None
    ]

    counts: dict[str, int] = {}
    for _, row in county_profiles.iterrows():
        clat = row.get("centroid_lat")
        clng = row.get("centroid_lng")
        fips = str(row["fips"])

        if clat is None or clng is None or (hasattr(clat, '__float__') and math.isnan(float(clat))):
            counts[fips] = 0
            continue

        count = 0
        for ch_lat, ch_lng in valid_chapters:
            if abs(ch_lat - clat) > lat_margin or abs(ch_lng - clng) > lng_margin:
                continue
            if haversine_km(float(clat), float(clng), ch_lat, ch_lng) <= RADIUS_KM:
                count += 1
        counts[fips] = count

    return pd.Series(counts, name="move_united_chapters_50mi")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n=== Move United Chapter Scrape (task 1.10) ===")
    print(f"  Source: {MOVE_UNITED_LIST_URL}")
    print(f"  Radius: {RADIUS_MILES} miles ({RADIUS_KM:.1f} km)")

    # --- Fetch and parse listing ---
    html = fetch_listing_html()
    chapters = parse_chapters_html(html)
    print(f"\n  Chapters found in HTML: {len(chapters)}")

    if not chapters:
        print(
            "\n  [WARN] No chapters parsed. The listing page structure may have changed.\n"
            "  Falling back to manual override if available..."
        )
        manual = RAW_DIR / "move_united_chapters_manual.json"
        if manual.exists():
            raw = json.loads(manual.read_text(encoding="utf-8"))
            chapters = [
                {
                    "chapter_name": c.get("chapter_name", ""),
                    "chapter_city": c.get("chapter_city", ""),
                    "chapter_state": c.get("chapter_state", ""),
                    "chapter_lat": c.get("chapter_lat"),
                    "chapter_lng": c.get("chapter_lng"),
                }
                for c in raw
            ]
            print(f"  Loaded {len(chapters)} from manual override.")
        else:
            print("  No manual override. Writing empty parquet.")
            pd.DataFrame(
                columns=["chapter_name", "chapter_lat", "chapter_lng", "chapter_city", "chapter_state"]
            ).to_parquet(CHAPTERS_OUT, index=False)
            return

    # --- Geocode ---
    # Skip geocoding for chapters that already have lat/lng from manual override
    needs_geocode = [c for c in chapters if c["chapter_lat"] is None]
    print(f"\n  Chapters needing geocode: {len(needs_geocode)}")
    if needs_geocode:
        print("  Geocoding via Nominatim (1s delay per request per ToS)...")
        chapters = geocode_all(chapters)

    geocoded = sum(1 for c in chapters if c["chapter_lat"] is not None)
    print(f"\n  Geocoded: {geocoded}/{len(chapters)} chapters")

    # State distribution
    state_counts = pd.Series([c["chapter_state"] for c in chapters if c["chapter_state"]]).value_counts()
    print(f"  States: {state_counts.shape[0]}")
    print(f"  Top 5: {dict(state_counts.head(5))}")

    # --- Save chapter parquet ---
    df_chapters = pd.DataFrame(chapters)
    df_chapters.to_parquet(CHAPTERS_OUT, index=False)
    print(f"\n  Saved: {CHAPTERS_OUT}  ({len(df_chapters)} rows)")

    # --- Patch county_profiles if present ---
    if not COUNTY_PROFILES.exists():
        print(
            f"\n  county_profiles.parquet not found.\n"
            "  Run 07_aggregate.py first, then re-run this script to patch counts."
        )
        return

    print(f"\n  Loading county_profiles: {COUNTY_PROFILES}")
    profiles = pd.read_parquet(COUNTY_PROFILES)
    print(f"  Counties: {len(profiles)}")

    required_cols = {"fips", "centroid_lat", "centroid_lng"}
    missing = required_cols - set(profiles.columns)
    if missing:
        print(f"\n  [WARN] county_profiles missing columns: {missing}. Re-run after 07_aggregate.py.")
        return

    print(f"\n  Computing 50-mile chapter counts for {len(profiles)} counties...")
    chapter_counts = count_chapters_per_county(chapters, profiles)

    profiles["fips"] = profiles["fips"].astype(str)
    profiles = profiles.set_index("fips")
    profiles["move_united_chapters_50mi"] = (
        chapter_counts.reindex(profiles.index).fillna(0).astype(int)
    )
    profiles = profiles.reset_index()

    def confidence(n: int) -> str:
        if n >= 3:
            return "high"
        if n >= 1:
            return "medium"
        return "none"

    profiles["adaptive_access_confidence"] = profiles["move_united_chapters_50mi"].apply(confidence)

    # Summary
    nonzero = (profiles["move_united_chapters_50mi"] > 0).sum()
    mean_count = profiles["move_united_chapters_50mi"].mean()
    max_count = profiles["move_united_chapters_50mi"].max()
    print(f"\n  Counties with >=1 chapter within 50mi: {nonzero} / {len(profiles)}")
    print(f"  Mean chapters per county: {mean_count:.2f}")
    print(f"  Max chapters in 50mi: {max_count}")
    print(f"  Confidence distribution:")
    print(profiles["adaptive_access_confidence"].value_counts().to_string())

    profiles.to_parquet(COUNTY_PROFILES, index=False)
    print(f"\n  Patched: {COUNTY_PROFILES}")
    print("  Done. D2: move_united_chapters_50mi is display-only -- NOT in similarity matrix.")


if __name__ == "__main__":
    main()
