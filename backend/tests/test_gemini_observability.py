"""
Observability + source-flag tests for GeminiService.

Closes the test-coverage gap flagged by the silent-failure-hunter F1+F2+F3
landing wave (commits 9977a7b, ef31249) — the existing test_gemini.py only
covers the live-Vertex happy path against ADC. These tests:

  * Verify _classify_vertex_error() maps each Vertex exception type to the
    correct coarse category (quota / iam / deadline / schema / generic),
    and that callers can then route quota+iam to logger.error so they
    land in Cloud Run Error Reporting at demo time.

  * Verify enrich_region() + enrich_analogs() flip narrative_source +
    tradeoff_source to "fallback" when Vertex raises. Without this guard,
    a future GeminiService refactor could silently regress the source
    flag and the frontend would re-claim "Live Gemini" on canned prose.

All tests mock Vertex AI at the GeminiService._call boundary — no ADC
required, runs offline.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Path setup — match test_gemini.py's pattern so tests run from backend/
# OR from repo root via `pytest backend/tests/`.
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import json

import pytest
from google.api_core import exceptions as gcp_exc

from schemas.analog import AnalogEntry, AnalogsResponse, SimilarityBreakdown
from schemas.region import (
    AdaptiveAccessBlock,
    ClimateBlock,
    MetricBlock,
    MetricsBlock,
    RegionResponse,
    SportEntry,
)
from services import gemini_service as gs
from services.auditor import AuditResult


# ---------------------------------------------------------------------------
# Fixtures — minimal valid Pydantic objects, no service-layer hydration
# ---------------------------------------------------------------------------

def _metric_block(count: int = 1) -> MetricBlock:
    return MetricBlock(count=count, per_100k=1.0, percentile=50.0, evidence="medium")


@pytest.fixture
def region() -> RegionResponse:
    return RegionResponse(
        fips="13067",
        county_name="Cobb County",
        state="GA",
        msa_label="Atlanta-Sandy Springs-Roswell, GA",
        population=766000,
        centroid=(-84.6, 33.9),
        metrics=MetricsBlock(olympic=_metric_block(9), paralympic=_metric_block(0)),
        top_sports=[SportEntry(sport="athletics", share=1.0)],
        climate=ClimateBlock(zone="humid_subtropical", avg_temp_f=63.5, annual_precip_in=50.7),
        adaptive_access=AdaptiveAccessBlock(chapters_within_50mi=3, confidence="high"),
        narrative="",
        compliance_log=[],
    )


@pytest.fixture
def analogs() -> AnalogsResponse:
    sample = AnalogEntry(
        rank=1,
        fips="48029",
        county_name="Bexar County",
        state="TX",
        overall_score=0.82,
        breakdown=SimilarityBreakdown(athlete=0.4, sport_mix=0.3, climate=0.12),
        match_quality="high",
        metrics=MetricsBlock(olympic=_metric_block(7), paralympic=_metric_block(1)),
        centroid=(-98.5, 29.4),
        narrative="",
        compliance_log=[],
    )
    return AnalogsResponse(
        source_fips="13067",
        analogs=[sample, sample.model_copy(update={"rank": 2, "fips": "48201"}),
                 sample.model_copy(update={"rank": 3, "fips": "06037"})],
        tradeoff_explanation="",
    )


@pytest.fixture(autouse=True)
def _stub_external_state(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub the auditor + cache so tests focus on source-flag logic.

    - Auditor.audit() returns AuditResult that passes the input through
      unchanged with no compliance entries. Real audit behavior has its
      own test_auditor.py — we only need the source flag to survive the
      audit wrapping in enrich_region/enrich_analogs.
    - Narrative cache is a per-test in-memory dict so cached results
      from one test never leak into another.
    """

    class _PassthroughAuditor:
        def audit(self, narrative: str, fallback: str | None = None) -> AuditResult:
            return AuditResult(
                causal_pass=True,
                parity_pass=True,
                name_pass=True,
                final_narrative=narrative,
                entries=[],
            )

    class _NoopCache:
        def __init__(self) -> None:
            self._store: dict[tuple[str, str], object] = {}

        def get(self, key: str, kind: str) -> object | None:
            return self._store.get((key, kind))

        def set(self, key: str, kind: str, value: object) -> None:
            self._store[(key, kind)] = value

    monkeypatch.setattr(gs, "get_auditor", lambda: _PassthroughAuditor())
    monkeypatch.setattr(gs, "get_narrative_cache", lambda: _NoopCache())


@pytest.fixture
def svc(monkeypatch: pytest.MonkeyPatch) -> gs.GeminiService:
    """GeminiService with the GenerativeModel constructor patched out so
    no ADC / network call fires when the service is instantiated.
    Individual tests then monkeypatch _call() per-case."""
    monkeypatch.setattr(gs, "GenerativeModel", lambda *a, **kw: object())
    return gs.GeminiService()


