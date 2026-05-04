"""
Smoke test for backend services.
Run from backend/ directory:
    .venv/Scripts/python.exe smoke_test.py
"""
from __future__ import annotations

import sys
import math
import traceback

sys.path.insert(0, ".")

PASS = "PASS"
FAIL = "FAIL"

results: list[tuple[str, str, str]] = []  # (section, check, status/detail)

def check(section: str, name: str, fn):
    try:
        result = fn()
        if result is True or result is None:
            results.append((section, name, PASS))
        else:
            results.append((section, name, f"FAIL: {result}"))
    except Exception as e:
        results.append((section, name, f"FAIL: {type(e).__name__}: {e}"))


# =========================================================
# 1. Schema imports
# =========================================================
def test_schema_imports():
    try:
        from schemas.region import (
            ZipRequest, MetricBlock, MetricsBlock, SportEntry,
            ClimateBlock, AdaptiveAccessBlock, ComplianceEntry, RegionResponse
        )
        results.append(("1. Schema imports", "from schemas.region import *", PASS))
    except Exception as e:
        results.append(("1. Schema imports", "from schemas.region import *", f"FAIL: {e}"))

    try:
        from schemas.analog import SimilarityBreakdown, AnalogEntry, AnalogsResponse
        results.append(("1. Schema imports", "from schemas.analog import *", PASS))
    except Exception as e:
        results.append(("1. Schema imports", "from schemas.analog import *", f"FAIL: {e}"))

    try:
        from schemas.pathway import EvidenceBlock, GapEntry, PathwayResponse
        results.append(("1. Schema imports", "from schemas.pathway import *", PASS))
    except Exception as e:
        results.append(("1. Schema imports", "from schemas.pathway import *", f"FAIL: {e}"))

test_schema_imports()


# =========================================================
# 2. ProfileService
# =========================================================
profile_svc = None
try:
    from services.profile_service import ProfileService, ZipNotFoundError, ProfileNotFoundError
    profile_svc = ProfileService()
    results.append(("2. ProfileService", "ProfileService() instantiation", PASS))
except Exception as e:
    results.append(("2. ProfileService", "ProfileService() instantiation", f"FAIL: {e}"))

def _profile_zip_resolution():
    if profile_svc is None:
        return "skipped (service not available)"
    fips = profile_svc.zip_to_fips("30060")
    if fips != "13067":
        return f"expected 13067, got {fips!r}"
    return True

check("2. ProfileService", "ZIP 30060 → FIPS 13067", _profile_zip_resolution)

profile_13067 = None

def _profile_get_profile():
    global profile_13067
    if profile_svc is None:
        return "skipped"
    profile_13067 = profile_svc.get_profile("13067")
    return True

check("2. ProfileService", "get_profile('13067') returns without error", _profile_get_profile)

def _profile_county_name():
    if profile_13067 is None:
        return "skipped"
    if profile_13067.county_name != "Cobb County":
        return f"expected 'Cobb County', got {profile_13067.county_name!r}"
    return True

check("2. ProfileService", "county_name == 'Cobb County'", _profile_county_name)

def _profile_centroid():
    if profile_13067 is None:
        return "skipped"
    c = profile_13067.centroid
    if c is None:
        return "centroid is None"
    if not (isinstance(c, tuple) and len(c) == 2):
        return f"centroid is not a 2-tuple: {c!r}"
    if not (isinstance(c[0], float) and isinstance(c[1], float)):
        return f"centroid elements are not floats: {type(c[0])}, {type(c[1])}"
    return True

check("2. ProfileService", "centroid is tuple of 2 floats", _profile_centroid)

def _profile_olympic_evidence():
    if profile_13067 is None:
        return "skipped"
    ev = profile_13067.metrics.olympic.evidence
    if ev not in ("high", "medium", "low"):
        return f"olympic.evidence = {ev!r}, not in ('high','medium','low')"
    return True

check("2. ProfileService", "metrics.olympic.evidence in ('high','medium','low')", _profile_olympic_evidence)

def _profile_paralympic_evidence():
    if profile_13067 is None:
        return "skipped"
    ev = profile_13067.metrics.paralympic.evidence
    if ev not in ("high", "medium", "low"):
        return f"paralympic.evidence = {ev!r}, not in ('high','medium','low')"
    return True

