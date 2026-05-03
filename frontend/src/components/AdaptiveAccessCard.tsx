/**
 * AdaptiveAccessCard — Move United chapter density.
 * Anatomy per DESIGN_SYSTEM §4.7. DISPLAY ONLY per locked decision D2 —
 * never load-bearing in similarity matching, confidence pill is mandatory,
 * methodology footnote acknowledges proxy limitations.
 */

import type { AdaptiveAccess } from '../lib/api';
import EvidenceLabel from './EvidenceLabel';
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

const ADAPTIVE_SOURCE =
  'Move United 2024 chapter directory, geocoded to county centroid + 50-mile radius search. Display only — never load-bearing in similarity matching per CLAUDE.md locked decision #2. Chapter density is a proxy and may underrepresent regional adaptive sports access.';

interface AdaptiveAccessCardProps {
  access: AdaptiveAccess;
  className?: string;
}

export default function AdaptiveAccessCard({
  access,
  className,
}: AdaptiveAccessCardProps) {
  const chapters = access.move_united_chapters_50mi;

  return (
    <article
      aria-label="Adaptive sports infrastructure"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 flex flex-col gap-4',
        className,
      )}
    >
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy">
        Adaptive access
      </p>

      <div>
        <p
          className="font-sans font-bold text-stat-md leading-none tabular text-navy"
          aria-label={`${chapters} Move United chapters within 50 miles`}
        >
          <SourceTooltip source={ADAPTIVE_SOURCE}>{chapters}</SourceTooltip>
        </p>
        <p className="text-caption text-muted-text mt-1">
          Move United chapters within 50 mi
        </p>
      </div>

      <EvidenceLabel level={access.confidence} className="self-start" />

      {chapters === 0 ? (
        <p className="font-serif italic text-eyebrow text-muted-text leading-relaxed">
          No Move United chapters within 50 mi in our indexed directory.
          Adaptive sports access likely exists through other organizations
          not in our source set; absence here is not a verdict on
          available access.
        </p>
      ) : (
        <p className="font-serif italic text-eyebrow text-muted-text leading-relaxed">
          Display only. Not used in similarity matching. Move United chapter
          density is a proxy and may underrepresent regional access.
        </p>
      )}
    </article>
  );
}

export function AdaptiveAccessCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading adaptive access card"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 flex flex-col gap-4 animate-pulse',
        className,
      )}
    >
      <div className="h-3 w-28 rounded bg-soft-border" />
      <div>
        <div className="h-9 w-16 rounded bg-soft-border" />
        <div className="h-3 w-48 rounded bg-soft-border/60 mt-2" />
      </div>
      <div className="h-6 w-32 rounded-full bg-soft-border" />
      <div className="space-y-1">
        <div className="h-3 w-full rounded bg-soft-border/60" />
        <div className="h-3 w-3/4 rounded bg-soft-border/60" />
      </div>
    </article>
  );
}
