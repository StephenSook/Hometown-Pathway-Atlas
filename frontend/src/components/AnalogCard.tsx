/**
 * AnalogCard — single peer county card.
 * Anatomy per DESIGN_SYSTEM §4.10.
 *
 * Interactive mode uses card-link pattern: <article> stays as landmark,
 * a single inner button activates via ::before pseudo-overlay covering the
 * whole card. Avoids the invalid HTML of nesting <article> inside <button>.
 * Hover styles ride the .group/.group-hover pattern on the article.
 */

import { useId } from 'react';
import type { AnalogEntry } from '../lib/api';
import EvidenceLabel from './EvidenceLabel';
import SimilarityBreakdown from './SimilarityBreakdown';
import { cn } from '../lib/utils';

interface AnalogCardProps {
  analog: AnalogEntry;
  onSelect?: (fips: string) => void;
  /** Cross-component highlight — fires onHover(fips) on
   *  mouseenter/focus, onHover(null) on leave/blur. Lifted to
   *  HomePage → CountyMap so the matching pin on the map gets
   *  emphasized while user is hovering this card. */
  onHover?: (fips: string | null) => void;
  /** True when the SHARED hoveredAnalogFips state matches this
   *  analog's fips. Drives a left-border accent so the bidirectional
   *  link is visible when user hovers the matching pin on the map.
   *  (Pin → card direction; card → pin direction is handled in
   *  CountyMap via the same shared state.) */
  isHighlighted?: boolean;
  className?: string;
}

export default function AnalogCard({
  analog,
  onSelect,
  onHover,
  isHighlighted,
  className,
}: AnalogCardProps) {
  const headingId = useId();
  const isInteractive = onSelect !== undefined;

  return (
    <article
      aria-labelledby={headingId}
      onMouseEnter={() => onHover?.(analog.fips)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(analog.fips)}
      onBlur={() => onHover?.(null)}
      className={cn(
        'group relative rounded-2xl bg-card-white border border-soft-border shadow-card-resting',
        'p-6 flex flex-col gap-4 transition-all duration-200',
        // Bidirectional highlight — when matching map pin is hovered,
        // outline this card with navy left border + lifted shadow.
        // Mirror of CountyMap's pin emphasis when card is hovered.
        isHighlighted && 'border-l-4 border-l-navy shadow-card-hover',
        isInteractive &&
          'group-hover:shadow-card-hover hover:shadow-card-hover hover:scale-[1.02]',
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
          level={analog.match_quality}
          label={`${analog.match_quality} match`}
        />
      </div>

      <div>
        <h3 className="text-h3 font-sans font-semibold text-navy leading-tight">
          {isInteractive ? (
            <button
              id={headingId}
              type="button"
              onClick={() => onSelect?.(analog.fips)}
              className={cn(
                'text-left focus-ring rounded',
                // ::before overlay extends click target to whole article surface.
                "before:content-[''] before:absolute before:inset-0 before:rounded-2xl",
              )}
            >
              {analog.county_name}
            </button>
          ) : (
            <span id={headingId}>{analog.county_name}</span>
          )}
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
