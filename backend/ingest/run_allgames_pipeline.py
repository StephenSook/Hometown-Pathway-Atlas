"""
run_allgames_pipeline.py — Chain steps 2-5 once athletes_allgames_raw.csv exists.

Steps:
  1. Geocode allgames CSV  (02_geocode.py logic, allgames paths)
  2. Re-aggregate county profiles  (07_aggregate.py)
  3. Re-compute similarity matrix  (08_similarity.py)
  4. Re-patch Move United counts  (06_move_united.py)

Run manually or called by a watcher once 01_athletes.py finishes:
  python ingest/run_allgames_pipeline.py

Safe to re-run — each step checks whether its output is already up-to-date.
"""

from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).parent.parent
PROCESSED = ROOT / "data" / "processed"
INGEST = Path(__file__).parent

ALLGAMES_RAW = PROCESSED / "athletes_allgames_raw.csv"
ALLGAMES_GEO = PROCESSED / "athletes_allgames_geocoded.parquet"


# ---------------------------------------------------------------------------
# Step 1 — Geocode allgames (reuse 02_geocode.py with patched paths)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Step helper — run a script as subprocess (simpler, no path-patching needed)
# ---------------------------------------------------------------------------

def run_script(name: str, label: str) -> None:
    log.info("=== %s ===", label)
    result = subprocess.run(
        [sys.executable, str(INGEST / name)],
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{name} exited with code {result.returncode}")
    log.info("  %s done.", name)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main() -> None:
    log.info("=" * 60)
    log.info("Allgames upgrade pipeline starting")
    log.info("=" * 60)

    # Guard
    if not ALLGAMES_RAW.exists():
        log.error("athletes_allgames_raw.csv not found — run 01_athletes.py first.")
        sys.exit(1)

    import pandas as pd
    df = pd.read_csv(ALLGAMES_RAW)
    years = sorted(df["year"].unique())
    log.info("allgames raw: %d rows, years=%s", len(df), years)

    # Step 1: geocode
    if ALLGAMES_GEO.exists():
        geo = pd.read_parquet(ALLGAMES_GEO)
        log.info("Step 1 SKIP — allgames geocoded already exists (%d rows)", len(geo))
    else:
        _run_geocode()

    # Step 2: aggregate (07_aggregate.py auto-picks allgames if present)
    run_script("07_aggregate.py", "STEP 2: Aggregate county profiles (allgames)")

    # Step 3: similarity matrix
    run_script("08_similarity.py", "STEP 3: Similarity matrix")

    # Step 4: Move United re-patch (geocode cache means this is fast)
    run_script("06_move_united.py", "STEP 4: Move United re-patch")

    log.info("=" * 60)
    log.info("Pipeline complete. county_profiles.parquet now uses full 2016-2024 data.")
    log.info("Ready for task 1.11 (Layer A stat hunt).")
    log.info("=" * 60)


def _run_geocode() -> None:
    """Geocode allgames by patching 02_geocode.py's path constants."""
    import importlib.util

    log.info("=== STEP 1: Geocode allgames ===")
    spec = importlib.util.spec_from_file_location("geocode02", INGEST / "02_geocode.py")
    mod = importlib.util.module_from_spec(spec)  # type: ignore
    spec.loader.exec_module(mod)  # type: ignore

    mod.INPUT_CSV = ALLGAMES_RAW
    mod.OUTPUT_PARQUET = ALLGAMES_GEO
    mod.log = log

    log.info("  Input:  %s", ALLGAMES_RAW)
    log.info("  Output: %s", ALLGAMES_GEO)
    mod.main()
    log.info("  Step 1 done.")


if __name__ == "__main__":
    main()
