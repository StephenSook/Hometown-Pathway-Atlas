/**
 * SimilarityBreakdown — 3 dimension bars for analog match.
 * Anatomy per DESIGN_SYSTEM §4.11.
 *
 * Used inside AnalogCard but also reusable standalone.
 * Three dimensions per locked decision D7: athlete (40 weight) /
 * sport mix (35) / climate (25).
 */

import type { SimilarityBreakdown as Breakdown } from '../lib/api';
import { fmtPercent } from '../lib/format';
import { cn } from '../lib/utils';

interface SimilarityBreakdownProps {
  breakdown: Breakdown;
  className?: string;
}

interface DimensionRow {
  label: string;
  value: number;
  /** Tailwind bg utility — large-area bar fill, AA-safe at any score */
  fillClass: string;
}

export default function SimilarityBreakdown({
  breakdown,
  className,
}: SimilarityBreakdownProps) {
  const rows: DimensionRow[] = [
    {
      label: 'Athlete profile',
      value: breakdown.athlete_score,
      fillClass: 'bg-olympic-blue',
    },
    {
      label: 'Sport mix',
      value: breakdown.sport_mix_score,
      fillClass: 'bg-paralympic-clay',
    },
    {
      label: 'Climate',
      value: breakdown.climate_score,
      fillClass: 'bg-accent-teal',
    },
  ];

  return (
    <ul
      aria-label="Similarity breakdown by dimension"
      className={cn('flex flex-col gap-3', className)}
    >
      {rows.map((row) => {
        const clampedValue = Math.min(1, Math.max(0, row.value));
        const widthPct = clampedValue * 100;
        return (
          <li key={row.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 font-mono uppercase tracking-wider text-eyebrow text-muted-text">
              {row.label}
            </span>

            <span
              role="meter"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={clampedValue}
              aria-label={`${row.label} similarity ${fmtPercent(widthPct)}`}
              className="relative flex-1 h-2 rounded bg-soft-border overflow-hidden"
            >
              <span
                className={cn('absolute inset-y-0 left-0 rounded', row.fillClass)}
                style={{ width: `${widthPct}%` }}
              />
            </span>

            <span className="w-12 shrink-0 text-right font-mono text-caption tabular text-body-text">
              {fmtPercent(widthPct)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
