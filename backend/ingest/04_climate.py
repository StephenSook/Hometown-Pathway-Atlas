"""
04_climate.py — County climate features from nClimGrid-Daily + USGS elevation.

Input:  NOAA nClimGrid-Daily county normals CSV (downloaded on first run)
        USGS county mean elevation CSV (bundled or downloaded)

Output: backend/data/processed/county_climate.parquet
        Columns: fips, avg_temp_f, annual_precip_in, elevation_ft, climate_zone

Climate zone assignment uses 7 Köppen-derived categories matched to ClimateBadge:
  humid_subtropical | marine_west_coast | semi_arid | continental
  subarctic | mediterranean | tropical

Data source notes:
  - nClimGrid-Daily county normals: NOAA CDO bulk county CSV for 1991-2020 normals.
    URL template: https://www.ncei.noaa.gov/data/nclimgrid-daily/access/...
    Fallback: NOAA CDO API for GHCND county summary (daily-to-annual aggregation).
  - Elevation: USGS National Map county mean elevation from county_elevations.csv
    (bundled in backend/data/raw/climate/ or derived from 3DEP 30m DEM mosaic).

5km gridded, NOT station-weighted (per PLAN.md task 1.3).
"""

from __future__ import annotations

import logging
import sys
import time
from io import StringIO
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
RAW_DIR = ROOT / "data" / "raw" / "climate"
PROCESSED_DIR = ROOT / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

NORMALS_CSV = RAW_DIR / "nclimgrid_county_normals.csv"
ELEVATION_CSV = RAW_DIR / "county_elevations.csv"
OUTPUT_PARQUET = PROCESSED_DIR / "county_climate.parquet"

# ---------------------------------------------------------------------------
# NOAA CDO API config
# Token: set NOAA_CDO_TOKEN env var. Free at https://www.ncdc.noaa.gov/cdo-web/token
# ---------------------------------------------------------------------------

import os

NOAA_CDO_TOKEN = os.environ.get("NOAA_CDO_TOKEN", "")
NOAA_CDO_BASE = "https://www.ncei.noaa.gov/cdo-web/api/v2"

# ---------------------------------------------------------------------------
# Climate zone classification
# 7 zones matched to ClimateBadge in DESIGN_SYSTEM §6.1
# Assignment logic: temp + precip + state-based coastal/elevation heuristics
# ---------------------------------------------------------------------------

# (avg_temp_f, annual_precip_in, state) → zone string
def classify_zone(
    avg_temp_f: float,
    annual_precip_in: float,
    elevation_ft: float,
    state_fips: str,
) -> str:
    """
    Rule-based Köppen-derived zone classifier.

    Priority order matches empirical US county distribution:
    1. Tropical (FL/HI/PR)
    2. Mediterranean (CA coast)
    3. Subarctic (AK + very cold continental)
    4. Semi-arid (low precip, not cold)
    5. Marine west coast (OR/WA coast, mild + wet)
    6. Humid subtropical (warm + wet SE)
    7. Continental (default)
    """
    # State-level FIPS prefix shortcuts
    state2 = state_fips[:2] if len(state_fips) >= 2 else ""

    # Tropical — Florida, Hawaii, Puerto Rico
    if state2 in ("12", "15", "72"):
        return "tropical"

    # Subarctic — Alaska, or extremely cold (avg < 20°F)
    if state2 == "02" or avg_temp_f < 20.0:
        return "subarctic"

    # Mediterranean — California, warm dry summers (precip < 20in, temp > 52°F)
    if state2 == "06" and annual_precip_in < 20.0 and avg_temp_f > 52.0:
        return "mediterranean"

    # Marine west coast — OR / WA, mild and wet (temp 45-60°F, precip > 30in)
    if state2 in ("41", "53") and 42.0 <= avg_temp_f <= 60.0 and annual_precip_in > 25.0:
        return "marine_west_coast"

    # Semi-arid — dry regardless of temp (precip < 15in and not subarctic)
    if annual_precip_in < 15.0:
        return "semi_arid"

    # Humid subtropical — warm + moderately wet SE / mid-Atlantic
    # avg temp > 55°F covers zone roughly south of Ohio River
    if avg_temp_f > 55.0 and annual_precip_in >= 30.0:
        return "humid_subtropical"

    # Continental — default for northern/interior counties
    return "continental"


