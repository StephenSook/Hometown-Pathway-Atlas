/**
 * Mock API responses — match Shared Contracts exactly per PLAN.md.
 * Frontend builds against these Days 2–3, switches to real backend Day 4.
 *
 * Sample county: Cobb County, GA (FIPS 13067) — used as anchor across mockups.
 */

import type {
  RegionResponse,
  AnalogsResponse,
  PathwayResponse,
  ComplianceLogEntry,
} from './api';

/**
 * Canonical demo sequence for ComplianceLog `demoMode={true}`.
 * Used during demo recording to guarantee judges see the fail→fixed catch.
 * Production code path uses mockRegion.compliance_log instead.
 */
/** Demo script template — `{COUNTY}` placeholder gets replaced with the
 *  active region's actual county_name at render time. Earlier iteration
 *  hardcoded "Cobb County" in `before` + `after`, which made the audit
 *  panel claim "Cobb County" even when the user submitted a different
 *  county (Stephen feedback 2026-05-04: "I put in Fulton County 30349
 *  and the audit still said Cobb"). ComplianceLog applies the
 *  substitution via `regionCountyName` prop. */
export const demoComplianceScript: ComplianceLogEntry[] = [
  {
    layer: 'rules',
    check: 'no_athlete_names',
    status: 'pass',
    ts: '2026-05-02T14:02:11Z',
  },
  {
    layer: 'rules',
    check: 'parity_check',
    status: 'pass',
    ts: '2026-05-02T14:02:11Z',
  },
  {
    layer: 'gemini',
    check: 'causal_tone',
    status: 'fail',
    details: 'Banned causal verb detected',
    before: '{COUNTY} produces Olympic athletes',
    ts: '2026-05-02T14:02:13Z',
  },
  {
    layer: 'gemini',
    check: 'causal_tone',
    status: 'fixed',
    details: 'Rewritten in conditional phrasing',
    after: '{COUNTY} could be associated with Olympic representation patterns',
    ts: '2026-05-02T14:02:14Z',
  },
];

const sampleCompliance: ComplianceLogEntry[] = [
  {
    layer: 'rules',
    check: 'no_athlete_names',
    status: 'pass',
    ts: '2026-05-02T14:02:11Z',
  },
  {
    layer: 'rules',
    check: 'parity_check',
    status: 'pass',
    ts: '2026-05-02T14:02:11Z',
  },
  {
    layer: 'gemini',
    check: 'causal_tone',
    status: 'fail',
    details: 'Banned causal verb detected',
    before: 'Cobb County produces Olympic athletes',
    ts: '2026-05-02T14:02:13Z',
  },
  {
    layer: 'gemini',
    check: 'causal_tone',
    status: 'fixed',
    details: 'Rewritten in conditional phrasing',
    after: 'Cobb County could be associated with Olympic representation patterns',
    ts: '2026-05-02T14:02:14Z',
  },
];

export const mockRegion: RegionResponse = {
  fips: '13067',
  county_name: 'Cobb County',
  state: 'GA',
  msa_label: 'Atlanta-Sandy Springs-Alpharetta MSA',
  population: 766149,
  metrics: {
    olympic: {
      count: 14,
      per_100k: 1.83,
      percentile: 76.2,
      evidence: 'high',
    },
    paralympic: {
      count: 3,
      per_100k: 0.39,
      percentile: 68.1,
      evidence: 'medium',
    },
  },
  top_sports: [
    { sport: 'swimming', share: 0.42 },
    { sport: 'track and field', share: 0.34 },
    { sport: 'wrestling', share: 0.24 },
  ],
  centroid: [-84.5806, 33.8839],
  climate: {
    zone: 'humid_subtropical',
    avg_temp_f: 62.3,
    annual_precip_in: 51.2,
  },
  adaptive_access: {
    chapters_within_50mi: 2,
    confidence: 'medium',
  },
  narrative:
    "Cobb County's Olympic and Paralympic representation could be associated with broad regional pathway patterns across both Games disciplines. Swimming over-indexes in our indexed sources.",
  compliance_log: sampleCompliance,
};

