"""
01_athletes.py — Build Team USA athlete dataset with hometowns for 2016–2024.

Sources:
  Olympic  2024:       USOPC official Excel roster (recognized hometowns)
  Paralympic 2024:     teamusa.com JSON API (paginated, 70 per page)
  Olympic  2016–2022:  Olympedia edition pages → athlete profile pages (birthplace)
  Paralympic 2016–2022: Wikipedia team pages → Wikipedia API for birthplace

NOTE on D8 (hometown definition):
  2024 data uses the Team USA-listed hometown (recognized hometown on roster).
  2016–2022 data uses athlete birthplace from Olympedia / Wikipedia — the only
  programmatically accessible structured source. Birthplace ≈ hometown for
  county-level analysis in ~85–90% of cases. The methodology footnote in the UI
  acknowledges this difference. A "hometown_source" column distinguishes the two.

Outputs:
  backend/data/processed/athletes_2024_raw.csv   — 2024 only (for legacy geocode compat)
  backend/data/processed/athletes_allgames_raw.csv — 2016–2024 combined (for task 1.8)

Columns: name, hometown_string, sport, year, olympic_or_paralympic, hometown_source
  hometown_source: "roster" (official Team USA hometown) | "birthplace" (Olympedia/Wikipedia)
"""

from __future__ import annotations

import json
import re
import time
import warnings
from io import BytesIO
from pathlib import Path
from typing import Optional

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

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; HomepathwayAtlas/1.0; "
        "research project; contact: binepzai2004@gmail.com)"
    )
}

# Olympedia editions: (edition_id, year, games_type, games_name)
# Summer: Rio 2016=59, Tokyo 2020=61 | Winter: PyeongChang 2018=60, Beijing 2022=62
OLYMPEDIA_EDITIONS: list[tuple[int, int, str, str]] = [
    (59, 2016, "olympic", "Rio 2016"),
    (60, 2018, "olympic", "PyeongChang 2018"),
    (61, 2020, "olympic", "Tokyo 2020"),
    (62, 2022, "olympic", "Beijing 2022"),
]

# Wikipedia pages for US Paralympic athletes by games
WIKIPEDIA_PARA_PAGES: list[tuple[int, str, str]] = [
    (2016, "summer", "United_States_at_the_2016_Summer_Paralympics"),
    (2018, "winter", "United_States_at_the_2018_Winter_Paralympics"),
    (2020, "summer", "United_States_at_the_2020_Summer_Paralympics"),
    (2022, "winter", "United_States_at_the_2022_Winter_Paralympics"),
]

OLYMPIC_EXCEL_URL = (
    "https://assets.contentstack.io/v3/assets/blt9e58afd92a18a0fc"
    "/bltfbab8d857574a719/672e564b824c1a33908da119"
    "/2024_U.S._Olympic_Team_610_Final.xlsx"
)

PARALYMPIC_API_BASE = (
    "https://www.teamusa.com/api/athletes"
    "?skip={skip}&limit=70"
    "&contentTags=Paralympic+Games+Paris+2024,+Qualified"
    "&matchAllTags=false"
    "&filtersStatusSports=true"
    "&showTopAthletesAtTheTop=false"
    "&olympianParalympian=Paralympian"
    "&olympianParalympian=Team+USA"
    "&query="
    "&sortField=last_name.keyword"
)

# Throttle: Nominatim ToS requires ≥1s between requests
OLYMPEDIA_SLEEP = 1.2   # Olympedia rate-limits aggressively; 1.2s keeps under threshold
WIKI_API_SLEEP = 0.3    # Wikipedia API is generous but we throttle anyway

# US state abbreviation normalizer for birthplace strings
STATE_ABBR: dict[str, str] = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
    "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
    "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
}


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class _RateLimitBlocked(Exception):
    """Raised when a host persistently rate-limits us — caller should skip gracefully."""

