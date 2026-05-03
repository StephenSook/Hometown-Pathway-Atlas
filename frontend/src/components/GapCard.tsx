/**
 * GapCard — single Pattern Gap presentation.
 * Anatomy per DESIGN_SYSTEM §4.15.
 *
 * Three categories share the same card chrome but differ in:
 * - tri-color CategoryBadge (locked from §4.15)
 * - heterogeneous evidence shape (`framing`-only vs `metric+value+...`)
 *
 * Caller contract: `gap.claim` must already be pre-hedged in conditional
 * phrasing (CLAUDE.md hard rule). This component renders it verbatim.
 * In dev builds a regex-based defense-in-depth surfaces an [unhedged]
 * badge if the claim leaks causal verbs past the hybrid auditor.
 *
 * A11y: card's accessible name is the CategoryBadge text via
 * aria-labelledby (not a parallel aria-label) so screen readers report
 * a single name per article instead of duplicate labels. Note that
 * `<article>` is NOT a WAI-ARIA landmark — this dedup affects accessible
 * names + AT navigation between articles, not landmark hierarchy.
 *
 * Defensive against backend schema drift: unknown gap categories,
 * non-object evidence, empty evidence, and non-primitive evidence values
 * all surface visible UI fallbacks plus a dev-mode console.warn rather
 * than crashing or rendering invisibly.
 */

import { useId } from 'react';
import { AlertTriangle, Check, Lightbulb } from 'lucide-react';
import type { GapCategory, PatternGap } from '../lib/api';
import { fmtPercentile } from '../lib/format';
import EvidenceLabel from './EvidenceLabel';
import { cn } from '../lib/utils';

interface GapCardProps {
  gap: PatternGap;
  className?: string;
}

const CATEGORY_LABEL: Record<GapCategory, string> = {
  observed_strength: 'Observed strength',
  public_access_signal: 'Public access signal',
  opportunity_hypothesis: 'Opportunity hypothesis',
};

const CATEGORY_ICON: Record<GapCategory, typeof Check> = {
  observed_strength: Check,
  public_access_signal: AlertTriangle,
  opportunity_hypothesis: Lightbulb,
};

const CATEGORY_STYLES: Record<GapCategory, string> = {
  observed_strength: 'bg-accent-teal text-card-white',
  public_access_signal: 'bg-status-amber text-body-text',
  opportunity_hypothesis: 'bg-navy/10 text-navy border border-navy/30',
};

const FALLBACK_BADGE_STYLES =
  'bg-soft-border text-body-text border border-soft-border';

// Defense-in-depth — the hybrid auditor (task 4.4) is the production line of
// defense for conditional phrasing. This regex catches obvious causal verbs
// that slip past it and surfaces an [unhedged] badge in dev builds only.
const CAUSAL_VERBS =
  /\b(produces?|creates?|guarantees?|causes?|makes?|leads?\s+to|results?\s+in)\b/i; // atlas-phrasing-allow

// Coerce typed PatternGapEvidence (backend) to free-form record so the
// existing key-value rendering loop in <EvidenceBlock> works unchanged.
type EvidenceRecord = Record<string, unknown>;

export default function GapCard({ gap, className }: GapCardProps) {
  const badgeId = useId();
  const causalViolation =
    import.meta.env.DEV && CAUSAL_VERBS.test(gap.claim);
  if (causalViolation) {
    console.warn(
      `[GapCard] Causal phrasing detected in gap.claim. ` +
        `Hybrid auditor (task 4.4) should have caught this server-side.`,
      { category: gap.category, claim: gap.claim },
    );
  }

  return (
    <article
      aria-labelledby={badgeId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 flex flex-col gap-4',
        className,
      )}
    >
      <CategoryBadge id={badgeId} category={gap.category} />

      <p className="text-body text-body-text leading-relaxed">
        {gap.claim}
        {causalViolation && (
          <span
            aria-label="Unhedged claim — dev warning"
            className="ml-2 inline-block px-1.5 py-0.5 rounded text-eyebrow font-mono uppercase bg-status-danger text-card-white"
          >
            [unhedged]
          </span>
        )}
      </p>

      <EvidenceBlock evidence={gap.evidence as EvidenceRecord} />

      <div className="flex justify-end mt-auto">
        <EvidenceLabel level={gap.confidence} />
      </div>
    </article>
  );
}