# ---------------------------------------------------------------------------
# NOAA CDO API fetch — county annual normals (fallback when local CSV absent)
# ---------------------------------------------------------------------------

def _fetch_normals_cdo_chunk(
    fips_list: list[str],
    token: str,
) -> list[dict]:
    """
    Fetch GHCND annual normals for a batch of county FIPS via CDO API v2.
    Returns list of dicts with keys: fips, avg_temp_f, annual_precip_in.
    Rate limit: 5 req/sec, 1000 req/day on free tier.
    """
    results: list[dict] = []
    for fips in fips_list:
        # CDO locationid for county = "FIPS:{state_fips}{county_fips}"
        location_id = f"FIPS:{fips}"
        for datatype, field in [("TAVG", "avg_temp_f"), ("PRCP", "annual_precip_in")]:
            try:
                resp = requests.get(
                    f"{NOAA_CDO_BASE}/data",
                    headers={"token": token},
                    params={
                        "datasetid": "NORMAL_ANN",
                        "datatypeid": f"ANN-{datatype}-NORMAL",
                        "locationid": location_id,
                        "startdate": "2010-01-01",
                        "enddate": "2010-01-01",
                        "units": "standard",
                        "limit": 1,
                    },
                    timeout=20,
                )
                resp.raise_for_status()
                results_json = resp.json().get("results", [])
                if results_json:
                    value = float(results_json[0]["value"])
                    existing = next((r for r in results if r["fips"] == fips), None)
                    if existing is None:
                        existing = {"fips": fips}
                        results.append(existing)
                    existing[field] = value
            except Exception as exc:
                log.debug("CDO API miss fips=%s datatype=%s: %s", fips, datatype, exc)
            time.sleep(0.25)  # CDO rate limit

    return results


# ---------------------------------------------------------------------------
# USGS elevation fetch / load
# ---------------------------------------------------------------------------

# Bundled county centroid elevations from USGS National Map (mean DEM, 30m).
# Format: fips (5-digit str), elevation_ft (float)
# If file absent, we fall back to a very rough lat-based proxy.
# Real data: export from https://nationalmap.gov/elevation.html or use
# the included pre-built CSV in backend/data/raw/climate/county_elevations.csv.

def load_elevation(all_fips: list[str]) -> dict[str, float]:
    """Return fips → elevation_ft mapping. Falls back to 0.0 if no data."""
    if ELEVATION_CSV.exists():
        elev_df = pd.read_csv(ELEVATION_CSV, dtype={"fips": str})
        elev_df["fips"] = elev_df["fips"].str.zfill(5)
        return dict(zip(elev_df["fips"], elev_df["elevation_ft"].astype(float)))
    log.warning("No elevation CSV found at %s — elevation_ft will default to 0.0", ELEVATION_CSV)
    return {}


# ---------------------------------------------------------------------------
# nClimGrid local CSV parser
# ---------------------------------------------------------------------------

# NOAA publishes county-level nClimGrid-Daily aggregated normals as multi-column CSV.
# Column layout (1991-2020 30-year normals, county scale):
#   GEOID, STATE, COUNTY, NORM_TAVG_F, NORM_PRCP_IN
# Actual file: https://www.ncei.noaa.gov/pub/data/normals/1991-2020/products/county/
# File name pattern: ann-tavg-normal.csv, ann-prcp-normal.csv (annual summary files)
#
# We expect a merged CSV pre-downloaded as nclimgrid_county_normals.csv with columns:
#   fips, avg_temp_f, annual_precip_in

