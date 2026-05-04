"""Tests for HybridAuditor deterministic pass — no network calls."""
import pytest
from services.auditor import HybridAuditor, AuditResult

CLEAN_NARRATIVE = (
    "Cobb County shows strong representation patterns in aquatics and gymnastics. "
    "The region may correlate with favorable training infrastructure. "
    "Both Olympic and Paralympic athletes originate from this area."
)

CAUSAL_NARRATIVE = (
    "Cobb County produces elite swimmers and will continue to be a pipeline. "
    "It is known for creating world-class gymnasts."
)

MISSING_PARALYMPIC = (
    "Olympic athletes originate from Cobb County. The region shows Olympic-level "
    "representation across five sports."
)

MISSING_OLYMPIC = (
    "Paralympic athletes originate from Cobb County. The region shows Paralympic-level "
    "representation in powerlifting."
)

NAME_LEAK_NARRATIVE = (
    "Both Olympic and Paralympic athletes originate here. "
    "John Smith showed strong performance patterns in this region."
)


@pytest.fixture
def auditor() -> HybridAuditor:
    return HybridAuditor()


def test_clean_narrative_passes(auditor: HybridAuditor) -> None:
    result = auditor.deterministic_check(CLEAN_NARRATIVE)
    assert result.causal_pass is True
    assert result.parity_pass is True
    assert result.name_pass is True
    assert all(e.status == "pass" for e in result.entries)


def test_causal_verb_detected(auditor: HybridAuditor) -> None:
    result = auditor.deterministic_check(CAUSAL_NARRATIVE)
    assert result.causal_pass is False
    causal_entry = next(e for e in result.entries if e.check == "causal_language")
    assert causal_entry.status == "fail"
    assert causal_entry.layer == "rules"


def test_missing_paralympic_detected(auditor: HybridAuditor) -> None:
    result = auditor.deterministic_check(MISSING_PARALYMPIC)
    assert result.parity_pass is False
    entry = next(e for e in result.entries if e.check == "parity_mention")
    assert entry.status == "fail"
    assert "Paralympic" in entry.details


def test_missing_olympic_detected(auditor: HybridAuditor) -> None:
    result = auditor.deterministic_check(MISSING_OLYMPIC)
    assert result.parity_pass is False
    entry = next(e for e in result.entries if e.check == "parity_mention")
    assert "Olympic" in entry.details


def test_name_leak_detected(auditor: HybridAuditor) -> None:
    result = auditor.deterministic_check(NAME_LEAK_NARRATIVE)
    assert result.name_pass is False
    entry = next(e for e in result.entries if e.check == "name_leak")
    assert entry.status == "fail"


def test_all_entries_have_required_fields(auditor: HybridAuditor) -> None:
    result = auditor.deterministic_check(CLEAN_NARRATIVE)
    for entry in result.entries:
        assert entry.layer in ("rules", "gemini")
        assert entry.status in ("pass", "fail", "fixed")
        assert entry.check
        assert entry.details
        assert entry.ts  # non-empty ISO8601 string


def test_multiple_causal_verbs_single_entry(auditor: HybridAuditor) -> None:
    """Multiple banned verbs → one causal_language entry, not many."""
    narrative = "This county produces, creates, and guarantees elite athletes."
    result = auditor.deterministic_check(narrative)
    causal_entries = [e for e in result.entries if e.check == "causal_language"]
    assert len(causal_entries) == 1


# ---------------------------------------------------------------------------
# Semantic pass tests — Gemini is mocked, no network calls
# ---------------------------------------------------------------------------
from unittest.mock import MagicMock, patch


def _mock_gemini_response(is_causal: bool, rewrite: str, confidence: str = "high") -> MagicMock:
    """Build a fake Gemini response object matching the rewrite schema."""
    mock_resp = MagicMock()
    mock_resp.text = (
        f'{{"is_causal_tone": {str(is_causal).lower()}, '
        f'"rewrite": "{rewrite}", "confidence": "{confidence}"}}'
    )
    return mock_resp


@patch("services.auditor.vertexai_model")
def test_semantic_pass_on_clean_narrative(mock_model: MagicMock, auditor: HybridAuditor) -> None:
    clean = (
        "Both Olympic and Paralympic athletes originate from this region. "
        "The area may correlate with strong coaching infrastructure."
    )
    mock_model.generate_content.return_value = _mock_gemini_response(
        is_causal=False, rewrite=clean
    )
    result = auditor.audit(clean)
    assert result.clean is True
    gemini_entry = next(e for e in result.entries if e.layer == "gemini")
    assert gemini_entry.status == "pass"


@patch("services.auditor.vertexai_model")
def test_semantic_rewrite_fixes_causal(mock_model: MagicMock, auditor: HybridAuditor) -> None:
    causal = (
        "Cobb County produces elite Olympic and Paralympic swimmers. "
        "It will continue to be a pipeline."
    )
    fixed = (
        "Cobb County shows strong representation patterns in Olympic and Paralympic swimming. "
        "The region may correlate with favorable aquatic infrastructure."
    )
    mock_model.generate_content.return_value = _mock_gemini_response(
        is_causal=True, rewrite=fixed
    )
    result = auditor.audit(causal)
    gemini_entry = next(e for e in result.entries if e.check == "causal_tone_semantic")
    assert gemini_entry.status == "fixed"
    assert result.final_narrative == fixed


@patch("services.auditor.vertexai_model")
def test_semantic_failure_does_not_block(mock_model: MagicMock, auditor: HybridAuditor) -> None:
    mock_model.generate_content.side_effect = Exception("Gemini timeout")
    narrative = (
        "Both Olympic and Paralympic athletes originate from this region. "
        "The area may correlate with strong coaching infrastructure."
    )
    result = auditor.audit(narrative)
    gemini_entry = next(e for e in result.entries if e.layer == "gemini")
    assert gemini_entry.status == "fail"
    assert result.final_narrative == narrative


@patch("services.auditor.vertexai_model")
def test_rewrite_loop_max_two_attempts(mock_model: MagicMock, auditor: HybridAuditor) -> None:
    """Gemini keeps returning causal rewrites — auditor gives up after 2 attempts."""
    still_causal = (
        "Both Olympic and Paralympic athletes originate here. "
        "The region produces elite performers."
    )
    mock_model.generate_content.return_value = _mock_gemini_response(
        is_causal=True, rewrite=still_causal
    )
    narrative = (
        "Both Olympic and Paralympic athletes originate here. "
        "This region produces champions."
    )
    result = auditor.audit(narrative)
    gemini_entry = next(e for e in result.entries if e.check == "causal_tone_semantic")
    assert gemini_entry.status == "fail"
    assert mock_model.generate_content.call_count == 2
