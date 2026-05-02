"""
05_population.py — ACS 5-year county population for per-capita normalization.

Input:  Census API (B01003_001E — total population)
        ACS 5-Year Estimates, 2019–2023 release (most recent stable)

Output: backend/data/processed/county_population.parquet
        Columns: fips (str, zero-padded 5-digit), population (int)

Per-capita normalization (D3) requires this.  Bayesian shrinkage alpha=50K
is applied in 07_aggregate.py — this script just pulls and validates raw counts.

Exits non-zero if >5% of counties are missing or if the API call fails entirely.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_PARQUET = PROCESSED_DIR / "county_population.parquet"

# ACS 5-year B01003_001E = total population, all US counties
ACS_URL = "https://api.census.gov/data/2023/acs/acs5"
ACS_VARIABLE = "B01003_001E"

# ~3,143 US counties + equivalents; flag if we get substantially fewer
MIN_EXPECTED_COUNTIES = 3_000
MAX_MISSING_PCT = 0.05


def fetch_acs_population(api_key: str | None) -> pd.DataFrame:
    params: dict[str, str] = {
        "get": f"NAME,{ACS_VARIABLE}",
        "for": "county:*",
        "in": "state:*",
    }
    if api_key:
        params["key"] = api_key

    log.info("Fetching ACS 5-year population from Census API...")
    resp = requests.get(ACS_URL, params=params, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    # First row is header
    headers = data[0]
    rows = data[1:]
    log.info("Received %d county rows from ACS API", len(rows))

    df = pd.DataFrame(rows, columns=headers)
    # Build 5-digit FIPS from state + county FIPS parts
    df["fips"] = df["state"].str.zfill(2) + df["county"].str.zfill(3)
    df["population"] = pd.to_numeric(df[ACS_VARIABLE], errors="coerce").astype("Int64")

    # Drop rows where population is null or ≤0 (Puerto Rico / territories can appear)
    n_before = len(df)
    df = df[df["population"] > 0].copy()
    n_dropped = n_before - len(df)
    if n_dropped:
        log.warning("Dropped %d rows with null/zero population", n_dropped)

    return df[["fips", "population"]].reset_index(drop=True)


def validate(df: pd.DataFrame) -> None:
    n = len(df)
    if n < MIN_EXPECTED_COUNTIES:
        log.error(
            "Only %d counties returned — expected ≥%d. Check API key or response.",
            n,
            MIN_EXPECTED_COUNTIES,
        )
        sys.exit(1)

    n_missing = df["population"].isna().sum()
    pct_missing = n_missing / n if n else 1.0
    if pct_missing > MAX_MISSING_PCT:
        log.error(
            "%.1f%% counties have missing population — above %.0f%% threshold.",
            100 * pct_missing,
            100 * MAX_MISSING_PCT,
        )
        sys.exit(1)

    log.info(
        "Validation passed: %d counties, median pop %s, missing %.1f%%",
        n,
        f"{int(df['population'].median()):,}",
        100 * pct_missing,
    )


def main() -> None:
    api_key = os.environ.get("CENSUS_API_KEY")
    if not api_key:
        log.warning(
            "CENSUS_API_KEY not set — unauthenticated requests are rate-limited to 500/day. "
            "Get a free key at https://api.census.gov/data/key_signup.html"
        )

    df = fetch_acs_population(api_key)
    validate(df)

    df.to_parquet(OUTPUT_PARQUET, index=False)
    log.info("Saved: %s  (%d rows)", OUTPUT_PARQUET, len(df))
    log.info("Next: 03_zip_crosswalk.py / 04_climate.py / 07_aggregate.py")


if __name__ == "__main__":
    main()
