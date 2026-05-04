"""
Task 2.8 — GeminiService structured output reliability test.

Runs enrich_region() and enrich_analogs() against 5 sample counties drawn from
different tiers (high-athlete, mid-athlete, low-athlete, rural, urban) and verifies
that Gemini returns valid structured JSON every time.

Usage (from backend/):
    .venv/Scripts/python.exe -m pytest tests/test_gemini.py -v
    # or run directly:
    .venv/Scripts/python.exe tests/test_gemini.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup — run from backend/ or repo root
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import pytest
import vertexai
import google.auth
import google.auth.exceptions

from config import get_settings
from services.gemini_service import GeminiService
from services.profile_service import get_profile_service
from services.analog_service import get_analog_service
from schemas.region import RegionResponse, ComplianceEntry
from schemas.analog import AnalogsResponse, AnalogEntry

# ---------------------------------------------------------------------------
# 5 sample FIPSes — diverse by size, region, athlete tier
# ---------------------------------------------------------------------------
# These were chosen from counties that appear in similarity_matrix.parquet so
# both ProfileService and AnalogService can build full objects.
_SAMPLE_FIPS = [
    "13067",  # Cobb County, GA         — high-athlete urban (demo anchor)
    "06037",  # Los Angeles County, CA  — mega-urban, lots of Olympians
    "36061",  # New York County, NY     — large urban
    "08031",  # Denver County, CO       — mid-urban, mountain climate
    "48113",  # Dallas County, TX       — large Sun Belt
]

_BANNED_WORDS = re.compile(
    r"\b(produces?|creates?|leads? to|guarantees?|makes|will|is known for)\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_compliance_entry(entry: ComplianceEntry, label: str) -> None:
    assert entry.layer in ("rules", "gemini"), f"{label}: unexpected layer {entry.layer!r}"
    assert entry.status in ("pass", "fail", "fixed"), f"{label}: unexpected status {entry.status!r}"
    assert entry.check, f"{label}: empty check name"
    assert entry.details, f"{label}: empty details"
    # ISO8601 basic sanity — expect "2026-05-03T..." format
    assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", entry.ts), (
        f"{label}: ts not ISO8601: {entry.ts!r}"
    )


def _check_no_causal_language(text: str, label: str) -> None:
    m = _BANNED_WORDS.search(text)
    assert not m, f"{label}: causal language detected — matched {m.group()!r} in: {text!r}"


def _check_region_response(region: RegionResponse, fips: str) -> None:
    label = f"enrich_region({fips})"

    # narrative must be a non-empty string
    assert isinstance(region.narrative, str) and region.narrative.strip(), (
        f"{label}: narrative is empty"
    )
    _check_no_causal_language(region.narrative, label)

    # compliance_log must be a non-empty list of valid entries
    assert region.compliance_log, f"{label}: compliance_log is empty"
    for entry in region.compliance_log:
        _check_compliance_entry(entry, label)

    # Parity checks — at least one entry must reference olympic and one paralympic
    checks = {e.check for e in region.compliance_log}
    assert "olympic_mentioned" in checks, f"{label}: missing olympic_mentioned compliance check"
    assert "paralympic_mentioned" in checks, f"{label}: missing paralympic_mentioned compliance check"

    # The parity checks should pass (Gemini was asked to mention both)
    olympic_ok = next(e for e in region.compliance_log if e.check == "olympic_mentioned")
    paralympic_ok = next(e for e in region.compliance_log if e.check == "paralympic_mentioned")
    assert olympic_ok.status == "pass", (
        f"{label}: olympic_mentioned check failed — Gemini omitted Olympic data"
    )
    assert paralympic_ok.status == "pass", (
        f"{label}: paralympic_mentioned check failed — Gemini omitted Paralympic data"
    )


def _check_analogs_response(resp: AnalogsResponse, fips: str) -> None:
    label = f"enrich_analogs({fips})"

    # tradeoff_explanation
    assert isinstance(resp.tradeoff_explanation, str) and resp.tradeoff_explanation.strip(), (
        f"{label}: tradeoff_explanation is empty"
    )
    _check_no_causal_language(resp.tradeoff_explanation, label)

    # Each analog entry
    assert resp.analogs, f"{label}: analogs list is empty"
    for entry in resp.analogs:
        entry_label = f"{label} analog {entry.fips}"
        assert isinstance(entry.narrative, str) and entry.narrative.strip(), (
            f"{entry_label}: narrative is empty"
        )
        _check_no_causal_language(entry.narrative, entry_label)
        assert entry.compliance_log, f"{entry_label}: compliance_log is empty"
        for ce in entry.compliance_log:
            _check_compliance_entry(ce, entry_label)


# ---------------------------------------------------------------------------
# ADC check — skip entire suite if credentials are absent
# ---------------------------------------------------------------------------

def _has_adc() -> bool:
    try:
        google.auth.default()
        return True
    except google.auth.exceptions.DefaultCredentialsError:
        return False


_requires_adc = pytest.mark.skipif(
    not _has_adc(),
    reason="Application Default Credentials not found — run `gcloud auth application-default login`",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def init_vertex() -> None:
    """Mirror the FastAPI lifespan — vertexai.init() must run before GeminiService."""
    s = get_settings()
    vertexai.init(project=s.gcp_project, location=s.gcp_location)


@pytest.fixture(scope="session")
def gemini_svc(init_vertex) -> GeminiService:
    return GeminiService()


@pytest.fixture(scope="session")
def profile_svc():
    return get_profile_service()


@pytest.fixture(scope="session")
def analog_svc():
    return get_analog_service()


# ---------------------------------------------------------------------------
# Tests — one parameterized test per concern, 5 FIPSes each
# ---------------------------------------------------------------------------

@_requires_adc
@pytest.mark.parametrize("fips", _SAMPLE_FIPS)
def test_enrich_region_structured_output(fips: str, gemini_svc: GeminiService, profile_svc) -> None:
    """enrich_region() returns valid narrative + compliance_log for every sample county."""
    region = profile_svc.get_profile(fips)
    enriched = gemini_svc.enrich_region(region)
    _check_region_response(enriched, fips)


@_requires_adc
@pytest.mark.parametrize("fips", _SAMPLE_FIPS)
def test_enrich_analogs_structured_output(fips: str, gemini_svc: GeminiService, analog_svc) -> None:
    """enrich_analogs() returns valid tradeoff + per-analog narratives for every sample county."""
    analogs = analog_svc.get_analogs(fips)
    enriched = gemini_svc.enrich_analogs(analogs)
    _check_analogs_response(enriched, fips)


@_requires_adc
@pytest.mark.parametrize("fips", _SAMPLE_FIPS)
def test_narrative_mentions_both_programs(fips: str, gemini_svc: GeminiService, profile_svc) -> None:
    """Region narrative must reference both Olympic and Paralympic tracks."""
    region = profile_svc.get_profile(fips)
    enriched = gemini_svc.enrich_region(region)
    narrative_lower = enriched.narrative.lower()
    assert "olympic" in narrative_lower, (
        f"FIPS {fips}: 'olympic' not found in narrative: {enriched.narrative!r}"
    )
    assert "paralympic" in narrative_lower, (
        f"FIPS {fips}: 'paralympic' not found in narrative: {enriched.narrative!r}"
    )


@_requires_adc
@pytest.mark.parametrize("fips", _SAMPLE_FIPS)
def test_compliance_log_schema(fips: str, gemini_svc: GeminiService, profile_svc) -> None:
    """Every ComplianceEntry in region response validates against the locked schema."""
    region = profile_svc.get_profile(fips)
    enriched = gemini_svc.enrich_region(region)
    for entry in enriched.compliance_log:
        assert entry.layer in ("rules", "gemini")
        assert entry.status in ("pass", "fail", "fixed")
        assert isinstance(entry.check, str) and entry.check
        assert isinstance(entry.details, str) and entry.details
        assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", entry.ts)


# ---------------------------------------------------------------------------
# Standalone runner (no pytest needed)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import traceback

    _s = get_settings()
    vertexai.init(project=_s.gcp_project, location=_s.gcp_location)

    _svc = GeminiService()
    _profile = get_profile_service()
    _analogs = get_analog_service()

    passed = 0
    failed = 0

    for fips in _SAMPLE_FIPS:
        print(f"\n{'='*60}")
        print(f"FIPS {fips}")
        print("=" * 60)
        try:
            region = _profile.get_profile(fips)
            enriched_region = _svc.enrich_region(region)
            _check_region_response(enriched_region, fips)
            print(f"  enrich_region   PASS  — narrative len={len(enriched_region.narrative)}, "
                  f"log entries={len(enriched_region.compliance_log)}")
            print(f"    narrative: {enriched_region.narrative[:120]}...")

            analogs = _analogs.get_analogs(fips)
            enriched_analogs = _svc.enrich_analogs(analogs)
            _check_analogs_response(enriched_analogs, fips)
            print(f"  enrich_analogs  PASS  — tradeoff len={len(enriched_analogs.tradeoff_explanation)}, "
                  f"analogs={len(enriched_analogs.analogs)}")

            # narrative + parity
            narrative_lower = enriched_region.narrative.lower()
            assert "olympic" in narrative_lower and "paralympic" in narrative_lower, (
                "parity: both programs not mentioned"
            )
            print(f"  parity check    PASS  — both Olympic + Paralympic mentioned")

            # compliance schema
            for entry in enriched_region.compliance_log:
                _check_compliance_entry(entry, fips)
            print(f"  compliance log  PASS  — all {len(enriched_region.compliance_log)} entries valid")

            passed += 1
        except Exception:
            failed += 1
            traceback.print_exc()

    print(f"\n{'='*60}")
    print(f"RESULT: {passed}/{passed+failed} counties passed")
    print("=" * 60)
    sys.exit(0 if failed == 0 else 1)
