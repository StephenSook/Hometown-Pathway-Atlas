/**
 * Atlas API client — typed fetch wrapper with ApiError class.
 * Reconciled to backend Pydantic schemas as of Phase 2 ship 2026-05-03
 * (Vinh commits 8a36c91 + a617346). Backend is now authoritative; this
 * file mirrors backend/schemas/*.py 1:1.
 *
 * Backend URL via VITE_API_BASE_URL env var, defaults to localhost:8000 for dev.
 */

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────
// Types — mirror backend/schemas/*.py 1:1.
// ─────────────────────────────────────────────────────────────────

export type EvidenceLevel = 'high' | 'medium' | 'low';
/** Backend uses "none" for adaptive-access when no chapters found within 50mi.
 *  Render layer maps "none" → "low" tier styling on EvidenceLabel. */
export type AdaptiveConfidence = 'high' | 'medium' | 'none';
export type ComplianceStatus = 'pass' | 'fail' | 'fixed';
export type ComplianceLayer = 'rules' | 'gemini';
export type GapCategory =
  | 'observed_strength'
  | 'public_access_signal'
  | 'opportunity_hypothesis';
/** Backend tier from analog_service._match_quality (≥0.75 / ≥0.50 / else). */
export type MatchQuality = 'high' | 'medium' | 'low';
/** Centroid is [longitude, latitude] tuple, optional per backend schema. */
export type Centroid = [number, number] | null;

export interface ComplianceLogEntry {
  layer: ComplianceLayer;
  check: string;
  status: ComplianceStatus;
  /** Backend always sends `details: str` — required field on Pydantic side.
   *  Kept optional in TS interface as a defensive permissiveness for
   *  pre-task-2.9 backend builds where compliance_log is empty array. */
  details?: string;
  ts: string; // ISO8601
  /** before/after are populated by the hybrid auditor when status=fixed.
   *  Vinh task 2.9 will add these fields to the Pydantic schema. */
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
  /** Fraction of region's top-sports list (0-1). Backend currently sets
   *  share=1/N for N top sports — visualization will look uniform until
   *  Vinh adds per-sport z-scores or counts to the parquet. */
  share: number;
}

export interface ClimateProfile {
  zone: string;
  /** Nullable per backend ClimateBlock — nClimGrid coverage gaps possible. */
  avg_temp_f: number | null;
  annual_precip_in: number | null;
}

export interface AdaptiveAccess {
  chapters_within_50mi: number;
  /** Three-tier per backend schema. "none" = no chapters found nearby. */
  confidence: AdaptiveConfidence;
}

export interface RegionResponse {
  fips: string;
  county_name: string;
  state: string;
  msa_label: string;
  population: number;
  /** [lng, lat] tuple. Used by CountyMap source-pin positioning. */
  centroid: Centroid;
  metrics: {
    olympic: ParityMetric;
    paralympic: ParityMetric;
  };
  top_sports: SportEntry[];
  climate: ClimateProfile;
  adaptive_access: AdaptiveAccess;
  /** Empty string until Vinh task 2.7 (Gemini narrative) ships. */
  narrative: string;
  /** Empty array until Vinh task 2.9 (HybridAuditor) ships. */
  compliance_log: ComplianceLogEntry[];
}

export interface SimilarityBreakdown {
  athlete: number;
  sport_mix: number;
  climate: number;
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
  centroid: Centroid;
  narrative: string;
  compliance_log: ComplianceLogEntry[];
}

export interface AnalogsResponse {
  source_fips: string;
  analogs: AnalogEntry[];
  tradeoff_explanation: string;
}

/** Backend EvidenceBlock — typed but all fields optional. */
export interface PatternGapEvidence {
  metric?: string;
  value?: number;
  percentile?: number;
  data_caveat?: string;
  framing?: string;
}

export interface PatternGap {
  category: GapCategory;
  claim: string;
  evidence: PatternGapEvidence;
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
    // Read body once as text, then attempt JSON.parse on the string —
    // calling response.json() then response.text() in catch fails
    // because the stream was already consumed by the failed JSON read.
    // Wrap response.text() in try too — gzip/encoding errors at the
    // stream layer would otherwise throw past the ApiError, leaving
    // the caller without an HTTP status to act on.
    let body: unknown = '';
    try {
      const text = await response.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    } catch {
      // Stream-level failure (gzip / network mid-body) — drop body,
      // keep going so caller still gets the HTTP status via ApiError.
      body = '';
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
