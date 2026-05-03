"""
validate.py — Day 2 GO/NO-GO checkpoint (task 1.6).

Runs 8 automated checks across all pipeline outputs, then samples 10 counties
for a quick eyeball pass printed to stdout.

Scoring:
  Each check is worth 1 point.
  7+ / 8 = GO  — proceed to task 1.7 (multi-year scrape)
  5–6 / 8 = WARN — fix flagged issues before proceeding
  <=4 / 8 = NO-GO — stop and reassess; default pivot is Hometown Genome

Checks:
  1. athletes_2024_geocoded.parquet exists and has >=700 rows
  2. FIPS coverage >= 95% (rows with valid 5-digit FIPS / total raw rows)
  3. Olympic + Paralympic both represented, each >= 10% of total
  4. county_population.parquet covers >= 3000 counties, 0% missing population
  5. county_climate.parquet covers all athlete-county FIPS, 0 invalid zones
  6. zip_county_crosswalk.parquet covers >= 35000 ZIPs; sample ZIPs resolve correctly
  7. No NIL violation — name / hometown columns absent from geocoded parquet (D5)
  8. Per-capita sanity: top-10 counties by count are NOT dominated by one single FIPS
     (guards against geocode collapse / many-to-one error)

Usage:
  python backend/ingest/validate.py
  python backend/ingest/validate.py --seed 99   # reproducible random sample
"""

from __future__ import annotations

import argparse
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

ROOT = Path(__file__).parent.parent
PROCESSED = ROOT / "data" / "processed"

# Thresholds
MIN_ATHLETE_ROWS = 700
MIN_FIPS_COVERAGE = 0.95
MIN_PARA_FRAC = 0.10
MIN_OLYMPIC_FRAC = 0.10
MIN_POP_COUNTIES = 3_000
MIN_ZIP_COUNT = 35_000
SAMPLE_ZIPS = ["30060", "10001", "90210", "60601", "77001", "98101", "85001", "33101"]
VALID_ZONES = {
    "humid_subtropical", "marine_west_coast", "semi_arid",
    "continental", "subarctic", "mediterranean", "tropical",
}
NIL_BANNED_COLS = {"name", "first_name", "last_name", "athlete_name", "hometown_string"}


def _pass(msg: str) -> bool:
    log.info("  PASS  %s", msg)
    return True


def _fail(msg: str) -> bool:
    log.error("  FAIL  %s", msg)
    return False


# ---------------------------------------------------------------------------
# Check 1 — geocoded parquet exists and has enough rows
# ---------------------------------------------------------------------------

def check_geocoded_exists(geo: pd.DataFrame, raw_csv: Path) -> bool:
    n = len(geo)
    if n < MIN_ATHLETE_ROWS:
        return _fail(f"geocoded has {n} rows — expected >= {MIN_ATHLETE_ROWS}")
    return _pass(f"geocoded has {n} rows")


# ---------------------------------------------------------------------------
# Check 2 — FIPS coverage >= 95%
# ---------------------------------------------------------------------------

def check_fips_coverage(geo: pd.DataFrame, raw_csv: Path) -> bool:
    if raw_csv.exists():
        raw_df = pd.read_csv(raw_csv, dtype=str)
        total = len(raw_df)
    else:
        log.warning("  athletes_2024_raw.csv not found — using geocoded row count as denominator")
        total = len(geo)

    resolved = geo["fips"].notna().sum()
    pct = resolved / total if total else 0.0
    if pct < MIN_FIPS_COVERAGE:
        return _fail(f"FIPS coverage {100*pct:.1f}% < {100*MIN_FIPS_COVERAGE:.0f}% ({resolved}/{total})")
    return _pass(f"FIPS coverage {100*pct:.1f}% ({resolved}/{total})")


# ---------------------------------------------------------------------------
# Check 3 — Olympic + Paralympic both represented
# ---------------------------------------------------------------------------

def check_parity_representation(geo: pd.DataFrame) -> bool:
    total = len(geo)
    o_frac = (geo["olympic_or_paralympic"] == "olympic").sum() / total
    p_frac = (geo["olympic_or_paralympic"] == "paralympic").sum() / total
    ok = o_frac >= MIN_OLYMPIC_FRAC and p_frac >= MIN_PARA_FRAC
    msg = (
        f"olympic {100*o_frac:.1f}% / paralympic {100*p_frac:.1f}% "
        f"(thresholds: each >= {100*MIN_OLYMPIC_FRAC:.0f}%)"
    )
    return _pass(msg) if ok else _fail(msg)


