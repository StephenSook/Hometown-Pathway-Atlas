"""
03_zip_crosswalk.py — Build ZIP → county FIPS lookup from HUD ZIP-County crosswalk.

Input:  HUD USPS ZIP-County crosswalk file (quarterly CSV from HUD user portal)
        Expected at: backend/data/raw/hud_zip_county_crosswalk.csv
        Download from: https://www.huduser.gov/portal/datasets/usps_crosswalk.html
        File: "ZIP-COUNTY" crosswalk, most recent quarter.
        Columns include: ZIP, COUNTY, RES_RATIO, BUS_RATIO, OTH_RATIO, TOT_RATIO

Output: backend/data/processed/zip_county_crosswalk.parquet
        Columns: zip (5-digit str), fips (5-digit str)
        One row per ZIP. Ambiguous ZIPs resolved by max residential ratio (RES_RATIO).

Strategy:
  - ZIP codes that span multiple counties → pick county with highest RES_RATIO.
  - ZIP codes with RES_RATIO == 0 for all rows (PO box ZIPs) → fall back to max TOT_RATIO.
  - Output is a flat 1:1 zip → fips table for fast runtime lookup.

Usage at runtime (ProfileService):
  df = pd.read_parquet("zip_county_crosswalk.parquet")
  fips = df.set_index("zip").loc["30060", "fips"]
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import pandas as pd

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
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

INPUT_CSV = RAW_DIR / "hud_zip_county_crosswalk.csv"
OUTPUT_PARQUET = PROCESSED_DIR / "zip_county_crosswalk.parquet"

# HUD ships the file with uppercase column names; normalise defensively
REQUIRED_COLS = {"zip", "county", "res_ratio"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_hud_file(path: Path) -> pd.DataFrame:
    """
    Load HUD crosswalk CSV. HUD column names vary slightly by quarter:
      ZIP / zip, COUNTY / county, RES_RATIO / res_ratio, TOT_RATIO / tot_ratio.
    Normalise to lowercase.
    """
    df = pd.read_csv(path, dtype=str)
    df.columns = df.columns.str.lower().str.strip()

    missing = REQUIRED_COLS - set(df.columns)
    if missing:
        log.error("HUD file is missing required columns: %s", missing)
        log.error("Columns found: %s", list(df.columns))
        sys.exit(1)

    # Pad ZIP and COUNTY to 5 digits
    df["zip"] = df["zip"].str.strip().str.zfill(5)
    df["county"] = df["county"].str.strip().str.zfill(5)

    # Convert ratio columns to float
    for col in ("res_ratio", "bus_ratio", "oth_ratio", "tot_ratio"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    if "tot_ratio" not in df.columns:
        df["tot_ratio"] = df["res_ratio"]

    return df


def pick_county(group: pd.DataFrame) -> str:
    """
    For a group of rows sharing the same ZIP, pick the county with the
    highest residential ratio. Fall back to total ratio if all res_ratios are 0
    (PO-box-only ZIPs). Returns the 5-digit FIPS string.
    """
    if group["res_ratio"].max() > 0:
        return group.loc[group["res_ratio"].idxmax(), "county"]
    return group.loc[group["tot_ratio"].idxmax(), "county"]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    if not INPUT_CSV.exists():
        log.error(
            "HUD crosswalk file not found: %s\n"
            "  Download from: https://www.huduser.gov/portal/datasets/usps_crosswalk.html\n"
            "  Choose 'ZIP-COUNTY' crosswalk, most recent quarter, save as:\n"
            "  %s",
            INPUT_CSV,
            INPUT_CSV,
        )
        sys.exit(1)

    log.info("Loading HUD crosswalk: %s", INPUT_CSV)
    raw = load_hud_file(INPUT_CSV)
    log.info("  Raw rows: %d | unique ZIPs: %d", len(raw), raw["zip"].nunique())

    # Count how many ZIPs are multi-county before collapsing
    multi = raw.groupby("zip").filter(lambda g: len(g) > 1)
    log.info(
        "  Multi-county ZIPs (ambiguous): %d", multi["zip"].nunique()
    )

    # Collapse to 1 row per ZIP using max residential ratio
    result = (
        raw.groupby("zip", sort=False)
        .apply(pick_county)
        .reset_index()
    )
    result.columns = ["zip", "fips"]

    # Validate: every fips should be a 5-digit string
    bad = result[~result["fips"].str.match(r"^\d{5}$", na=False)]
    if not bad.empty:
        log.warning("  %d rows with malformed FIPS — dropping:", len(bad))
        for _, row in bad.head(10).iterrows():
            log.warning("    zip=%s  fips=%r", row["zip"], row["fips"])
        result = result[result["fips"].str.match(r"^\d{5}$", na=False)]

    result = result.sort_values("zip").reset_index(drop=True)
    result.to_parquet(OUTPUT_PARQUET, index=False)

    log.info(
        "Saved: %s  (%d ZIPs → county FIPS mappings)",
        OUTPUT_PARQUET,
        len(result),
    )

    # Spot-check a few known ZIPs
    spot = {"30060": "13067", "10001": "36061", "60601": "17031"}
    lookup = result.set_index("zip")["fips"].to_dict()
    for zip_code, expected_fips in spot.items():
        got = lookup.get(zip_code, "MISSING")
        status = "OK" if got == expected_fips else f"WARN (expected {expected_fips})"
        log.info("  Spot-check ZIP %s → %s  [%s]", zip_code, got, status)

    log.info("Done. Next: 04_climate.py / 05_population.py")


if __name__ == "__main__":
    main()
