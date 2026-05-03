from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from schemas.region import ComplianceEntry, MetricsBlock


class SimilarityBreakdown(BaseModel):
    athlete: float
    sport_mix: float
    climate: float


class AnalogEntry(BaseModel):
    rank: int
    fips: str
    county_name: str
    state: str
    overall_score: float
    breakdown: SimilarityBreakdown
    match_quality: Literal["high", "medium", "low"]
    metrics: MetricsBlock
    centroid: tuple[float, float] | None  # [lng, lat]
    narrative: str
    compliance_log: list[ComplianceEntry]


class AnalogsResponse(BaseModel):
    source_fips: str
    analogs: list[AnalogEntry]
    tradeoff_explanation: str