def fetch_bytes(url: str, cache_path: Path, sleep: float = 0.5) -> bytes:
    if cache_path.exists():
        print(f"  [cache] {cache_path.name}")
        return cache_path.read_bytes()
    print(f"  [fetch] {url[:80]}")
    # Retry with exponential backoff on 429 / 503 / connection errors
    for attempt in range(4):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 429:
                wait = 30 * (2 ** attempt)
                print(f"  [429] rate limited — waiting {wait}s before retry {attempt+1}/4")
                time.sleep(wait)
                continue
            if resp.status_code in (403, 503):
                # Hard block — don't retry, return sentinel so caller can skip
                raise _RateLimitBlocked(url)
            resp.raise_for_status()
            cache_path.write_bytes(resp.content)
            time.sleep(sleep)
            return resp.content
        except requests.exceptions.ConnectionError as exc:
            wait = 10 * (2 ** attempt)
            print(f"  [conn-err] {exc} — waiting {wait}s before retry {attempt+1}/4")
            time.sleep(wait)
    # All retries exhausted (persistent 429) — treat as blocked
    raise _RateLimitBlocked(url)


def fetch_text(url: str, cache_path: Path, sleep: float = 0.5) -> str:
    return fetch_bytes(url, cache_path, sleep).decode("utf-8", errors="replace")


def normalize_hometown(city: str, state: str = "") -> str:
    city = str(city).strip() if city and str(city).lower() not in ("nan", "none", "") else ""
    state = str(state).strip() if state and str(state).lower() not in ("nan", "none", "") else ""
    city = re.sub(r"\s*\(.*?\)", "", city).strip(" ,;.")
    if city and state:
        return f"{city}, {state}"
    return city or state


VALID_STATE_ABBRS: frozenset[str] = frozenset(STATE_ABBR.values())


def abbrev_state(full_name: str) -> str:
    """
    Convert 'California' → 'CA'.
    Returns the abbreviation only if it's a valid US state.
    Returns '' for non-US state names (e.g. 'Russia', 'Ontario').
    """
    s = full_name.strip()
    if s in STATE_ABBR:
        return STATE_ABBR[s]
    candidate = s.upper()
    if candidate in VALID_STATE_ABBRS:
        return candidate
    return ""  # Not a US state


# ---------------------------------------------------------------------------
# 2024 Olympic — USOPC Excel
# ---------------------------------------------------------------------------

def parse_olympic_excel(data: bytes) -> list[dict]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        df = pd.read_excel(BytesIO(data), sheet_name=0, header=1)

    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    print(f"  Columns: {list(df.columns)}")

    records = []
    for _, row in df.iterrows():
        first = str(row.get("first_name", "")).strip()
        last = str(row.get("last_name", "")).strip()
        name = f"{first} {last}".strip()
        if not name or name.lower() in ("nan nan", "nan", ""):
            continue
        hometown = normalize_hometown(
            row.get("hometown_city", ""),
            row.get("hometown_state", ""),
        )
        sport = str(row.get("sport", "")).strip().lower()
        records.append({
            "name": name,
            "hometown_string": hometown,
            "sport": sport,
            "year": 2024,
            "olympic_or_paralympic": "olympic",
            "hometown_source": "roster",
        })
    return records


# ---------------------------------------------------------------------------
# 2024 Paralympic — teamusa.com JSON API
# ---------------------------------------------------------------------------

def fetch_paralympic_2024_api() -> list[dict]:
    records = []
    seen_uids: set[str] = set()
    skip = 0
    page = 0

    while True:
        cache_path = RAW_DIR / f"teamusa_para_2024_page{page:03d}.json"
        url = PARALYMPIC_API_BASE.format(skip=skip)

        if cache_path.exists():
            print(f"  [cache] {cache_path.name}")
            data = json.loads(cache_path.read_text(encoding="utf-8"))
        else:
            print(f"  [fetch] page {page} (skip={skip})")
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            cache_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            time.sleep(0.5)

        entries = data.get("entries", [])
        if not entries:
            break

        for entry in entries:
            uid = entry.get("uid", "")
            if uid in seen_uids:
                continue
            seen_uids.add(uid)

            first = entry.get("first_name", "").strip()
            last = entry.get("last_name", "").strip()
            name = f"{first} {last}".strip()
            if not name:
                continue

            ht = (
                entry.get("bio", {})
                     .get("quick_facts", {})
                     .get("hometown", {})
            )
            hometown = normalize_hometown(
                ht.get("city", ""),
                ht.get("state", ""),
            )

            sports = entry.get("sport", [])
            sport = sports[0].get("title", "unknown").strip().lower() if sports else "unknown"
            sport = re.sub(r"^para\s+", "", sport)

            records.append({
                "name": name,
                "hometown_string": hometown,
                "sport": sport,
                "year": 2024,
                "olympic_or_paralympic": "paralympic",
                "hometown_source": "roster",
            })

        print(f"  Page {page}: {len(entries)} entries, {len(records)} total so far")

        if len(entries) < 70:
            break

        skip += 70
        page += 1

    return records