check("2. ProfileService", "metrics.paralympic.evidence in ('high','medium','low')", _profile_paralympic_evidence)

def _profile_adaptive_confidence():
    if profile_13067 is None:
        return "skipped"
    conf = profile_13067.adaptive_access.confidence
    if conf not in ("high", "medium", "none"):
        return f"adaptive_access.confidence = {conf!r}, not in ('high','medium','none')"
    return True

check("2. ProfileService", "adaptive_access.confidence in ('high','medium','none')", _profile_adaptive_confidence)

def _profile_zip_not_found():
    if profile_svc is None:
        return "skipped"
    try:
        profile_svc.zip_to_fips("99999")
        return "ZipNotFoundError was NOT raised for zip 99999"
    except ZipNotFoundError:
        return True
    except Exception as e:
        return f"wrong exception type: {type(e).__name__}: {e}"

check("2. ProfileService", "ZipNotFoundError raised for zip '99999'", _profile_zip_not_found)

def _profile_not_found():
    if profile_svc is None:
        return "skipped"
    try:
        profile_svc.get_profile("00000")
        return "ProfileNotFoundError was NOT raised for fips 00000"
    except ProfileNotFoundError:
        return True
    except Exception as e:
        return f"wrong exception type: {type(e).__name__}: {e}"

check("2. ProfileService", "ProfileNotFoundError raised for fips '00000'", _profile_not_found)


# =========================================================
# 3. AnalogService
# =========================================================
analog_svc = None
try:
    from services.analog_service import AnalogService
    analog_svc = AnalogService()
    results.append(("3. AnalogService", "AnalogService() instantiation", PASS))
except Exception as e:
    results.append(("3. AnalogService", "AnalogService() instantiation", f"FAIL: {e}"))

analogs_13067 = None

def _analog_get():
    global analogs_13067
    if analog_svc is None:
        return "skipped"
    analogs_13067 = analog_svc.get_analogs("13067")
    return True

check("3. AnalogService", "get_analogs('13067') returns without error", _analog_get)

def _analog_count():
    if analogs_13067 is None:
        return "skipped"
    n = len(analogs_13067.analogs)
    if n != 3:
        return f"expected 3 analogs, got {n}"
    return True

check("3. AnalogService", "returns exactly 3 analogs", _analog_count)

def _analog_no_nan_score():
    if analogs_13067 is None:
        return "skipped"
    for a in analogs_13067.analogs:
        if math.isnan(a.overall_score):
            return f"rank {a.rank} has NaN overall_score"
    return True

check("3. AnalogService", "overall_score is not NaN for all 3", _analog_no_nan_score)

def _analog_centroids():
    if analogs_13067 is None:
        return "skipped"
    for a in analogs_13067.analogs:
        c = a.centroid
        if c is None:
            return f"rank {a.rank} ({a.county_name}) has None centroid"
        if not (isinstance(c, tuple) and len(c) == 2):
            return f"rank {a.rank} centroid is not 2-tuple: {c!r}"
        if not (isinstance(c[0], float) and isinstance(c[1], float)):
            return f"rank {a.rank} centroid elements not floats: {type(c[0])}, {type(c[1])}"
    return True

check("3. AnalogService", "all 3 have centroid as tuple of 2 floats (not None)", _analog_centroids)

def _analog_olympic_evidence():
    if analogs_13067 is None:
        return "skipped"
    for a in analogs_13067.analogs:
        ev = a.metrics.olympic.evidence
        if ev not in ("high", "medium", "low"):
            return f"rank {a.rank} olympic.evidence = {ev!r}"
    return True

check("3. AnalogService", "all 3 have metrics.olympic.evidence in ('high','medium','low')", _analog_olympic_evidence)

def _analog_diversity():
    if analogs_13067 is None:
        return "skipped"
    names = [a.county_name for a in analogs_13067.analogs]
    if len(set(names)) < 2:
        return f"all 3 analogs have same county_name: {names}"
    return True

check("3. AnalogService", "analogs span at least 2 different county_name values", _analog_diversity)


# =========================================================
# 4. PathwayService
# =========================================================
pathway_svc = None
try:
    from services.pathway_service import PathwayService
    pathway_svc = PathwayService()
    results.append(("4. PathwayService", "PathwayService() instantiation", PASS))
