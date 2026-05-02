/**
 * AnalogCard — single peer county card.
 * Anatomy per DESIGN_SYSTEM §4.10.
 *
 * Hover state uses CSS hover (no Framer Motion needed for subtle scale).
 * Click handler optional — Day 4 will wire to /region/{fips} drilldown via router.
 */

import { useId } from 'react';
import type { AnalogEntry } from '../lib/api';
import EvidenceLabel from './EvidenceLabel';
import SimilarityBreakdown from './SimilarityBreakdown';
import { cn } from '../lib/utils';

interface AnalogCardProps {
  analog: AnalogEntry;
  onSelect?: (fips: string) => void;
  className?: string;
}

export default function AnalogCard({
  analog,
  onSelect,
  className,
}: AnalogCardProps) {
  const headingId = useId();
  const isInteractive = onSelect !== undefined;

  const content = (
    <article
      aria-labelledby={headingId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting',
        'p-6 flex flex-col gap-4',
        isInteractive &&
          'transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02] cursor-pointer focus-ring',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-label={`Rank ${analog.rank}`}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-navy text-card-white font-mono text-caption tabular shrink-0"
        >
          {analog.rank}
        </span>

        <EvidenceLabel
          level={analog.match_quality === 'strong' ? 'high' : 'medium'}
          label={`${analog.match_quality} match`}
        />
      </div>

      <div>
        <h3
          id={headingId}
          className="text-h3 font-sans font-semibold text-navy leading-tight"
        >
          {analog.county_name}
        </h3>
        <p className="font-serif italic text-caption text-muted-text mt-1">
          {analog.state}
        </p>
      </div>

      <div className="h-px bg-soft-border" aria-hidden="true" />

      <SimilarityBreakdown breakdown={analog.breakdown} />

      <p className="font-serif italic text-caption text-muted-text leading-relaxed">
        {analog.narrative}
      </p>
    </article>
  );

  if (!isInteractive) return content;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(analog.fips)}
      className="text-left w-full"
      aria-label={`Open ${analog.county_name}, ${analog.state} region detail`}
    >
      {content}
    </button>
  );
}

export function AnalogCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading peer county card"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting',
        'p-6 flex flex-col gap-4 animate-pulse',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="w-7 h-7 rounded-full bg-soft-border" />
        <div className="h-6 w-28 rounded-full bg-soft-border" />
      </div>
      <div>
        <div className="h-6 w-44 rounded bg-soft-border" />
        <div className="h-3 w-24 rounded bg-soft-border/60 mt-2" />
      </div>
      <div className="h-px bg-soft-border" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-32 h-3 rounded bg-soft-border shrink-0" />
            <div className="flex-1 h-2 rounded bg-soft-border" />
            <div className="w-12 h-3 rounded bg-soft-border shrink-0" />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="h-3 w-full rounded bg-soft-border/60" />
        <div className="h-3 w-3/4 rounded bg-soft-border/60" />
      </div>
    </article>
  );
}
