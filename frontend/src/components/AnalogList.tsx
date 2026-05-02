/**
 * AnalogList — three peer county cards in a grid container.
 * Anatomy per DESIGN_SYSTEM §4.9.
 *
 * Always renders 3 slots. If fewer analogs returned (data sparsity),
 * remaining slots show a limited-match placeholder. Preserves the
 * "three peers" promise visually even with sparse data.
 */

import type { AnalogEntry } from '../lib/api';
import AnalogCard, { AnalogCardSkeleton } from './AnalogCard';
import { cn } from '../lib/utils';

interface AnalogListProps {
  analogs: AnalogEntry[];
  onSelectAnalog?: (fips: string) => void;
  className?: string;
}

const REQUIRED_SLOTS = 3;

export default function AnalogList({
  analogs,
  onSelectAnalog,
  className,
}: AnalogListProps) {
  const filledCount = analogs.length;
  const missingCount = Math.max(0, REQUIRED_SLOTS - filledCount);

  return (
    <section
      aria-labelledby="analog-list-heading"
      className={cn('flex flex-col gap-6', className)}
    >
      <header>
        <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2">
          Peer counties
        </p>
        <h2
          id="analog-list-heading"
          className="text-h2 font-sans font-semibold text-navy leading-tight tracking-tight"
        >
          Three regional{' '}
          <span className="font-serif italic font-normal">analogs</span>
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {analogs.map((analog) => (
          <AnalogCard
            key={analog.fips}
            analog={analog}
            onSelect={onSelectAnalog}
          />
        ))}

        {Array.from({ length: missingCount }).map((_, i) => (
          <article
            key={`missing-${i}`}
            aria-label="Limited peer match available"
            className="rounded-2xl bg-card-white/60 border border-dashed border-soft-border p-6 flex flex-col items-center justify-center text-center min-h-[280px]"
          >
            <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2">
              Limited match
            </p>
            <p className="font-serif italic text-caption text-muted-text leading-relaxed max-w-[200px]">
              Sparse data in this region — see methodology footnote for
              context.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AnalogListSkeleton({ className }: { className?: string }) {
  return (
    <section
      aria-busy="true"
      aria-label="Loading peer counties"
      className={cn('flex flex-col gap-6', className)}
    >
      <header className="animate-pulse">
        <div className="h-3 w-24 rounded bg-soft-border mb-2" />
        <div className="h-9 w-72 rounded bg-soft-border" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <AnalogCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
