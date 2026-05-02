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
 *
 * A11y: the card's accessible name comes from the CategoryBadge via
 * aria-labelledby, not a parallel aria-label, so screen-reader landmark
 * navigation doesn't double-announce the same name.
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

export default function GapCard({ gap, className }: GapCardProps) {
  const badgeId = useId();
  return (
    <article
      aria-labelledby={badgeId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 flex flex-col gap-4',
        className,
      )}
    >
      <CategoryBadge id={badgeId} category={gap.category} />

      <p className="text-body text-body-text leading-relaxed">{gap.claim}</p>

      <EvidenceBlock evidence={gap.evidence} />

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
  const Icon = CATEGORY_ICON[category];
  return (
    <span
      id={id}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'font-mono uppercase tracking-wider text-eyebrow whitespace-nowrap self-start',
        CATEGORY_STYLES[category],
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {CATEGORY_LABEL[category]}
    </span>
  );
}

/**
 * Heterogeneous evidence renderer. Discriminates on `'framing' in evidence`:
 * - framing-only → italic serif paragraph (interpretive stance)
 * - metric+value+... → dl with mono key/value rows
 */
function EvidenceBlock({ evidence }: { evidence: Record<string, unknown> }) {
  if ('framing' in evidence) {
    return (
      <p className="font-serif italic text-caption text-muted-text leading-snug">
        {String(evidence.framing)}
      </p>
    );
  }

  return (
    <dl className="flex flex-col gap-1">
      {Object.entries(evidence).map(([key, value]) => (
        <EvidenceRow key={key} fieldKey={key} value={value} />
      ))}
    </dl>
  );
}

function EvidenceRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const label = humanizeKey(fieldKey);
  const isCaveat = fieldKey === 'data_caveat';
  const isPercentile = fieldKey === 'percentile' && typeof value === 'number';
  const display = isPercentile
    ? fmtPercentile(value as number)
    : typeof value === 'number'
      ? value.toString()
      : typeof value === 'string' || typeof value === 'boolean'
        ? String(value)
        : null;

  // Skip non-primitive values (objects, arrays, null) — graceful degradation
  // against backend schema drift, avoids "[object Object]" leaking into UI.
  if (display === null) return null;

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

function humanizeKey(key: string): string {
  if (key === 'data_caveat') return 'Caveat';
  return key
    .split('_')
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
