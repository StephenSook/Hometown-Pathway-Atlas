/**
 * ParityPanel ★ — Olympic + Paralympic side-by-side metrics
 * Per DESIGN_SYSTEM.md §4.4 (most critical component, locked anchor)
 *
 * LOCKED RULES (NEVER violate):
 * - Two columns, equal width, equal hue weight, identical chrome
 * - NEVER merge Olympic + Paralympic into a single number or bar
 * - NEVER hide Paralympic behind a toggle, tab, or "show more"
 * - NEVER stack vertically on desktop (mobile only — md breakpoint switch)
 *
 * Anatomy:
 * - White card, rounded-2xl, border-soft-border, p-6, shadow-card-resting
 * - Top: county name + MSA in Instrument Serif italic, centered
 * - Two columns separated by hairline divider (vertical desktop, horizontal mobile)
 * - LEFT (Olympic): navy header, navy stat, olympic-blue percentile bar
 * - RIGHT (Paralympic): paralympic-clay header, paralympic-clay stat, clay percentile bar
 * - Each column: large stat (tabular) → "per 100k population" → 5-segment percentile bar
 *   → EvidenceLabel pill
 * - Footer: monospace footnote acknowledging methodology
 *
 * Reference: docs/moodboard/02_parity_panel.png (LOCKED visual anchor)
 */

import { useId } from 'react';
import type { ParityMetric } from '../lib/api';
import { fmtPerCapita, fmtPercentile } from '../lib/format';
import EvidenceLabel from './EvidenceLabel';
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

const PARITY_SOURCES = {
  olympic:
    'Team USA Olympic roster 2016–2024 (Rio + Tokyo + Paris) aggregated to county FIPS, per-capita normalized vs Census ACS 5-year population with empirical Bayes shrinkage to dampen small-county noise.',
  paralympic:
    'Team USA Paralympic roster 2016–2024 aggregated to county FIPS, per-capita normalized vs Census ACS 5-year population with empirical Bayes shrinkage to dampen small-county noise. Ranked by percentile separately from Olympic — never merged.',
} as const;

interface ParityPanelProps {
  countyName: string;
  msaLabel: string;
  olympic: ParityMetric;
  paralympic: ParityMetric;
  className?: string;
}

// 5-segment percentile bar per moodboard 02_parity_panel.png
const SEGMENT_COUNT = 5;

interface ColumnProps {
  side: 'olympic' | 'paralympic';
  metric: ParityMetric;
}