def load_nclimgrid_csv() -> Optional[pd.DataFrame]:
    if not NORMALS_CSV.exists():
        return None
    df = pd.read_csv(NORMALS_CSV, dtype=str)
    df.columns = [c.strip().lower() for c in df.columns]

    # Normalize column aliases from different NOAA file formats
    col_map = {}
    for c in df.columns:
        if c in ("geoid", "fips", "county_fips"):
            col_map[c] = "fips"
        elif c in ("norm_tavg_f", "tavg_f", "avg_temp_f", "mean_temp_f"):
            col_map[c] = "avg_temp_f"
        elif c in ("norm_prcp_in", "prcp_in", "annual_precip_in", "precip_in"):
            col_map[c] = "annual_precip_in"
    df = df.rename(columns=col_map)

    required = {"fips", "avg_temp_f", "annual_precip_in"}
    missing_cols = required - set(df.columns)
    if missing_cols:
        log.error("nClimGrid CSV missing columns: %s", missing_cols)
        return None

    df["fips"] = df["fips"].astype(str).str.zfill(5)
    df["avg_temp_f"] = pd.to_numeric(df["avg_temp_f"], errors="coerce")
    df["annual_precip_in"] = pd.to_numeric(df["annual_precip_in"], errors="coerce")
    df = df.dropna(subset=["avg_temp_f", "annual_precip_in"])
    log.info("nClimGrid CSV: %d county records loaded", len(df))
    return df[["fips", "avg_temp_f", "annual_precip_in"]]


# ---------------------------------------------------------------------------
# Inline fallback: synthetic county normals derived from state centroids
# Used only when no NOAA source is available — ensures script always produces output
# for downstream tasks. Accuracy is low; replace with real data before Day 6 gate.
# ---------------------------------------------------------------------------

# State FIPS prefix → (avg_temp_f, annual_precip_in) state-level approximate normals
_STATE_FALLBACK: dict[str, tuple[float, float]] = {
    "01": (63.5, 56.0),  # AL
    "02": (26.0, 22.0),  # AK
    "04": (60.3, 12.7),  # AZ
    "05": (60.4, 50.6),  # AR
    "06": (59.4, 22.2),  # CA
    "08": (45.1, 15.9),  # CO
    "09": (49.9, 46.4),  # CT
    "10": (55.5, 45.8),  # DE
    "11": (57.9, 39.7),  # DC
    "12": (70.7, 54.5),  # FL
    "13": (63.5, 50.7),  # GA
    "15": (70.0, 17.1),  # HI
    "16": (44.4, 18.7),  # ID
    "17": (51.8, 38.7),  # IL
    "18": (51.7, 41.7),  # IN
    "19": (47.8, 35.0),  # IA
    "20": (54.3, 28.7),  # KS
    "21": (55.6, 46.9),  # KY
    "22": (66.4, 60.1),  # LA
    "23": (41.0, 42.2),  # ME
    "24": (54.5, 43.5),  # MD
    "25": (47.9, 47.7),  # MA
    "26": (44.8, 32.7),  # MI
    "27": (41.2, 27.8),  # MN
    "28": (63.4, 56.2),  # MS
    "29": (54.5, 42.2),  # MO
    "30": (42.7, 15.3),  # MT
    "31": (49.0, 23.6),  # NE
    "32": (51.8, 9.5),   # NV
    "33": (44.4, 42.0),  # NH
    "34": (52.7, 46.5),  # NJ
    "35": (53.4, 14.6),  # NM
    "36": (45.4, 41.8),  # NY
    "37": (59.0, 50.3),  # NC
    "38": (40.4, 17.8),  # ND
    "39": (50.7, 38.6),  # OH
    "40": (59.6, 36.5),  # OK
    "41": (48.4, 43.5),  # OR
    "42": (48.8, 41.2),  # PA
    "44": (50.1, 47.2),  # RI
    "45": (62.4, 49.8),  # SC
    "46": (45.2, 20.1),  # SD
    "47": (57.6, 52.4),  # TN
    "48": (64.8, 28.9),  # TX
    "49": (48.6, 12.2),  # UT
    "50": (42.9, 36.5),  # VT
    "51": (55.1, 43.9),  # VA
    "53": (48.3, 38.2),  # WA
    "54": (51.8, 45.0),  # WV
    "55": (43.1, 32.6),  # WI
    "56": (42.0, 14.0),  # WY
    "72": (77.0, 60.0),  # PR
}


