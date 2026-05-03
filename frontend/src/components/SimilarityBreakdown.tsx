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
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

const DIMENSION_SOURCES = {
  athlete:
    '40% weight (CLAUDE.md locked decision #7). County athlete pipeline density: Team USA 2016-2024 roster representation per 100k population, normalized via empirical Bayes shrinkage to dampen small-county noise.',
  sport_mix:
    '35% weight (CLAUDE.md locked decision #7). Top-N sport over-indexing pattern: NFHS Athletics Participation 2023-24 z-scores cross-joined with Team USA roster sport assignments by county FIPS.',
  climate:
    '25% weight (CLAUDE.md locked decision #7). NOAA nClimGrid 5km 30-year climate normals + Köppen-Geiger zone match. Tie-break enforces MSA diversity constraint per locked decision #10 — top 3 analogs must span ≥2 different MSAs.',
} as const;

interface SimilarityBreakdownProps {
  breakdown: Breakdown;
  className?: string;
}

interface DimensionRow {
  label: string;
  value: number;
  /** Tailwind bg utility — large-area bar fill, AA-safe at any score */
  fillClass: string;
  /** Per-dimension methodology citation surfaced via SourceTooltip on label. */
  source: string;
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
      source: DIMENSION_SOURCES.athlete,
    },
    {
      label: 'Sport mix',
      value: breakdown.sport_mix_score,
      fillClass: 'bg-paralympic-clay',
      source: DIMENSION_SOURCES.sport_mix,
    },
    {
      label: 'Climate',
      value: breakdown.climate_score,
      fillClass: 'bg-accent-teal',
      source: DIMENSION_SOURCES.climate,
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
              <SourceTooltip source={row.source}>{row.label}</SourceTooltip>
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
