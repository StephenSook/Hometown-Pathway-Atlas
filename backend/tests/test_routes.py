"""
HTTP route integration tests using FastAPI TestClient.

Covers all 5 endpoints with valid/invalid inputs, error shapes, and status codes.
No network calls — GeminiService and VertexAI are mocked throughout.

Usage (from backend/):
    .venv/Scripts/python.exe -m pytest tests/test_routes.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import pytest
from fastapi.testclient import TestClient

from schemas.analog import AnalogEntry, AnalogsResponse, SimilarityBreakdown
from schemas.pathway import EvidenceBlock, GapEntry, PathwayResponse
from schemas.region import (
    AdaptiveAccessBlock,
    ClimateBlock,
    ComplianceEntry,
    MetricBlock,
    MetricsBlock,
    RegionResponse,
    SportEntry,
)


# ---------------------------------------------------------------------------
# Shared fixtures / stubs
# ---------------------------------------------------------------------------

def _make_metric(count: int = 5, pct: float = 60.0) -> MetricBlock:
    return MetricBlock(count=count, per_100k=1.5, percentile=pct, evidence="medium")


def _make_region(fips: str = "13067") -> RegionResponse:
    return RegionResponse(
        fips=fips,
        county_name="Cobb County",
        state="GA",
        msa_label="Atlanta-Sandy Springs-Roswell",
        population=760_141,
        centroid=(-84.5, 33.9),
        metrics=MetricsBlock(olympic=_make_metric(), paralympic=_make_metric(2, 40.0)),
        top_sports=[SportEntry(sport="Swimming", share=0.5), SportEntry(sport="Gymnastics", share=0.5)],
        climate=ClimateBlock(zone="humid_subtropical", avg_temp_f=62.0, annual_precip_in=52.0),
        adaptive_access=AdaptiveAccessBlock(chapters_within_50mi=3, confidence="medium"),
        narrative="This county shows representation patterns.",
        compliance_log=[
            ComplianceEntry(
                layer="rules",
                check="causal_language",
                status="pass",
                details="No causal language.",
                ts="2026-05-04T00:00:00Z",
            )
        ],
    )


def _make_analogs(source_fips: str = "13067") -> AnalogsResponse:
    def _entry(rank: int, fips: str) -> AnalogEntry:
        return AnalogEntry(
            rank=rank,
            fips=fips,
            county_name=f"County {fips}",
            state="GA",
            overall_score=0.85 - rank * 0.05,
            breakdown=SimilarityBreakdown(athlete=0.8, sport_mix=0.85, climate=0.9),
            match_quality="high",
            metrics=MetricsBlock(olympic=_make_metric(), paralympic=_make_metric()),
            centroid=(-84.0, 33.5),
            narrative="Similar representation patterns.",
            compliance_log=[],
        )

    return AnalogsResponse(
        source_fips=source_fips,
        analogs=[_entry(1, "13121"), _entry(2, "13089"), _entry(3, "13057")],
        tradeoff_explanation="Top county leads on athlete profile similarity.",
    )


def _make_pathway(fips: str = "13067") -> PathwayResponse:
    return PathwayResponse(
        source_fips=fips,
        gaps=[
            GapEntry(
                category="observed_strength",
                claim="This county shows strong representation patterns.",
                evidence=EvidenceBlock(metric="olympic_percentile", value=12.0, percentile=85.0),
                confidence="high",
            ),
            GapEntry(
                category="public_access_signal",
                claim="There are 3 Move United chapters within 50 miles.",
                evidence=EvidenceBlock(metric="move_united_chapters_50mi", value=3.0),
                confidence="medium",
            ),
            GapEntry(
                category="opportunity_hypothesis",
                claim="Counties with similar climate could show higher Paralympic representation.",
                evidence=EvidenceBlock(metric="paralympic_percentile", value=2.0, percentile=40.0),
                confidence="low",
            ),
        ],
    )


# ---------------------------------------------------------------------------
# App fixture — mock settings + VertexAI init + GeminiService to avoid network
# ---------------------------------------------------------------------------

def _make_test_settings():
    from config import Settings
    # Pass _env_file=None to prevent pydantic-settings from reading the .env file,
    # which contains extra keys (GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT)
    # that Settings forbids as extras.
    return Settings(
        _env_file=None,
        gcp_project="test-project",
        gcp_location="us-central1",
        gemini_model="gemini-2.5-flash",
        frontend_origin="http://localhost:5173",
    )


@pytest.fixture(scope="module")
def client():
    with (
        patch("config.get_settings", return_value=_make_test_settings()),
        patch("vertexai.init"),
    ):
        # Import app inside the patch so module-level get_settings() sees the mock
        import importlib
        import main as _main_mod
        importlib.reload(_main_mod)
        app = _main_mod.app

        mock_gemini = MagicMock()
        mock_gemini.enrich_region.side_effect = lambda r: r
        mock_gemini.enrich_analogs.side_effect = lambda r: r
        # qa() mock — return a deterministic conditional-phrased response.
        from schemas.region import ReasoningStep, RegionQAResponse
        mock_gemini.qa.side_effect = lambda region, question: RegionQAResponse(
            reasoning=[
                ReasoningStep(
                    step="Pulling region context",
                    detail="Olympic + Paralympic per-100k, top sports, climate, adaptive access.",
                ),
                ReasoningStep(
                    step="Drafting conditional-phrased response",
                    detail="Hedged claims only.",
                ),
            ],
            answer=(
                f"{region.county_name} could be associated with regional pathway dynamics "
                f"that may correlate with climate signature and indexed-source coverage."
            ),
            confidence="medium",
            source="gemini",
            compliance_log=[],
        )

        with patch("routes.region.get_gemini_service", return_value=mock_gemini), \
             patch("routes.analogs.get_gemini_service", return_value=mock_gemini):
            with TestClient(app, raise_server_exceptions=True) as c:
                yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_returns_ok(self, client: TestClient) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/region
# ---------------------------------------------------------------------------

class TestRegionRoute:
    def test_valid_zip_returns_200(self, client: TestClient) -> None:
        region = _make_region()
        with patch("routes.region.get_profile_service") as mock_factory:
            svc = MagicMock()
            svc.get_profile_by_zip.return_value = region
            mock_factory.return_value = svc
            with patch("routes.region.get_gemini_service") as gf:
                gf.return_value.enrich_region.side_effect = lambda r: r
                resp = client.post("/api/region", json={"zip": "30060"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["fips"] == "13067"
        assert data["county_name"] == "Cobb County"
        assert "metrics" in data
        assert "compliance_log" in data

    def test_invalid_zip_format_returns_422(self, client: TestClient) -> None:
        resp = client.post("/api/region", json={"zip": "ABCDE"})
        assert resp.status_code == 422

    def test_zip_too_short_returns_422(self, client: TestClient) -> None:
        resp = client.post("/api/region", json={"zip": "300"})
        assert resp.status_code == 422

    def test_zip_too_long_returns_422(self, client: TestClient) -> None:
        resp = client.post("/api/region", json={"zip": "300601"})
        assert resp.status_code == 422

    def test_unknown_zip_returns_404(self, client: TestClient) -> None:
        from services.profile_service import ZipNotFoundError
        with patch("routes.region.get_profile_service") as mock_factory:
            svc = MagicMock()
            svc.get_profile_by_zip.side_effect = ZipNotFoundError("ZIP '99999' not found")
            mock_factory.return_value = svc
            resp = client.post("/api/region", json={"zip": "99999"})
        assert resp.status_code == 404
        assert "detail" in resp.json()

    def test_missing_zip_field_returns_422(self, client: TestClient) -> None:
        resp = client.post("/api/region", json={})
        assert resp.status_code == 422

    def test_by_fips_valid_returns_200(self, client: TestClient) -> None:
        region = _make_region()
        with patch("routes.region.get_profile_service") as mock_factory:
            svc = MagicMock()
            svc.get_profile.return_value = region
            mock_factory.return_value = svc
            with patch("routes.region.get_gemini_service") as gf:
                gf.return_value.enrich_region.side_effect = lambda r: r
                resp = client.get("/api/region/by-fips/13067")
        assert resp.status_code == 200
        assert resp.json()["fips"] == "13067"

    def test_by_fips_unknown_returns_404(self, client: TestClient) -> None:
        from services.profile_service import ProfileNotFoundError
        with patch("routes.region.get_profile_service") as mock_factory:
            svc = MagicMock()
            svc.get_profile.side_effect = ProfileNotFoundError("FIPS '00000' not found")
            mock_factory.return_value = svc
            resp = client.get("/api/region/by-fips/00000")
        assert resp.status_code == 404

    def test_sentinel_sparse_zip_00000_returns_404(self, client: TestClient) -> None:
        from services.profile_service import ZipNotFoundError
        with patch("routes.region.get_profile_service") as mock_factory:
            svc = MagicMock()
            svc.get_profile_by_zip.side_effect = ZipNotFoundError("ZIP '00000' not found")
            mock_factory.return_value = svc
            resp = client.post("/api/region", json={"zip": "00000"})
        assert resp.status_code == 404

    def test_compliance_log_in_response(self, client: TestClient) -> None:
        region = _make_region()
        with patch("routes.region.get_profile_service") as mock_factory:
            svc = MagicMock()
            svc.get_profile_by_zip.return_value = region
            mock_factory.return_value = svc
            with patch("routes.region.get_gemini_service") as gf:
                gf.return_value.enrich_region.side_effect = lambda r: r
                resp = client.post("/api/region", json={"zip": "30060"})
        log = resp.json()["compliance_log"]
        assert isinstance(log, list)
        assert len(log) > 0
        entry = log[0]
        assert entry["layer"] in ("rules", "gemini")
        assert entry["status"] in ("pass", "fail", "fixed")


# ---------------------------------------------------------------------------
# GET /api/analogs/{fips}
# ---------------------------------------------------------------------------

class TestAnalogsRoute:
    def test_valid_fips_returns_200(self, client: TestClient) -> None:
        analogs = _make_analogs()
        with patch("routes.analogs.get_analog_service") as af:
            af.return_value.get_analogs.return_value = analogs
            with patch("routes.analogs.get_gemini_service") as gf:
                gf.return_value.enrich_analogs.side_effect = lambda r: r
                resp = client.get("/api/analogs/13067")
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_fips"] == "13067"
        assert len(data["analogs"]) == 3
        assert "tradeoff_explanation" in data

    def test_unknown_fips_returns_404(self, client: TestClient) -> None:
        from services.profile_service import ProfileNotFoundError
        with patch("routes.analogs.get_analog_service") as af:
            af.return_value.get_analogs.side_effect = ProfileNotFoundError("FIPS '00000' not found")
            resp = client.get("/api/analogs/00000")
        assert resp.status_code == 404

    def test_analog_entry_has_required_fields(self, client: TestClient) -> None:
        analogs = _make_analogs()
        with patch("routes.analogs.get_analog_service") as af:
            af.return_value.get_analogs.return_value = analogs
            with patch("routes.analogs.get_gemini_service") as gf:
                gf.return_value.enrich_analogs.side_effect = lambda r: r
                resp = client.get("/api/analogs/13067")
        entry = resp.json()["analogs"][0]
        for field in ("rank", "fips", "county_name", "state", "overall_score", "breakdown",
                      "match_quality", "metrics", "narrative"):
            assert field in entry, f"Missing field: {field}"

    def test_returns_3_analogs(self, client: TestClient) -> None:
        analogs = _make_analogs()
        with patch("routes.analogs.get_analog_service") as af:
            af.return_value.get_analogs.return_value = analogs
            with patch("routes.analogs.get_gemini_service") as gf:
                gf.return_value.enrich_analogs.side_effect = lambda r: r
                resp = client.get("/api/analogs/13067")
        assert len(resp.json()["analogs"]) == 3


# ---------------------------------------------------------------------------
# GET /api/pathway/{fips}
# ---------------------------------------------------------------------------

class TestPathwayRoute:
    def test_valid_fips_returns_200(self, client: TestClient) -> None:
        pathway = _make_pathway()
        with patch("routes.pathway.get_pathway_service") as sf:
            sf.return_value.get_pathway.return_value = pathway
            resp = client.get("/api/pathway/13067")
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_fips"] == "13067"
        assert len(data["gaps"]) == 3

    def test_unknown_fips_returns_404(self, client: TestClient) -> None:
        from services.pathway_service import PathwayNotFoundError
        with patch("routes.pathway.get_pathway_service") as sf:
            sf.return_value.get_pathway.side_effect = PathwayNotFoundError("FIPS '00000' not found")
            resp = client.get("/api/pathway/00000")
        assert resp.status_code == 404

    def test_all_three_gap_categories_present(self, client: TestClient) -> None:
        pathway = _make_pathway()
        with patch("routes.pathway.get_pathway_service") as sf:
            sf.return_value.get_pathway.return_value = pathway
            resp = client.get("/api/pathway/13067")
        categories = {g["category"] for g in resp.json()["gaps"]}
        assert "observed_strength" in categories
        assert "public_access_signal" in categories
        assert "opportunity_hypothesis" in categories

    def test_gap_entry_schema(self, client: TestClient) -> None:
        pathway = _make_pathway()
        with patch("routes.pathway.get_pathway_service") as sf:
            sf.return_value.get_pathway.return_value = pathway
            resp = client.get("/api/pathway/13067")
        gap = resp.json()["gaps"][0]
        assert gap["category"] in ("observed_strength", "public_access_signal", "opportunity_hypothesis")
        assert gap["confidence"] in ("high", "medium", "low")
        assert isinstance(gap["claim"], str) and gap["claim"]


# ---------------------------------------------------------------------------
# GET /api/stats/county/{fips}
# ---------------------------------------------------------------------------

class TestStatsRoute:
    def test_valid_fips_returns_200(self, client: TestClient) -> None:
        region = _make_region()
        with patch("routes.stats.get_profile_service") as sf:
            sf.return_value.get_profile.return_value = region
            resp = client.get("/api/stats/county/13067")
        assert resp.status_code == 200
        data = resp.json()
        assert data["fips"] == "13067"
        assert "olympic_per_100k" in data
        assert "paralympic_per_100k" in data
        assert "olympic_evidence" in data
        assert "paralympic_evidence" in data

    def test_unknown_fips_returns_404(self, client: TestClient) -> None:
        from services.profile_service import ProfileNotFoundError
        with patch("routes.stats.get_profile_service") as sf:
            sf.return_value.get_profile.side_effect = ProfileNotFoundError("not found")
            resp = client.get("/api/stats/county/00000")
        assert resp.status_code == 404

    def test_evidence_values_are_valid(self, client: TestClient) -> None:
        region = _make_region()
        with patch("routes.stats.get_profile_service") as sf:
            sf.return_value.get_profile.return_value = region
            resp = client.get("/api/stats/county/13067")
        data = resp.json()
        assert data["olympic_evidence"] in ("high", "medium", "low")
        assert data["paralympic_evidence"] in ("high", "medium", "low")


# ---------------------------------------------------------------------------
# GET /api/stats/global
# ---------------------------------------------------------------------------

def _make_global_profiles_df() -> "pd.DataFrame":
    """Minimal county_profiles DataFrame for /api/stats/global unit tests."""
    import numpy as np
    import pandas as pd

    # 10 rows: 2 with athletes, 8 without
    data = {
        "fips": [f"{i:05d}" for i in range(10)],
        "olympic_count": [5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "paralympic_count": [3, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        # population: row 0 is a major metro (>250K), rows 1-9 are small (<250K)
        "population": [5_000_000, 50_000, 80_000, 100_000, 120_000,
                       30_000, 40_000, 60_000, 90_000, 110_000],
        # smoothed Paralympic rate — set row 1 high so it beats metro median
        "paralympic_smoothed": [0.01, 0.50, 0.001, 0.002, 0.001,
                                0.001, 0.002, 0.001, 0.001, 0.001],
        "olympic_smoothed": [0.05, 0.00, 0.001, 0.001, 0.001,
                             0.001, 0.001, 0.001, 0.001, 0.001],
    }
    return pd.DataFrame(data)


class TestGlobalStatsRoute:
    def test_returns_200_with_expected_shape(self, client: TestClient) -> None:
        from routes.stats import _compute_global_stats
        _compute_global_stats.cache_clear()

        with patch("routes.stats.pd.read_parquet", return_value=_make_global_profiles_df()):
            resp = client.get("/api/stats/global")

        assert resp.status_code == 200
        data = resp.json()
        assert "gap" in data
        assert "underdog" in data

    def test_gap_stat_fields(self, client: TestClient) -> None:
        from routes.stats import _compute_global_stats
        _compute_global_stats.cache_clear()

        with patch("routes.stats.pd.read_parquet", return_value=_make_global_profiles_df()):
            resp = client.get("/api/stats/global")

        gap = resp.json()["gap"]
        assert gap["total_counties"] == 10
        assert gap["counties_with_athletes"] == 2
        assert gap["counties_no_athletes"] == 8
        assert isinstance(gap["ratio_display"], str) and gap["ratio_display"]
        assert isinstance(gap["headline"], str) and "counties" in gap["headline"]

    def test_underdog_stat_fields(self, client: TestClient) -> None:
        from routes.stats import _compute_global_stats
        _compute_global_stats.cache_clear()

        with patch("routes.stats.pd.read_parquet", return_value=_make_global_profiles_df()):
            resp = client.get("/api/stats/global")

        u = resp.json()["underdog"]
        assert isinstance(u["n_small_counties"], int)
        assert isinstance(u["n_beating_metro"], int)
        assert isinstance(u["pct_display"], str) and u["pct_display"].endswith("%")
        assert isinstance(u["headline"], str) and "250,000" in u["headline"]

    def test_ratio_display_is_4_in_5_for_80pct_gap(self, client: TestClient) -> None:
        """With 8/10 counties having no athletes (80% gap), ratio_display should be '4 in 5'."""
        from routes.stats import _compute_global_stats
        _compute_global_stats.cache_clear()

        with patch("routes.stats.pd.read_parquet", return_value=_make_global_profiles_df()):
            resp = client.get("/api/stats/global")

        assert resp.json()["gap"]["ratio_display"] == "4 in 5"

    def test_pct_with_athletes_sums_correctly(self, client: TestClient) -> None:
        from routes.stats import _compute_global_stats
        _compute_global_stats.cache_clear()

        with patch("routes.stats.pd.read_parquet", return_value=_make_global_profiles_df()):
            resp = client.get("/api/stats/global")

        gap = resp.json()["gap"]
        assert gap["pct_with_athletes"] == pytest.approx(20.0, abs=0.1)


# ---------------------------------------------------------------------------
# POST /api/region/qa (B3 — Layer C live wire)
# ---------------------------------------------------------------------------

class TestRegionQA:
    def test_valid_payload_returns_200(self, client: TestClient) -> None:
        with patch(
            "services.profile_service.ProfileService.get_profile",
            return_value=_make_region(),
        ):
            resp = client.post(
                "/api/region/qa",
                json={"fips": "13067", "question": "What might explain this region’s sport pattern?"},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert "reasoning" in body
        assert "answer" in body
        assert body["confidence"] in ("high", "medium", "low")
        assert isinstance(body["reasoning"], list)
        assert len(body["reasoning"]) >= 1
        for step in body["reasoning"]:
            assert "step" in step
            assert "detail" in step

    def test_unknown_fips_returns_404(self, client: TestClient) -> None:
        from services.profile_service import ProfileNotFoundError
        with patch(
            "services.profile_service.ProfileService.get_profile",
            side_effect=ProfileNotFoundError("FIPS not found"),
        ):
            resp = client.post(
                "/api/region/qa",
                json={"fips": "99999", "question": "Test?"},
            )
        assert resp.status_code == 404

    def test_invalid_fips_format_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/api/region/qa",
            json={"fips": "abc", "question": "Test?"},
        )
        assert resp.status_code == 422

    def test_empty_question_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/api/region/qa",
            json={"fips": "13067", "question": ""},
        )
        assert resp.status_code == 422

    def test_question_over_500_chars_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/api/region/qa",
            json={"fips": "13067", "question": "x" * 501},
        )
        assert resp.status_code == 422

    def test_missing_question_field_returns_422(self, client: TestClient) -> None:
        resp = client.post("/api/region/qa", json={"fips": "13067"})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# CORS header check (spot-check one endpoint)
# ---------------------------------------------------------------------------

class TestCORS:
    def test_cors_header_present_for_allowed_origin(self, client: TestClient) -> None:
        resp = client.get(
            "/health",
            headers={"Origin": "http://localhost:5173"},
        )
        assert resp.status_code == 200
        # CORS middleware should echo the origin back
        assert "access-control-allow-origin" in resp.headers
