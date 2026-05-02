/**
 * Atlas API client — typed fetch wrapper with ApiError class.
 * Mirrors Trace pattern. Implements PLAN.md Shared Contracts.
 *
 * Backend URL via VITE_API_BASE_URL env var, defaults to localhost:8000 for dev.
 */

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────
// Types — locked to PLAN.md Shared Contracts. Edit there first.
// ─────────────────────────────────────────────────────────────────

export type EvidenceLevel = 'high' | 'medium' | 'low';
export type ComplianceStatus = 'pass' | 'fail' | 'fixed';
export type ComplianceLayer = 'rules' | 'gemini';
export type GapCategory =
  | 'observed_strength'
  | 'public_access_signal'
  | 'opportunity_hypothesis';
export type MatchQuality = 'strong' | 'partial';

export interface ComplianceLogEntry {
  layer: ComplianceLayer;
  check: string;
  status: ComplianceStatus;
  details?: string;
  ts: string; // ISO8601
  before?: string;
  after?: string;
}

export interface ParityMetric {
  count: number;
  per_100k: number;
  percentile: number;
  evidence: EvidenceLevel;
}

export interface SportEntry {
  sport: string;
  z_score: number;
}

export interface ClimateProfile {
  zone: string;
  avg_temp_f: number;
  annual_precip_in: number;
  elevation_ft: number;
}

export interface AdaptiveAccess {
  move_united_chapters_50mi: number;
  confidence: EvidenceLevel;
}

export interface RegionResponse {
  fips: string;
  county_name: string;
  state: string;
  msa_label: string;
  population: number;
  metrics: {
    olympic: ParityMetric;
    paralympic: ParityMetric;
  };
  top_sports: SportEntry[];
  climate: ClimateProfile;
  adaptive_access: AdaptiveAccess;
  narrative: string;
  compliance_log: ComplianceLogEntry[];
}

export interface SimilarityBreakdown {
  athlete_score: number;
  sport_mix_score: number;
  climate_score: number;
}

export interface AnalogEntry {
  rank: number;
  fips: string;
  county_name: string;
  state: string;
  overall_score: number;
  breakdown: SimilarityBreakdown;
  match_quality: MatchQuality;
  metrics: RegionResponse['metrics'];
  narrative: string;
  compliance_log: ComplianceLogEntry[];
}

export interface AnalogsResponse {
  source_fips: string;
  analogs: AnalogEntry[];
  tradeoff_explanation: string;
}

export interface PatternGap {
  category: GapCategory;
  claim: string;
  evidence: Record<string, unknown>;
  confidence: EvidenceLevel;
}

export interface PathwayResponse {
  source_fips: string;
  gaps: PatternGap[];
}

export interface RegionRequest {
  zip: string;
}

// ─────────────────────────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ─────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, `Request failed: ${response.status}`, body);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

export const api = {
  region: (zip: string) =>
    request<RegionResponse>('/api/region', {
      method: 'POST',
      body: JSON.stringify({ zip } satisfies RegionRequest),
    }),

  analogs: (fips: string) => request<AnalogsResponse>(`/api/analogs/${fips}`),

  pathway: (fips: string) => request<PathwayResponse>(`/api/pathway/${fips}`),
};