function ParityColumn({ side, metric }: ColumnProps) {
  const isOlympic = side === 'olympic';
  const heading = isOlympic ? 'OLYMPIC' : 'PARALYMPIC';
  // Headers stay navy on both sides per §1.1 contrast rule:
  // Olympic-blue + Paralympic-clay fail AA at small text (12px eyebrow).
  // Hue distinction comes from large stat number + bar fill (large-text safe).
  const headerColor = 'text-navy';
  const statColor = isOlympic ? 'text-olympic-blue' : 'text-paralympic-clay';
  const fillColor = isOlympic ? 'bg-olympic-blue' : 'bg-paralympic-clay';

  // Compute filled segments — round to nearest segment
  const filledSegments = Math.min(
    SEGMENT_COUNT,
    Math.max(0, Math.round((metric.percentile / 100) * SEGMENT_COUNT)),
  );

  return (
    <section
      aria-label={`${heading} representation`}
      className="flex-1 flex flex-col items-center gap-3 p-6 text-center"
    >
      <p className={cn('font-mono uppercase tracking-wider text-eyebrow', headerColor)}>
        {heading}
      </p>

      <p className={cn('font-sans font-bold text-stat-md md:text-stat-lg leading-none tabular', statColor)}>
        <SourceTooltip source={isOlympic ? PARITY_SOURCES.olympic : PARITY_SOURCES.paralympic}>
          {fmtPerCapita(metric.per_100k)}
        </SourceTooltip>
      </p>

      <p className="text-caption text-muted-text">per 100k population</p>

      <div
        role="meter"
        aria-valuenow={metric.percentile}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${heading} percentile rank: ${fmtPercentile(metric.percentile)}`}
        className="flex w-full max-w-[200px] gap-1 mt-1"
      >
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 flex-1 rounded-sm',
              i < filledSegments ? fillColor : 'bg-soft-border',
            )}
          />
        ))}
      </div>

      <p className="text-caption text-muted-text font-mono">
        {fmtPercentile(metric.percentile)} percentile
      </p>

      <EvidenceLabel level={metric.evidence} className="mt-1" />
    </section>
  );
}

export default function ParityPanel({
  countyName,
  msaLabel,
  olympic,
  paralympic,
  className,
}: ParityPanelProps) {
  const headingId = useId();

  return (
    <article
      role="region"
      aria-labelledby={headingId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting overflow-hidden',
        className,
      )}
    >
      <div className="px-6 pt-6 text-center">
        <p id={headingId} className="font-serif italic text-caption text-muted-text">
          {countyName} · {msaLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-soft-border">
        <ParityColumn side="olympic" metric={olympic} />
        <ParityColumn side="paralympic" metric={paralympic} />
      </div>

      <p className="px-6 pb-5 text-eyebrow font-mono text-muted-text text-center">
        Per 100k pop. Percentile rank vs national distribution. Never merged.
      </p>
    </article>
  );
}

/**
 * Loading skeleton — mirrors final layout exactly.
 * Per DESIGN_SYSTEM §7.1: skeleton matching shape, no spinners inside components.
 */
export function ParityPanelSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading parity panel"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting overflow-hidden animate-pulse',
        className,
      )}
    >
      <div className="px-6 pt-6 text-center">
        <div className="mx-auto h-4 w-56 rounded bg-soft-border" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-soft-border">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3 p-6">
            <div className="h-3 w-20 rounded bg-soft-border" />
            <div className="h-12 md:h-16 w-28 rounded bg-soft-border" />
            <div className="h-3 w-32 rounded bg-soft-border/60" />
            <div className="h-2 w-full max-w-[200px] rounded bg-soft-border" />
            <div className="h-3 w-24 rounded bg-soft-border/60" />
            <div className="h-6 w-32 rounded-full bg-soft-border" />
          </div>
        ))}
      </div>
      <div className="px-6 pb-5">
        <div className="mx-auto h-3 w-72 rounded bg-soft-border/60" />
      </div>
    </article>
  );
}

/**
 * Empty state — rural / tribal fallback per DESIGN_SYSTEM §7.3.
 * Both columns show "—" placeholders + evidence "low" + extended footnote.
 * Preserves side-by-side parity discipline even when data is sparse.
 */
export function ParityPanelEmpty({
  countyName,
  msaLabel,
  className,
}: {
  countyName: string;
  msaLabel: string;
  className?: string;
}) {
  return (
    <article
      role="region"
      aria-label={`${countyName} parity panel — limited data`}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting overflow-hidden',
        className,
      )}
    >
      <div className="px-6 pt-6 text-center">
        <p className="font-serif italic text-caption text-muted-text">
          {countyName} · {msaLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-soft-border">
        {(['OLYMPIC', 'PARALYMPIC'] as const).map((heading) => {
          return (
            <section
              key={heading}
              aria-label={`${heading} representation — limited data`}
              className="flex-1 flex flex-col items-center gap-3 p-6 text-center"
            >
              <p className="font-mono uppercase tracking-wider text-eyebrow text-navy">
                {heading}
              </p>
              <p className="font-sans font-bold text-stat-md md:text-stat-lg leading-none text-muted-text/40">
                —
              </p>
              <p className="text-caption text-muted-text">per 100k population</p>
              <div className="flex w-full max-w-[200px] gap-1 mt-1">
                {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
                  <span key={i} className="h-2 flex-1 rounded-sm bg-soft-border" />
                ))}
              </div>
              <EvidenceLabel level="low" className="mt-1" />
            </section>
          );
        })}
      </div>

      <p className="px-6 pb-5 text-eyebrow font-mono text-muted-text text-center">
        Limited public data for this region. See Pattern Gaps below — three peer
        regions sharing geographic and climate signature could provide context.
      </p>
    </article>
  );
}