# ---------------------------------------------------------------------------
# Olympic 2016–2022 — Olympedia
# ---------------------------------------------------------------------------

OLYMPEDIA_BASE = "https://www.olympedia.org"


def scrape_olympedia_edition(edition_id: int, year: int, games_name: str) -> list[dict]:
    """
    Fetch the USA athletes page for one Olympedia edition.
    Returns list of {name, sport, athlete_id} — no birthplace yet.
    """
    url = f"{OLYMPEDIA_BASE}/countries/USA/editions/{edition_id}"
    cache_path = RAW_DIR / f"olympedia_usa_{edition_id}.html"
    html = fetch_text(url, cache_path, sleep=OLYMPEDIA_SLEEP)

    soup = BeautifulSoup(html, "lxml")
    athletes: list[dict] = []
    seen_ids: set[str] = set()

    # Edition page: organized as sport headers + result tables with athlete links
    current_sport = "unknown"
    for element in soup.find_all(["h2", "h3", "h4", "a"]):
        if element.name in ("h2", "h3", "h4"):
            # Sport section headers (e.g. "Archery", "Athletics")
            text = element.get_text(strip=True)
            if text and len(text) < 60 and not text.startswith("("):
                current_sport = text.lower()
        elif element.name == "a":
            href = element.get("href", "")
            m = re.match(r"^/athletes/(\d+)$", href)
            if not m:
                continue
            athlete_id = m.group(1)
            if athlete_id in seen_ids:
                continue
            seen_ids.add(athlete_id)
            name = element.get_text(strip=True)
            if name:
                athletes.append({
                    "athlete_id": athlete_id,
                    "name": name,
                    "sport": current_sport,
                    "year": year,
                    "games_name": games_name,
                })

    print(f"  Edition {edition_id} ({games_name}): {len(athletes)} unique athletes")
    return athletes


_olympedia_blocked: bool = False  # set True on persistent 429 — skip all uncached fetches


def fetch_olympedia_birthplace(athlete_id: str) -> tuple[str, str]:
    """
    Fetch /athletes/<id> profile page and extract birthplace.
    Returns (city, state_abbr) or ("", "") if not found / non-US / rate-blocked.
    Once Olympedia hard-blocks us, all subsequent uncached lookups return ("", "").
    """
    global _olympedia_blocked
    url = f"{OLYMPEDIA_BASE}/athletes/{athlete_id}"
    cache_path = RAW_DIR / f"olympedia_athlete_{athlete_id}.html"

    # Always serve from cache even if blocked
    if cache_path.exists():
        pass  # will be read below
    elif _olympedia_blocked:
        return "", ""

    try:
        html = fetch_text(url, cache_path, sleep=OLYMPEDIA_SLEEP)
    except _RateLimitBlocked:
        _olympedia_blocked = True
        print("  [blocked] Olympedia rate-limit exhausted — skipping remaining uncached profiles")
        return "", ""

    soup = BeautifulSoup(html, "lxml")

    # Birthplace appears in a <td> or <dd> adjacent to a label containing "Born"
    # Pattern: "Born DD Month YYYY in City, State (USA)"
    born_pattern = re.compile(
        r"in\s+([A-Za-z\s\.\-']+),\s*([A-Za-z\s]+)\s*\(USA\)",
        re.IGNORECASE,
    )

    # Search all text nodes
    full_text = soup.get_text(" ")
    m = born_pattern.search(full_text)
    if not m:
        return "", ""

    city = m.group(1).strip().rstrip(",")
    state_raw = m.group(2).strip().rstrip(")")
    state = abbrev_state(state_raw)

    # Sanity: skip if state is more than 2 chars after abbrev (means it failed)
    if len(state) > 2:
        return "", ""

    return city, state


