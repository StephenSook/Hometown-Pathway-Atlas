"""
02_geocode.py — Resolve hometown_string → FIPS county code.

Input:  backend/data/processed/athletes_2024_raw.csv
        (columns: name, hometown_string, sport, year, olympic_or_paralympic)

Output: backend/data/processed/athletes_2024_geocoded.parquet
        (columns: fips, sport, year, olympic_or_paralympic — name DROPPED here per D5)

Strategy per unique city (in order):
  1. Manual overrides — known problem cities (NYC boroughs, VA independent cities, etc.)
  2. Nominatim (OSM) forward geocode → lat/lon
  3. Census reverse geocoder → county FIPS from lat/lon
  Results cached to geocode_cache/city_fips_cache.json — re-runs skip API calls.

Success target: >=95% FIPS resolution. Exits non-zero if below threshold.

D5: athlete names dropped immediately after FIPS join. Never written to output parquet.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
CACHE_DIR = ROOT / "data" / "raw" / "geocode_cache"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

INPUT_CSV = PROCESSED_DIR / "athletes_2024_raw.csv"
OUTPUT_PARQUET = PROCESSED_DIR / "athletes_2024_geocoded.parquet"
FIPS_CACHE_JSON = CACHE_DIR / "city_fips_cache.json"

SUCCESS_THRESHOLD = 0.95

NOMINATIM_UA = "HomepathwayAtlas/1.0 research binepzai2004@gmail.com"

# ---------------------------------------------------------------------------
# Manual overrides — cities with known API mismatches or independent city FIPS
# "City, ST" → 5-digit FIPS string
# ---------------------------------------------------------------------------

MANUAL_OVERRIDES: dict[str, str] = {
    # NYC boroughs — Nominatim often resolves to Manhattan; override to correct county
    "New York, NY": "36061",
    "New York City, NY": "36061",
    "Brooklyn, NY": "36047",
    "Queens, NY": "36081",
    "Bronx, NY": "36005",
    "Staten Island, NY": "36085",
    # Virginia independent cities (no county parent — they ARE their own FIPS)
    "Alexandria, VA": "51510",
    "Chesapeake, VA": "51550",
    "Norfolk, VA": "51710",
    "Richmond, VA": "51760",
    "Virginia Beach, VA": "51810",
    "Hampton, VA": "51650",
    "Newport News, VA": "51700",
    "Portsmouth, VA": "51740",
    "Roanoke, VA": "51770",
    "Suffolk, VA": "51800",
    # Other independent cities
    "Baltimore, MD": "24510",
    "St. Louis, MO": "29510",
    # DC
    "Washington, DC": "11001",
    "Washington D.C., DC": "11001",
    # Hawaii / Alaska
    "Honolulu, HI": "15003",
    "Anchorage, AK": "02020",
}

# Full state name → 2-letter abbreviation
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

# 2-letter abbreviation → full state name (for Nominatim queries)
ABBR_STATE = {v: k for k, v in STATE_ABBR.items()}

# ---------------------------------------------------------------------------
# Persistent FIPS cache
# ---------------------------------------------------------------------------

def load_cache() -> dict[str, Optional[str]]:
    if FIPS_CACHE_JSON.exists():
        return json.loads(FIPS_CACHE_JSON.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, Optional[str]]) -> None:
    FIPS_CACHE_JSON.write_text(json.dumps(cache, indent=2, sort_keys=True), encoding="utf-8")


# ---------------------------------------------------------------------------
# Parse "City, ST" string
# ---------------------------------------------------------------------------

def parse_hometown(s: str) -> tuple[str, str]:
    """Return (city, state_abbr) from 'City, ST'. Returns ('', '') if unparseable."""
    s = s.strip()
    if not s:
        return "", ""
    parts = [p.strip() for p in s.rsplit(",", 1)]
    if len(parts) != 2:
        return s, ""
    city, state_raw = parts
    state = STATE_ABBR.get(state_raw, state_raw.upper())
    return city, state


# ---------------------------------------------------------------------------
# Step 1: Nominatim forward geocode → (lat, lon)
# Nominatim ToS: 1 req/sec max, identify yourself via User-Agent
# ---------------------------------------------------------------------------

def nominatim_latlon(city: str, state_abbr: str) -> Optional[tuple[float, float]]:
    """Return (lat, lon) for a city, or None on failure."""
    state_full = ABBR_STATE.get(state_abbr, state_abbr)
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "city": city,
                "state": state_full,
                "country": "USA",
                "format": "json",
                "limit": 1,
            },
            headers={"User-Agent": NOMINATIM_UA},
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as exc:
        log.debug("Nominatim failed %s, %s: %s", city, state_abbr, exc)
    return None


# ---------------------------------------------------------------------------
# Step 2: Census reverse geocoder → county FIPS from lat/lon
# ---------------------------------------------------------------------------

CENSUS_REVERSE_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"


def census_reverse_fips(lat: float, lon: float) -> Optional[str]:
    """Return 5-digit county FIPS for a lat/lon point, or None."""
    try:
        resp = requests.get(
            CENSUS_REVERSE_URL,
            params={
                "x": str(lon),
                "y": str(lat),
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
                "format": "json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        counties = (
            resp.json()
            .get("result", {})
            .get("geographies", {})
            .get("Counties", [])
        )
        if counties:
            geoid = counties[0].get("GEOID", "")
            if len(geoid) == 5:
                return geoid
    except Exception as exc:
        log.debug("Census reverse failed lat=%s lon=%s: %s", lat, lon, exc)
    return None


# ---------------------------------------------------------------------------
# Core resolution loop
# ---------------------------------------------------------------------------

def resolve_one(city: str, state_abbr: str) -> Optional[str]:
    """Nominatim → Census reverse. Returns FIPS or None."""
    latlon = nominatim_latlon(city, state_abbr)
    if latlon is None:
        return None
    time.sleep(0.15)  # Census politeness
    return census_reverse_fips(*latlon)


def geocode_all(df: pd.DataFrame, cache: dict[str, Optional[str]]) -> dict[str, Optional[str]]:
    unique = [h for h in df["hometown_string"].dropna().unique() if h]
    log.info("Unique hometowns: %d", len(unique))

    # Apply manual overrides (no API call)
    for key, fips in MANUAL_OVERRIDES.items():
        cache[key] = fips

    to_lookup = [h for h in unique if h not in cache]
    log.info("  Cached/overridden: %d | Need lookup: %d", len(unique) - len(to_lookup), len(to_lookup))

    resolved = 0
    for i, hometown in enumerate(to_lookup, 1):
        city, state = parse_hometown(hometown)
        if not city or not state:
            log.warning("  [%d/%d] Unparseable: %r", i, len(to_lookup), hometown)
            cache[hometown] = None
            continue

        fips = resolve_one(city, state)
        cache[hometown] = fips

        if fips:
            resolved += 1
            log.info("  [%d/%d] %-35s -> %s", i, len(to_lookup), hometown, fips)
        else:
            log.warning("  [%d/%d] MISS: %s", i, len(to_lookup), hometown)

        # Nominatim ToS: max 1 req/sec; we're doing 2 requests per city so sleep here
        time.sleep(1.1)

        # Save cache every 50 entries so progress survives interruption
        if i % 50 == 0:
            save_cache(cache)
            log.info("  Progress save at %d entries", i)

    log.info("Resolved: %d / %d new lookups", resolved, len(to_lookup))
    return cache


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not INPUT_CSV.exists():
        log.error("Input not found: %s — run 01_athletes.py first.", INPUT_CSV)
        sys.exit(1)

    df = pd.read_csv(INPUT_CSV, dtype=str).fillna("")
    log.info(
        "Loaded %d records (%d olympic, %d paralympic)",
        len(df),
        (df["olympic_or_paralympic"] == "olympic").sum(),
        (df["olympic_or_paralympic"] == "paralympic").sum(),
    )

    cache = load_cache()
    cache = geocode_all(df, cache)
    save_cache(cache)

    # Join FIPS and drop name + hometown immediately (D5 — NIL compliance)
    df["fips"] = df["hometown_string"].map(cache)
    df = df.drop(columns=["name", "hometown_string"], errors="ignore")

    total = len(df)
    n_resolved = df["fips"].notna().sum()
    pct = n_resolved / total if total else 0

    log.info("Resolution: %d / %d (%.1f%%)", n_resolved, total, 100 * pct)

    missing = df[df["fips"].isna()]
    if not missing.empty:
        log.warning("Unresolved %d rows by group:", len(missing))
        for sport, count in missing["sport"].value_counts().head(10).items():
            log.warning("  %-30s  %d missing", sport, count)

    out = df[df["fips"].notna()].copy()
    out["fips"] = out["fips"].str.strip().str.zfill(5)
    out = out[["fips", "sport", "year", "olympic_or_paralympic"]]
    out.to_parquet(OUTPUT_PARQUET, index=False)
    log.info("Saved: %s  (%d rows)", OUTPUT_PARQUET, len(out))

    if pct < SUCCESS_THRESHOLD:
        log.error(
            "%.1f%% resolution is below %.0f%% threshold — escalate before continuing.",
            100 * pct,
            100 * SUCCESS_THRESHOLD,
        )
        sys.exit(1)

    log.info(
        "GO — resolution above threshold. Next: 03_zip_crosswalk.py / 04_climate.py / 05_population.py"
    )


if __name__ == "__main__":
    main()
