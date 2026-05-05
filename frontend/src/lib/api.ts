/**
 * Atlas API client — typed fetch wrapper with ApiError class.
 * Reconciled to backend Pydantic schemas as of Phase 2 ship 2026-05-03
 * (Vinh commits 8a36c91 + a617346). Backend is now authoritative; this
 * file mirrors backend/schemas/*.py 1:1.
 *
 * Backend URL via VITE_API_BASE_URL env var, defaults to localhost:8000 for dev.
 */

// Gate the localhost fallback to dev-only. In production builds with
// VITE_API_BASE_URL unset, ship empty string + log loudly so the
// failure surface is visible (every API call → 4xx via fetch on
// relative URL → QueryCache.onError fires Sonner toast → judges see
// "Network error" instead of silent broken app pointing at
// localhost:8000 that doesn't exist on the deployed host).
//
// Production deploy via cloud_run_deploy.md uses .env.production
// temp file to inject the backend URL at build time. If that step
// gets skipped, this guard is the second-line defense.
const API_BASE_URL = (() => {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return explicit;
  if (import.meta.env.DEV) return 'http://localhost:8000';
  console.error(
    '[api] VITE_API_BASE_URL not set in production build — all API ' +
      'calls will fail. Set it via frontend/.env.production before ' +
      '`gcloud run deploy --source frontend/`. See docs/cloud_run_deploy.md.',
  );
  return '';
})();

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

export interface CountyStats {
  fips: string;
  county_name: string;
  olympic_per_100k: number;
  paralympic_per_100k: number;
  olympic_evidence: EvidenceLevel;
  paralympic_evidence: EvidenceLevel;
}

/** Region Q&A — Layer C live wire (B3 ship 2026-05-04). User asks a
 *  free-text question about the region; Gemini reasons over the visible
 *  context (FIPS, metrics, sport mix, climate, adaptive access) and
 *  returns a conditional-phrased answer + visible reasoning chain.
 *  Frontend RegionQA fell back to STUBBED_RESPONSES until this shipped. */
export interface ReasoningStep {
  step: string;
  detail: string;
}

export interface RegionQAResponse {
  reasoning: ReasoningStep[];
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  /** Distinguishes a real Gemini call from the deterministic
   *  `_fallback_qa()` path. Both paths return HTTP 200; this field
   *  drives the "Live Gemini" eyebrow flip on the frontend so a
   *  fallback response doesn't claim to be live. */
  source: 'gemini' | 'fallback';
  compliance_log: ComplianceLogEntry[];
}

export interface RegionQARequest {
  fips: string;
  question: string;
}

/** Global atlas stats — backend `/api/stats/global` (Vinh Layer D ship
 *  2026-05-04, revision atlas-backend-00007-6k7). Two themed findings:
 *  - `gap`: the "4 in 5" headline behind HeroStat (Layer A finding)
 *  - `underdog`: small counties beating metro Paralympic rate (Layer D
 *    second finding)
 *  Both expose pre-formatted `headline` strings ready for editorial
 *  copy + raw numerator/denominator fields for in-component visuals. */
interface GlobalStatsBlock {
  /** Pre-formatted display string ready for hero + scrollytelling text. */
  headline: string;
}

export interface GapStat extends GlobalStatsBlock {
  total_counties: number;
  counties_with_athletes: number;
  counties_no_athletes: number;
  pct_with_athletes: number;
  ratio_display: string;
}

export interface UnderdogStat extends GlobalStatsBlock {
  n_small_counties: number;
  n_beating_metro: number;
  pct_beating_metro: number;
  metro_para_median_per_100k: number;
  pct_display: string;
}

export interface GlobalStats {
  gap: GapStat;
  underdog: UnderdogStat;
}

export const api = {
  region: (zip: string) =>
    request<RegionResponse>('/api/region', {
      method: 'POST',
      body: JSON.stringify({ zip } satisfies RegionRequest),
    }),

  analogs: (fips: string) => request<AnalogsResponse>(`/api/analogs/${fips}`),

  pathway: (fips: string) => request<PathwayResponse>(`/api/pathway/${fips}`),

  /** Lightweight per-county stats — used for click-to-load tooltip
   *  enrichment on CountyMap. Single county, fast lookup, no Gemini
   *  in path (deterministic profile only). Vinh task 0.9 contract. */
  countyStats: (fips: string) =>
    request<CountyStats>(`/api/stats/county/${fips}`),

  /** Region profile by FIPS — same payload shape as `/api/region` but
   *  keyed by county FIPS instead of ZIP. Powers map drill-down: click
   *  any county on the map → load that county as the new source region
   *  without a ZIP round-trip. Vinh task B7 ship 2026-05-04. */
  regionByFips: (fips: string) =>
    request<RegionResponse>(`/api/region/by-fips/${fips}`),

  /** Global atlas stats — Layer D scrollytelling source. Vinh task
   *  Layer D ship 2026-05-04. Single global call (no params), cache
   *  aggressively (`staleTime` set on hook side). Used by HeroStat
   *  validation + Layer D editorial chapters. */
  globalStats: () => request<GlobalStats>('/api/stats/global'),

  /** Region Q&A — Layer C live wire (B3 ship 2026-05-04). Replaces
   *  STUBBED_RESPONSES in RegionQA component when the backend qa
   *  endpoint resolves. Body: { fips, question }. Returns reasoning
   *  chain + final conditional-phrased answer + confidence rating
   *  + audit log. Caller falls back to stub on ApiError. */
  regionQA: (fips: string, question: string) =>
    request<RegionQAResponse>('/api/region/qa', {
      method: 'POST',
      body: JSON.stringify({ fips, question } satisfies RegionQARequest),
    }),
};