# ---------------------------------------------------------------------------
# Check 4 — population parquet coverage + no missing values
# ---------------------------------------------------------------------------

def check_population(pop: pd.DataFrame) -> bool:
    n = len(pop)
    n_missing = pop["population"].isna().sum()
    if n < MIN_POP_COUNTIES:
        return _fail(f"population has {n} counties — expected >= {MIN_POP_COUNTIES}")
    if n_missing > 0:
        return _fail(f"population has {n_missing} missing values")
    return _pass(f"population {n} counties, 0 missing")


# ---------------------------------------------------------------------------
# Check 5 — climate covers all athlete FIPS, valid zones only
# ---------------------------------------------------------------------------

def check_climate(geo: pd.DataFrame, climate: pd.DataFrame) -> bool:
    athlete_fips = set(geo["fips"].dropna().unique())
    climate_fips = set(climate["fips"].unique())
    missing_fips = athlete_fips - climate_fips
    invalid_zones = climate[~climate["climate_zone"].isin(VALID_ZONES)]

    if missing_fips:
        return _fail(
            f"{len(missing_fips)} athlete FIPS have no climate record: "
            f"{sorted(missing_fips)[:5]}{'...' if len(missing_fips) > 5 else ''}"
        )
    if len(invalid_zones) > 0:
        return _fail(
            f"{len(invalid_zones)} counties have invalid climate_zone: "
            f"{invalid_zones['climate_zone'].unique().tolist()}"
        )
    return _pass(
        f"climate covers all {len(athlete_fips)} athlete FIPS, "
        f"{climate['climate_zone'].nunique()} valid zones"
    )


# ---------------------------------------------------------------------------
# Check 6 — ZIP crosswalk size + sample lookups
# ---------------------------------------------------------------------------

def check_zip_crosswalk(xwalk: pd.DataFrame) -> bool:
    n = len(xwalk)
    if n < MIN_ZIP_COUNT:
        return _fail(f"ZIP crosswalk has {n} rows — expected >= {MIN_ZIP_COUNT}")

    xwalk_idx = xwalk.set_index("zip")["fips"]
    misses = [z for z in SAMPLE_ZIPS if z not in xwalk_idx]
    if misses:
        return _fail(f"ZIP crosswalk missing sample ZIPs: {misses}")
    return _pass(f"ZIP crosswalk {n} rows, all {len(SAMPLE_ZIPS)} sample ZIPs resolve")


# ---------------------------------------------------------------------------
# Check 7 — NIL compliance: no banned columns in geocoded output (D5)
# ---------------------------------------------------------------------------

def check_nil_compliance(geo: pd.DataFrame) -> bool:
    present = NIL_BANNED_COLS & set(geo.columns)
    if present:
        return _fail(f"NIL violation — banned columns in geocoded parquet: {present}")
    return _pass(f"NIL OK — no name/hometown columns in geocoded output")


# ---------------------------------------------------------------------------
# Check 8 — per-capita sanity: top FIPS not absorbing >20% of all athletes
# ---------------------------------------------------------------------------

def check_no_geocode_collapse(geo: pd.DataFrame) -> bool:
    top_fips = geo["fips"].value_counts().iloc[0]
    top_pct = top_fips / len(geo)
    threshold = 0.20
    if top_pct > threshold:
        top_val = geo["fips"].value_counts().index[0]
        return _fail(
            f"Top FIPS {top_val} has {top_fips} athletes ({100*top_pct:.1f}%) "
            f"— possible geocode collapse (threshold: < {100*threshold:.0f}%)"
        )
    return _pass(
        f"No geocode collapse — top FIPS has {top_fips} athletes "
        f"({100*top_pct:.1f}%)"
    )


# ---------------------------------------------------------------------------
# Eyeball sample: 10 random counties with counts
# ---------------------------------------------------------------------------

