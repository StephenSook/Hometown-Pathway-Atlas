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
    status: 'pass',
    details: 'No causal language detected',
    ts: '2026-05-02T14:02:12Z',
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
    { sport: 'swimming', z_score: 2.1 },
    { sport: 'track and field', z_score: 1.7 },
    { sport: 'wrestling', z_score: 1.2 },
  ],
  climate: {
    zone: 'humid_subtropical',
    avg_temp_f: 62.3,
    annual_precip_in: 51.2,
    elevation_ft: 1100,
  },
  adaptive_access: {
    move_united_chapters_50mi: 2,
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
        athlete_score: 0.81,
        sport_mix_score: 0.88,
        climate_score: 0.83,
      },
      match_quality: 'strong',
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
        athlete_score: 0.78,
        sport_mix_score: 0.82,
        climate_score: 0.77,
      },
      match_quality: 'partial',
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
        athlete_score: 0.74,
        sport_mix_score: 0.79,
        climate_score: 0.75,
      },
      match_quality: 'partial',
      metrics: mockRegion.metrics,
      narrative:
        "Jefferson County's over-indexing in swimming and track could be associated with similar regional sport mix.",
      compliance_log: sampleCompliance,
    },
  ],
  tradeoff_explanation:
    "Mecklenburg leads on overall similarity. Wake County shows stronger Paralympic per-capita representation despite a slightly cooler climate match. Jefferson County offers the closest sport-mix signal for fans focused on swimming pathways.",
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