except Exception as e:
    results.append(("4. PathwayService", "PathwayService() instantiation", f"FAIL: {e}"))

pathway_13067 = None

def _pathway_get():
    global pathway_13067
    if pathway_svc is None:
        return "skipped"
    pathway_13067 = pathway_svc.get_pathway("13067")
    return True

check("4. PathwayService", "get_pathway('13067') returns without error", _pathway_get)

def _pathway_count():
    if pathway_13067 is None:
        return "skipped"
    n = len(pathway_13067.gaps)
    if n != 3:
        return f"expected 3 gaps, got {n}"
    return True

check("4. PathwayService", "returns exactly 3 gaps", _pathway_count)

def _pathway_categories():
    if pathway_13067 is None:
        return "skipped"
    expected = {"observed_strength", "public_access_signal", "opportunity_hypothesis"}
    actual = {g.category for g in pathway_13067.gaps}
    if actual != expected:
        return f"expected {expected}, got {actual}"
    return True

check("4. PathwayService", "categories are exactly the 3 required", _pathway_categories)

def _pathway_confidence():
    if pathway_13067 is None:
        return "skipped"
    for g in pathway_13067.gaps:
        if g.confidence not in ("high", "medium", "low"):
            return f"category {g.category!r} has confidence={g.confidence!r}"
    return True

check("4. PathwayService", "all confidence values in ('high','medium','low')", _pathway_confidence)

BANNED_CAUSAL = ["produces", "creates", "leads to", "guarantees", "makes", " will "]

def _pathway_no_causal_words():
    if pathway_13067 is None:
        return "skipped"
    for g in pathway_13067.gaps:
        claim_lower = g.claim.lower()
        for word in BANNED_CAUSAL:
            if word in claim_lower:
                return f"category {g.category!r} claim contains banned word {word!r}: {g.claim!r}"
    return True

check("4. PathwayService", "no claim contains banned causal words", _pathway_no_causal_words)


# =========================================================
# 5. Second FIPS smoke test
# =========================================================
second_fips = None

def _find_second_fips():
    """Pick a FIPS from similarity matrix that isn't 13067."""
    global second_fips
    if analog_svc is None:
        return "skipped (AnalogService unavailable)"
    matrix = analog_svc._matrix
    candidates = matrix[matrix["source_fips"] != "13067"]["source_fips"].dropna().unique()
    if len(candidates) == 0:
        return "no other FIPS found in similarity matrix"
    second_fips = str(candidates[0])
    return True

check("5. Second FIPS", "find a second FIPS from similarity matrix", _find_second_fips)

def _second_profile():
    if second_fips is None:
        return "skipped"
    if profile_svc is None:
        return "skipped"
    profile_svc.get_profile(second_fips)
    return True

check("5. Second FIPS", f"ProfileService.get_profile(second_fips) succeeds", _second_profile)

def _second_analog():
    if second_fips is None:
        return "skipped"
    if analog_svc is None:
        return "skipped"
    resp = analog_svc.get_analogs(second_fips)
    if len(resp.analogs) == 0:
        return f"got 0 analogs for {second_fips}"
    return True

check("5. Second FIPS", "AnalogService.get_analogs(second_fips) succeeds", _second_analog)

def _second_pathway():
    if second_fips is None:
        return "skipped"
    if pathway_svc is None:
        return "skipped"
    resp = pathway_svc.get_pathway(second_fips)
    # pathway returns empty list if FIPS not in profiles — that's acceptable
    return True

check("5. Second FIPS", "PathwayService.get_pathway(second_fips) succeeds", _second_pathway)


# =========================================================
# Print results
# =========================================================
print("\n" + "=" * 72)
print("SMOKE TEST RESULTS")
print("=" * 72)

current_section = None
passes = 0
fails = 0

for section, name, status in results:
    if section != current_section:
        print(f"\n{section}")
        print("-" * 60)
        current_section = section
    icon = "✓" if status == PASS else "✗"
    print(f"  {icon} {name}")
    if status != PASS:
        print(f"      → {status}")
        fails += 1
    else:
        passes += 1

print("\n" + "=" * 72)
print(f"TOTAL: {passes + fails} checks — {passes} PASS / {fails} FAIL")
if second_fips:
    print(f"Second FIPS used: {second_fips}")
print("=" * 72)
sys.exit(0 if fails == 0 else 1)
