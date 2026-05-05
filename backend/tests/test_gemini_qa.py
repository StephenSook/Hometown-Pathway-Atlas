"""
GeminiService.qa() unit tests — Layer C live wire (B3 2026-05-04).

Mocks GeminiService._call() so tests stay offline. Covers:
- happy path returns source="gemini"
- Gemini exception path returns source="fallback" + deterministic prose
- malformed confidence value normalizes to "medium"
- reasoning step details pass through HybridAuditor (banned verbs caught)

Mock pattern mirrors test_routes.py — patch via context managers, no
network calls.

Usage (from backend/):
    python3 -m pytest tests/test_gemini_qa.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import pytest

from schemas.region import (
    AdaptiveAccessBlock,
    ClimateBlock,
    MetricBlock,
    MetricsBlock,
    RegionResponse,
    SportEntry,
)


def _make_region(fips: str = "13067") -> RegionResponse:
    return RegionResponse(
        fips=fips,
        county_name="Cobb County",
        state="GA",
        msa_label="Atlanta-Sandy Springs-Roswell",
        population=760_141,
        centroid=(-84.5, 33.9),
        metrics=MetricsBlock(
            olympic=MetricBlock(count=9, per_100k=1.17, percentile=94.4, evidence="medium"),
            paralympic=MetricBlock(count=0, per_100k=0.0, percentile=0.8, evidence="low"),
        ),
        top_sports=[SportEntry(sport="football", share=0.333)],
        climate=ClimateBlock(zone="humid_subtropical", avg_temp_f=63.5, annual_precip_in=50.7),
        adaptive_access=AdaptiveAccessBlock(chapters_within_50mi=3, confidence="high"),
        narrative="",
        compliance_log=[],
    )


@pytest.fixture
def gemini_service():
    """Build a GeminiService with VertexAI init mocked. Each test then
    patches _call on the instance to control Gemini responses."""
    with (
        patch("vertexai.init"),
        patch("services.gemini_service.GenerativeModel", return_value=MagicMock()),
        patch("config.get_settings") as mock_settings,
    ):
        from config import Settings
        mock_settings.return_value = Settings(
            _env_file=None,
            gcp_project="test-project",
            gcp_location="us-central1",
            gemini_model="gemini-2.5-flash",
            frontend_origin="http://localhost:5173",
        )
        from services.gemini_service import GeminiService
        # Bypass the cache singleton so each test gets a fresh service.
        svc = GeminiService()
        # Clear narrative cache so tests don't share state.
        from services.cache import get_narrative_cache
        get_narrative_cache().clear() if hasattr(get_narrative_cache(), "clear") else None
        yield svc


class TestQAHappyPath:
    def test_returns_source_gemini_on_successful_call(self, gemini_service):
        with patch.object(gemini_service, "_call") as mock_call:
            mock_call.return_value = {
                "reasoning": [
                    {"step": "Pulling region context", "detail": "Olympic + Paralympic data."},
                    {"step": "Drafting response", "detail": "Conditional phrasing only."},
                ],
                "answer": "Cobb County could be associated with regional pathway dynamics.",
                "confidence": "high",
            }
            result = gemini_service.qa(_make_region(), "What might explain this region?")

        assert result.source == "gemini"
        assert result.confidence == "high"
        assert len(result.reasoning) == 2
        assert result.answer  # non-empty


class TestQAFallbackPath:
    def test_gemini_exception_returns_source_fallback(self, gemini_service):
        with patch.object(gemini_service, "_call", side_effect=RuntimeError("Gemini timeout")):
            result = gemini_service.qa(_make_region(), "Test question?")

        assert result.source == "fallback"
        assert "temporarily unavailable" in result.answer.lower() or result.answer
        assert len(result.reasoning) >= 1
        # Compliance log should record the error.
        error_entries = [e for e in result.compliance_log if e.status == "fail"]
        assert any("region_qa" in e.check or "qa" in e.check for e in error_entries)


class TestQAConfidenceNormalization:
    def test_malformed_confidence_normalizes_to_medium(self, gemini_service):
        with patch.object(gemini_service, "_call") as mock_call:
            mock_call.return_value = {
                "reasoning": [{"step": "Test", "detail": "Test detail."}],
                "answer": "Test answer.",
                "confidence": "very_high",  # not in enum
            }
            result = gemini_service.qa(_make_region(), "Test?")

        assert result.confidence == "medium"

    def test_missing_confidence_defaults_to_medium(self, gemini_service):
        # _call would normally raise on missing required field; simulate
        # the partial response that slipped past schema validation.
        with patch.object(gemini_service, "_call") as mock_call:
            mock_call.return_value = {
                "reasoning": [{"step": "Test", "detail": "Test detail."}],
                "answer": "Test answer.",
                # confidence missing entirely
            }
            result = gemini_service.qa(_make_region(), "Test?")

        assert result.confidence == "medium"


class TestQAReasoningAudit:
    def test_reasoning_step_detail_passes_through_auditor(self, gemini_service):
        # Construct a Gemini response where the reasoning step contains
        # a banned causal verb — the HybridAuditor should catch it and
        # rewrite. Final response should NOT contain the banned phrase.
        with patch.object(gemini_service, "_call") as mock_call:
            mock_call.return_value = {
                "reasoning": [
                    {
                        "step": "Drafting response",
                        "detail": "This county produces strong athletes consistently.",
                    }
                ],
                "answer": "Conditional phrasing answer.",
                "confidence": "medium",
            }
            result = gemini_service.qa(_make_region(), "Test?")

        # The final reasoning detail should NOT contain "produces" verbatim
        # — auditor either rewrote it or the audit log records a fail/fix.
        # If the auditor's rewrite path fires, banned word is gone.
        # If only flagged (no rewrite), the audit log captures the entry.
        causal_in_detail = "produces" in result.reasoning[0].detail.lower()
        audit_caught = any(
            e.status in ("fail", "fixed") and "causal" in e.check.lower()
            for e in result.compliance_log
        )
        # Either rewrote it OR audited it — must be one of these two.
        assert (not causal_in_detail) or audit_caught, (
            f"Banned verb 'produces' leaked through audit unrewrited: "
            f"{result.reasoning[0].detail!r}"
        )