# ---------------------------------------------------------------------------
# _classify_vertex_error() — pure function, exhaustive case mapping
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "exc, expected_category",
    [
        (gcp_exc.ResourceExhausted("rate limit"), "quota"),
        (gcp_exc.PermissionDenied("denied"), "iam"),
        (gcp_exc.DeadlineExceeded("timeout"), "deadline"),
        (gcp_exc.ServiceUnavailable("503"), "deadline"),
        (json.JSONDecodeError("bad json", "{}", 0), "schema"),
        (ValueError("schema mismatch"), "schema"),
        (RuntimeError("something else"), "generic"),
    ],
)
def test_classify_vertex_error_maps_each_type(exc: Exception, expected_category: str) -> None:
    assert gs._classify_vertex_error(exc) == expected_category


def test_classify_vertex_error_returns_generic_when_gcp_exc_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Defensive path: if google.api_core fails to import (shouldn't happen
    in our pinned env but the module guards for it), every exception
    must classify as 'generic' rather than crashing the fallback path."""
    monkeypatch.setattr(gs, "gcp_exc", None)
    assert gs._classify_vertex_error(gcp_exc.ResourceExhausted("anything")) == "generic"
    assert gs._classify_vertex_error(RuntimeError("anything")) == "generic"


# ---------------------------------------------------------------------------
# enrich_region() — narrative_source flag honesty
# ---------------------------------------------------------------------------

def test_enrich_region_marks_source_gemini_on_success(
    svc: gs.GeminiService, region: RegionResponse, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        svc,
        "_call",
        lambda prompt, schema: {
            "safe_summary": "Cobb County may correlate with Olympic and Paralympic patterns.",
            "olympic_mentioned": True,
            "paralympic_mentioned": True,
            "name_leak_check": "no_names",
            "causal_tone": "ok",
        },
    )
    result = svc.enrich_region(region)
    assert result.narrative_source == "gemini"
    assert result.narrative.startswith("Cobb County")


@pytest.mark.parametrize(
    "exc",
    [
        gcp_exc.ResourceExhausted("quota burned"),
        gcp_exc.PermissionDenied("missing aiplatform.user"),
        gcp_exc.DeadlineExceeded("model took >60s"),
        ValueError("schema fields missing"),
        RuntimeError("unknown failure"),
    ],
)
def test_enrich_region_marks_source_fallback_on_vertex_error(
    svc: gs.GeminiService,
    region: RegionResponse,
    monkeypatch: pytest.MonkeyPatch,
    exc: Exception,
) -> None:
    """Every error class — quota, IAM, deadline, schema, generic — must
    flip narrative_source to 'fallback'. This is the F2 invariant the
    frontend eyebrow swap depends on."""

    def _raise(*_args, **_kwargs):
        raise exc

    monkeypatch.setattr(svc, "_call", _raise)
    result = svc.enrich_region(region)
    assert result.narrative_source == "fallback"
    # Fallback narrative must still be non-empty (don't ship a blank card).
    assert result.narrative.strip()


# ---------------------------------------------------------------------------
# enrich_analogs() — tradeoff_source flag honesty
# ---------------------------------------------------------------------------

def test_enrich_analogs_marks_tradeoff_source_gemini_on_success(
    svc: gs.GeminiService,
    analogs: AnalogsResponse,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Both the tradeoff prose path AND each per-analog narrative path
    succeed — tradeoff_source should be 'gemini'."""

    def _ok(prompt: str, schema: dict) -> dict:
        # The same mock handles both _generate_tradeoff and
        # _enrich_analog_entry — return shapes that satisfy both schemas.
        return {
            "leader_explanation": "Three peer counties may correlate with similar pathway patterns.",
            "safe_summary": "This county may correlate with both Olympic and Paralympic signals.",
            "olympic_mentioned": True,
            "paralympic_mentioned": True,
            "name_leak_check": "no_names",
            "causal_tone": "ok",
        }

    monkeypatch.setattr(svc, "_call", _ok)
    result = svc.enrich_analogs(analogs)
    assert result.tradeoff_source == "gemini"


def test_enrich_analogs_marks_tradeoff_source_fallback_on_quota(
    svc: gs.GeminiService,
    analogs: AnalogsResponse,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When the tradeoff Vertex call raises, tradeoff_source flips to
    'fallback' even though per-analog calls might still succeed
    independently. Source flag tracks the tradeoff path specifically."""

    def _raise(*_args, **_kwargs):
        raise gcp_exc.ResourceExhausted("quota for tradeoff call")

    monkeypatch.setattr(svc, "_call", _raise)
    result = svc.enrich_analogs(analogs)
    assert result.tradeoff_source == "fallback"
    # Fallback tradeoff prose must still be non-empty.
    assert result.tradeoff_explanation.strip()
