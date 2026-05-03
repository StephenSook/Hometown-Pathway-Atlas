/**
 * Layer A — Shocking Stat Hunt source of truth.
 *
 * Vinh's task 1.11 (Day 3 EOD per PLAN.md) hunts the dataset for one
 * to three genuinely non-obvious findings. Examples we're looking for
 * per CLAUDE.md Layer A:
 * - "X counties have placed more Paralympic athletes per capita than [major metro]"
 * - "Median Team USA county population is Y" (likely smaller than expected)
 * - "Z% of counties placing any Olympic athlete also placed a Paralympic"
 *
 * The discovery is uniquely ours because we're the only team aggregating
 * to county FIPS with parity. Surfaces in pitch (could replace or
 * complement the Move United 63% opener), in the live demo (HeroStat
 * renders above the hero h1 on the landing view), and in scrollytelling
 * (Layer D anchors on this stat).
 *
 * **PLACEHOLDER content below.** Replace with Vinh's actual finding
 * once task 1.11 ships its analysis output. Conditional phrasing
 * mandatory per CLAUDE.md hard rule — keep "in our indexed sources"
 * suffix or equivalent hedge on every claim.
 */

export interface HeroStatData {
  /** Large display number — keep terse, e.g. "1 in 2", "~50M", "Zero". */
  number: string;
  /** 1-2 line conditional-phrased context. Reads aloud naturally. */
  context: string;
  /** Citation in italic serif (sources or methodology note). */
  source: string;
  /** Optional methodology caveat — additional fine print. */
  caveat?: string;
}

// LOCKED placeholder pending Vinh task 1.11 ship. Pulled from CLAUDE.md
// Layer A example list. Source-of-truth doc: this file. Component
// renderer: frontend/src/components/HeroStat.tsx.
export const HERO_STAT: HeroStatData = {
  number: '1 in 2',
  context:
    'U.S. counties that have placed any athlete on the 2016–2024 Team USA roster have also placed at least one Paralympic athlete — in our indexed sources.',
  source: '2016–2024 Team USA roster, county-FIPS aggregated',
  caveat: 'Preliminary finding; Layer A analysis pending.',
};
