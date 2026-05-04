"""HybridAuditor — deterministic rules pass + Gemini semantic rewrite loop."""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

from vertexai.generative_models import GenerationConfig, GenerativeModel

from config import get_settings
from schemas.region import ComplianceEntry

logger = logging.getLogger(__name__)


_CAUSAL_PATTERN = re.compile(
    r"\b(produces?|creates?|leads? to|led to|guarantees?|makes?|is known for"
    r"|will\s+(?:produce|create|guarantee|lead|make|generate|ensure|result|cause))\b",
    re.IGNORECASE,
)

_OLYMPIC_PATTERN = re.compile(r"\bOlympic\b", re.IGNORECASE)
_PARALYMPIC_PATTERN = re.compile(r"\bParalympic\b", re.IGNORECASE)

_NAME_PATTERN = re.compile(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b")

_SAFE_BIGRAMS = {
    "Cobb County", "Los Angeles", "New York", "San Francisco", "Salt Lake",
    "Long Beach", "Team USA", "United States", "Cloud Run", "Move United",
    "Bayesian shrinkage", "Both Olympic", "Both Paralympic",
}

_REWRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "is_causal_tone": {"type": "boolean"},
        "rewrite": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    },
    "required": ["is_causal_tone", "rewrite", "confidence"],
}

_MAX_REWRITE_ATTEMPTS = 2

# Module-level model reference — None until first call, mockable in tests
vertexai_model: GenerativeModel | None = None


def _get_model() -> GenerativeModel:
    global vertexai_model
    if vertexai_model is None:
        s = get_settings()
        vertexai_model = GenerativeModel(
            model_name=s.gemini_model,
            system_instruction=(
                "You are a compliance auditor for sports analytics content. "
                "Identify causal language that implies geography deterministically "
                "produces athletes. Rewrite to use conditional phrasing: "
                "'originates from', 'shows representation patterns', "
                "'may correlate with', 'could be associated with'. "
                "Never use: produces, creates, leads to, guarantees, makes, will, is known for."
            ),
        )
    return vertexai_model


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass
class AuditResult:
    causal_pass: bool
    parity_pass: bool
    name_pass: bool
    final_narrative: str
    entries: list[ComplianceEntry] = field(default_factory=list)

    @property
    def clean(self) -> bool:
        return self.causal_pass and self.parity_pass and self.name_pass


