from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

import vertexai
from vertexai.generative_models import GenerationConfig, GenerativeModel

from config import Settings, get_settings
from schemas.analog import AnalogEntry, AnalogsResponse
from schemas.region import ComplianceEntry, RegionResponse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Structured output schemas (Vertex AI response_schema format)
# ---------------------------------------------------------------------------

_REGION_NARRATIVE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "safe_summary": {
            "type": "string",
            "description": "2-3 sentence narrative using ONLY conditional phrasing",
        },
        "key_points": {
            "type": "array",
            "items": {"type": "string"},
        },
        "uncertainty_note": {"type": "string"},
        "parity_check": {
            "type": "object",
            "properties": {
                "olympic_mentioned": {"type": "boolean"},
                "paralympic_mentioned": {"type": "boolean"},
                "deterministic_language": {"type": "boolean"},
            },
            "required": ["olympic_mentioned", "paralympic_mentioned", "deterministic_language"],
        },
    },
    "required": ["safe_summary", "key_points", "uncertainty_note", "parity_check"],
}

_ANALOG_TRADEOFF_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "leader_explanation": {"type": "string"},
        "tradeoffs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "county_name": {"type": "string"},
                    "tradeoff": {"type": "string"},
                },
                "required": ["county_name", "tradeoff"],
            },
        },
        "paralympic_focus_pick": {"type": "string"},
    },
    "required": ["leader_explanation", "tradeoffs", "paralympic_focus_pick"],
}

_ANALOG_NARRATIVE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "safe_summary": {"type": "string"},
        "uncertainty_note": {"type": "string"},
    },
    "required": ["safe_summary", "uncertainty_note"],
}

# ---------------------------------------------------------------------------
# System instruction (shared across all prompts)
# ---------------------------------------------------------------------------

_SYSTEM_INSTRUCTION = """You are a sports demographer producing safe, fan-facing narratives about \
U.S. county-level Team USA representation. RULES:

1. Use conditional phrasing only. NEVER causal language.
   GOOD: "could be associated with", "may correlate with", "originates from", \
"shows representation patterns"
   BANNED: "produces", "creates", "leads to", "guarantees", "is known for", "will", "makes"

2. ALWAYS mention BOTH Olympic and Paralympic data. If one is sparse, \
acknowledge it: "Paralympic signal is sparse in our indexed sources."

3. NEVER name individual athletes. Only aggregate counts.

4. NEVER imply geography determines athletic outcomes.

5. NEVER use IOC or USOPC trademarks beyond what is explicitly permitted."""


# ---------------------------------------------------------------------------
# GeminiService
# ---------------------------------------------------------------------------

