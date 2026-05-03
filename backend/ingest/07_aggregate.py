"""
07_aggregate.py — Aggregate per-county athlete counts → county_profiles.parquet.

Inputs:
  backend/data/processed/athletes_2024_geocoded.parquet  (or athletes_allgames_geocoded.parquet once 1.7 done)
  backend/data/processed/county_population.parquet
  backend/data/processed/county_climate.parquet

Output: backend/data/processed/county_profiles.parquet

Key operations (locked decisions):
  D3: Per-capita normalization (athletes/100k) + empirical Bayes shrinkage (alpha=50K)
  D4: Olympic + Paralympic ranked separately — never merged
  D5: Athlete names never persist — not in input, not in output
  Task 0.9 contract: bake Census FIPS centroid (lng, lat) into parquet for CountyMap pins

Schema (county_profiles.parquet):
  fips, county_name, state, state_fips, msa_label, population,
  olympic_count, paralympic_count,
  olympic_per_100k, paralympic_per_100k,
  olympic_smoothed, paralympic_smoothed,
  olympic_percentile, paralympic_percentile,
  olympic_evidence, paralympic_evidence,
  top_sports, sport_mix_vector,
  avg_temp_f, annual_precip_in, elevation_ft, climate_zone,
  move_united_chapters_50mi, adaptive_access_confidence,
  centroid_lng, centroid_lat
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
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

# Prefer the full multi-year geocoded file when available (task 1.7 output);
# fall back to 2024-only for Day 3 work while 1.7 is still running.
ALLGAMES_PARQUET = PROCESSED_DIR / "athletes_allgames_geocoded.parquet"
GEOCODED_2024 = PROCESSED_DIR / "athletes_2024_geocoded.parquet"
POPULATION_PARQUET = PROCESSED_DIR / "county_population.parquet"
CLIMATE_PARQUET = PROCESSED_DIR / "county_climate.parquet"
OUTPUT_PARQUET = PROCESSED_DIR / "county_profiles.parquet"

# D3: Bayesian shrinkage pseudo-count (locked)
BAYES_ALPHA = 50_000

# Evidence label thresholds (per DESIGN_SYSTEM §4.4 + task 0.9 contract)
EVIDENCE_HIGH_MIN = 10
EVIDENCE_MED_MIN = 3

# Top-N sports to record per county
TOP_SPORTS_N = 3

# Census Gazetteer county centroid URL (2024 release, ZIP file)
GAZETTEER_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/"
    "2024_Gaz_counties_national.zip"
)
GAZETTEER_TXT_NAME = "2024_Gaz_counties_national.txt"

# Known CBSAs for counties most likely to appear in analogs + demo ZIPs.
# This is display-only; AnalogService applies the MSA diversity constraint (D10)
# at request time using state_fips + msa_label, not this lookup.
FIPS_TO_MSA: dict[str, str] = {
    # Atlanta–Sandy Springs–Roswell, GA
    "13067": "Atlanta-Sandy Springs-Roswell, GA",
    "13121": "Atlanta-Sandy Springs-Roswell, GA",
    "13135": "Atlanta-Sandy Springs-Roswell, GA",
    "13057": "Atlanta-Sandy Springs-Roswell, GA",
    "13089": "Atlanta-Sandy Springs-Roswell, GA",
    "13063": "Atlanta-Sandy Springs-Roswell, GA",
    "13097": "Atlanta-Sandy Springs-Roswell, GA",
    "13113": "Atlanta-Sandy Springs-Roswell, GA",
    "13117": "Atlanta-Sandy Springs-Roswell, GA",
    "13151": "Atlanta-Sandy Springs-Roswell, GA",
    "13159": "Atlanta-Sandy Springs-Roswell, GA",
    "13169": "Atlanta-Sandy Springs-Roswell, GA",
    "13171": "Atlanta-Sandy Springs-Roswell, GA",
    "13199": "Atlanta-Sandy Springs-Roswell, GA",
    "13211": "Atlanta-Sandy Springs-Roswell, GA",
    "13217": "Atlanta-Sandy Springs-Roswell, GA",
    "13223": "Atlanta-Sandy Springs-Roswell, GA",
    "13227": "Atlanta-Sandy Springs-Roswell, GA",
    "13231": "Atlanta-Sandy Springs-Roswell, GA",
    "13247": "Atlanta-Sandy Springs-Roswell, GA",
    "13255": "Atlanta-Sandy Springs-Roswell, GA",
    "13297": "Atlanta-Sandy Springs-Roswell, GA",
    # Los Angeles–Long Beach–Anaheim, CA
    "06037": "Los Angeles-Long Beach-Anaheim, CA",
    "06059": "Los Angeles-Long Beach-Anaheim, CA",
    # New York–Newark–Jersey City, NY-NJ-PA
    "36061": "New York-Newark-Jersey City, NY-NJ-PA",
    "36047": "New York-Newark-Jersey City, NY-NJ-PA",
    "36081": "New York-Newark-Jersey City, NY-NJ-PA",
    "36005": "New York-Newark-Jersey City, NY-NJ-PA",
    "36085": "New York-Newark-Jersey City, NY-NJ-PA",
    "34003": "New York-Newark-Jersey City, NY-NJ-PA",
    "34013": "New York-Newark-Jersey City, NY-NJ-PA",
    "34017": "New York-Newark-Jersey City, NY-NJ-PA",
    "34019": "New York-Newark-Jersey City, NY-NJ-PA",
    "34023": "New York-Newark-Jersey City, NY-NJ-PA",
    "34025": "New York-Newark-Jersey City, NY-NJ-PA",
    "34027": "New York-Newark-Jersey City, NY-NJ-PA",
    "34029": "New York-Newark-Jersey City, NY-NJ-PA",
    "34035": "New York-Newark-Jersey City, NY-NJ-PA",
    "34037": "New York-Newark-Jersey City, NY-NJ-PA",
    "34039": "New York-Newark-Jersey City, NY-NJ-PA",
    "36071": "New York-Newark-Jersey City, NY-NJ-PA",
    "36079": "New York-Newark-Jersey City, NY-NJ-PA",
    "36087": "New York-Newark-Jersey City, NY-NJ-PA",
    "36103": "New York-Newark-Jersey City, NY-NJ-PA",
    "36119": "New York-Newark-Jersey City, NY-NJ-PA",
    "42103": "New York-Newark-Jersey City, NY-NJ-PA",
    # Chicago–Naperville–Elgin, IL-IN-WI
    "17031": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17037": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17043": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17063": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17089": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17093": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17097": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17111": "Chicago-Naperville-Elgin, IL-IN-WI",
    "17197": "Chicago-Naperville-Elgin, IL-IN-WI",
    # Washington–Arlington–Alexandria, DC-VA-MD-WV
    "11001": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "24021": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "24031": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "24033": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51013": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51043": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51059": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51061": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51107": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51153": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51157": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51177": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51179": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51187": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    "51510": "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    # San Francisco–Oakland–Hayward, CA
    "06001": "San Francisco-Oakland-Hayward, CA",
    "06013": "San Francisco-Oakland-Hayward, CA",
    "06041": "San Francisco-Oakland-Hayward, CA",
    "06075": "San Francisco-Oakland-Hayward, CA",
    "06081": "San Francisco-Oakland-Hayward, CA",
    # Boston–Cambridge–Newton, MA-NH
    "25009": "Boston-Cambridge-Newton, MA-NH",
    "25017": "Boston-Cambridge-Newton, MA-NH",
    "25021": "Boston-Cambridge-Newton, MA-NH",
    "25023": "Boston-Cambridge-Newton, MA-NH",
    "25025": "Boston-Cambridge-Newton, MA-NH",
    "33015": "Boston-Cambridge-Newton, MA-NH",
    "33017": "Boston-Cambridge-Newton, MA-NH",
    # Dallas–Fort Worth–Arlington, TX
    "48113": "Dallas-Fort Worth-Arlington, TX",
    "48121": "Dallas-Fort Worth-Arlington, TX",
    "48139": "Dallas-Fort Worth-Arlington, TX",
    "48221": "Dallas-Fort Worth-Arlington, TX",
    "48251": "Dallas-Fort Worth-Arlington, TX",
    "48257": "Dallas-Fort Worth-Arlington, TX",
    "48363": "Dallas-Fort Worth-Arlington, TX",
    "48397": "Dallas-Fort Worth-Arlington, TX",
    "48425": "Dallas-Fort Worth-Arlington, TX",
    "48439": "Dallas-Fort Worth-Arlington, TX",
    "48497": "Dallas-Fort Worth-Arlington, TX",
    # Houston–The Woodlands–Sugar Land, TX
    "48015": "Houston-The Woodlands-Sugar Land, TX",
    "48039": "Houston-The Woodlands-Sugar Land, TX",
    "48071": "Houston-The Woodlands-Sugar Land, TX",
    "48157": "Houston-The Woodlands-Sugar Land, TX",
    "48167": "Houston-The Woodlands-Sugar Land, TX",
    "48201": "Houston-The Woodlands-Sugar Land, TX",
    "48291": "Houston-The Woodlands-Sugar Land, TX",
    "48339": "Houston-The Woodlands-Sugar Land, TX",
    "48473": "Houston-The Woodlands-Sugar Land, TX",
    # Miami–Fort Lauderdale–West Palm Beach, FL
    "12011": "Miami-Fort Lauderdale-West Palm Beach, FL",
    "12086": "Miami-Fort Lauderdale-West Palm Beach, FL",
    "12099": "Miami-Fort Lauderdale-West Palm Beach, FL",
    # Seattle–Tacoma–Bellevue, WA
    "53033": "Seattle-Tacoma-Bellevue, WA",
    "53053": "Seattle-Tacoma-Bellevue, WA",
    "53061": "Seattle-Tacoma-Bellevue, WA",
    # Phoenix–Mesa–Scottsdale, AZ
    "04013": "Phoenix-Mesa-Scottsdale, AZ",
    "04021": "Phoenix-Mesa-Scottsdale, AZ",
    # Minneapolis–St. Paul–Bloomington, MN-WI
    "27003": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27019": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27025": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27037": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27053": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27059": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27079": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27109": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27123": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27139": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "27163": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "55093": "Minneapolis-St. Paul-Bloomington, MN-WI",
    "55109": "Minneapolis-St. Paul-Bloomington, MN-WI",
    # Denver–Aurora–Lakewood, CO
    "08001": "Denver-Aurora-Lakewood, CO",
    "08005": "Denver-Aurora-Lakewood, CO",
    "08013": "Denver-Aurora-Lakewood, CO",
    "08019": "Denver-Aurora-Lakewood, CO",
    "08031": "Denver-Aurora-Lakewood, CO",
    "08035": "Denver-Aurora-Lakewood, CO",
    "08047": "Denver-Aurora-Lakewood, CO",
    "08059": "Denver-Aurora-Lakewood, CO",
    "08093": "Denver-Aurora-Lakewood, CO",
}

# State FIPS → abbreviation (for county_name parsing)
STATE_FIPS_TO_ABBR: dict[str, str] = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY", "72": "PR",
}


# ---------------------------------------------------------------------------
# Step 1: Load inputs
# ---------------------------------------------------------------------------

def load_athletes() -> pd.DataFrame:
    if ALLGAMES_PARQUET.exists():
        log.info("Loading multi-year geocoded data: %s", ALLGAMES_PARQUET)
        df = pd.read_parquet(ALLGAMES_PARQUET)
    else:
        log.info(
            "athletes_allgames_geocoded.parquet not found (task 1.7 still running). "
            "Using 2024-only data: %s",
            GEOCODED_2024,
        )
        df = pd.read_parquet(GEOCODED_2024)

    required = {"fips", "sport", "olympic_or_paralympic"}
    missing = required - set(df.columns)
    if missing:
        log.error("athletes parquet missing columns: %s", missing)
        sys.exit(1)

    log.info("Loaded %d athlete rows, %d unique FIPSes", len(df), df["fips"].nunique())
    return df


def load_population() -> pd.DataFrame:
    df = pd.read_parquet(POPULATION_PARQUET)
    df["fips"] = df["fips"].astype(str).str.zfill(5)
    df["population"] = pd.to_numeric(df["population"], errors="coerce")
    log.info("Loaded population for %d counties", len(df))
    return df


def load_climate() -> pd.DataFrame:
    df = pd.read_parquet(CLIMATE_PARQUET)
    df["fips"] = df["fips"].astype(str).str.zfill(5)
    log.info("Loaded climate data for %d counties", len(df))
    return df


# ---------------------------------------------------------------------------
# Step 2: Fetch Census Gazetteer centroids
# ---------------------------------------------------------------------------

def fetch_centroids() -> pd.DataFrame:
    """Download 2024 Census Gazetteer ZIP and return fips→centroid_lng/lat lookup."""
    import io
    import zipfile

    cache_path = ROOT / "data" / "raw" / "2024_gaz_counties.txt"

    if cache_path.exists():
        log.info("[cache] %s", cache_path.name)
        raw = cache_path.read_text(encoding="utf-8")
    else:
        log.info("Fetching Census Gazetteer county centroids (ZIP)...")
        try:
            resp = requests.get(GAZETTEER_URL, timeout=120)
            resp.raise_for_status()
            with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                # Find the .txt file inside the ZIP
                txt_names = [n for n in zf.namelist() if n.endswith(".txt")]
                if not txt_names:
                    raise ValueError(f"No .txt file found in Gazetteer ZIP. Files: {zf.namelist()}")
                raw = zf.read(txt_names[0]).decode("utf-8", errors="replace")
            cache_path.write_text(raw, encoding="utf-8")
            log.info("Cached to %s", cache_path)
        except (requests.RequestException, zipfile.BadZipFile, ValueError) as exc:
            log.warning("Census Gazetteer fetch failed: %s — centroids will be null", exc)
            return pd.DataFrame(columns=["fips", "county_name", "centroid_lng", "centroid_lat"])

    from io import StringIO
    df = pd.read_csv(StringIO(raw), sep="\t", dtype=str, engine="python")
    df.columns = [c.strip() for c in df.columns]

    # Identify columns by likely names (Gazetteer column names vary slightly by release)
    col_map: dict[str, str] = {}
    for col in df.columns:
        col_lower = col.lower()
        if "geoid" in col_lower:
            col_map["fips"] = col
        elif "intptlat" in col_lower:
            col_map["lat"] = col
        elif "intptlong" in col_lower or "intptlon" in col_lower:
            col_map["lng"] = col
        elif col_lower == "name" or col_lower == "namelsad":
            col_map.setdefault("name", col)

    if not {"fips", "lat", "lng"}.issubset(col_map):
        log.warning(
            "Could not identify centroid columns in Gazetteer. Available: %s",
            df.columns.tolist(),
        )
        return pd.DataFrame(columns=["fips", "county_name", "centroid_lng", "centroid_lat"])

    out = pd.DataFrame()
    out["fips"] = df[col_map["fips"]].astype(str).str.zfill(5)
    out["county_name"] = df[col_map["name"]].astype(str) if "name" in col_map else ""
    out["centroid_lat"] = pd.to_numeric(df[col_map["lat"]], errors="coerce")
    out["centroid_lng"] = pd.to_numeric(df[col_map["lng"]], errors="coerce")

    # Keep only 50 states + DC (drop territories)
    out = out[out["fips"].str[:2].isin(STATE_FIPS_TO_ABBR)].copy()
    log.info("Loaded centroids for %d counties from Gazetteer", len(out))
    return out[["fips", "county_name", "centroid_lng", "centroid_lat"]]


# ---------------------------------------------------------------------------
# Step 3: Count athletes per county × type
# ---------------------------------------------------------------------------

def count_athletes(df: pd.DataFrame) -> pd.DataFrame:
    """Pivot to one row per FIPS with olympic_count + paralympic_count + sport lists."""
    df = df.copy()
    df["fips"] = df["fips"].astype(str).str.zfill(5)

    counts = (
        df.groupby(["fips", "olympic_or_paralympic"])
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )
    counts.columns.name = None

    if "olympic" not in counts.columns:
        counts["olympic"] = 0
    if "paralympic" not in counts.columns:
        counts["paralympic"] = 0

    counts = counts.rename(
        columns={"olympic": "olympic_count", "paralympic": "paralympic_count"}
    )

    # Top sports across all types per county
    sport_agg = (
        df.groupby("fips")["sport"]
        .apply(lambda s: ",".join(s.value_counts().head(TOP_SPORTS_N).index.tolist()))
        .reset_index(name="top_sports")
    )

    # Sport mix vector: normalized frequency vector over all unique sports
    all_sports = sorted(df["sport"].unique())
    sport_index = {s: i for i, s in enumerate(all_sports)}
    n_sports = len(all_sports)

    def build_sport_vector(grp: pd.Series) -> list[float]:
        vec = [0.0] * n_sports
        vc = grp.value_counts()
        total = vc.sum()
        for sport, cnt in vc.items():
            vec[sport_index[sport]] = cnt / total
        return vec

    sport_vectors = (
        df.groupby("fips")["sport"]
        .apply(build_sport_vector)
        .reset_index(name="sport_mix_vector")
    )

    result = (
        counts
        .merge(sport_agg, on="fips", how="left")
        .merge(sport_vectors, on="fips", how="left")
    )
    result["top_sports"] = result["top_sports"].fillna("")
    return result


# ---------------------------------------------------------------------------
# Step 4: Per-capita + Bayesian shrinkage (D3)
# ---------------------------------------------------------------------------

def add_per_capita(df: pd.DataFrame, pop: pd.DataFrame) -> pd.DataFrame:
    merged = df.merge(pop, on="fips", how="left")
    merged["population"] = merged["population"].fillna(0)

    # Raw per 100k
    for col in ("olympic", "paralympic"):
        merged[f"{col}_per_100k"] = np.where(
            merged["population"] > 0,
            (merged[f"{col}_count"] / merged["population"]) * 100_000,
            0.0,
        )

    return merged


def apply_bayes_shrinkage(df: pd.DataFrame) -> pd.DataFrame:
    """
    Empirical Bayes shrinkage: smoothed_rate = (count + alpha * national_rate) / (population + alpha)
    where alpha = BAYES_ALPHA (50K), national_rate = total_count / total_population.

    This pulls low-pop counties with noisy small counts toward the national rate,
    preventing e.g. a 1-athlete county with population 500 from dominating percentile ranks.
    """
    total_pop = df["population"].sum()

    for col in ("olympic", "paralympic"):
        total_count = df[f"{col}_count"].sum()
        national_rate = total_count / total_pop if total_pop > 0 else 0.0

        df[f"{col}_smoothed"] = np.where(
            df["population"] > 0,
            (df[f"{col}_count"] + BAYES_ALPHA * national_rate)
            / (df["population"] + BAYES_ALPHA)
            * 100_000,
            0.0,
        )

    return df


# ---------------------------------------------------------------------------
# Step 5: Percentile ranks + evidence labels (D4)
# ---------------------------------------------------------------------------

def add_percentile_and_evidence(df: pd.DataFrame) -> pd.DataFrame:
    """Percentile rank counties separately for Olympic vs Paralympic (D4)."""
    for col in ("olympic", "paralympic"):
        smoothed = df[f"{col}_smoothed"]
        # percentile rank: fraction of counties at or below this value × 100
        df[f"{col}_percentile"] = (
            smoothed.rank(method="average", pct=True) * 100
        ).round(1)

    def evidence_label(count_series: pd.Series) -> pd.Series:
        return count_series.apply(
            lambda c: "high" if c >= EVIDENCE_HIGH_MIN
            else ("medium" if c >= EVIDENCE_MED_MIN else "low")
        )

    df["olympic_evidence"] = evidence_label(df["olympic_count"])
    df["paralympic_evidence"] = evidence_label(df["paralympic_count"])

    return df


# ---------------------------------------------------------------------------
# Step 6: Build county_name + state columns from Gazetteer / fallback
# ---------------------------------------------------------------------------

def add_geo_labels(df: pd.DataFrame, centroids: pd.DataFrame) -> pd.DataFrame:
    df = df.merge(centroids, on="fips", how="left")

    # state_fips = first 2 chars of fips
    df["state_fips"] = df["fips"].str[:2]
    df["state"] = df["state_fips"].map(STATE_FIPS_TO_ABBR).fillna("")

    # county_name from Gazetteer; fallback to fips-derived label
    df["county_name"] = df["county_name"].fillna("")
    mask_missing = df["county_name"] == ""
    df.loc[mask_missing, "county_name"] = (
        "County " + df.loc[mask_missing, "fips"]
    )

    # msa_label from static lookup; empty string for rural counties
    df["msa_label"] = df["fips"].map(FIPS_TO_MSA).fillna("")

    return df


# ---------------------------------------------------------------------------
# Step 7: Join climate; add Move United placeholders (task 1.10 fills real values)
# ---------------------------------------------------------------------------

def add_climate(df: pd.DataFrame, climate: pd.DataFrame) -> pd.DataFrame:
    df = df.merge(climate, on="fips", how="left")
    df["avg_temp_f"] = df["avg_temp_f"].fillna(np.nan)
    df["annual_precip_in"] = df["annual_precip_in"].fillna(np.nan)
    df["elevation_ft"] = df["elevation_ft"].fillna(np.nan)
    df["climate_zone"] = df["climate_zone"].fillna("unknown")
    return df


def add_move_united_placeholders(df: pd.DataFrame) -> pd.DataFrame:
    """task 1.10 will overwrite these columns with real chapter counts."""
    if "move_united_chapters_50mi" not in df.columns:
        df["move_united_chapters_50mi"] = 0
    if "adaptive_access_confidence" not in df.columns:
        df["adaptive_access_confidence"] = "low"
    return df


# ---------------------------------------------------------------------------
# Step 8: Finalize column order + validate
# ---------------------------------------------------------------------------

OUTPUT_COLUMNS = [
    "fips", "county_name", "state", "state_fips", "msa_label", "population",
    "olympic_count", "paralympic_count",
    "olympic_per_100k", "paralympic_per_100k",
    "olympic_smoothed", "paralympic_smoothed",
    "olympic_percentile", "paralympic_percentile",
    "olympic_evidence", "paralympic_evidence",
    "top_sports", "sport_mix_vector",
    "avg_temp_f", "annual_precip_in", "elevation_ft", "climate_zone",
    "move_united_chapters_50mi", "adaptive_access_confidence",
    "centroid_lng", "centroid_lat",
]


def validate(df: pd.DataFrame, athlete_fips: set[str]) -> None:
    errors: list[str] = []

    # Every athlete FIPS must appear in the profiles
    missing_fips = athlete_fips - set(df["fips"])
    if missing_fips:
        errors.append(
            f"{len(missing_fips)} athlete FIPSes missing from profiles: "
            f"{sorted(missing_fips)[:5]}..."
        )

    # D4: evidence labels must be exact enum values
    for col in ("olympic_evidence", "paralympic_evidence"):
        bad = set(df[col]) - {"high", "medium", "low"}
        if bad:
            errors.append(f"{col} has invalid values: {bad}")

    # D4: separate percentile columns must exist and be distinct series
    if "olympic_percentile" not in df.columns or "paralympic_percentile" not in df.columns:
        errors.append("Missing percentile columns")

    # No athlete names (D5) — check column names
    name_cols = [c for c in df.columns if "name" in c.lower() and c != "county_name"]
    if name_cols:
        errors.append(f"Suspicious name columns in output: {name_cols}")

    # Bayesian smoothed values must be >= 0
    for col in ("olympic_smoothed", "paralympic_smoothed"):
        if (df[col] < 0).any():
            errors.append(f"{col} has negative values")

    # Centroid coverage — check athlete counties specifically (map pins only needed there)
    athlete_df = df[df["fips"].isin(athlete_fips)]
    n_athlete_with_centroid = athlete_df["centroid_lng"].notna().sum()
    pct_athlete = n_athlete_with_centroid / len(athlete_df) * 100 if len(athlete_df) else 0
    n_total_with_centroid = df["centroid_lng"].notna().sum()
    pct_total = n_total_with_centroid / len(df) * 100 if len(df) else 0
    log.info(
        "Centroid coverage: %d/%d all counties (%.1f%%), %d/%d athlete counties (%.1f%%)",
        n_total_with_centroid, len(df), pct_total,
        n_athlete_with_centroid, len(athlete_df), pct_athlete,
    )
    if pct_athlete < 80:
        errors.append(
            f"Athlete-county centroid coverage {pct_athlete:.1f}% < 80% — "
            "CountyMap pins will have significant gaps"
        )

    if errors:
        for e in errors:
            log.error("VALIDATION FAIL: %s", e)
        sys.exit(1)

    log.info(
        "Validation passed: %d county profiles, %d athlete FIPSes covered",
        len(df),
        len(athlete_fips),
    )
    log.info(
        "Olympic counts: total=%d, evidence_high=%d, med=%d, low=%d",
        df["olympic_count"].sum(),
        (df["olympic_evidence"] == "high").sum(),
        (df["olympic_evidence"] == "medium").sum(),
        (df["olympic_evidence"] == "low").sum(),
    )
    log.info(
        "Paralympic counts: total=%d, evidence_high=%d, med=%d, low=%d",
        df["paralympic_count"].sum(),
        (df["paralympic_evidence"] == "high").sum(),
        (df["paralympic_evidence"] == "medium").sum(),
        (df["paralympic_evidence"] == "low").sum(),
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    athletes = load_athletes()
    athlete_fips = set(athletes["fips"].astype(str).str.zfill(5))

    pop = load_population()
    climate = load_climate()
    centroids = fetch_centroids()

    # Build per-county athlete counts + sport vectors
    counts = count_athletes(athletes)

    # Expand to ALL counties that have population data so downstream services
    # can look up any county by FIPS, not just the 350 with athletes.
    # Counties with 0 athletes get count=0, evidence="low".
    full_fips = pop[["fips"]].copy()
    merged = full_fips.merge(counts, on="fips", how="left")
    merged["olympic_count"] = merged["olympic_count"].fillna(0).astype(int)
    merged["paralympic_count"] = merged["paralympic_count"].fillna(0).astype(int)
    merged["top_sports"] = merged["top_sports"].fillna("")
    merged["sport_mix_vector"] = merged["sport_mix_vector"].apply(
        lambda v: v if isinstance(v, list) else []
    )

    # Per-capita + shrinkage
    merged = add_per_capita(merged, pop)
    merged = apply_bayes_shrinkage(merged)
    merged = add_percentile_and_evidence(merged)

    # Geography labels + centroids
    merged = add_geo_labels(merged, centroids)

    # Climate features
    merged = add_climate(merged, climate)

    # Move United placeholders (task 1.10 overwrites)
    merged = add_move_united_placeholders(merged)

    # Enforce output column order; drop any extra columns
    for col in OUTPUT_COLUMNS:
        if col not in merged.columns:
            merged[col] = None
    result = merged[OUTPUT_COLUMNS].reset_index(drop=True)

    validate(result, athlete_fips)

    result.to_parquet(OUTPUT_PARQUET, index=False)
    log.info("Saved: %s  (%d rows)", OUTPUT_PARQUET, len(result))
    log.info("Next: 08_similarity.py (task 1.9)")


if __name__ == "__main__":
    main()
