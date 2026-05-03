/**
 * SportMix — top sports the region could be associated with.
 * Anatomy per DESIGN_SYSTEM §4.5.
 *
 * 3-5 horizontal bars stacked. Width encodes share (0-1, sum across the
 * top sports = 1). Color stays single navy — opacity stays solid. Bar
 * fills are large-area, AA-safe.
 *
 * Backend Phase 2 (Vinh task 2.3) currently returns share = 1/N for N
 * top sports — every bar is identical width until the parquet refines to
 * include per-sport z-scores or counts. This is honest reflection of
 * current data; weight visualization will gain meaning as upstream math
 * sharpens.
 */

import type { SportEntry } from '../lib/api';
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

const SPORT_MIX_SOURCE =
  'NFHS Athletics Participation Survey 2023-24 (8,062,302 student-athletes across 19,983 schools) cross-joined with USOPC Team USA roster 2016-2024 by county FIPS. Bar width encodes per-sport share of region top-sports list (0-1).';

function fmtShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

interface SportMixProps {
  sports: SportEntry[];
  className?: string;
}

// Share is a fraction (0-1). Sum across top sports should equal 1 in
// principle; clamping defensively for any individual entry.
function clampShare(s: number): number {
  return Math.min(1, Math.max(0, s));
}

function widthPercent(share: number): number {
  return clampShare(share) * 100;
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
          const clamped = clampShare(entry.share);
          return (
            <li key={entry.sport} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-body text-body-text capitalize">
                {entry.sport}
              </span>

              <span
                role="meter"
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={clamped}
                aria-label={`${entry.sport} share ${fmtShare(entry.share)}`}
                className="relative flex-1 h-2 rounded bg-soft-border overflow-hidden"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-navy rounded"
                  style={{ width: `${widthPercent(entry.share)}%` }}
                />
              </span>

              <span className="w-12 shrink-0 text-right font-mono text-caption tabular text-muted-text">
                {fmtShare(entry.share)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 font-serif italic text-eyebrow text-muted-text">
        Share of region top-sports list. Visualization gains weight as
        upstream parquet refines from per-sport names to per-sport
        counts in our indexed sources.
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
