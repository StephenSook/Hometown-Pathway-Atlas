/**
 * Pillar 5 — locked Business Numbers source of truth.
 *
 * Numbers MUST stay in sync with `docs/pitch_pillar5.md`. The pitch doc
 * is the prose surface (judges read it, slide notes cite it) and this
 * file is the React surface (Pillar5Strip renders it). When either side
 * changes, update both — there is no automated sync.
 *
 * Number sourcing was audited 2026-05-02 (cold-check round 3). Earlier
 * draft cited "~50M households" sourced to Aspen Institute, but Aspen's
 * figure is 50M *children* ages 6-17 (not households). Doc + component
 * now both cite "children" honestly. NFHS school count corrected from
 * "~13K" to "~20K" (actual NFHS 2023-24 = 19,983). NGB recruitment
 * estimate explicitly labeled "modeled" since it's derived from the
 * 50 NGBs × ~120 slots assumption, not a sourced figure.
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

export const PILLAR5_TAM: Pillar5Block = {
  number: '~50M',
  label: 'US children ages 6-17 in the addressable youth-sports market',
  source: 'Aspen Institute Project Play, State of Play 2024',
} as const;

export const PILLAR5_COST: Pillar5Block = {
  number: 'Zero',
  label: 'Existing public county-level Olympic + Paralympic Atlas tools',
  source: 'Independent gap analysis 2026',
} as const;

export const PILLAR5_REVENUE_PILLS = [
  'B2B licensing → 50 NGBs (modeled ~6,000 recruitment positions / year)',
  'B2G partnerships → ~20,000 high schools via state recreation depts',
] as const;

export const PILLAR5_FOOTER =
  'Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs.';
