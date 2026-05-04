/**
 * Atlas banned-verb regex — single source of truth for frontend
 * conditional-phrasing safety nets.
 *
 * CLAUDE.md hard rule: user-facing strings MUST use conditional phrasing
 * (hedged language only — "could be associated with", "may correlate",
 * "appears", "shows patterns"). Causal-tone verbs trigger Pillar 4
 * compliance violation. See the regex literal below for the exact
 * coverage list.
 *
 * Backend HybridAuditor (Vinh task 2.9, shipped commit 7893fa7) is the
 * production line of defense — every Gemini narrative passes through
 * deterministic regex + Gemini semantic causal-tone analysis before
 * reaching the wire.
 *
 * Frontend safety nets are the SECOND line of defense — RegionNarrative
 * suppresses render entirely on a verb hit, GapCard surfaces an
 * [unhedged] dev badge. Either action prevents a Pillar 4 violation
 * from reaching judges if the backend auditor is bypassed (network
 * failure, schema drift, transient Gemini variance under load).
 *
 * Aligned 2026-05-04 — previously RegionNarrative had 10 verbs +
 * GapCard had 7 (drift caught by trunk-style code review). One regex,
 * imported by both, removes the drift surface permanently.
 *
 * If the CI script (scripts/check-conditional-phrasing.mjs) ever
 * widens or narrows its banned set, mirror the change here for runtime
 * parity. Backend auditor (backend/services/auditor.py _CAUSAL_PATTERN,
 * narrowed by Vinh 2026-05-04 commit 2ff150f) is the canonical source
 * for the production catch surface.
 */

export const BANNED_VERBS = /\b(produces?|producing|creates?|creating|guarantees?|leads?\s+to|led\s+to|causes?|makes?|results?\s+in)\b/i; // atlas-phrasing-allow — regex pattern source intentionally contains the verbs

/**
 * Test arbitrary user-facing string against the banned-verb regex.
 * Returns true if any banned verb is present. Caller decides the action
 * (suppress render, surface dev badge, log warning, etc).
 */
export function containsBannedVerb(text: string): boolean {
  return BANNED_VERBS.test(text);
}