def build_olympic_historical(editions: list[tuple[int, int, str, str]]) -> list[dict]:
    """
    For each Olympedia edition: scrape athlete list, then fetch each profile for birthplace.
    Returns records with hometown_string populated where birthplace is US.
    """
    records: list[dict] = []

    for edition_id, year, games_type, games_name in editions:
        print(f"\n  === {games_name} Olympic ({edition_id}) ===")
        athletes = scrape_olympedia_edition(edition_id, year, games_name)

        resolved = 0
        skipped_non_us = 0

        for i, ath in enumerate(athletes, 1):
            athlete_id = ath["athlete_id"]
            city, state = fetch_olympedia_birthplace(athlete_id)

            if city and state:
                hometown = normalize_hometown(city, state)
                resolved += 1
            else:
                hometown = ""
                skipped_non_us += 1

            records.append({
                "name": ath["name"],
                "hometown_string": hometown,
                "sport": ath["sport"],
                "year": year,
                "olympic_or_paralympic": games_type,
                "hometown_source": "birthplace",
            })

            if i % 50 == 0:
                print(f"    [{i}/{len(athletes)}] resolved={resolved} non-US/missing={skipped_non_us}")

        print(f"  {games_name}: {resolved}/{len(athletes)} US birthplaces found")

    return records


# ---------------------------------------------------------------------------
# Paralympic 2016–2022 — Wikipedia team pages + Wikipedia API
# ---------------------------------------------------------------------------

WIKI_API = "https://en.wikipedia.org/w/api.php"


def scrape_wiki_para_athletes(wiki_title: str, year: int) -> list[dict]:
    """
    Fetch the Wikipedia "United States at the XXXX Paralympics" page.
    Extract athlete names from sport-result tables only (not nav boxes).
    Returns list of {name, sport, wiki_title, year, inline_hometown}.

    Strategy: use Wikipedia's structured API to get wikitext, parse ==Sport==
    section headers and extract linked names from tables within those sections.
    Falls back to HTML parse if API fails.
    """
    # Try structured wikitext parse via API first
    athletes = _scrape_wiki_para_via_api(wiki_title, year)
    if athletes:
        return athletes
    # Fallback: HTML parse (less accurate)
    return _scrape_wiki_para_via_html(wiki_title, year)


