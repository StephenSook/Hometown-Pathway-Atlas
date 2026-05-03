/**
 * Pillar5Strip ★ — Business Numbers (Sookra-flagged silent killer).
 * Anatomy per DESIGN_SYSTEM §4.18.
 *
 * Three-column horizontal strip at the bottom of HomePage results view:
 * 1. TAM — addressable market number
 * 2. Cost framing — gap or savings number
 * 3. Revenue model — B2B/B2G channel pills
 *
 * Numbers are LOCKED. Source of truth: `docs/pitch_pillar5.md`. If that
 * doc and this component drift, fix the component to match the doc — the
 * doc is the pitch defensibility checklist that goes into slide notes.
 *
 * Per spec §4.18 the panel must NEVER ship without all three numbers
 * visible. Constants are hardcoded; no skeleton variant exported (a
 * loading state would contradict the lock contract).
 *
 * A11y: matches sibling `<article role="region">` landmark pattern from
 * ParityPanel rather than the spec's `<section>` + nested `<article>`
 * (which would surface 4 landmark stops for one card). Sub-columns use
 * sr-only h3 headings for screen-reader navigation between columns.
 */

import { useId } from 'react';
import {
  PILLAR5_TAM as TAM,
  PILLAR5_COST as COST_FRAMING,
  PILLAR5_REVENUE_PILLS as REVENUE_PILLS,
  PILLAR5_FOOTER as FOOTER_CALLOUT,
} from '../lib/pillar5';
import { cn } from '../lib/utils';

interface Pillar5StripProps {
  className?: string;
}

export default function Pillar5Strip({ className }: Pillar5StripProps) {
  const eyebrowId = useId();
  const tamHeadingId = useId();
  const costHeadingId = useId();
  const revenueHeadingId = useId();

  return (
    <article
      role="region"
      aria-labelledby={eyebrowId}
      className={cn(
        'rounded-2xl bg-warm-neutral border border-soft-border shadow-sm p-6',
        className,
      )}
    >
      <p
        id={eyebrowId}
        className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-6"
      >
        Who this is for
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div aria-labelledby={tamHeadingId} className="flex flex-col gap-2">
          <h3 id={tamHeadingId} className="sr-only">
            Total addressable market
          </h3>
          <p className="font-sans font-bold text-stat-md text-navy leading-none tabular">
            {TAM.number}
          </p>
          <p className="font-sans text-body text-body-text">{TAM.label}</p>
          <p className="font-serif italic text-caption text-muted-text mt-auto">
            {TAM.source}
          </p>
        </div>

        <div aria-labelledby={costHeadingId} className="flex flex-col gap-2">
          <h3 id={costHeadingId} className="sr-only">
            Cost framing
          </h3>
          <p className="font-sans font-bold text-stat-md text-navy leading-none tabular">
            {COST_FRAMING.number}
          </p>
          <p className="font-sans text-body text-body-text">
            {COST_FRAMING.label}
          </p>
          <p className="font-serif italic text-caption text-muted-text mt-auto">
            {COST_FRAMING.source}
          </p>
        </div>

        <div aria-labelledby={revenueHeadingId} className="flex flex-col gap-2">
          <h3 id={revenueHeadingId} className="sr-only">
            Revenue model
          </h3>
          <p className="font-mono uppercase tracking-wider text-eyebrow text-navy">
            Revenue model
          </p>
          <ul className="flex flex-col items-start gap-2">
            {REVENUE_PILLS.map((line) => (
              <li
                key={line}
                className="inline-flex items-center rounded-full border border-soft-border bg-card-white px-3 py-1.5 text-[14px] font-semibold leading-tight text-body-text"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="font-serif italic text-caption text-muted-text mt-6 text-center">
        {FOOTER_CALLOUT}
      </p>
    </article>
  );
}
