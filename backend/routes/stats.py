from __future__ import annotations

from functools import lru_cache

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_settings
from services.profile_service import ProfileNotFoundError, get_profile_service

router = APIRouter()

# Major metro FIPS for the "underdog outlier" stat (mirrors 09_stat_hunt.py)
_MAJOR_METRO_FIPS = {
    "06037",  # Los Angeles County
    "06059",  # Orange County (LA metro)
    "36061",  # Manhattan / New York County
    "36047",  # Brooklyn / Kings County
    "36081",  # Queens County
    "17031",  # Cook County (Chicago)
}


class CountyStats(BaseModel):
    fips: str
    county_name: str
    olympic_per_100k: float
    paralympic_per_100k: float
    olympic_evidence: str
    paralympic_evidence: str


class GapStat(BaseModel):
    """The '4 in 5' pipeline gap — counties with zero Team USA representation."""
    total_counties: int
    counties_with_athletes: int
    counties_no_athletes: int
    pct_with_athletes: float
    # Display-ready strings
    ratio_display: str   # "4 in 5"
    headline: str


class UnderdogStat(BaseModel):
    """Small counties (<250K pop) that beat major-metro Paralympic per-capita rate."""
    n_small_counties: int
    n_beating_metro: int
    pct_beating_metro: float
    metro_para_median_per_100k: float
    # Display-ready strings
    pct_display: str     # "68%"
    headline: str


class GlobalStats(BaseModel):
    gap: GapStat
    underdog: UnderdogStat


@lru_cache(maxsize=1)
def _compute_global_stats() -> GlobalStats:
    """Compute scrollytelling stats from county_profiles.parquet (cached at startup)."""
    settings = get_settings()
    profiles = pd.read_parquet(settings.county_profiles_path)
    profiles["fips"] = profiles["fips"].astype(str).str.zfill(5)

    # --- Gap stat (Hypothesis D from 09_stat_hunt.py) ---
    total = len(profiles)
    with_athletes = int(
        ((profiles["olympic_count"] > 0) | (profiles["paralympic_count"] > 0)).sum()
    )
    without = total - with_athletes
    pct_with = with_athletes / total * 100 if total else 0.0

    # "4 in 5" framing: ~83% have no athletes → 4 in 5
    pct_without = without / total * 100 if total else 0.0
    if pct_without >= 75:
        ratio_display = "4 in 5"
    elif pct_without >= 60:
        ratio_display = "3 in 5"
    elif pct_without >= 45:
        ratio_display = "nearly 1 in 2"
    else:
        ratio_display = f"{pct_without:.0f}%"

    gap = GapStat(
        total_counties=total,
        counties_with_athletes=with_athletes,
        counties_no_athletes=without,
        pct_with_athletes=round(pct_with, 1),
        ratio_display=ratio_display,
        headline=(
            f"{ratio_display} of U.S. counties show no Team USA athlete representation "
            f"in our 2016–2024 indexed sources — suggesting significant untapped pipeline "
            f"across {without:,} counties."
        ),
    )

    # --- Underdog stat (Hypothesis C from 09_stat_hunt.py) ---
    metro = profiles[profiles["fips"].isin(_MAJOR_METRO_FIPS)]
    metro_para_median = float(metro["paralympic_smoothed"].median()) if len(metro) else 0.0

    small = profiles[profiles["population"] < 250_000]
    n_small = len(small)
    n_beat = int((small["paralympic_smoothed"] > metro_para_median).sum())
    pct_beat = n_beat / n_small * 100 if n_small else 0.0

    underdog = UnderdogStat(
        n_small_counties=n_small,
        n_beating_metro=n_beat,
        pct_beating_metro=round(pct_beat, 1),
        metro_para_median_per_100k=round(metro_para_median, 4),
        pct_display=f"{pct_beat:.0f}%",
        headline=(
            f"About {pct_beat:.0f}% of U.S. counties with populations under 250,000 "
            f"show Paralympic athlete representation rates above the major-metro median — "
            f"in our indexed sources."
        ),
    )

    return GlobalStats(gap=gap, underdog=underdog)


@router.get("/api/stats/global", response_model=GlobalStats)
async def get_global_stats() -> GlobalStats:
    """Aggregate scrollytelling stats for Layer D editorial chapters.

    Returns two pre-computed stats anchored on the Layer A stat hunt:
    - gap: the '4 in 5' pipeline coverage gap across 3,222 counties
    - underdog: % of sub-250K-pop counties beating major-metro Paralympic per-capita rate
    """
    return _compute_global_stats()


@router.get("/api/stats/county/{fips}", response_model=CountyStats)
async def get_county_stats(fips: str) -> CountyStats:
    """Lightweight county stats for CountyMap hover tooltips (task 0.9 contract)."""
    svc = get_profile_service()
    try:
        profile = svc.get_profile(fips)
    except ProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return CountyStats(
        fips=profile.fips,
        county_name=profile.county_name,
        olympic_per_100k=profile.metrics.olympic.per_100k,
        paralympic_per_100k=profile.metrics.paralympic.per_100k,
        olympic_evidence=profile.metrics.olympic.evidence,
        paralympic_evidence=profile.metrics.paralympic.evidence,
    )
