from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class EvidenceBlock(BaseModel):
    metric: str | None = None
    value: float | None = None
    percentile: float | None = None
    data_caveat: str | None = None
    framing: str | None = None


class GapEntry(BaseModel):
    category: Literal[
        "observed_strength",
        "public_access_signal",
        "opportunity_hypothesis",
    ]
    claim: str
    evidence: EvidenceBlock
    confidence: Literal["high", "medium", "low"]


class PathwayResponse(BaseModel):
    source_fips: str
    gaps: list[GapEntry]
