"""
09_stat_hunt.py — Layer A Shocking Stat Hunt (task 1.11).

Reads county_profiles.parquet + athletes_allgames_geocoded.parquet and hunts
for 1-2 genuinely non-obvious findings with high emotional resonance for the pitch.

Four hypothesis classes:
  A. Parity density  — what % of Olympic-producing counties also produced a Paralympian?
  B. Small-town punch — median population of Team USA counties vs all US counties
  C. Underdog outlier — small counties that beat big metros on per-capita rate
  D. Geographic spread — how many unique states / how concentrated the pipeline is

Prints ranked candidates with conditional-phrased headline strings.
Writes HERO_STAT patch to stdout so Stephen can copy into lib/heroStat.ts.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"

PROFILES_PARQUET = PROCESSED_DIR / "county_profiles.parquet"
ATHLETES_PARQUET = PROCESSED_DIR / "athletes_allgames_geocoded.parquet"

# Major metro FIPS sets for comparison — LA + NYC + Chicago
MAJOR_METRO_FIPS = {
    "06037",  # Los Angeles County
    "06059",  # Orange County (LA metro)
    "36061",  # Manhattan / New York County
    "36047",  # Brooklyn / Kings County
    "36081",  # Queens County
    "17031",  # Cook County (Chicago)
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    profiles = pd.read_parquet(PROFILES_PARQUET)
    profiles["fips"] = profiles["fips"].astype(str).str.zfill(5)
    athletes = pd.read_parquet(ATHLETES_PARQUET)
    athletes["fips"] = athletes["fips"].astype(str).str.zfill(5)
    log.info(
        "Loaded %d county profiles, %d athlete rows (%d unique FIPSes)",
        len(profiles), len(athletes), athletes["fips"].nunique(),
    )
    return profiles, athletes


def fmt_pop(n: float) -> str:
    """Format population for display."""
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.0f}K"
    return str(int(n))


# ---------------------------------------------------------------------------
# Hypothesis A — Parity density
# Counties that placed any Olympic athlete: what fraction also placed a Paralympian?
# ---------------------------------------------------------------------------

def hypothesis_a_parity_density(profiles: pd.DataFrame) -> dict:
    olympic_counties = profiles[profiles["olympic_count"] > 0]
    both = olympic_counties[olympic_counties["paralympic_count"] > 0]

    n_olympic = len(olympic_counties)
    n_both = len(both)
    pct = n_both / n_olympic * 100 if n_olympic else 0

    # Also: counties that placed ANY athlete at all
    any_athlete = profiles[(profiles["olympic_count"] > 0) | (profiles["paralympic_count"] > 0)]
    para_only = profiles[
        (profiles["paralympic_count"] > 0) & (profiles["olympic_count"] == 0)
    ]

    log.info(
        "[A] Olympic counties: %d | Also Paralympic: %d (%.1f%%) | Para-only: %d",
        n_olympic, n_both, pct, len(para_only),
    )

    # Resonance: "X in Y" framing (round to nearest integer ratio)
    # e.g. 52% → "more than 1 in 2"
    ratio_str = f"{pct:.0f}%"
    if pct >= 49:
        ratio_str = "more than 1 in 2"
    elif pct >= 32:
        ratio_str = "about 1 in 3"
    elif pct >= 24:
        ratio_str = "about 1 in 4"

    headline = (
        f"{ratio_str} of U.S. counties that appear in the 2016–2024 Team USA "
        f"Olympic roster also show representation in the Paralympic roster — "
        f"in our indexed sources."
    )

    return {
        "hypothesis": "A — Parity Density",
        "stat_number": ratio_str,
        "raw_pct": pct,
        "n_olympic_counties": n_olympic,
        "n_both_counties": n_both,
        "headline": headline,
        "resonance_score": _resonance_score_parity(pct),
        "source": "2016–2024 Team USA roster, county-FIPS aggregated",
        "caveat": "Based on indexed 2016–2024 data; coverage may vary by Games year.",
    }


def _resonance_score_parity(pct: float) -> int:
    """Score 1-10 for how surprising/useful this is for the pitch."""
    if pct >= 45:
        return 9   # "half of Olympic counties also have Paralympians" — very strong
    if pct >= 30:
        return 7
    if pct >= 20:
        return 5
    return 3


# ---------------------------------------------------------------------------
# Hypothesis B — Small-town punch
# Median population of Team USA (any athlete) counties vs all US counties
# ---------------------------------------------------------------------------

def hypothesis_b_small_town(profiles: pd.DataFrame) -> dict:
    athlete_counties = profiles[
        (profiles["olympic_count"] > 0) | (profiles["paralympic_count"] > 0)
    ]
    all_counties = profiles[profiles["population"] > 0]

    med_athlete = athlete_counties["population"].median()
    med_all = all_counties["population"].median()
    ratio = med_athlete / med_all if med_all > 0 else 1.0

    p25 = athlete_counties["population"].quantile(0.25)
    p75 = athlete_counties["population"].quantile(0.75)

    log.info(
        "[B] Median athlete county pop: %s | Median all-county pop: %s | ratio: %.2f",
        fmt_pop(med_athlete), fmt_pop(med_all), ratio,
    )
    log.info(
        "[B] Athlete county 25th–75th pctile pop: %s – %s",
        fmt_pop(p25), fmt_pop(p75),
    )

    # Is it surprising? Small-town advantage is pitch-worthy if median is <2× all-county
    # (both could be similarly small — US counties skew rural)
    if ratio <= 1.2:
        surprise = "similar to"
        resonance = 4
    elif ratio >= 2.0:
        surprise = "much larger than"
        resonance = 5  # less surprising — bigger counties produce more athletes
    else:
        surprise = "modestly larger than"
        resonance = 6

    # Count sub-100K counties with athletes
    small_with_athletes = athlete_counties[athlete_counties["population"] < 100_000]
    pct_small = len(small_with_athletes) / len(athlete_counties) * 100 if len(athlete_counties) else 0

    log.info(
        "[B] Counties with athletes AND pop < 100K: %d (%.1f%% of athlete counties)",
        len(small_with_athletes), pct_small,
    )

    headline = (
        f"The median Team USA hometown county has a population of ~{fmt_pop(med_athlete)} — "
        f"{surprise} the median U.S. county (~{fmt_pop(med_all)}) — "
        f"suggesting pipeline reach across community sizes, in our indexed sources."
    )

    return {
        "hypothesis": "B — Small-Town Punch",
        "stat_number": f"~{fmt_pop(med_athlete)}",
        "raw_median_athlete": med_athlete,
        "raw_median_all": med_all,
        "ratio": ratio,
        "pct_small_counties": pct_small,
        "headline": headline,
        "resonance_score": resonance,
        "source": "2016–2024 Team USA roster + Census ACS 5-year population",
        "caveat": "County-level; not all athletes' official hometowns resolve to unique counties.",
    }


# ---------------------------------------------------------------------------
# Hypothesis C — Underdog outliers
# Small counties (pop < 250K) with Paralympic smoothed_per_100k ABOVE large metro medians
# ---------------------------------------------------------------------------

def hypothesis_c_underdog(profiles: pd.DataFrame) -> dict:
    # Major metro benchmark: median Paralympic smoothed per 100K across LA + NYC + Chicago counties
    metro_profiles = profiles[profiles["fips"].isin(MAJOR_METRO_FIPS)]
    metro_para_median = metro_profiles["paralympic_smoothed"].median()
    metro_oly_median = metro_profiles["olympic_smoothed"].median()

    log.info(
        "[C] Major-metro median paralympic_smoothed=%.4f, olympic_smoothed=%.4f",
        metro_para_median, metro_oly_median,
    )

    small = profiles[profiles["population"] < 250_000]
    small_beat_metro_para = small[small["paralympic_smoothed"] > metro_para_median]
    small_beat_metro_oly = small[small["olympic_smoothed"] > metro_oly_median]

    n_small = len(small)
    n_beat_para = len(small_beat_metro_para)
    n_beat_oly = len(small_beat_metro_oly)
    pct_beat_para = n_beat_para / n_small * 100 if n_small else 0
    pct_beat_oly = n_beat_oly / n_small * 100 if n_small else 0

    log.info(
        "[C] Small counties beating major-metro Paralympic rate: %d / %d (%.1f%%)",
        n_beat_para, n_small, pct_beat_para,
    )
    log.info(
        "[C] Small counties beating major-metro Olympic rate: %d / %d (%.1f%%)",
        n_beat_oly, n_small, pct_beat_oly,
    )

    # Top 10 small overperformers (Paralympic)
    top_para = (
        small_beat_metro_para[small_beat_metro_para["paralympic_count"] > 0]
        .sort_values("paralympic_smoothed", ascending=False)
        .head(10)[["fips", "county_name", "state", "population", "paralympic_count", "paralympic_smoothed"]]
    )
    log.info("[C] Top small Paralympic overperformers:\n%s", top_para.to_string(index=False))

    pct_str = f"{pct_beat_para:.0f}%"
    headline = (
        f"About {pct_str} of U.S. counties with populations under 250,000 show "
        f"Paralympic athlete representation rates above the major-metro median — "
        f"in our indexed sources."
    )

    # Resonance: high if many small counties outperform big metros (equity story)
    resonance = 8 if pct_beat_para >= 10 else (6 if pct_beat_para >= 5 else 4)

    return {
        "hypothesis": "C — Underdog Outliers",
        "stat_number": pct_str,
        "raw_pct": pct_beat_para,
        "n_small_counties": n_small,
        "n_beat_metro": n_beat_para,
        "top_overperformers": top_para.to_dict("records"),
        "headline": headline,
        "resonance_score": resonance,
        "source": "2016–2024 Team USA roster, county-FIPS per-capita rates",
        "caveat": "Smoothed per-capita rates use empirical Bayes shrinkage (alpha=50K). Major metros: LA, NYC, Chicago.",
    }


# ---------------------------------------------------------------------------
# Hypothesis D — Geographic concentration
# What % of counties (of 3,222) have ever placed a Team USA athlete?
# How many states have no Paralympic-placing county?
# ---------------------------------------------------------------------------

def hypothesis_d_geography(profiles: pd.DataFrame) -> dict:
    total_counties = len(profiles)
    any_olympic = (profiles["olympic_count"] > 0).sum()
    any_para = (profiles["paralympic_count"] > 0).sum()
    any_athlete = ((profiles["olympic_count"] > 0) | (profiles["paralympic_count"] > 0)).sum()

    pct_oly = any_olympic / total_counties * 100
    pct_para = any_para / total_counties * 100
    pct_any = any_athlete / total_counties * 100

    log.info(
        "[D] Counties with ≥1 Olympic athlete: %d / %d (%.1f%%)",
        any_olympic, total_counties, pct_oly,
    )
    log.info(
        "[D] Counties with ≥1 Paralympic athlete: %d / %d (%.1f%%)",
        any_para, total_counties, pct_para,
    )
    log.info(
        "[D] Counties with any Team USA athlete: %d / %d (%.1f%%)",
        any_athlete, total_counties, pct_any,
    )

    # States with zero Paralympic-placing counties
    states_with_para = profiles[profiles["paralympic_count"] > 0]["state"].unique()
    all_states = profiles["state"].unique()
    states_no_para = set(all_states) - set(states_with_para) - {""}
    log.info("[D] States with NO Paralympic county: %d — %s", len(states_no_para), sorted(states_no_para))

    # Top states by Paralympic county count
    para_by_state = (
        profiles[profiles["paralympic_count"] > 0]
        .groupby("state")
        .size()
        .sort_values(ascending=False)
        .head(10)
    )
    log.info("[D] Top states by Paralympic-placing counties:\n%s", para_by_state.to_string())

    pct_str = f"{pct_any:.0f}%"
    headline = (
        f"Only about {pct_str} of U.S. counties show Team USA athlete representation "
        f"in our 2016–2024 indexed sources — suggesting significant untapped pipeline "
        f"across {total_counties - any_athlete:,} counties."
    )

    # High resonance if the "gap" number is compelling
    resonance = 8 if pct_any < 25 else (6 if pct_any < 40 else 4)

    return {
        "hypothesis": "D — Geographic Spread / Gap",
        "stat_number": pct_str,
        "raw_pct": pct_any,
        "total_counties": total_counties,
        "counties_with_any_athlete": int(any_athlete),
        "counties_no_athlete": int(total_counties - any_athlete),
        "states_no_paralympic": sorted(states_no_para),
        "headline": headline,
        "resonance_score": resonance,
        "source": "2016–2024 Team USA roster + Census county list",
        "caveat": "County count based on ACS 5-year population table; ~3,222 counties/county-equivalents.",
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    profiles, athletes = load_data()

    results: list[dict] = []

    log.info("\n" + "=" * 60)
    log.info("HYPOTHESIS A: Parity density")
    log.info("=" * 60)
    a = hypothesis_a_parity_density(profiles)
    results.append(a)

    log.info("\n" + "=" * 60)
    log.info("HYPOTHESIS B: Small-town punch")
    log.info("=" * 60)
    b = hypothesis_b_small_town(profiles)
    results.append(b)

    log.info("\n" + "=" * 60)
    log.info("HYPOTHESIS C: Underdog outliers")
    log.info("=" * 60)
    c = hypothesis_c_underdog(profiles)
    results.append(c)

    log.info("\n" + "=" * 60)
    log.info("HYPOTHESIS D: Geographic gap")
    log.info("=" * 60)
    d = hypothesis_d_geography(profiles)
    results.append(d)

    # -----------------------------------------------------------------------
    # Rank and print
    # -----------------------------------------------------------------------
    results.sort(key=lambda x: x["resonance_score"], reverse=True)

    print("\n" + "=" * 70)
    print("LAYER A STAT HUNT — RANKED FINDINGS")
    print("=" * 70)
    for i, r in enumerate(results, 1):
        print(f"\n#{i}  [{r['hypothesis']}]  Resonance={r['resonance_score']}/10")
        print(f"  STAT:    {r['stat_number']}")
        print(f"  PITCH:   {r['headline']}")
        print(f"  SOURCE:  {r['source']}")
        if r.get("caveat"):
            print(f"  CAVEAT:  {r['caveat']}")

    # -----------------------------------------------------------------------
    # Recommend top stat + print heroStat.ts patch
    # -----------------------------------------------------------------------
    winner = results[0]
    runner_up = results[1] if len(results) > 1 else None

    print("\n" + "=" * 70)
    print("RECOMMENDED HERO_STAT PATCH  (copy into frontend/src/lib/heroStat.ts)")
    print("=" * 70)
    _print_herostat_patch(winner)

    if runner_up and runner_up["resonance_score"] >= 7:
        print("\n--- RUNNER-UP (also strong, consider for scrollytelling Layer D) ---")
        _print_herostat_patch(runner_up)


def _print_herostat_patch(r: dict) -> None:
    caveat = r.get("caveat", "")
    print(f"""
export const HERO_STAT: HeroStatData = {{
  number: '{r['stat_number']}',
  context:
    '{r['headline']}',
  source: '{r['source']}',
  caveat: '{caveat}',
}};
""")


if __name__ == "__main__":
    main()
