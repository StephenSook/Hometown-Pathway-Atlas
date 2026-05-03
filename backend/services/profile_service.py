from __future__ import annotations

import math
from functools import lru_cache

import pandas as pd

from config import Settings, get_settings
from schemas.region import (
    AdaptiveAccessBlock,
    ClimateBlock,
    ComplianceEntry,
    MetricBlock,
    MetricsBlock,
    RegionResponse,
    SportEntry,
)


class ProfileNotFoundError(Exception):
    pass


class ZipNotFoundError(Exception):
    pass


class ProfileService:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        self._zip_df: pd.DataFrame = pd.read_parquet(s.zip_crosswalk_path).set_index("zip")
        self._profiles: pd.DataFrame = pd.read_parquet(s.county_profiles_path).set_index("fips")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def zip_to_fips(self, zip_code: str) -> str:
        """Resolve a 5-digit ZIP to a county FIPS code."""
        try:
            return str(self._zip_df.loc[zip_code, "fips"])
        except KeyError:
            raise ZipNotFoundError(f"ZIP {zip_code!r} not found in crosswalk")

    def get_profile(self, fips: str) -> RegionResponse:
        """Return a full RegionResponse for a county FIPS."""
        try:
            row = self._profiles.loc[fips]
        except KeyError:
            raise ProfileNotFoundError(f"FIPS {fips!r} not found in county profiles")

        return RegionResponse(
            fips=fips,
            county_name=str(row["county_name"]),
            state=str(row["state"]),
            msa_label=str(row["msa_label"]) if row["msa_label"] else "",
            population=int(row["population"]) if not _is_null(row["population"]) else 0,
            centroid=_centroid(row),
            metrics=_build_metrics(row),
            top_sports=_build_top_sports(row),
            climate=_build_climate(row),
            adaptive_access=_build_adaptive_access(row),
            narrative="",          # filled by GeminiService (task 2.7)
            compliance_log=[],     # filled by HybridAuditor (task 2.9)
        )

    def get_profile_by_zip(self, zip_code: str) -> RegionResponse:
        fips = self.zip_to_fips(zip_code)
        return self.get_profile(fips)


# ------------------------------------------------------------------
# Module-level singleton (loaded once at first call)
# ------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_profile_service() -> ProfileService:
    return ProfileService()


# ------------------------------------------------------------------
# Private helpers
# ------------------------------------------------------------------

def _is_null(val: object) -> bool:
    try:
        return math.isnan(float(val))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return val is None


def _centroid(row: pd.Series) -> tuple[float, float] | None:
    lng = row.get("centroid_lng")
    lat = row.get("centroid_lat")
    if _is_null(lng) or _is_null(lat):
        return None
    return (float(lng), float(lat))


def _build_metrics(row: pd.Series) -> MetricsBlock:
    return MetricsBlock(
        olympic=MetricBlock(
            count=int(row["olympic_count"]),
            per_100k=round(float(row["olympic_per_100k"]), 2),
            percentile=round(float(row["olympic_percentile"]), 1),
            evidence=str(row["olympic_evidence"]),  # type: ignore[arg-type]
        ),
        paralympic=MetricBlock(
            count=int(row["paralympic_count"]),
            per_100k=round(float(row["paralympic_per_100k"]), 2),
            percentile=round(float(row["paralympic_percentile"]), 1),
            evidence=str(row["paralympic_evidence"]),  # type: ignore[arg-type]
        ),
    )


def _build_top_sports(row: pd.Series) -> list[SportEntry]:
    raw = str(row.get("top_sports", ""))
    if not raw:
        return []
    sports = [s.strip() for s in raw.split(",") if s.strip()]
    # Equal-weight share since we only store names, not counts in top_sports string
    share = round(1.0 / len(sports), 3) if sports else 0.0
    return [SportEntry(sport=s, share=share) for s in sports]


def _build_climate(row: pd.Series) -> ClimateBlock:
    temp = row.get("avg_temp_f")
    precip = row.get("annual_precip_in")
    return ClimateBlock(
        zone=str(row.get("climate_zone", "unknown")),
        avg_temp_f=None if _is_null(temp) else round(float(temp), 1),
        annual_precip_in=None if _is_null(precip) else round(float(precip), 1),
    )


def _build_adaptive_access(row: pd.Series) -> AdaptiveAccessBlock:
    conf_raw = str(row.get("adaptive_access_confidence", "none"))
    # parquet stores "low" for counties with no Move United chapters near them;
    # the UI contract uses "high" | "medium" | "none"
    conf_map = {"high": "high", "medium": "medium", "low": "none", "none": "none"}
    return AdaptiveAccessBlock(
        chapters_within_50mi=int(row.get("move_united_chapters_50mi", 0)),
        confidence=conf_map.get(conf_raw, "none"),  # type: ignore[arg-type]
    )