class HybridAuditor:
    """Audits narrative text for compliance with CLAUDE.md hard rules."""

    def deterministic_check(self, narrative: str) -> AuditResult:
        entries: list[ComplianceEntry] = []
        ts = _now_iso()

        causal_match = _CAUSAL_PATTERN.search(narrative)
        if causal_match:
            causal_pass = False
            entries.append(ComplianceEntry(
                layer="rules", check="causal_language", status="fail",
                details=f"Banned phrase detected: '{causal_match.group()}'",
                before=causal_match.group(),
                ts=ts,
            ))
        else:
            causal_pass = True
            entries.append(ComplianceEntry(
                layer="rules", check="causal_language", status="pass",
                details="No banned causal verbs found.", ts=ts,
            ))

        has_olympic = bool(_OLYMPIC_PATTERN.search(narrative))
        has_paralympic = bool(_PARALYMPIC_PATTERN.search(narrative))
        if not has_olympic or not has_paralympic:
            parity_pass = False
            missing = [p for p, found in [("Olympic", has_olympic), ("Paralympic", has_paralympic)] if not found]
            entries.append(ComplianceEntry(
                layer="rules", check="parity_mention", status="fail",
                details=f"Narrative missing mention of: {', '.join(missing)}",
                ts=ts,
            ))
        else:
            parity_pass = True
            entries.append(ComplianceEntry(
                layer="rules", check="parity_mention", status="pass",
                details="Both Olympic and Paralympic mentioned.", ts=ts,
            ))

        unsafe_names = [
            m.group() for m in _NAME_PATTERN.finditer(narrative)
            if m.group() not in _SAFE_BIGRAMS
        ]
        if unsafe_names:
            name_pass = False
            entries.append(ComplianceEntry(
                layer="rules", check="name_leak", status="fail",
                details=f"Possible athlete name(s) detected: {', '.join(repr(n) for n in unsafe_names)}",
                ts=ts,
            ))
        else:
            name_pass = True
            entries.append(ComplianceEntry(
                layer="rules", check="name_leak", status="pass",
                details="No name patterns detected.", ts=ts,
            ))

        return AuditResult(
            causal_pass=causal_pass,
            parity_pass=parity_pass,
            name_pass=name_pass,
            final_narrative=narrative,
            entries=entries,
        )

    def semantic_check(self, narrative: str) -> tuple[str | None, list[ComplianceEntry]]:
        """Call Gemini to classify and optionally rewrite causal tone.
        Never raises. Returns (None, entries) when all rewrite attempts fail so the
        caller can substitute a safe fallback rather than serving causal language.
        """
        entries: list[ComplianceEntry] = []
        current = narrative

        for attempt in range(_MAX_REWRITE_ATTEMPTS):
            try:
                model = _get_model()
                response = model.generate_content(
                    f"Audit this text for causal language. Return JSON.\n\nText: {current}",
                    generation_config=GenerationConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                        response_schema=_REWRITE_SCHEMA,
                    ),
                )
                data = json.loads(response.text)
            except Exception as exc:
                logger.warning("HybridAuditor Gemini call failed (attempt %d): %s", attempt + 1, exc)
                entries.append(ComplianceEntry(
                    layer="gemini", check="causal_tone_semantic", status="fail",
                    details=f"Gemini unavailable (attempt {attempt + 1}): {exc}", ts=_now_iso(),
                ))
                continue

            if not data.get("is_causal_tone", False):
                entries.append(ComplianceEntry(
                    layer="gemini", check="causal_tone_semantic", status="pass",
                    details=f"Gemini classified as non-causal (confidence={data.get('confidence', 'unknown')}).",
                    ts=_now_iso(),
                ))
                return current, entries

            rewrite = data.get("rewrite", current)
            det = self.deterministic_check(rewrite)
            if det.causal_pass:
                entries.append(ComplianceEntry(
                    layer="gemini", check="causal_tone_semantic", status="fixed",
                    details=f"Causal tone detected and rewritten (attempt {attempt + 1}).",
                    before=current,
                    after=rewrite,
                    ts=_now_iso(),
                ))
                return rewrite, entries

            current = rewrite

        entries.append(ComplianceEntry(
            layer="gemini", check="causal_tone_semantic", status="fail",
            details=f"Causal tone persisted after {_MAX_REWRITE_ATTEMPTS} rewrite attempts.",
            ts=_now_iso(),
        ))
        # All rewrite attempts exhausted — signal failure by returning None so audit()
        # can substitute a safe fallback rather than serving causal language.
        return None, entries

    def audit(self, narrative: str, fallback: str | None = None) -> AuditResult:
        """Run deterministic pass; if causal fail, run Gemini semantic rewrite.

        If all rewrite attempts fail, uses `fallback` text (if provided) to avoid
        serving causal language. Falls back to the original narrative if no fallback given.
        """
        det_result = self.deterministic_check(narrative)

        if not det_result.causal_pass:
            # Only invoke Gemini when deterministic found a banned phrase.
            semantic_narrative, semantic_entries = self.semantic_check(narrative)
            all_entries = det_result.entries + semantic_entries

            if semantic_narrative is None:
                # All rewrites failed — use safe fallback rather than original causal text.
                semantic_narrative = fallback if fallback is not None else narrative

            # Re-evaluate parity/name on the final (possibly rewritten) narrative.
            final_det = self.deterministic_check(semantic_narrative)
            return AuditResult(
                causal_pass=final_det.causal_pass,
                parity_pass=final_det.parity_pass,
                name_pass=final_det.name_pass,
                final_narrative=semantic_narrative,
                entries=all_entries,
            )

        return det_result


_auditor = HybridAuditor()


def get_auditor() -> HybridAuditor:
    return _auditor
