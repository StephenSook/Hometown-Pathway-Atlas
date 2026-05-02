/**
 * RegionHeader — county identity + population badge per DESIGN_SYSTEM.md §4.3
 *
 * Anatomy:
 * - County name in Inter weight 600, navy, 32-40px desktop
 * - State + MSA label below in Instrument Serif italic, muted-text 13px
 * - Population badge: JetBrains Mono 12px uppercase, soft-border pill,
 *   tabular numbers
 *
 * Mobile (per §3): stacks vertically — county name, state+MSA on line 2,
 * population badge on line 3.
 *
 * States:
 * - Default: as above
 * - Loading: skeleton rows matching final shape (no in-component spinner)
 *
 * Reference: docs/moodboard/02_parity_panel.png header pattern
 */

import { fmtPopulation } from '../lib/format';
import { cn } from '../lib/utils';

interface RegionHeaderProps {
  countyName: string;
  state: string;
  msaLabel: string;
  population: number;
  className?: string;
}

export default function RegionHeader({
  countyName,
  state,
  msaLabel,
  population,
  className,
}: RegionHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-6',
        className,
      )}
    >
      <div>
        {/* §1.2 page title scale: 32px mobile / 32-40px desktop — NOT hero h1 (64px) */}
        <h1 className="text-h2 md:text-[40px] md:leading-[1.1] md:tracking-[-0.01em] font-sans font-semibold text-navy leading-tight">
          {countyName}
        </h1>
        <p className="mt-1 font-serif italic text-caption text-muted-text">
          {state} · {msaLabel}
        </p>
      </div>

      <div className="self-start md:self-auto">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-card-white px-3 py-1 font-mono uppercase tracking-wider text-eyebrow text-muted-text"
          aria-label={`Population: ${fmtPopulation(population)}`}
        >
          <span className="text-muted-text">pop</span>
          <span className="tabular text-body-text">
            {fmtPopulation(population)}
          </span>
        </span>
      </div>
    </header>
  );
}

/**
 * Loading skeleton matching RegionHeader's final shape.
 * Use at page level above the component until data arrives.
 */
export function RegionHeaderSkeleton({ className }: { className?: string }) {
  return (
    <header
      aria-busy="true"
      aria-label="Loading region header"
      className={cn(
        'flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-6 animate-pulse',
        className,
      )}
    >
      <div>
        <div className="h-9 md:h-12 w-48 md:w-64 rounded bg-soft-border" />
        <div className="mt-2 h-4 w-56 rounded bg-soft-border/60" />
      </div>
      <div className="h-7 w-28 rounded-full bg-soft-border self-start md:self-auto" />
    </header>
  );
}
