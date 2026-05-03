"""
08_similarity.py — Precompute pairwise county similarity matrix → similarity_matrix.parquet.

Input:  backend/data/processed/county_profiles.parquet
Output: backend/data/processed/similarity_matrix.parquet

Locked decisions (from arch spec + PLAN.md):
  D7:  Three dimensions only — athlete profile (40%), sport mix (35%), climate (25%).
  D10: Store same_msa_as_source flag; AnalogService applies diversity constraint at request time.

Output schema (arch spec §3.3):
  source_fips, analog_fips, overall_score, athlete_score, sport_mix_score, climate_score,
  analog_rank, same_msa_as_source

Top 50 analogs per source county (350 source × 50 = 17,500 output rows).
Self-pairs are excluded (a county is not its own analog).

Scoring:
  athlete_score   = 1 - cosine_distance(percentile_vector_source, percentile_vector_analog)
                    where percentile_vector = [olympic_percentile/100, paralympic_percentile/100]
  sport_mix_score = 1 - cosine_distance(sport_mix_vector_source, sport_mix_vector_analog)
                    fallback: jaccard overlap of top_sports when both vectors are zero-norm
  climate_score   = 1 - normalized_euclidean(climate_vector_source, climate_vector_analog)
                    climate_vector = [avg_temp_f (norm), annual_precip_in (norm), climate_zone_match]
                    (elevation is excluded — all 2024-data values are 0.0)

overall_score = 0.40 * athlete_score + 0.35 * sport_mix_score + 0.25 * climate_score
All scores clipped to [0, 1].
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from numpy.linalg import norm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
PROFILES_PARQUET = PROCESSED_DIR / "county_profiles.parquet"
OUTPUT_PARQUET = PROCESSED_DIR / "similarity_matrix.parquet"

# D7 dimension weights (locked)
W_ATHLETE = 0.40
W_SPORT_MIX = 0.35
W_CLIMATE = 0.25

TOP_K = 50  # top analogs to keep per source county


# ---------------------------------------------------------------------------
# Load + filter to counties with athlete data
# ---------------------------------------------------------------------------

def load_profiles() -> pd.DataFrame:
    df = pd.read_parquet(PROFILES_PARQUET)
    df["fips"] = df["fips"].astype(str).str.zfill(5)

    # Only counties with at least one athlete can be sources OR analogs.
    # Non-athlete counties have zero-norm percentile and sport vectors —
    # they would always score 0.5 on athlete_score (tied) and degrade results.
    athlete_mask = (df["olympic_count"] > 0) | (df["paralympic_count"] > 0)
    df = df[athlete_mask].copy().reset_index(drop=True)
    log.info("Loaded %d athlete counties for similarity computation", len(df))
    return df


# ---------------------------------------------------------------------------
# Build feature matrices
# ---------------------------------------------------------------------------

def build_athlete_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    2-dimensional vector per county: [olympic_percentile/100, paralympic_percentile/100].
    Range [0,1]. D4: separate percentile ranks, never merged.
    """
    mat = np.column_stack([
        df["olympic_percentile"].to_numpy(dtype=np.float64) / 100.0,
        df["paralympic_percentile"].to_numpy(dtype=np.float64) / 100.0,
    ])
    return mat


def build_sport_mix_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    Sport mix vectors stored in county_profiles (54-dim, l1-normalized).
    Convert list/array column to dense numpy matrix.
    Zero-norm rows (single-sport counties) remain as-is; cosine fallback uses top_sports jaccard.
    """
    vecs = df["sport_mix_vector"].tolist()
    n = len(vecs)
    if n == 0:
        return np.zeros((0, 0))
    dim = len(vecs[0]) if hasattr(vecs[0], "__len__") else 0
    if dim == 0:
        return np.zeros((n, 1))
    mat = np.zeros((n, dim), dtype=np.float64)
    for i, v in enumerate(vecs):
        arr = np.asarray(v, dtype=np.float64)
        mat[i, : len(arr)] = arr
    return mat


def build_climate_matrix(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    Returns (continuous_mat, zone_labels).
    continuous_mat columns: [avg_temp_f_norm, annual_precip_in_norm]
    Elevation excluded — all values are 0.0 in 2024 data.
    zone_labels: string array for exact-match bonus.
    """
    temp = df["avg_temp_f"].to_numpy(dtype=np.float64)
    precip = df["annual_precip_in"].to_numpy(dtype=np.float64)

    # Min-max normalize to [0, 1] across the population.
    # Use nanmin/nanmax so NaN counties don't corrupt the range;
    # fill remaining NaNs with 0.5 (midpoint = no signal).
    def normalize(arr: np.ndarray) -> np.ndarray:
        lo, hi = np.nanmin(arr), np.nanmax(arr)
        if hi == lo:
            return np.zeros_like(arr)
        out = (arr - lo) / (hi - lo)
        np.nan_to_num(out, nan=0.5, copy=False)
        return out

    mat = np.column_stack([normalize(temp), normalize(precip)])
    zones = df["climate_zone"].to_numpy(dtype=str)
    return mat, zones


