from __future__ import annotations

from functools import lru_cache
from typing import Literal

import pandas as pd

from config import Settings, get_settings
from schemas.analog import AnalogEntry, AnalogsResponse, SimilarityBreakdown
from schemas.region import ComplianceEntry, MetricBlock, MetricsBlock
from services.profile_service import ProfileNotFoundError, _build_metrics, _centroid, _is_null

# D10: top 3 must span ≥2 distinct MSAs
_TARGET_ANALOGS = 3
_MIN_MSAS = 2
# How many candidates to pull from the matrix before diversity filtering
_CANDIDATE_POOL = 20


def _match_quality(score: float) -> Literal["high", "medium", "low"]:
    if score >= 0.75:
        return "high"
    if score >= 0.50:
        return "medium"
    return "low"


class AnalogService:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        self._matrix: pd.DataFrame = pd.read_parquet(s.similarity_matrix_path)
        self._profiles: pd.DataFrame = pd.read_parquet(s.county_profiles_path).set_index("fips")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_analogs(self, source_fips: str) -> AnalogsResponse:
        candidates = self._fetch_candidates(source_fips)
        selected = self._apply_msa_diversity(candidates, source_fips)

        analogs = [self._build_entry(row, rank) for rank, row in enumerate(selected, start=1)]

        return AnalogsResponse(
            source_fips=source_fips,
            analogs=analogs,
            tradeoff_explanation="",  # filled by GeminiService (task 2.7)
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fetch_candidates(self, source_fips: str) -> list[pd.Series]:
        pool = self._matrix[self._matrix["source_fips"] == source_fips].copy()
        if pool.empty:
            raise ProfileNotFoundError(
                f"No similarity rows found for FIPS {source_fips!r}. "
                "County may have zero athletes and was excluded from the matrix."
            )
        pool = pool.sort_values("overall_score", ascending=False).head(_CANDIDATE_POOL)
        return [row for _, row in pool.iterrows()]

    def _apply_msa_diversity(
        self, candidates: list[pd.Series], source_fips: str
    ) -> list[pd.Series]:
        """
        D10: select top-3 analogs that collectively span ≥2 distinct MSAs.

        Strategy:
          1. Take the best-scoring candidate unconditionally.
          2. For each subsequent slot, prefer a candidate from an MSA not yet represented.
          3. If we can't hit the _MIN_MSAS threshold with remaining candidates, fall back
             to the next-best regardless of MSA.
        """
        selected: list[pd.Series] = []
        seen_msas: set[str] = set()

        def _msa_of(analog_fips: str) -> str:
            try:
                return str(self._profiles.loc[analog_fips, "msa_label"])
            except KeyError:
                return ""

        # Convert to list of dicts so we can pop by index safely (avoids pandas Series ambiguity)
        remaining: list[dict] = [r.to_dict() for r in candidates]
        if not remaining:
            return selected

        best = remaining.pop(0)
        selected.append(pd.Series(best))
        seen_msas.add(_msa_of(str(best["analog_fips"])))

        # Subsequent picks: diversity-first, then fallback
        while len(selected) < _TARGET_ANALOGS and remaining:
            msas_needed = _MIN_MSAS - len(seen_msas)
            slots_left = _TARGET_ANALOGS - len(selected)

            if msas_needed > 0 and len(remaining) >= slots_left:
                idx = next(
                    (i for i, r in enumerate(remaining)
                     if _msa_of(str(r["analog_fips"])) not in seen_msas),
                    None,
                )
                pick_idx = idx if idx is not None else 0
            else:
                pick_idx = 0

            pick = remaining.pop(pick_idx)
            selected.append(pd.Series(pick))
            seen_msas.add(_msa_of(str(pick["analog_fips"])))

        return selected

    def _build_entry(self, row: pd.Series, rank: int) -> AnalogEntry:
        analog_fips = str(row["analog_fips"])
        try:
            profile_row = self._profiles.loc[analog_fips]
            metrics = _build_metrics(profile_row)
            centroid = _centroid(profile_row)
            county_name = str(profile_row["county_name"])
            state = str(profile_row["state"])
        except KeyError:
            # Analog FIPS not in profiles (shouldn't happen after pipeline validation)
            metrics = _fallback_metrics()
            centroid = None
            county_name = f"County {analog_fips}"
            state = ""

        return AnalogEntry(
            rank=rank,
            fips=analog_fips,
            county_name=county_name,
            state=state,
            overall_score=round(float(row["overall_score"]), 4),
            breakdown=SimilarityBreakdown(
                athlete=round(float(row["athlete_score"]), 4),
                sport_mix=round(float(row["sport_mix_score"]), 4),
                climate=round(float(row["climate_score"]), 4),
            ),
            match_quality=_match_quality(float(row["overall_score"])),
            metrics=metrics,
            centroid=centroid,
            narrative="",          # filled by GeminiService (task 2.7)
            compliance_log=[],     # filled by HybridAuditor (task 2.9)
        )


def _fallback_metrics() -> MetricsBlock:
    empty = MetricBlock(count=0, per_100k=0.0, percentile=0.0, evidence="low")
    return MetricsBlock(olympic=empty, paralympic=empty)


# ------------------------------------------------------------------
# Module-level singleton
# ------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_analog_service() -> AnalogService:
    return AnalogService()