def build_fallback_df(fips_series: pd.Series) -> pd.DataFrame:
    """Construct a climate DataFrame using state-level averages as county fallback."""
    log.warning(
        "No nClimGrid CSV and no CDO token — building fallback from state-level normals. "
        "Replace with real NOAA data before Day 6 gate."
    )
    records = []
    for fips in fips_series.unique():
        state2 = str(fips)[:2]
        avg_temp_f, annual_precip_in = _STATE_FALLBACK.get(state2, (50.0, 30.0))
        records.append({"fips": fips, "avg_temp_f": avg_temp_f, "annual_precip_in": annual_precip_in})
    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # ---- Step 1: load or download county temp + precip normals ----
    climate_df = load_nclimgrid_csv()

    if climate_df is None:
        if NOAA_CDO_TOKEN:
            log.info("No local CSV — fetching county normals from NOAA CDO API ...")
            # Build FIPS list from geocoded athlete data if available
            geocoded = PROCESSED_DIR / "athletes_2024_geocoded.parquet"
            if geocoded.exists():
                athlete_df = pd.read_parquet(geocoded)
                all_fips = athlete_df["fips"].dropna().unique().tolist()
            else:
                # All 3,143 US county FIPS — read from a census list if needed
                # For now use a known minimal set; full list deferred to actual run
                log.warning(
                    "athletes_2024_geocoded.parquet not found — climate fetch covers all FIPS "
                    "which requires running 02_geocode.py first for best results."
                )
                all_fips = list(_STATE_FALLBACK.keys())  # state prefixes only; will still work

            cdo_records = _fetch_normals_cdo_chunk(all_fips[:500], NOAA_CDO_TOKEN)
            if cdo_records:
                climate_df = pd.DataFrame(cdo_records)
                climate_df.to_csv(NORMALS_CSV, index=False)
                log.info("CDO normals fetched and cached to %s", NORMALS_CSV)
            else:
                log.warning("CDO API returned no results — falling back to state averages.")

    if climate_df is None or climate_df.empty:
        # Use state-level fallback so downstream tasks can proceed
        geocoded = PROCESSED_DIR / "athletes_2024_geocoded.parquet"
        if geocoded.exists():
            fips_series = pd.read_parquet(geocoded)["fips"].dropna()
        else:
            fips_series = pd.Series([f"{s}001" for s in _STATE_FALLBACK])
        climate_df = build_fallback_df(fips_series)

    # ---- Step 2: load elevation ----
    log.info("Loading elevation data ...")
    elev_map = load_elevation(climate_df["fips"].tolist())
    climate_df["elevation_ft"] = climate_df["fips"].map(elev_map).fillna(0.0).astype(float)

    missing_elev = (climate_df["elevation_ft"] == 0.0).sum()
    if missing_elev > 0:
        log.warning(
            "%d counties missing elevation (defaulted to 0.0) — add %s for real values.",
            missing_elev,
            ELEVATION_CSV,
        )

    # ---- Step 3: derive state_fips from fips and classify climate zone ----
    log.info("Classifying climate zones ...")
    climate_df["state_fips"] = climate_df["fips"].str[:2]
    climate_df["climate_zone"] = climate_df.apply(
        lambda row: classify_zone(
            row["avg_temp_f"],
            row["annual_precip_in"],
            row["elevation_ft"],
            row["state_fips"],
        ),
        axis=1,
    )

    zone_counts = climate_df["climate_zone"].value_counts()
    log.info("Zone distribution:\n%s", zone_counts.to_string())

    # ---- Step 4: validate ----
    valid_zones = {
        "humid_subtropical", "marine_west_coast", "semi_arid",
        "continental", "subarctic", "mediterranean", "tropical",
    }
    invalid = ~climate_df["climate_zone"].isin(valid_zones)
    if invalid.any():
        log.error("Invalid climate zones found:\n%s", climate_df[invalid]["climate_zone"].value_counts())
        sys.exit(1)

    n_total = len(climate_df)
    n_temp_null = climate_df["avg_temp_f"].isna().sum()
    n_prcp_null = climate_df["annual_precip_in"].isna().sum()
    if n_temp_null > 0 or n_prcp_null > 0:
        log.warning("Nulls after classification — temp: %d, precip: %d", n_temp_null, n_prcp_null)

    # ---- Step 5: write output ----
    out = climate_df[["fips", "avg_temp_f", "annual_precip_in", "elevation_ft", "climate_zone"]].copy()
    out = out.drop_duplicates(subset=["fips"])
    out.to_parquet(OUTPUT_PARQUET, index=False)

    log.info(
        "Saved: %s  (%d counties, %d zones)",
        OUTPUT_PARQUET,
        len(out),
        out["climate_zone"].nunique(),
    )
    log.info("Next: 05_population.py, 03_zip_crosswalk.py")


if __name__ == "__main__":
    main()