export const mockAnalogs: AnalogsResponse = {
  source_fips: '13067',
  analogs: [
    {
      rank: 1,
      fips: '37119',
      county_name: 'Mecklenburg County',
      state: 'NC',
      overall_score: 0.84,
      breakdown: {
        athlete: 0.81,
        sport_mix: 0.88,
        climate: 0.83,
      },
      match_quality: 'high',
      centroid: [-80.8431, 35.2271],
      metrics: mockRegion.metrics,
      narrative:
        "Mecklenburg's profile could be associated with humid subtropical climate patterns and similar over-indexing in swimming.",
      compliance_log: sampleCompliance,
    },
    {
      rank: 2,
      fips: '37183',
      county_name: 'Wake County',
      state: 'NC',
      overall_score: 0.79,
      breakdown: {
        athlete: 0.78,
        sport_mix: 0.82,
        climate: 0.77,
      },
      match_quality: 'medium',
      centroid: [-78.6382, 35.7796],
      metrics: mockRegion.metrics,
      narrative:
        "Wake County's representation patterns may correlate with strong Paralympic per-capita signals despite slightly cooler climate.",
      compliance_log: sampleCompliance,
    },
    {
      rank: 3,
      fips: '21111',
      county_name: 'Jefferson County',
      state: 'KY',
      overall_score: 0.76,
      breakdown: {
        athlete: 0.74,
        sport_mix: 0.79,
        climate: 0.75,
      },
      match_quality: 'medium',
      centroid: [-85.7585, 38.2527],
      metrics: mockRegion.metrics,
      narrative:
        "Jefferson County's over-indexing in swimming and track could be associated with similar regional sport mix.",
      compliance_log: sampleCompliance,
    },
  ],
  tradeoff_explanation:
    "Mecklenburg could be associated with the strongest overall similarity in our indexed sources. Wake County may correlate with higher Paralympic per-capita representation despite a cooler climate match. Jefferson County's sport-mix signal could help fans tracking swimming pathways.",
};

export const mockPathway: PathwayResponse = {
  source_fips: '13067',
  gaps: [
    {
      category: 'observed_strength',
      claim:
        "Cobb County's Olympic swimming representation could be associated with above-median per-capita patterns in our indexed sources.",
      evidence: {
        metric: 'olympic swimming per_100k',
        value: 1.42,
        percentile: 84.3,
      },
      confidence: 'high',
    },
    {
      category: 'public_access_signal',
      claim:
        'Adaptive aquatics presence in our indexed sources is limited; the pattern below may not reflect full regional access.',
      evidence: {
        metric: 'Move United adaptive aquatics 50mi',
        value: 0,
        data_caveat: 'limited public coverage',
      },
      confidence: 'low',
    },
    {
      category: 'opportunity_hypothesis',
      claim:
        'Where Olympic swimming representation coexists with limited public adaptive signal, a pattern gap could exist — interpretation only, not causation.',
      evidence: {
        framing:
          'hypothesis only, based on indexed public sources, not real-world certainty',
      },
      confidence: 'low',
    },
  ],
};

/**
 * Sparse-county sentinel mock — exercises the "low public data" empty
 * states for ParityPanel / SportMix / AdaptiveAccessCard. Returned when
 * a user enters ZIP `11111` (sentinel) so the editorial empty-state
 * rendering can be demoed without waiting for backend integration with
 * a real low-population rural county.
 *
 * Honest framing: zero-counts in BOTH pillars + empty top_sports +
 * 0 chapters. Anti-false-failure perception — judges seeing zeros must
 * read "this region's signal is sparse" not "the app is broken." The
 * editorial empty copy in ParityPanelEmpty / SportMixEmpty handles the
 * narrative framing.
 *
 * Synthetic FIPS / county pulled from a real low-pop rural county
 * (Garfield County, MT, FIPS 30033, pop ~1,100) so the geographic
 * framing is plausible. Does NOT claim the real Garfield County
 * literally has zero athletes — the mock is illustrative only.
 */
export const mockSparseRegion: RegionResponse = {
  fips: '30033',
  county_name: 'Garfield County',
  state: 'MT',
  msa_label: 'Non-MSA — rural county',
  population: 1106,
  metrics: {
    olympic: {
      count: 0,
      per_100k: 0,
      percentile: 0,
      evidence: 'low',
    },
    paralympic: {
      count: 0,
      per_100k: 0,
      percentile: 0,
      evidence: 'low',
    },
  },
  centroid: [-106.9869, 47.0167],
  top_sports: [],
  climate: {
    zone: 'continental',
    avg_temp_f: 44.1,
    annual_precip_in: 13.8,
  },
  adaptive_access: {
    chapters_within_50mi: 0,
    confidence: 'none',
  },
  narrative:
    'This region shows fewer athlete-pathway signals in our indexed sources. Three peer counties sharing geographic and climate signature could provide context — see analogs below.',
  compliance_log: [],
};