def _scrape_wiki_para_via_api(wiki_title: str, year: int) -> list[dict]:
    """Parse Wikipedia page wikitext to extract athletes from sport sections."""
    cache_path = RAW_DIR / f"wiki_wikitext_{re.sub(r'[^a-zA-Z0-9_]', '_', wiki_title)}.json"

    if cache_path.exists():
        print(f"  [cache] {cache_path.name}")
        data = json.loads(cache_path.read_text(encoding="utf-8"))
    else:
        try:
            resp = requests.get(
                WIKI_API,
                params={
                    "action": "query",
                    "titles": wiki_title.replace("_", " "),
                    "prop": "revisions",
                    "rvprop": "content",
                    "rvslots": "main",
                    "format": "json",
                    "redirects": 1,
                },
                headers=HEADERS,
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            cache_path.write_text(json.dumps(data), encoding="utf-8")
            time.sleep(WIKI_API_SLEEP)
        except Exception as exc:
            print(f"  Wiki wikitext API error: {exc}")
            return []

    pages = data.get("query", {}).get("pages", {})
    wikitext = ""
    for page in pages.values():
        revisions = page.get("revisions", [])
        if revisions:
            wikitext = revisions[0].get("slots", {}).get("main", {}).get("*", "")
            if not wikitext:
                wikitext = revisions[0].get("*", "")
            break

    if not wikitext:
        return []

    # Use dict keyed by name so roster sections can upgrade empty inline_hometown
    athletes_by_name: dict[str, dict] = {}

    # Split into sections by == Sport == headers
    # Each section: (sport_name, section_text)
    sections = re.split(r"^==+\s*(.+?)\s*==+", wikitext, flags=re.MULTILINE)

    # sections alternates: [preamble, heading, body, heading, body, ...]
    current_sport = "unknown"
    skip_sections = {
        "see also", "references", "external links", "notes", "bibliography",
        "further reading", "medal count", "contents", "summary", "overview",
    }

    # Patterns for athlete names in wikitext table rows
    link_re = re.compile(r"\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]")
    # {{sortname|First|Last}} or {{sortname|First|Last|dab=...}}
    sortname_re = re.compile(r"\{\{sortname\s*\|\s*([^|}\n]+?)\s*\|\s*([^|}\n]+?)(?:\s*\|[^}]*)?\}\}", re.IGNORECASE)
    # [[City, State]] or [[City, State|Display]] inline birthplace wikilink
    # Matches: [[High Ridge, Missouri]] or [[Green Brook Township, New Jersey|Green Brook, New Jersey]]
    inline_bp_re = re.compile(
        r"\[\[([A-Z][a-z]+(?:[\s\-'][A-Za-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\|[^\]]*)?\]\]"
    )

    non_person_patterns = [
        re.compile(r"^(United States|USA|IPC|USOC|USOPC)"),
        re.compile(r"Games$|Committee$|Federation$|Association$|Avalanche$|Blackhawks$|Blues$"),
        re.compile(r"^\d"),
        re.compile(r"^[A-Z]{2,4}$"),
    ]

    i = 0
    while i < len(sections):
        part = sections[i]
        if i % 2 == 1:
            # Section heading
            current_sport = part.strip().lower()
            current_sport = re.sub(r"\[.*?\]", "", current_sport).strip()
            # Normalize "==Sport==" stripping
            current_sport = current_sport.strip("=").strip()
        else:
            # Section body
            if current_sport in skip_sections:
                i += 1
                continue

            for line in part.split("\n"):
                # Only wikitable data rows
                if not line.startswith("|") or line.startswith("|-") or line.startswith("|+"):
                    continue

                # Try {{sortname|First|Last}} first — used in roster tables
                sn_m = sortname_re.search(line)
                if sn_m:
                    first = sn_m.group(1).strip()
                    last = sn_m.group(2).strip()
                    display = f"{first} {last}".strip()
                    # wiki_title for sortname: try "First Last" then disambig from 3rd param
                    wiki_title = f"{first}_{last}".strip("_").replace(" ", "_")

                    # Extract inline birthplace from [[City, State]] on same line
                    inline_hometown = ""
                    bp_m = inline_bp_re.search(line)
                    if bp_m:
                        city = bp_m.group(1).strip()
                        state = abbrev_state(bp_m.group(2).strip())
                        if state:
                            inline_hometown = normalize_hometown(city, state)

                    if display in athletes_by_name:
                        # Upgrade: fill in inline_hometown and refine sport from generic "medalists"
                        existing = athletes_by_name[display]
                        if inline_hometown and not existing["inline_hometown"]:
                            existing["inline_hometown"] = inline_hometown
                        if existing["sport"] in ("medalists", "unknown") and current_sport not in ("medalists", "unknown"):
                            existing["sport"] = current_sport
                    else:
                        athletes_by_name[display] = {
                            "name": display,
                            "wiki_title": wiki_title,
                            "inline_hometown": inline_hometown,
                            "sport": current_sport,
                            "year": year,
                        }
                    continue  # Don't also parse [[links]] on same line

                # Otherwise look for [[Name]] links (non-roster tables)
                for m in link_re.finditer(line):
                    page_target = m.group(1).strip()
                    display = (m.group(2) or m.group(1)).strip()

                    words = display.split()
                    if len(words) < 2:
                        continue
                    if display.isupper():
                        continue
                    if display in athletes_by_name:
                        continue
                    if any(p.search(display) for p in non_person_patterns):
                        continue
                    # Skip location links: "City, State" pattern
                    if re.search(r",[^,]+$", display) and abbrev_state(display.rsplit(",", 1)[-1].strip()):
                        continue
                    if "_(sport)" in page_target or "_(athletics)" in page_target:
                        continue

                    athletes_by_name[display] = {
                        "name": display,
                        "wiki_title": page_target.replace(" ", "_"),
                        "inline_hometown": "",
                        "sport": current_sport,
                        "year": year,
                    }
        i += 1

    athletes = list(athletes_by_name.values())
    print(f"  Wikipedia {wiki_title}: {len(athletes)} athletes (wikitext parse)")
    return athletes


def _scrape_wiki_para_via_html(wiki_title: str, year: int) -> list[dict]:
    """Fallback HTML scraper for Wikipedia Paralympics pages."""
    url = f"https://en.wikipedia.org/wiki/{wiki_title}"
    cache_path = RAW_DIR / f"wiki_para_{wiki_title}.html"
    html = fetch_text(url, cache_path, sleep=WIKI_API_SLEEP)

    soup = BeautifulSoup(html, "lxml")
    athletes: list[dict] = []
    seen_names: set[str] = set()
    current_sport = "unknown"

    skip_headings = {
        "contents", "references", "external links", "see also",
        "notes", "medal count", "bibliography",
    }
    non_person_re = re.compile(
        r"^(United States|USA|IPC|USOC|USOPC)|Games$|Committee$|Federation$|^\d|^[A-Z]{2,4}$"
    )

    content = soup.find("div", {"id": "mw-content-text"})
    if not content:
        return athletes

    for element in content.find_all(["h2", "h3", "h4", "table"]):
        if element.name in ("h2", "h3", "h4"):
            heading = re.sub(r"\[edit\]", "", element.get_text(strip=True)).strip().lower()
            if heading not in skip_headings:
                current_sport = heading
        elif element.name == "table":
            # Skip navigation/info tables (wikitable sortable are result tables)
            table_class = " ".join(element.get("class", []))
            if "navbox" in table_class or "infobox" in table_class:
                continue

            headers_text = [th.get_text(strip=True).lower() for th in element.find_all("th")]
            birthplace_col_idx: Optional[int] = None
            for idx, h in enumerate(headers_text):
                if "birth" in h or "hometown" in h:
                    birthplace_col_idx = idx
                    break

            for row in element.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) < 2:  # Skip single-cell rows (headers etc.)
                    continue

                athlete_name = ""
                athlete_wiki_title = ""
                for cell in cells:
                    a = cell.find("a")
                    if not a or not a.get("href", "").startswith("/wiki/"):
                        continue
                    candidate = a.get_text(strip=True)
                    words = candidate.split()
                    if len(words) < 2:
                        continue
                    if candidate.isupper() or non_person_re.search(candidate):
                        continue
                    athlete_name = candidate
                    athlete_wiki_title = a["href"].replace("/wiki/", "")
                    break

                if not athlete_name or athlete_name in seen_names:
                    continue
                if athlete_name.lower() in ("athlete", "name", "event", "sport"):
                    continue
                seen_names.add(athlete_name)

                inline_hometown = ""
                if birthplace_col_idx is not None and len(cells) > birthplace_col_idx:
                    bp_text = cells[birthplace_col_idx].get_text(strip=True)
                    bp_m = re.search(
                        r"([A-Za-z\s\.\-']+),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", bp_text
                    )
                    if bp_m:
                        city = bp_m.group(1).strip()
                        state = abbrev_state(bp_m.group(2).strip())
                        if len(state) <= 2:
                            inline_hometown = normalize_hometown(city, state)

                athletes.append({
                    "name": athlete_name,
                    "wiki_title": athlete_wiki_title,
                    "inline_hometown": inline_hometown,
                    "sport": current_sport,
                    "year": year,
                })

    print(f"  Wikipedia {wiki_title}: {len(athletes)} athletes (HTML fallback)")
    return athletes