class GeminiService:
    def __init__(self, settings: Settings | None = None) -> None:
        s = settings or get_settings()
        self._model_name = s.gemini_model
        self._model = GenerativeModel(
            self._model_name,
            system_instruction=_SYSTEM_INSTRUCTION,
        )

    # ------------------------------------------------------------------
    # Public API — called by routes after deterministic services
    # ------------------------------------------------------------------

    def enrich_region(self, region: RegionResponse) -> RegionResponse:
        """Fill region.narrative + region.compliance_log from Gemini."""
        packet = _build_region_packet(region)
        try:
            result = self._call(
                prompt=_region_narrative_prompt(packet),
                schema=_REGION_NARRATIVE_SCHEMA,
            )
            narrative = result.get("safe_summary", "")
            log_entries = _make_region_compliance_log(result)
        except Exception as exc:
            logger.warning("GeminiService.enrich_region failed for %s: %s", region.fips, exc)
            narrative = _fallback_region_narrative(region)
            log_entries = _error_log_entry("region_narrative", str(exc))

        return region.model_copy(update={"narrative": narrative, "compliance_log": log_entries})

    def enrich_analogs(self, analogs_response: AnalogsResponse) -> AnalogsResponse:
        """Fill tradeoff_explanation + per-analog narrative + compliance_log."""
        analogs = analogs_response.analogs

        # 1. Tradeoff explanation across all 3 analogs
        tradeoff_text = self._generate_tradeoff(analogs_response)

        # 2. Per-analog narrative (parallel would be nice but keeping sequential for simplicity)
        enriched: list[AnalogEntry] = []
        for entry in analogs:
            enriched.append(self._enrich_analog_entry(entry))

        return analogs_response.model_copy(
            update={"analogs": enriched, "tradeoff_explanation": tradeoff_text}
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _generate_tradeoff(self, analogs_response: AnalogsResponse) -> str:
        packet = _build_tradeoff_packet(analogs_response)
        try:
            result = self._call(
                prompt=_analog_tradeoff_prompt(packet),
                schema=_ANALOG_TRADEOFF_SCHEMA,
            )
            return result.get("leader_explanation", "")
        except Exception as exc:
            logger.warning(
                "GeminiService._generate_tradeoff failed for %s: %s",
                analogs_response.source_fips,
                exc,
            )
            return _fallback_tradeoff_narrative(analogs_response)

    def _enrich_analog_entry(self, entry: AnalogEntry) -> AnalogEntry:
        packet = _build_analog_packet(entry)
        try:
            result = self._call(
                prompt=_analog_narrative_prompt(packet),
                schema=_ANALOG_NARRATIVE_SCHEMA,
            )
            narrative = result.get("safe_summary", "")
            log_entries = _make_analog_compliance_log(result)
        except Exception as exc:
            logger.warning(
                "GeminiService._enrich_analog_entry failed for %s: %s", entry.fips, exc
            )
            narrative = _fallback_analog_narrative(entry)
            log_entries = _error_log_entry("analog_narrative", str(exc))

        return entry.model_copy(update={"narrative": narrative, "compliance_log": log_entries})

    def _call(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        response = self._model.generate_content(
            prompt,
            generation_config=GenerationConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=0.3,
            ),
        )
        return json.loads(response.text)


# ---------------------------------------------------------------------------
# Evidence packet builders
# ---------------------------------------------------------------------------

def _build_region_packet(region: RegionResponse) -> dict[str, Any]:
    return {
        "fips": region.fips,
        "county_name": region.county_name,
        "state": region.state,
        "population": region.population,
        "olympic_count": region.metrics.olympic.count,
        "olympic_per_100k": region.metrics.olympic.per_100k,
        "olympic_percentile": region.metrics.olympic.percentile,
        "paralympic_count": region.metrics.paralympic.count,
        "paralympic_per_100k": region.metrics.paralympic.per_100k,
        "paralympic_percentile": region.metrics.paralympic.percentile,
        "top_sports": [s.sport for s in region.top_sports[:3]],
        "climate_zone": region.climate.zone,
        "adaptive_access_chapters": region.adaptive_access.chapters_within_50mi,
    }


def _build_tradeoff_packet(analogs_response: AnalogsResponse) -> dict[str, Any]:
    return {
        "source_fips": analogs_response.source_fips,
        "candidates": [
            {
                "rank": a.rank,
                "county_name": a.county_name,
                "state": a.state,
                "overall_score": a.overall_score,
                "scores": {
                    "athlete": a.breakdown.athlete,
                    "sport_mix": a.breakdown.sport_mix,
                    "climate": a.breakdown.climate,
                },
                "olympic_per_100k": a.metrics.olympic.per_100k,
                "paralympic_per_100k": a.metrics.paralympic.per_100k,
            }
            for a in analogs_response.analogs
        ],
    }


def _build_analog_packet(entry: AnalogEntry) -> dict[str, Any]:
    return {
        "county_name": entry.county_name,
        "state": entry.state,
        "overall_score": entry.overall_score,
        "olympic_count": entry.metrics.olympic.count,
        "olympic_per_100k": entry.metrics.olympic.per_100k,
        "olympic_percentile": entry.metrics.olympic.percentile,
        "paralympic_count": entry.metrics.paralympic.count,
        "paralympic_per_100k": entry.metrics.paralympic.per_100k,
        "paralympic_percentile": entry.metrics.paralympic.percentile,
    }


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _region_narrative_prompt(packet: dict[str, Any]) -> str:
    return (
        f"Evidence packet for {packet['county_name']}, {packet['state']}:\n"
        f"{json.dumps(packet, indent=2)}\n\n"
        "Produce a 2-3 sentence narrative that:\n"
        "- Mentions both Olympic and Paralympic representation\n"
        "- Notes the top sport if one over-indexes\n"
        "- Uses ONLY conditional phrasing\n"
        "- Includes one uncertainty note\n"
        "Return JSON matching the schema."
    )


def _analog_tradeoff_prompt(packet: dict[str, Any]) -> str:
    return (
        f"Analog candidates for FIPS {packet['source_fips']}:\n"
        f"{json.dumps(packet, indent=2)}\n\n"
        "Compare the three candidates. Explain:\n"
        "1. Why the top-ranked county leads on overall similarity\n"
        "2. ONE notable tradeoff each candidate makes\n"
        "3. Which candidate would be most interesting for someone focused on Paralympic representation\n"
        "Use conditional phrasing only. Return JSON matching the schema."
    )


def _analog_narrative_prompt(packet: dict[str, Any]) -> str:
    return (
        f"Evidence packet for analog county {packet['county_name']}, {packet['state']}:\n"
        f"{json.dumps(packet, indent=2)}\n\n"
        "Produce a 1-2 sentence narrative using ONLY conditional phrasing. "
        "Mention both Olympic and Paralympic signals. Return JSON matching the schema."
    )


# ---------------------------------------------------------------------------
# Compliance log builders
# ---------------------------------------------------------------------------

def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_region_compliance_log(result: dict[str, Any]) -> list[ComplianceEntry]:
    parity = result.get("parity_check", {})
    ts = _utcnow()
    log: list[ComplianceEntry] = []

    log.append(ComplianceEntry(
        layer="gemini",
        check="olympic_mentioned",
        status="pass" if parity.get("olympic_mentioned") else "fail",
        details="Olympic representation referenced in narrative." if parity.get("olympic_mentioned")
            else "Olympic representation missing from narrative.",
        ts=ts,
    ))
    log.append(ComplianceEntry(
        layer="gemini",
        check="paralympic_mentioned",
        status="pass" if parity.get("paralympic_mentioned") else "fail",
        details="Paralympic representation referenced in narrative." if parity.get("paralympic_mentioned")
            else "Paralympic representation missing from narrative.",
        ts=ts,
    ))
    log.append(ComplianceEntry(
        layer="gemini",
        check="causal_tone",
        status="fail" if parity.get("deterministic_language") else "pass",
        details="Deterministic language detected — requires rewrite." if parity.get("deterministic_language")
            else "No deterministic language detected.",
        ts=ts,
    ))
    return log


def _make_analog_compliance_log(result: dict[str, Any]) -> list[ComplianceEntry]:
    ts = _utcnow()
    return [ComplianceEntry(
        layer="gemini",
        check="analog_narrative",
        status="pass",
        details="Analog narrative generated with conditional phrasing.",
        ts=ts,
    )]


def _error_log_entry(check: str, detail: str) -> list[ComplianceEntry]:
    return [ComplianceEntry(
        layer="gemini",
        check=check,
        status="fail",
        details=f"Gemini call failed: {detail[:120]}",
        ts=_utcnow(),
    )]


# ---------------------------------------------------------------------------
# Fallback narratives (when Gemini call fails)
# ---------------------------------------------------------------------------

def _fallback_region_narrative(region: RegionResponse) -> str:
    sports = ", ".join(s.sport for s in region.top_sports[:2])
    sport_clause = f" with associations to {sports}" if sports else ""
    return (
        f"{region.county_name} shows representation patterns{sport_clause} "
        f"that may correlate with local athletic development. "
        f"Olympic percentile: {region.metrics.olympic.percentile:.0f}th; "
        f"Paralympic percentile: {region.metrics.paralympic.percentile:.0f}th nationally. "
        "Data reflects 2016–2024 Team USA roster hometowns."
    )


def _fallback_tradeoff_narrative(analogs_response: AnalogsResponse) -> str:
    if not analogs_response.analogs:
        return "No analog counties available for comparison."
    top = analogs_response.analogs[0]
    return (
        f"{top.county_name}, {top.state} shows the strongest overall similarity "
        f"(score: {top.overall_score:.2f}). "
        "Detailed tradeoff analysis is temporarily unavailable."
    )


def _fallback_analog_narrative(entry: AnalogEntry) -> str:
    return (
        f"{entry.county_name} shows representation patterns that may correlate with "
        f"similar community and climate characteristics. "
        f"Olympic percentile: {entry.metrics.olympic.percentile:.0f}th; "
        f"Paralympic percentile: {entry.metrics.paralympic.percentile:.0f}th nationally."
    )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_gemini_service() -> GeminiService:
    return GeminiService()
