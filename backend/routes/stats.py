from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.profile_service import ProfileNotFoundError, get_profile_service

router = APIRouter()


class CountyStats(BaseModel):
    fips: str
    county_name: str
    olympic_per_100k: float
    paralympic_per_100k: float
    olympic_evidence: str
    paralympic_evidence: str


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