def fetch_wiki_birthplace(wiki_title: str) -> str:
    """
    Query Wikipedia API for an athlete's page and extract birthplace from
    the infobox wikitext. Returns 'City, ST' or '' if not US or not found.

    Common infobox patterns encountered:
      | birth_place = [[Harbor City, California]], U.S.
      | birth_place = [[Reno, Nevada]], U.S.
      | birth_place = [[Cartersville, Georgia|Cartersville]], [[Georgia (U.S. state)|Georgia]], U.S.
      | birth_place = {{birth place|Reno|Nevada|US}}
    """
    if not wiki_title:
        return ""

    cache_path = RAW_DIR / f"wiki_bio_{re.sub(r'[^a-zA-Z0-9_]', '_', wiki_title)}.json"
    if cache_path.exists():
        data = json.loads(cache_path.read_text(encoding="utf-8"))
    else:
        try:
            resp = requests.get(
                WIKI_API,
                params={
                    "action": "query",
                    "titles": wiki_title.replace("_", " "),
                    "prop": "revisions",
                    "rvprop": "content",
                    "rvslots": "main",
                    "format": "json",
                    "redirects": 1,
                },
                headers=HEADERS,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            cache_path.write_text(json.dumps(data), encoding="utf-8")
            time.sleep(WIKI_API_SLEEP)
        except Exception as exc:
            print(f"    Wiki API error for {wiki_title}: {exc}")
            return ""

    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if page.get("ns") != 0:
            continue
        revisions = page.get("revisions", [])
        if not revisions:
            continue
        wikitext = revisions[0].get("slots", {}).get("main", {}).get("*", "")
        if not wikitext:
            wikitext = revisions[0].get("*", "")
        if not wikitext:
            continue

        # Skip disambiguation pages — no infobox
        if "{{hndis" in wikitext or "{{disambiguation" in wikitext.lower():
            continue

        # Only process US birthplaces — must contain "U.S." or ", United States" or US= in template
        is_us = (
            "U.S." in wikitext[:3000]
            or "United States" in wikitext[:3000]
            or "|US}}" in wikitext[:3000]
            or "| US }}" in wikitext[:3000]
        )
        if not is_us:
            continue

        result = _extract_birthplace_from_wikitext(wikitext)
        if result:
            return result

    return ""


def _extract_birthplace_from_wikitext(wikitext: str) -> str:
    """
    Parse a Wikipedia athlete infobox wikitext and return 'City, ST' or ''.

    Checks `| hometown = ...` first (most accurate for Team USA purposes),
    then falls back to `| birth_place = ...`.

    Handles real-world patterns:
      | hometown = [[Clarksville, Maryland]]
      | birth_place = [[Harbor City, California]], U.S.
      | birth_place = {{birth place|Reno|Nevada|US}}
      | birth_place = [[Northlake, Illinois|Northlake]], [[Illinois]], U.S.
    """
    # Try hometown field first — most aligned with D8 (Team USA listed hometown)
    ht = _parse_location_field(wikitext, r"hometown")
    if ht:
        return ht

    # Fall back to birth_place (birthplace proxy)
    bp = _parse_location_field(wikitext, r"birth[_ ]?place")
    if bp:
        return bp

    return ""


def _parse_location_field(wikitext: str, field_re: str) -> str:
    """
    Extract city+state from a wikitext infobox field matching field_re.
    Returns 'City, ST' (US only) or ''.
    """
    prefix = rf"\|\s*{field_re}\s*="

    # Pattern 1: {{birth place|City|State|...}} template
    m = re.search(
        prefix + r"\s*\{\{[Bb]irth[_ ]?[Pp]lace\s*\|\s*([^|}\n]+?)\s*\|\s*([^|}\n]+?)\s*[|}]",
        wikitext,
    )
    if m:
        city = m.group(1).strip().strip("[]")
        state = abbrev_state(m.group(2).strip().strip("[]"))
        if city and state:
            return normalize_hometown(city, state)

    # Pattern 2: | field = [[City, State]], ... (entire "City, State" as one wikilink)
    m = re.search(
        prefix + r"\s*\[\[([^|\]]+),\s*([^\]]+)\]\]",
        wikitext,
        re.IGNORECASE,
    )
    if m:
        city = m.group(1).strip()
        state = abbrev_state(m.group(2).strip().split(",")[0].strip())
        if city and state:
            return normalize_hometown(city, state)

    # Pattern 3: | field = [[City|Display]], [[State (qualifier)|State]], ...
    m = re.search(
        prefix + r"\s*\[\[([^|\]]+?)(?:\|[^\]]+)?\]\],?\s*\[\[([^\]|]+?)(?:\s*\([^)]*\))?(?:\|[^\]]+)?\]\]",
        wikitext,
        re.IGNORECASE,
    )
    if m:
        city_raw = m.group(1).strip()
        if "," not in city_raw:
            state = abbrev_state(m.group(2).strip())
            if city_raw and state:
                return normalize_hometown(city_raw, state)

    # Pattern 4: | field = City, State, U.S. (plain text, no wikilinks)
    m = re.search(
        prefix + r"\s*([A-Z][^\[|\n,]+?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*U\.S\.",
        wikitext,
        re.IGNORECASE,
    )
    if m:
        city = re.sub(r"\[|\]", "", m.group(1)).strip()
        state = abbrev_state(re.sub(r"\[|\]", "", m.group(2)).strip())
        if city and state:
            return normalize_hometown(city, state)

    return ""


def build_paralympic_historical(
    pages: list[tuple[int, str, str]],
) -> list[dict]:
    """
    For each Wikipedia Paralympics page: collect athlete names, look up birthplace.
    """
    records: list[dict] = []

    for year, _season, wiki_title in pages:
        print(f"\n  === {year} Paralympic Wikipedia ({wiki_title}) ===")
        athletes = scrape_wiki_para_athletes(wiki_title, year)

        resolved = 0
        inline_used = 0

        for i, ath in enumerate(athletes, 1):
            # Prefer inline birthplace from table (e.g. Para Ice Hockey rosters)
            if ath["inline_hometown"]:
                hometown = ath["inline_hometown"]
                resolved += 1
                inline_used += 1
            else:
                hometown = fetch_wiki_birthplace(ath["wiki_title"])
                if hometown:
                    resolved += 1

            records.append({
                "name": ath["name"],
                "hometown_string": hometown,
                "sport": ath["sport"],
                "year": year,
                "olympic_or_paralympic": "paralympic",
                "hometown_source": "birthplace",
            })

            if i % 50 == 0:
                print(f"    [{i}/{len(athletes)}] resolved={resolved} (inline={inline_used})")

        print(f"  {year} Paralympic: {resolved}/{len(athletes)} hometowns found")

    return records


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    all_records: list[dict] = []

    # --- 2024 Olympic ---
    print("\n--- OLYMPIC 2024 (USOPC Excel) ---")
    cache_path = RAW_DIR / "usopc_2024_olympic_roster.xlsx"
    data = fetch_bytes(OLYMPIC_EXCEL_URL, cache_path)
    olympic_2024 = parse_olympic_excel(data)
    print(f"  Extracted {len(olympic_2024)} records")
    all_records.extend(olympic_2024)

    # --- 2024 Paralympic ---
    print("\n--- PARALYMPIC 2024 (teamusa.com API) ---")
    para_2024 = fetch_paralympic_2024_api()
    print(f"  Extracted {len(para_2024)} records")
    all_records.extend(para_2024)

    # --- Olympic 2016–2022 (Olympedia) ---
    print("\n--- OLYMPIC 2016–2022 (Olympedia) ---")
    olympic_hist = build_olympic_historical(OLYMPEDIA_EDITIONS)
    all_records.extend(olympic_hist)

    # --- Paralympic 2016–2022 (Wikipedia) ---
    print("\n--- PARALYMPIC 2016–2022 (Wikipedia) ---")
    para_hist = build_paralympic_historical(WIKIPEDIA_PARA_PAGES)
    all_records.extend(para_hist)

    # --- Assemble ---
    df = pd.DataFrame(all_records)
    if df.empty:
        print("\nNo records extracted.")
        return

    print(f"\n{'='*60}")
    print(f"TOTAL: {len(df)} records across {df['year'].nunique()} game years")
    for year in sorted(df["year"].unique()):
        sub = df[df["year"] == year]
        o = (sub["olympic_or_paralympic"] == "olympic").sum()
        p = (sub["olympic_or_paralympic"] == "paralympic").sum()
        ht_miss = (sub["hometown_string"] == "").sum()
        print(f"  {year}: {o} Olympic + {p} Paralympic = {len(sub)} total | missing hometown: {ht_miss}")

    missing = df[df["hometown_string"] == ""]
    pct = 100 * len(missing) / max(len(df), 1)
    print(f"\nOverall missing hometown: {len(missing)} ({pct:.1f}%)")

    # --- Save 2024-only CSV (backward compat with 02_geocode.py) ---
    df_2024 = df[df["year"] == 2024].drop(columns=["hometown_source"])
    out_2024 = PROCESSED_DIR / "athletes_2024_raw.csv"
    df_2024.to_csv(out_2024, index=False)
    print(f"\nSaved 2024-only: {out_2024}  ({len(df_2024)} rows)")

    # --- Save all-games CSV (for task 1.8 aggregation) ---
    out_all = PROCESSED_DIR / "athletes_allgames_raw.csv"
    df.to_csv(out_all, index=False)
    print(f"Saved all-games:  {out_all}  ({len(df)} rows)")
    print("Next: run 02_geocode.py (2024) or wait for task 1.8 to geocode all-games.")


if __name__ == "__main__":
    main()
