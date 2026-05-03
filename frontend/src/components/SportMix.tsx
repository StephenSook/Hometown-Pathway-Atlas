/**
 * SportMix — top sports the region over-indexes on.
 * Anatomy per DESIGN_SYSTEM §4.5.
 *
 * 3-5 horizontal bars stacked. Width encodes z-score (sequential, not categorical).
 * Color stays single navy — opacity stays solid. Bar fills are large-area, AA-safe.
 */

import type { SportEntry } from '../lib/api';
import { fmtZScore } from '../lib/format';
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

const SPORT_MIX_SOURCE =
  'NFHS Athletics Participation Survey 2023-24 (8,062,302 student-athletes across 19,983 schools) cross-joined with USOPC Team USA roster 2016-2024 by county FIPS. Z-score is the per-sport county participation rate normalized vs national county distribution — positive z = over-indexed.';

interface SportMixProps {
  sports: SportEntry[];
  className?: string;
}

// z-score expected in the 0–3 range for over-indexed sports. Cap at 3 for width math.
const Z_SCORE_MAX = 3;

function clampZ(z: number): number {
  return Math.min(Z_SCORE_MAX, Math.max(0, z));
}

function widthPercent(z: number): number {
  return (clampZ(z) / Z_SCORE_MAX) * 100;
}

export default function SportMix({ sports, className }: SportMixProps) {
  // Sparse-county empty state — sports.length === 0 means no sport
  // over-indexed enough vs national distribution to register. Editorial
  // empty copy honestly frames the absence rather than rendering an
  // empty bar list (which would look broken).
  if (sports.length === 0) {
    return (
      <article
        aria-label="Top sports — no over-indexed signal"
        className={cn(
          'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6',
          className,
        )}
      >
        <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-4">
          <SourceTooltip source={SPORT_MIX_SOURCE}>Top sports</SourceTooltip>
        </p>
        <p className="font-serif italic text-body text-muted-text leading-relaxed">
          No sport over-indexed in this region — county participation
          patterns may be balanced across categories, or sample size is
          below the threshold needed for a stable z-score. The absence is
          itself a signal.
        </p>
      </article>
    );
  }

  return (
    <article
      aria-label="Top sports the region could be associated with"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6',
        className,
      )}
    >
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-4">
        <SourceTooltip source={SPORT_MIX_SOURCE}>Top sports</SourceTooltip>
      </p>

      <ul className="flex flex-col gap-3">
        {sports.map((entry) => {
          const clamped = clampZ(entry.z_score);
          return (
            <li key={entry.sport} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-body text-body-text capitalize">
                {entry.sport}
              </span>

              <span
                role="meter"
                aria-valuemin={0}
                aria-valuemax={Z_SCORE_MAX}
                aria-valuenow={clamped}
                aria-label={`${entry.sport} z-score ${fmtZScore(entry.z_score)}`}
                className="relative flex-1 h-2 rounded bg-soft-border overflow-hidden"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-navy rounded"
                  style={{ width: `${widthPercent(entry.z_score)}%` }}
                />
              </span>

              <span className="w-12 shrink-0 text-right font-mono text-caption tabular text-muted-text">
                {fmtZScore(entry.z_score)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 font-serif italic text-eyebrow text-muted-text">
        Z-score vs national county distribution. Higher could be associated with
        regional over-indexing patterns in our indexed sources.
      </p>
    </article>
  );
}

export function SportMixSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading top sports"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 animate-pulse',
        className,
      )}
    >
      <div className="h-3 w-20 rounded bg-soft-border mb-4" />
      <ul className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3">
            <div className="w-32 h-4 rounded bg-soft-border shrink-0" />
            <div className="flex-1 h-2 rounded bg-soft-border" />
            <div className="w-12 h-4 rounded bg-soft-border shrink-0" />
          </li>
        ))}
      </ul>
    </article>
  );
}
