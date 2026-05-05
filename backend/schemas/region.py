from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ZipRequest(BaseModel):
    zip: str = Field(..., pattern=r"^\d{5}$")


class MetricBlock(BaseModel):
    count: int
    per_100k: float
    percentile: float
    evidence: Literal["high", "medium", "low"]


class MetricsBlock(BaseModel):
    olympic: MetricBlock
    paralympic: MetricBlock


class SportEntry(BaseModel):
    sport: str
    share: float


class ClimateBlock(BaseModel):
    zone: str
    avg_temp_f: float | None
    annual_precip_in: float | None


class AdaptiveAccessBlock(BaseModel):
    chapters_within_50mi: int
    confidence: Literal["high", "medium", "none"]


class ComplianceEntry(BaseModel):
    layer: Literal["rules", "gemini"]
    check: str
    status: Literal["pass", "fail", "fixed"]
    details: str
    ts: str  # ISO8601
    before: str | None = None  # banned phrase / original text (fail→fixed entries)
    after: str | None = None   # safe rewrite (fixed entries)


class RegionResponse(BaseModel):
    fips: str
    county_name: str
    state: str
    msa_label: str
    population: int
    centroid: tuple[float, float] | None  # [lng, lat]
    metrics: MetricsBlock
    top_sports: list[SportEntry]
    climate: ClimateBlock
    adaptive_access: AdaptiveAccessBlock
    narrative: str
    compliance_log: list[ComplianceEntry]


# ---------------------------------------------------------------------------
# Region Q&A — Layer C live wire (B3, 2026-05-04)
# ---------------------------------------------------------------------------

class RegionQARequest(BaseModel):
    fips: str = Field(..., pattern=r"^\d{5}$")
    question: str = Field(..., min_length=1, max_length=500)


class ReasoningStep(BaseModel):
    step: str
    detail: str


class RegionQAResponse(BaseModel):
    reasoning: list[ReasoningStep]
    answer: str
    confidence: Literal["high", "medium", "low"]
    compliance_log: list[ComplianceEntry] = Field(default_factory=list)
