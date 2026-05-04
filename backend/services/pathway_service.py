from __future__ import annotations

from functools import lru_cache
from typing import Literal

import pandas as pd

from config import Settings, get_settings
from schemas.pathway import EvidenceBlock, GapEntry, PathwayResponse

# Thresholds (aligned with 07_aggregate.py evidence labels)
_HIGH_COUNT = 10
_MED_COUNT = 3

# Percentile thresholds for strength / gap signals
_STRONG_PERCENTILE = 70.0   # county is in top-30% nationally
_WEAK_PERCENTILE = 40.0     # county is in bottom-40% nationally


class PathwayNotFoundError(Exception):
    pass


class PathwayService:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        self._profiles: pd.DataFrame = pd.read_parquet(s.county_profiles_path).set_index("fips")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_pathway(self, fips: str) -> PathwayResponse:
        try:
            row = self._profiles.loc[fips]
        except KeyError:
            raise PathwayNotFoundError(f"FIPS {fips!r} not found in county profiles")

        gaps: list[GapEntry] = []
        gaps.extend(self._observed_strength(fips, row))
        gaps.extend(self._public_access_signal(fips, row))
        gaps.extend(self._opportunity_hypothesis(fips, row))

        return PathwayResponse(source_fips=fips, gaps=gaps)

    # ------------------------------------------------------------------
    # Category builders
    # ------------------------------------------------------------------

    def _observed_strength(self, fips: str, row: pd.Series) -> list[GapEntry]:
        """
        Highlight the county's strongest representation signal.
        Uses the higher of Olympic vs Paralympic smoothed percentile.
        """
        o_pct = _safe_float(row.get("olympic_percentile"), 0.0)
        p_pct = _safe_float(row.get("paralympic_percentile"), 0.0)
        o_count = _safe_int(row.get("olympic_count"), 0)
        p_count = _safe_int(row.get("paralympic_count"), 0)

        if o_pct >= p_pct:
            dominant, count, pct = "Olympic", o_count, o_pct
        else:
            dominant, count, pct = "Paralympic", p_count, p_pct

        top_sports = _parse_top_sports(str(row.get("top_sports", "")))
        sport_phrase = f" in {top_sports[0]}" if top_sports else ""

        if pct >= _STRONG_PERCENTILE:
            claim = (
                f"This county shows representation patterns{sport_phrase} "
                f"that place it in the top {100 - pct:.0f}% of US counties "
                f"for {dominant} athlete hometowns."
            )
            confidence: Literal["high", "medium", "low"] = (
                "high" if count >= _HIGH_COUNT else "medium" if count >= _MED_COUNT else "low"
            )
        else:
            claim = (
                f"This county shows emerging representation patterns{sport_phrase} "
                f"with potential to grow ({dominant} percentile: {pct:.0f}th)."
            )
            confidence = "low"

        return [GapEntry(
            category="observed_strength",
            claim=claim,
            evidence=EvidenceBlock(
                metric=f"{dominant.lower()}_percentile",
                value=float(count),
                percentile=round(pct, 1),
                data_caveat="Based on 2016–2024 Team USA roster hometowns.",
            ),
            confidence=confidence,
        )]

    def _public_access_signal(self, fips: str, row: pd.Series) -> list[GapEntry]:
        """
        Surfaces adaptive-access / Move United chapter density as a public infrastructure signal.
        Display-only per D2 — never influences similarity scores.
        """
        chapters = int(row.get("move_united_chapters_50mi", 0))
        conf_raw = str(row.get("adaptive_access_confidence", "none"))

        if chapters > 0:
            claim = (
                f"There are approximately {chapters} Move United chapter(s) within 50 miles, "
                "which may indicate existing adaptive sports infrastructure in the region."
            )
            confidence_label: Literal["high", "medium", "low"] = (
                "high" if conf_raw == "high" else "medium" if conf_raw == "medium" else "low"
            )
            framing = None
        else:
            claim = (
                "No Move United chapters were identified within 50 miles. "
                "This could represent a gap in publicly documented adaptive sports access."
            )
            confidence_label = "low"
            framing = (
                "Absence of known chapters does not imply absence of programs — "
                "data reflects publicly listed Move United chapters only."
            )

        return [GapEntry(
            category="public_access_signal",
            claim=claim,
            evidence=EvidenceBlock(
                metric="move_united_chapters_50mi",
                value=float(chapters),
                framing=framing,
                data_caveat="Move United chapter listings as of data collection date. Display-only.",
            ),
            confidence=confidence_label,
        )]

    def _opportunity_hypothesis(self, fips: str, row: pd.Series) -> list[GapEntry]:
        """
        Identifies a sport or dimension where the county shows low representation
        relative to its climate/demographic profile — framed as opportunity, not deficiency.
        """
        o_pct = _safe_float(row.get("olympic_percentile"), 0.0)
        p_pct = _safe_float(row.get("paralympic_percentile"), 0.0)
        climate_zone = str(row.get("climate_zone", "unknown"))
        top_sports = _parse_top_sports(str(row.get("top_sports", "")))

        # Surface the weaker of the two tracks as the opportunity
        if p_pct <= o_pct:
            weak_track = "Paralympic"
            weak_pct = p_pct
            weak_count = _safe_int(row.get("paralympic_count"), 0)
        else:
            weak_track = "Olympic"
            weak_pct = o_pct
            weak_count = _safe_int(row.get("olympic_count"), 0)

        sport_context = (
            f" The county's strongest sport associations are {', '.join(top_sports[:2])}."
            if len(top_sports) >= 2
            else ""
        )

        claim = (
            f"Counties with similar climate profiles ({climate_zone}) "
            f"could show higher {weak_track} representation than observed here "
            f"({weak_track} percentile: {weak_pct:.0f}th).{sport_context} "
            "Targeted development programs could help find pathways for local athletes."
        )

        confidence: Literal["high", "medium", "low"] = (
            "medium" if weak_pct < _WEAK_PERCENTILE else "low"
        )

        return [GapEntry(
            category="opportunity_hypothesis",
            claim=claim,
            evidence=EvidenceBlock(
                metric=f"{weak_track.lower()}_percentile",
                value=float(weak_count),
                percentile=round(weak_pct, 1),
                data_caveat="Hypothesis based on climate similarity patterns. Not a guarantee of outcomes.",
            ),
            confidence=confidence,
        )]


# ------------------------------------------------------------------
# Private helpers
# ------------------------------------------------------------------

def _safe_float(val: object, default: float = 0.0) -> float:
    try:
        import math
        v = float(val)  # type: ignore[arg-type]
        return default if math.isnan(v) else v
    except (TypeError, ValueError):
        return default


def _safe_int(val: object, default: int = 0) -> int:
    try:
        import math
        v = float(val)  # type: ignore[arg-type]
        return default if math.isnan(v) else int(v)
    except (TypeError, ValueError):
        return default


def _parse_top_sports(raw: str) -> list[str]:
    return [s.strip() for s in raw.split(",") if s.strip()]


# ------------------------------------------------------------------
# Module-level singleton
# ------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_pathway_service() -> PathwayService:
    return PathwayService()