function CategoryBadge({
  id,
  category,
}: {
  id?: string;
  category: GapCategory;
}) {
  // Defensive lookup — backend enum drift (e.g. a 4th category) won't crash
  // the icon render. Falls back to AlertTriangle + neutral styling +
  // verbose label so the silent path becomes a visible signal.
  const knownLabel = CATEGORY_LABEL[category];
  const knownIcon = CATEGORY_ICON[category];
  const knownStyles = CATEGORY_STYLES[category];
  const isKnown = knownLabel !== undefined;

  if (!isKnown && import.meta.env.DEV) {
    console.warn(
      `[GapCard] Unknown gap category "${category}" — ` +
        `using fallback rendering. Update GapCategory type in lib/api.ts.`,
    );
  }

  const Icon = knownIcon ?? AlertTriangle;
  const label = knownLabel ?? `Unknown signal: ${category}`;
  const styles = knownStyles ?? FALLBACK_BADGE_STYLES;

  return (
    <span
      id={id}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'font-mono uppercase tracking-wider text-eyebrow whitespace-nowrap self-start',
        styles,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Heterogeneous evidence renderer with three guard tiers:
 * 1. evidence is null/undefined/non-object → "Evidence unavailable" placeholder
 * 2. evidence has `framing` key → italic serif paragraph (interpretive stance)
 * 3. evidence object has zero keys → "Supporting metrics not available" placeholder
 * Otherwise render dl with one EvidenceRow per key.
 */
function EvidenceBlock({ evidence }: { evidence: Record<string, unknown> }) {
  if (evidence == null || typeof evidence !== 'object') {
    if (import.meta.env.DEV) {
      console.warn('[GapCard] evidence is null/undefined/non-object', {
        received: evidence,
      });
    }
    return (
      <p className="font-serif italic text-caption text-muted-text leading-snug">
        Evidence unavailable for this signal in our indexed sources.
      </p>
    );
  }

  if ('framing' in evidence) {
    return (
      <p className="font-serif italic text-caption text-muted-text leading-snug">
        {String(evidence.framing)}
      </p>
    );
  }

  const entries = Object.entries(evidence);
  if (entries.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('[GapCard] evidence object has no keys');
    }
    return (
      <p className="font-serif italic text-caption text-muted-text leading-snug">
        Supporting metrics not available for this signal in our indexed sources.
      </p>
    );
  }

  return (
    <dl className="flex flex-col gap-1">
      {entries.map(([key, value]) => (
        <EvidenceRow key={key} fieldKey={key} value={value} />
      ))}
    </dl>
  );
}

function EvidenceRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const label = humanizeKey(fieldKey);
  const isCaveat = fieldKey === 'data_caveat' || fieldKey === 'dataCaveat';
  const isPercentile = fieldKey === 'percentile' && typeof value === 'number';
  const display = isPercentile
    ? fmtPercentile(value as number)
    : typeof value === 'number'
      ? value.toString()
      : typeof value === 'string' || typeof value === 'boolean'
        ? String(value)
        : null;

  // Visible "unavailable" placeholder + dev warn for non-primitive values
  // (objects, arrays, null) — guards against backend schema drift without
  // the row silently disappearing.
  if (display === null) {
    if (import.meta.env.DEV) {
      console.warn(
        `[GapCard] evidence.${fieldKey} is not a primitive (got ${typeof value}). ` +
          `Rendering as 'unavailable'. Add a typeof branch to EvidenceRow if this key matters.`,
      );
    }
    return (
      <div className="flex items-baseline justify-between gap-3">
        <dt className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
          {label}
        </dt>
        <dd className="font-serif italic text-caption text-muted-text text-right">
          unavailable
        </dd>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
        {label}
      </dt>
      <dd
        className={cn(
          isCaveat
            ? 'font-serif italic text-caption text-muted-text text-right'
            : 'font-mono text-caption tabular text-body-text text-right',
        )}
      >
        {display}
      </dd>
    </div>
  );
}

/**
 * Splits snake_case OR camelCase keys, capitalizes the first segment.
 * Special-cases the `data_caveat` / `dataCaveat` evidence key as "Caveat".
 */
function humanizeKey(key: string): string {
  if (key === 'data_caveat' || key === 'dataCaveat') return 'Caveat';
  const parts = key.includes('_')
    ? key.split('_')
    : key.split(/(?=[A-Z])/).map((p) => p.toLowerCase());
  return parts
    .map((part, i) => (i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function GapCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading pattern gap"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 flex flex-col gap-4 animate-pulse',
        className,
      )}
    >
      <div className="h-5 w-32 rounded-full bg-soft-border" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-full rounded bg-soft-border" />
        <div className="h-4 w-4/5 rounded bg-soft-border" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded bg-soft-border" />
        <div className="h-3 w-3/4 rounded bg-soft-border" />
      </div>
      <div className="self-end mt-auto h-5 w-24 rounded-full bg-soft-border" />
    </article>
  );
}
