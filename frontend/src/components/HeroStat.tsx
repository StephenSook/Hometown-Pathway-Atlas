/**
 * HeroStat — Layer A "Shocking Stat" callout displayed above the hero h1.
 *
 * This is the first thing visitors see on the landing view. The stat
 * lands BEFORE the user even encounters the ZIP input — anchors the
 * entire demo with a county-FIPS-parity discovery uniquely ours.
 *
 * Visual contract:
 * - Large stat number (text-stat-md/lg navy, font-bold tabular)
 * - 1-2 line conditional-phrased context (Inter body)
 * - Tiny source citation (Instrument Serif italic muted)
 * - Optional caveat (Instrument Serif italic muted, smaller)
 * - Border-top hairline rule above the block as visual anchor
 *
 * Display-only. No interactivity. Mirror Pillar5Strip's a11y pattern:
 * `<article role="region" aria-labelledby>` + sr-only h2 for AT.
 *
 * Source of truth: `frontend/src/lib/heroStat.ts`. If the doc claim or
 * sourcing changes, edit there and this component picks it up.
 */

import { useId } from 'react';
import type { HeroStatData } from '../lib/heroStat';
import { cn } from '../lib/utils';

interface HeroStatProps {
  stat: HeroStatData;
  className?: string;
}

export default function HeroStat({ stat, className }: HeroStatProps) {
  const headingId = useId();

  return (
    <article
      role="region"
      aria-labelledby={headingId}
      className={cn(
        'mx-auto max-w-[640px] px-6 pt-8 pb-6 text-center',
        className,
      )}
    >
      <h2 id={headingId} className="sr-only">
        Shocking statistic
      </h2>

      <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3">
        Did you know
      </p>

      <p className="font-sans font-bold text-stat-md md:text-stat-lg text-navy leading-none tabular mb-4">
        {stat.number}
      </p>

      <p className="font-sans text-body text-body-text leading-relaxed mb-3">
        {stat.context}
      </p>

      <p className="font-serif italic text-eyebrow text-muted-text">
        {stat.source}
      </p>

      {stat.caveat && (
        <p className="font-serif italic text-eyebrow text-muted-text mt-1">
          {stat.caveat}
        </p>
      )}
    </article>
  );
}