# ---------------------------------------------------------------------------
# Similarity functions
# ---------------------------------------------------------------------------

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two 1-D vectors. Returns 0 if either is zero-norm."""
    na, nb = norm(a), norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.clip(np.dot(a, b) / (na * nb), 0.0, 1.0))


def jaccard_top_sports(sports_i: str, sports_j: str) -> float:
    """Jaccard similarity over comma-split sport sets. Fallback for zero-norm sport vectors."""
    set_i = set(s.strip() for s in sports_i.split(",") if s.strip())
    set_j = set(s.strip() for s in sports_j.split(",") if s.strip())
    if not set_i and not set_j:
        return 0.0
    return len(set_i & set_j) / len(set_i | set_j)


def climate_similarity(
    cont_i: np.ndarray,
    cont_j: np.ndarray,
    zone_i: str,
    zone_j: str,
) -> float:
    """
    Blend continuous (temp+precip) Euclidean similarity with a climate-zone match bonus.
    continuous_sim = 1 - euclidean_distance / sqrt(2)   (max possible distance in [0,1]^2 space)
    zone_bonus      = 0.2 if zones match, else 0.0
    combined        = 0.8 * continuous_sim + 0.2 * zone_bonus
    """
    zone_bonus = 1.0 if zone_i == zone_j else 0.0
    # After normalize() NaNs are filled with 0.5, so cont vectors are always finite here.
    # Guard defensively in case of unexpected NaN from a future data change.
    if np.isnan(cont_i).any() or np.isnan(cont_j).any():
        return float(np.clip(0.2 * zone_bonus, 0.0, 1.0))
    dist = norm(cont_i - cont_j)
    max_dist = float(np.sqrt(len(cont_i)))  # sqrt(2) for 2-D unit hypercube
    continuous_sim = 1.0 - min(dist / max_dist, 1.0)
    return float(np.clip(0.8 * continuous_sim + 0.2 * zone_bonus, 0.0, 1.0))


# ---------------------------------------------------------------------------
# Core pairwise computation
# ---------------------------------------------------------------------------

def compute_similarity_matrix(df: pd.DataFrame) -> pd.DataFrame:
    n = len(df)
    log.info("Building feature matrices for %d counties (%d pairs)...", n, n * n)

    athlete_mat = build_athlete_matrix(df)
    sport_mat = build_sport_mix_matrix(df)
    climate_cont, climate_zones = build_climate_matrix(df)

    fips_arr = df["fips"].to_numpy()
    msa_arr = df["msa_label"].to_numpy(dtype=str)
    top_sports_arr = df["top_sports"].to_numpy(dtype=str)

    # Precompute athlete cosine scores as a full n×n matrix (small enough: 350×350 float64 ~1MB)
    log.info("Computing athlete scores (cosine on percentile vectors)...")
    athlete_norms = norm(athlete_mat, axis=1, keepdims=True)
    athlete_norms_safe = np.where(athlete_norms == 0, 1.0, athlete_norms)
    athlete_normed = athlete_mat / athlete_norms_safe
    # Zero-norm rows stay zero; dot product with anything gives 0 → score 0
    athlete_scores_full = np.clip(athlete_normed @ athlete_normed.T, 0.0, 1.0)

    # Precompute sport mix cosine scores
    log.info("Computing sport mix scores (cosine on sport mix vectors)...")
    sport_norms = norm(sport_mat, axis=1, keepdims=True)
    sport_norms_safe = np.where(sport_norms == 0, 1.0, sport_norms)
    sport_normed = sport_mat / sport_norms_safe
    sport_scores_full = np.clip(sport_normed @ sport_normed.T, 0.0, 1.0)

    # For counties where both sport vectors are zero-norm, fall back to jaccard
    zero_sport_mask = (sport_norms.ravel() == 0)

    log.info("Computing climate scores and assembling top-50 per source...")

    rows: list[dict] = []
    for i in range(n):
        a_scores = athlete_scores_full[i]  # shape (n,)
        s_scores = sport_scores_full[i].copy()

        # Apply jaccard fallback where source or target has zero sport vector
        if zero_sport_mask[i]:
            for j in range(n):
                if i == j:
                    continue
                if zero_sport_mask[j]:
                    s_scores[j] = jaccard_top_sports(top_sports_arr[i], top_sports_arr[j])
                # If only target is non-zero, sport_normed[i] is zero → score already 0
                # (zero-norm source has no sport signal, score stays 0)

        # Climate scores (computed per-pair since we have zone string comparison)
        c_scores = np.zeros(n, dtype=np.float64)
        for j in range(n):
            if i == j:
                continue
            c_scores[j] = climate_similarity(
                climate_cont[i], climate_cont[j],
                climate_zones[i], climate_zones[j],
            )

        # Overall score (D7 weights)
        overall = W_ATHLETE * a_scores + W_SPORT_MIX * s_scores + W_CLIMATE * c_scores
        overall[i] = -1.0  # exclude self

        # Get top-K analog indices
        top_indices = np.argpartition(overall, -TOP_K)[-TOP_K:]
        top_indices = top_indices[np.argsort(overall[top_indices])[::-1]]

        source_fips = fips_arr[i]
        source_msa = msa_arr[i]

        for rank, j in enumerate(top_indices, start=1):
            rows.append({
                "source_fips": source_fips,
                "analog_fips": fips_arr[j],
                "overall_score": round(float(overall[j]), 6),
                "athlete_score": round(float(a_scores[j]), 6),
                "sport_mix_score": round(float(s_scores[j]), 6),
                "climate_score": round(float(c_scores[j]), 6),
                "analog_rank": rank,
                "same_msa_as_source": bool(
                    source_msa != "" and source_msa == msa_arr[j]
                ),
            })

        if (i + 1) % 50 == 0:
            log.info("  %d/%d source counties processed", i + 1, n)

    log.info("Pairwise computation complete: %d rows", len(rows))
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate(df: pd.DataFrame, n_sources: int) -> None:
    errors: list[str] = []

    expected_rows = n_sources * TOP_K
    if len(df) != expected_rows:
        errors.append(
            f"Expected {expected_rows} rows ({n_sources} sources × {TOP_K} top), got {len(df)}"
        )

    # Each source must have exactly TOP_K rows
    counts = df.groupby("source_fips").size()
    bad_counts = counts[counts != TOP_K]
    if len(bad_counts) > 0:
        errors.append(
            f"{len(bad_counts)} sources have != {TOP_K} analogs: {bad_counts.head(5).to_dict()}"
        )

    # No self-pairs
    self_pairs = (df["source_fips"] == df["analog_fips"]).sum()
    if self_pairs > 0:
        errors.append(f"Found {self_pairs} self-pairs (source == analog)")

    # Scores in [0, 1]
    for col in ("overall_score", "athlete_score", "sport_mix_score", "climate_score"):
        lo, hi = df[col].min(), df[col].max()
        if lo < -0.001 or hi > 1.001:
            errors.append(f"{col} out of [0,1]: min={lo:.4f}, max={hi:.4f}")

    # analog_rank must be 1..TOP_K per source
    rank_max = df.groupby("source_fips")["analog_rank"].max()
    if (rank_max != TOP_K).any():
        errors.append(f"analog_rank max != {TOP_K} for some sources")

    if errors:
        for e in errors:
            log.error("VALIDATION FAIL: %s", e)
        sys.exit(1)

    same_msa_pct = df["same_msa_as_source"].mean() * 100
    log.info(
        "Validation passed: %d rows, %d sources, %.1f%% same-MSA pairs",
        len(df), n_sources, same_msa_pct,
    )
    log.info(
        "Score ranges — overall: [%.3f, %.3f]  athlete: [%.3f, %.3f]  sport: [%.3f, %.3f]  climate: [%.3f, %.3f]",
        df["overall_score"].min(), df["overall_score"].max(),
        df["athlete_score"].min(), df["athlete_score"].max(),
        df["sport_mix_score"].min(), df["sport_mix_score"].max(),
        df["climate_score"].min(), df["climate_score"].max(),
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not PROFILES_PARQUET.exists():
        log.error("county_profiles.parquet not found — run 07_aggregate.py first")
        sys.exit(1)

    df = load_profiles()
    n_sources = len(df)

    result = compute_similarity_matrix(df)

    validate(result, n_sources)

    result.to_parquet(OUTPUT_PARQUET, index=False)
    log.info("Saved: %s  (%d rows)", OUTPUT_PARQUET, len(result))
    log.info("Next: 09_stat_hunt.py (task 1.11) and 06_move_united.py (task 1.10)")


if __name__ == "__main__":
    main()