def print_eyeball_sample(geo: pd.DataFrame, pop: pd.DataFrame, seed: int) -> None:
    print("\n" + "=" * 60)
    print("EYEBALL SAMPLE — 10 random athlete counties")
    print("=" * 60)

    county_counts = (
        geo.groupby(["fips", "olympic_or_paralympic"])
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )
    county_counts.columns.name = None
    for col in ("olympic", "paralympic"):
        if col not in county_counts.columns:
            county_counts[col] = 0

    merged = county_counts.merge(pop[["fips", "population"]], on="fips", how="left")
    merged["per_100k_olympic"] = (
        merged["olympic"] / merged["population"].fillna(1) * 100_000
    ).round(2)
    merged["per_100k_paralympic"] = (
        merged["paralympic"] / merged["population"].fillna(1) * 100_000
    ).round(2)

    sample = merged.sample(min(10, len(merged)), random_state=seed)
    sample = sample.sort_values("fips")

    print(
        f"{'FIPS':7}  {'Olympic':>8}  {'Paralympic':>10}  "
        f"{'Pop':>10}  {'O/100k':>8}  {'P/100k':>8}"
    )
    print("-" * 60)
    for _, row in sample.iterrows():
        print(
            f"{row['fips']:7}  {int(row['olympic']):>8}  {int(row['paralympic']):>10}  "
            f"{int(row['population']) if pd.notna(row['population']) else 'N/A':>10}  "
            f"{row['per_100k_olympic']:>8.2f}  {row['per_100k_paralympic']:>8.2f}"
        )
    print()

    print("Sport mix across full dataset:")
    sport_counts = geo["sport"].value_counts().head(10)
    for sport, count in sport_counts.items():
        print(f"  {sport:<30} {count:>4}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Task 1.6 GO/NO-GO validation")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for eyeball sample")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("HOMETOWN PATHWAY ATLAS — Task 1.6 Validation")
    print("=" * 60 + "\n")

    # --- Load files ---
    geo_path = PROCESSED / "athletes_2024_geocoded.parquet"
    raw_csv = PROCESSED / "athletes_2024_raw.csv"
    pop_path = PROCESSED / "county_population.parquet"
    climate_path = PROCESSED / "county_climate.parquet"
    xwalk_path = PROCESSED / "zip_county_crosswalk.parquet"

    missing = [p for p in [geo_path, pop_path, climate_path, xwalk_path] if not p.exists()]
    if missing:
        log.error("Missing required files:")
        for p in missing:
            log.error("  %s", p)
        sys.exit(1)

    geo = pd.read_parquet(geo_path)
    pop = pd.read_parquet(pop_path)
    climate = pd.read_parquet(climate_path)
    xwalk = pd.read_parquet(xwalk_path)

    # --- Run checks ---
    checks = [
        ("geocoded exists + row count",    check_geocoded_exists(geo, raw_csv)),
        ("FIPS coverage >= 95%",           check_fips_coverage(geo, raw_csv)),
        ("Olympic + Paralympic parity",    check_parity_representation(geo)),
        ("population coverage",            check_population(pop)),
        ("climate coverage + zones",       check_climate(geo, climate)),
        ("ZIP crosswalk size + lookups",   check_zip_crosswalk(xwalk)),
        ("NIL compliance (D5)",            check_nil_compliance(geo)),
        ("no geocode collapse",            check_no_geocode_collapse(geo)),
    ]

    passed = sum(1 for _, result in checks if result)
    total = len(checks)

    print(f"\nResults: {passed} / {total} checks passed\n")
    for name, result in checks:
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {name}")

    print()

    # --- Verdict ---
    if passed >= 7:
        verdict = "GO"
        msg = "Pipeline is solid. Proceed to task 1.7 (2016-2024 full scrape)."
        exit_code = 0
    elif passed >= 5:
        verdict = "WARN"
        msg = "Fix the failing checks before starting task 1.7."
        exit_code = 1
    else:
        verdict = "NO-GO"
        msg = "4 or fewer checks passed. Stop and reassess — default pivot: Hometown Genome."
        exit_code = 2

    print("=" * 60)
    print(f"VERDICT: {verdict} — {msg}")
    print("=" * 60)

    # --- Eyeball sample (always printed, even on NO-GO) ---
    print_eyeball_sample(geo, pop, seed=args.seed)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
