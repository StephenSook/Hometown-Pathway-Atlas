/**
 * Pillar5Defense — Pillar 5 second-layer card surfacing per-incident
 * dollar harm + 3 named lighthouse NGBs on stage.
 *
 * Sibling to Pillar5Strip (locked at 3-column anatomy per DESIGN_SYSTEM
 * §4.18). This panel renders directly below it and provides the
 * defensibility receipts the 2026-05-03 Sookra Council asked for:
 *   - Per-incident harm number ($35K-$70K Beat the Streets startup)
 *     so "we have a market" matures into "we have a quantified harm
 *     dollar."
 *   - 3 named NGBs (USA Wrestling / USA Swimming / USA Track & Field)
 *     so abstract "50 NGBs" matures into concrete first-customer ICP.
 *
 * Visual relationship to Pillar5Strip: Pillar5Strip uses bg-warm-neutral;
 * this card uses bg-card-white with chips switched to bg-warm-neutral.
 * The inverted background pairing reads as "deeper layer of the same
 * pillar" rather than two unrelated cards stacked.
 *
 * Data source: `lib/pillar5.ts` exports `PILLAR5_HARM` +
 * `PILLAR5_LIGHTHOUSE_NGBS`. Drift-check script (scripts/check-pillar5-
 * drift.mjs) enforces sync with `docs/pitch_pillar5.md`.
 *
 * A11y: matches Pillar5Strip's `<article role="region">` landmark
 * pattern. Sub-zones use sr-only h3 headings for screen-reader
 * navigation. NGB chip list uses `<ul role="list">` to preserve list
 * semantics under Tailwind's reset.
 */

import { useId } from 'react';
import {
  PILLAR5_HARM as HARM,
  PILLAR5_LIGHTHOUSE_NGBS as NGBS,
} from '../lib/pillar5';
import { cn } from '../lib/utils';

interface Pillar5DefenseProps {
  className?: string;
}

export default function Pillar5Defense({ className }: Pillar5DefenseProps) {
  const eyebrowId = useId();
  const harmHeadingId = useId();
  const ngbHeadingId = useId();

  return (
    <article
      role="region"
      aria-labelledby={eyebrowId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-sm p-6',
        className,
      )}
    >
      <p
        id={eyebrowId}
        className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-6"
      >
        Defensibility — what mistargeting could cost · who buys first
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 items-start">
        <div
          aria-labelledby={harmHeadingId}
          className="flex flex-col gap-2 md:border-r md:border-soft-border md:pr-8"
        >
          <h3 id={harmHeadingId} className="sr-only">
            Per-incident dollar harm
          </h3>
          <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
            Per-incident harm
          </p>
          <p className="font-sans font-bold text-stat-md text-navy leading-none tabular">
            {HARM.number}
          </p>
          <p className="font-sans text-body text-body-text leading-snug">
            {HARM.label}
          </p>
          <p className="font-serif italic text-caption text-muted-text mt-auto">
            {HARM.source}
          </p>
        </div>

        <div aria-labelledby={ngbHeadingId} className="flex flex-col gap-3">
          <h3
            id={ngbHeadingId}
            className="font-mono uppercase tracking-wider text-eyebrow text-muted-text"
          >
            Lighthouse pilots
          </h3>
          <ul role="list" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {NGBS.map((ngb) => (
              <li
                key={ngb.name}
                className="rounded-xl border border-soft-border bg-warm-neutral p-4 flex flex-col gap-1.5"
              >
                <p className="font-sans font-bold text-body-lg text-navy leading-tight">
                  {ngb.name}
                </p>
                <p className="font-mono uppercase tracking-wider text-eyebrow text-navy">
                  {ngb.program}
                </p>
                <p className="font-sans text-caption text-body-text mt-1">
                  {ngb.reach}
                </p>
                <p className="font-serif italic text-caption text-muted-text mt-auto">
                  {ngb.unitEconomics}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
