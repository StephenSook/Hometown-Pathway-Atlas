"""
01_athletes.py — Build 2024 Team USA athlete dataset with hometowns.

Olympic:    USOPC official Excel roster (recognized hometowns)
Paralympic: teamusa.com JSON API (paginated, 70 per page)

Output: backend/data/processed/athletes_2024_raw.csv
Columns: name, hometown_string, sport, year, olympic_or_paralympic

Names stay attached at this stage. Drop them in 02_geocode.py after FIPS lookup.
"""

import json
import re
import time
import warnings
from io import BytesIO
from pathlib import Path

import pandas as pd
import requests

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


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def fetch_bytes(url: str, cache_path: Path) -> bytes:
    """Download url to cache_path on first call; return cached bytes on subsequent calls."""
    if cache_path.exists():
        print(f"  [cache] {cache_path.name}")
        return cache_path.read_bytes()
    print(f"  [fetch] {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    cache_path.write_bytes(resp.content)
    time.sleep(0.5)
    return resp.content


def normalize_hometown(city: str, state: str = "") -> str:
    """Return 'City, ST' string. Strips parentheticals and nan placeholders."""
    city = str(city).strip() if city and str(city).lower() not in ("nan", "none", "") else ""
    state = str(state).strip() if state and str(state).lower() not in ("nan", "none", "") else ""
    city = re.sub(r"\s*\(.*?\)", "", city).strip(" ,;.")
    if city and state:
        return f"{city}, {state}"
    return city or state


# ---------------------------------------------------------------------------
# Olympic — USOPC Excel
# ---------------------------------------------------------------------------

def parse_olympic_excel(data: bytes) -> list[dict]:
    """
    Row 0: merged title. Row 1: real headers.
    Columns: First Name | Last Name | Sport | Hometown City | Hometown State | Gender | Event
    """
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
        })
    return records


# ---------------------------------------------------------------------------
# Paralympic — teamusa.com JSON API
# ---------------------------------------------------------------------------

def fetch_paralympic_api() -> list[dict]:
    """
    Paginate teamusa.com /api/athletes filtered to Paris 2024 Paralympians.
    Stops when a page returns fewer than 70 entries (last page).
    Deduplicates by uid in case the same athlete appears across pages.
    Each page cached as JSON in data/raw/.
    """
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

            # hometown nested at bio.quick_facts.hometown
            ht = (
                entry.get("bio", {})
                     .get("quick_facts", {})
                     .get("hometown", {})
            )
            hometown = normalize_hometown(
                ht.get("city", ""),
                ht.get("state", ""),
            )

            # sport is a list — take first title, strip "Para " prefix for consistency
            sports = entry.get("sport", [])
            sport = sports[0].get("title", "unknown").strip().lower() if sports else "unknown"
            sport = re.sub(r"^para\s+", "", sport)  # "para swimming" -> "swimming"

            records.append({
                "name": name,
                "hometown_string": hometown,
                "sport": sport,
                "year": 2024,
                "olympic_or_paralympic": "paralympic",
            })

        print(f"  Page {page}: {len(entries)} entries, {len(records)} total so far")

        if len(entries) < 70:
            break

        skip += 70
        page += 1

    return records


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    """Fetch Olympic + Paralympic 2024 rosters and write athletes_2024_raw.csv."""
    all_records: list[dict] = []

    # --- Olympic ---
    print("\n--- OLYMPIC 2024 (USOPC Excel) ---")
    cache_path = RAW_DIR / "usopc_2024_olympic_roster.xlsx"
    data = fetch_bytes(OLYMPIC_EXCEL_URL, cache_path)
    olympic_records = parse_olympic_excel(data)
    print(f"  Extracted {len(olympic_records)} Olympic records")
    all_records.extend(olympic_records)

    # --- Paralympic ---
    print("\n--- PARALYMPIC 2024 (teamusa.com API) ---")
    para_records = fetch_paralympic_api()
    print(f"  Extracted {len(para_records)} Paralympic records")
    all_records.extend(para_records)

    # --- Summary ---
    df = pd.DataFrame(all_records)
    if df.empty:
        print("\nNo records extracted.")
        return

    print(f"\nTotal records: {len(df)}")
    print(f"  Olympic:    {len(df[df.olympic_or_paralympic == 'olympic'])}")
    print(f"  Paralympic: {len(df[df.olympic_or_paralympic == 'paralympic'])}")

    missing = df[df.hometown_string == ""]
    pct = 100 * len(missing) / max(len(df), 1)
    print(f"  Missing hometown: {len(missing)} ({pct:.1f}%)")
    if 0 < len(missing) <= 30:
        print(missing[["name", "sport"]].to_string(index=False))

    out_path = PROCESSED_DIR / "athletes_2024_raw.csv"
    df.to_csv(out_path, index=False)
    print(f"\nSaved: {out_path}")
    print("Next step: run 02_geocode.py (drops name column after FIPS lookup)")


if __name__ == "__main__":
    main()
