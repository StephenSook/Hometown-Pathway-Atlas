/**
 * PatternGapPanel — three-card editorial conclusion of the data flow.
 * Anatomy per DESIGN_SYSTEM §4.15.
 *
 * Mirrors the ParityPanel a11y pattern: useId-bound aria-labelledby on the
 * outer article so screen readers announce the heading once and treat the
 * three GapCards as one logical region.
 *
 * Layout follows DESIGN_SYSTEM §3 mobile-first table: stacks vertically
 * on mobile, three columns from md+ (matches AnalogList's grid pattern).
 *
 * Pattern Gaps are one of the project's three load-bearing differentiators —
 * conditional phrasing is enforced at every layer (mocks, claim text, panel
 * chrome). Static labels here are deliberately neutral, never causal.
 */

import { useId } from 'react';
import type { PatternGap } from '../lib/api';
import GapCard, { GapCardSkeleton } from './GapCard';
import { cn } from '../lib/utils';

interface PatternGapPanelProps {
  gaps: PatternGap[];
  className?: string;
}

export default function PatternGapPanel({
  gaps,
  className,
}: PatternGapPanelProps) {
  const headingId = useId();

  return (
    <article
      role="region"
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-6', className)}
    >
      <header className="text-center">
        <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2">
          Pattern gaps
        </p>
        <h3
          id={headingId}
          className="font-sans font-semibold text-h3 text-navy"
        >
          What this region's data shows
        </h3>
      </header>

      {gaps.length === 0 ? (
        <p className="font-serif italic text-caption text-muted-text text-center">
          No pattern signals available for this region in our indexed sources.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {gaps.map((gap) => (
            <GapCard key={gap.category} gap={gap} />
          ))}
        </div>
      )}
    </article>
  );
}

export function PatternGapPanelSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading pattern gaps"
      className={cn('flex flex-col gap-6 animate-pulse', className)}
    >
      <header className="text-center flex flex-col items-center gap-2">
        <div className="h-3 w-24 rounded bg-soft-border" />
        <div className="h-7 w-72 rounded bg-soft-border" />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <GapCardSkeleton key={i} />
        ))}
      </div>
    </article>
  );
}
