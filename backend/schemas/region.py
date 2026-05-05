from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


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
    # Distinguishes a real Gemini narrative call from the deterministic
    # `_fallback_region_narrative()` payload. Mirrors the qa() pattern
    # that ships source distinction. Frontend can detect when "Live
    # Gemini" eyebrow on RegionNarrative would be misleading.
    # silent-failure-hunter audit 2026-05-04 PM CRITICAL.
    narrative_source: Literal["gemini", "fallback"] = "gemini"
    compliance_log: list[ComplianceEntry]


# ---------------------------------------------------------------------------
# Region Q&A — Layer C live wire (B3, 2026-05-04)
# ---------------------------------------------------------------------------

class RegionQARequest(BaseModel):
    fips: str = Field(..., pattern=r"^\d{5}$")
    question: str = Field(..., min_length=1, max_length=500)

    @field_validator("question")
    @classmethod
    def _question_not_blank(cls, v: str) -> str:
        # min_length=1 alone passes whitespace-only strings — strip first.
        stripped = v.strip()
        if not stripped:
            raise ValueError("question cannot be blank or whitespace-only")
        return stripped


class ReasoningStep(BaseModel):
    step: str
    detail: str


class RegionQAResponse(BaseModel):
    reasoning: list[ReasoningStep]
    answer: str
    confidence: Literal["high", "medium", "low"]
    # Distinguish a real Gemini response from the deterministic
    # `_fallback_qa()` payload — the route returns 200 in either case
    # so HTTP status alone can't tell the frontend whether the answer
    # came from a live model. The "Live Gemini" eyebrow tag flips ONLY
    # when source == "gemini".
    source: Literal["gemini", "fallback"] = "gemini"
    compliance_log: list[ComplianceEntry] = Field(default_factory=list)
