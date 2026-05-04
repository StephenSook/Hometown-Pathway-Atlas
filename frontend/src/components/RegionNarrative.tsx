/**
 * RegionNarrative — Vertex AI Gemini-generated region prose.
 *
 * Surfaces the `region.narrative` field that Vinh's GeminiService
 * (task 2.7, ship 7893fa7) populates on every POST /api/region call.
 * Backend's `enrich_region` returns 2-3 sentence editorial prose framing
 * the region's Olympic + Paralympic representation pattern in conditional
 * phrasing. The prose is generated structured-output (response_schema)
 * with system_instruction enforcing parity + hedged tone.
 *
 * Placement (HomePage.tsx): between <RegionHeader /> + <CountyMap />.
 * Frames Beat 3 narration ("Cobb County, Georgia. Population 766,000.
 * The map plots us in navy.") with Gemini's prose interpretation BEFORE
 * the visual reveal — the pitch differentiation is "judge sees that
 * Gemini just wrote this paragraph live, not a static description."
 *
 * Empty-state hide: if `narrative === ''` (Gemini fallback path failed
 * for some reason), render nothing rather than an empty box. The other
 * region surfaces (RegionHeader + ParityPanel + metric grid) carry the
 * data load on their own.
 *
 * Frontend safety net for banned-verb drift: GeminiService's
 * system_instruction enforces conditional phrasing, and HybridAuditor
 * (Vinh task 2.9) will be the deterministic backstop. UNTIL 2.9 ships,
 * a frontend regex check on the narrative against the same banned-verb
 * list as scripts/check-conditional-phrasing.mjs catches any Gemini
 * drift before it reaches the UI. If a banned verb slips through, we
 * suppress the narrative entirely (return null) rather than render a
 * compliance-violating string. DEV mode warns to console so drift is
 * observable during smoke + recording.
 *
 * A11y: <article role="region"> landmark mirroring sibling RegionQA +
 * Pillar5 + ComplianceLog conventions. Eyebrow doubles as label via
 * aria-labelledby. SourceTooltip on the eyebrow reveals Vertex AI
 * attribution + audit lineage on hover/focus.
 */

import { useId } from 'react';
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

// Mirror the EXACT banned-verb list from scripts/check-conditional-phrasing.mjs
// PLUS the broader set in GapCard.tsx (causes/makes/results in). Cold-check
// 2026-05-04 caught that this list was narrower than GapCard's, leaving a
// gap where Gemini drift on "causes"/"makes"/"results in" would slip past
// the frontend safety net even though those phrases are caught at backend
// HybridAuditor (Vinh task 2.9). Aligned with GapCard for defense in depth.
const BANNED_VERBS = /\b(produces?|producing|creates?|creating|guarantees?|leads?\s+to|led\s+to|causes?|makes?|results?\s+in)\b/i; // atlas-phrasing-allow — regex pattern source intentionally contains the verbs

interface RegionNarrativeProps {
  /** Gemini-generated 2-3 sentence prose. Empty string when backend
   *  fallback fired or Vinh's enrich_region hasn't shipped yet. */
  narrative: string;
  className?: string;
}

export default function RegionNarrative({
  narrative,
  className,
}: RegionNarrativeProps) {
  const headingId = useId();

  if (!narrative) return null;

  if (BANNED_VERBS.test(narrative)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[RegionNarrative] Banned causal verb detected in Gemini output, suppressing render.',
        { narrative },
      );
    }
    return null;
  }

  return (
    <article
      role="region"
      aria-labelledby={headingId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting',
        'border-l-4 border-l-olympic-blue px-6 py-5',
        className,
      )}
    >
      <p
        id={headingId}
        className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3"
      >
        <SourceTooltip source="Generated live by Vertex AI Gemini 2.5 Flash. Structured-output (response_schema) with system_instruction enforcing parity + conditional phrasing. Audited at backend (HybridAuditor) and as a frontend safety net before render.">
          Region narrative — Vertex AI Gemini
        </SourceTooltip>
      </p>
      <p className="font-serif italic text-body-lg text-body-text leading-relaxed">
        {narrative}
      </p>
    </article>
  );
}
