"""HybridAuditor — deterministic rules pass + Gemini semantic rewrite loop."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

from schemas.region import ComplianceEntry


_CAUSAL_PATTERN = re.compile(
    r"\b(produces?|creates?|leads? to|guarantees?|makes?|is known for"
    r"|will\s+\w+)\b",
    re.IGNORECASE,
)

_OLYMPIC_PATTERN = re.compile(r"\bOlympic\b", re.IGNORECASE)
_PARALYMPIC_PATTERN = re.compile(r"\bParalympic\b", re.IGNORECASE)

_NAME_PATTERN = re.compile(r"(?<!\.\s)(?<!\n)\b[A-Z][a-z]+\s+[A-Z][a-z]+\b")

_SAFE_BIGRAMS = {
    "Cobb County", "Los Angeles", "New York", "San Francisco", "Salt Lake",
    "Long Beach", "Team USA", "United States", "Cloud Run", "Move United",
    "Bayesian shrinkage",
}


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


_auditor = HybridAuditor()


def get_auditor() -> HybridAuditor:
    return _auditor
