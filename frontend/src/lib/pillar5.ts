/**
 * Pillar 5 — locked Business Numbers source of truth.
 *
 * Numbers MUST stay in sync with `docs/pitch_pillar5.md`. The pitch doc
 * is the prose surface (judges read it, slide notes cite it) and this
 * file is the React surface (Pillar5Strip renders it). When either side
 * changes, update both — drift is enforced by
 * `scripts/check-pillar5-drift.mjs` (CI gate).
 *
 * Number sourcing was audited 2026-05-02 (cold-check round 3). Earlier
 * draft cited "~50M households" sourced to Aspen Institute, but Aspen's
 * figure is 50M *children* ages 6-17 (not households). Doc + component
 * now both cite "children" honestly. NFHS school count corrected from
 * "~13K" to "~20K" (actual NFHS 2023-24 = 19,983). NGB recruitment
 * estimate explicitly labeled "modeled" since it's derived from the
 * 50 NGBs × ~120 slots assumption, not a sourced figure.
 *
 * 2026-05-03 Sookra Council weakest-pillar verdict added two new exports:
 *   - `PILLAR5_HARM` — per-incident dollar harm, anchored to Beat the
 *     Streets Tier 1 startup-year budget (a sourced unit-cost number,
 *     not a modeled estimate)
 *   - `PILLAR5_LIGHTHOUSE_NGBS` — 3 named first-customer NGBs (USA
 *     Wrestling, USA Swimming, USA Track & Field), each with public
 *     unit economics so the abstract "50 NGBs" claim has concrete ICP
 *
 * Pillar5Strip currently renders TAM + COST + REVENUE_PILLS only (locked
 * 3-column anatomy per DESIGN_SYSTEM §4.18). HARM + LIGHTHOUSE_NGBS are
 * data-layer only today — surface in pitch Q&A and in a separate
 * Pillar5Defense panel if Stephen decides to add it Day 8.
 *
 * If a judge presses "where does ~50M come from?" — answer: Aspen
 * Institute Project Play, State of Play 2024 (children ages 6-17 in the
 * addressable youth-sports market).
 */

export interface Pillar5Block {
  number: string;
  label: string;
  source: string;
}

export interface Pillar5LighthouseNGB {
  name: string;
  program: string;
  reach: string;
  unitEconomics: string;
  whyFit: string;
  source: string;
}

export const PILLAR5_TAM: Pillar5Block = {
  number: '~50M',
  label:
    'US children ages 6-17 — addressable youth-sports TAM (~27M actively play organized sports per Aspen NSCH+SFIA cross-cut)',
  source: 'Aspen Institute Project Play, State of Play 2024',
} as const;

export const PILLAR5_COST: Pillar5Block = {
  number: 'Zero',
  label: 'Existing public county-level Olympic + Paralympic Atlas tools',
  source: 'Independent gap analysis 2026',
} as const;

export const PILLAR5_REVENUE_PILLS = [
  'B2B licensing → 50 NGBs (modeled ~6,000 recruitment positions / year — heavy-tail; track + swim concentrate)',
  'B2G partnerships → ~13K school districts (NFHS membership covers ~20,000 high schools)',
] as const;

export const PILLAR5_HARM: Pillar5Block = {
  number: '$35K–$70K',
  label:
    'Year-one cost of one mistargeted Beat the Streets startup wrestling chapter',
  source: 'Beat the Streets National program tier disclosures, 2025',
} as const;

export const PILLAR5_LIGHTHOUSE_NGBS: readonly Pillar5LighthouseNGB[] = [
  {
    name: 'USA Wrestling',
    program: 'Beat the Streets Network',
    reach: '7,366 youth · 257 teams · 10 markets · 37 cities',
    unitEconomics:
      'Tier 1 startup $35K–$70K · Tier 2 $250K–$499K · Tier 3–4 $500K+',
    whyFit:
      'Climate-agnostic indoor sport · dense regional pipeline · explicit chapter-grant siting decisions',
    source: 'https://new.beatthestreets.org/faq-on-bts/',
  },
  {
    name: 'USA Swimming',
    program: 'Make A Splash Foundation',
    reach: '850+ lesson partners · 4.9M+ kids served since 2007',
    unitEconomics: '$6.3M cumulative invested · ~$1.29 per child served',
    whyFit:
      'Climate-correlated (warm-state pool access) · grant-program structured · adaptive-access aligned',
    source: 'https://www.usaswimming.org/foundation',
  },
  {
    name: 'USA Track & Field',
    program: 'RunJumpThrow (Hershey)',
    reach: '200K+ kids · 1,100+ schools (2016 baseline) · 8+ states',
    unitEconomics:
      'Free to schools (Hershey-sponsor-funded) · 21 station kits + curriculum',
    whyFit:
      'Largest single-NGB youth program · maximum geographic dispersion · outdoor sport profile',
    source: 'https://www.usatf.org/runjumpthrow-new/home',
  },
] as const;

export const PILLAR5_FOOTER =
  'Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs.';
