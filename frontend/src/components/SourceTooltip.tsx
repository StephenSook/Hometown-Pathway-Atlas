/**
 * SourceTooltip — citable-metric primitive for editorial-tier defensibility.
 *
 * Wraps any visible metric (number, label, pill text) with a hover/focus
 * popover revealing its source citation. Modeled on NYT Upshot, Bloomberg,
 * Pudding source-citation patterns: dotted underline as the persistent
 * visual cue → hover/focus reveals positioned card with source label and
 * optional external link.
 *
 * Used across Atlas results to make every visible number defensible at
 * judge-read distance (no need to crawl docs/ to verify a stat). Counter-
 * point to "magic AI numbers" criticism: every number cites itself.
 *
 * Two variants based on `href`:
 *   - WITHOUT href: renders <span>, mouse-hover-only, screen reader
 *     announces source via persistent aria-describedby (tooltip stays
 *     in DOM with visibility:hidden; ARIA still discovers it).
 *   - WITH href: renders <a target="_blank">, full keyboard focus
 *     pathway (Tab to it, focus-visible reveals tooltip, Enter follows
 *     link). Footer "Open ↗" affordance inside tooltip.
 *
 * A11y:
 *   - aria-describedby ALWAYS set (works regardless of visual hover state)
 *   - role="tooltip" on the popover
 *   - dotted underline = the persistent affordance cue
 *   - group-hover + group-focus-visible = mouse + keyboard reveal
 *   - No tabIndex injected on the no-href variant — avoids 20+ Tab stops
 *     across results view; AT users get the source via aria-describedby
 *     readout instead
 *
 * Positioning: tooltip is `position: absolute` anchored to wrapper at
 * `bottom-full`. Default flip: not implemented (would require runtime
 * measurement like CountyTooltip). For results-page metrics, all sit far
 * enough from viewport edges that bottom-full positioning lands cleanly.
 * Edge-of-viewport metrics (e.g., last NGB chip on mobile) may clip — if
 * that surfaces in browser review, add a `placement="bottom"` opt.
 */

import { useId } from 'react';
import { cn } from '../lib/utils';

interface SourceTooltipProps {
  /** Human-readable source citation (e.g., "Aspen Project Play, State of Play 2024"). */
  source: string;
  /** Optional URL — when present, wrapper becomes a link to the source. */
  href?: string;
  /** The metric being cited — number, label, or any inline content. */
  children: React.ReactNode;
  className?: string;
}

export default function SourceTooltip({
  source,
  href,
  children,
  className,
}: SourceTooltipProps) {
  const tooltipId = useId();

  const wrapperClasses = cn(
    'group relative inline-flex items-baseline',
    href ? 'cursor-pointer no-underline text-inherit' : 'cursor-help',
    className,
  );

  const cueAndTooltip = (
    <>
      <span className="border-b border-dotted border-muted-text/50 group-hover:border-navy group-focus-visible:border-navy transition-colors">
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30',
          'min-w-[240px] max-w-[380px]',
          'rounded-xl bg-card-white border border-soft-border shadow-md p-3',
          'text-left',
          'opacity-0 invisible',
          'group-hover:opacity-100 group-hover:visible',
          'group-focus-visible:opacity-100 group-focus-visible:visible',
          'group-focus-within:opacity-100 group-focus-within:visible',
          'transition-opacity duration-150',
          // Arrow pointer triangle — NYT/Bloomberg pattern visually
          // connecting tooltip card to underlined element below.
          // ::before is the outer (soft-border color, 9px) + ::after
          // is the inner (card-white, 8px, -mt-px to align flush
          // with card bottom border). Two stacked triangles produce
          // the bordered triangle effect via CSS only — no SVG.
          "before:content-[''] before:absolute before:top-full before:left-1/2",
          'before:-translate-x-1/2 before:border-[9px] before:border-transparent',
          'before:border-t-soft-border',
          "after:content-[''] after:absolute after:top-full after:left-1/2",
          'after:-translate-x-1/2 after:border-8 after:border-transparent',
          'after:border-t-card-white after:-mt-px',
        )}
      >
        <span className="block font-mono uppercase tracking-wider text-eyebrow text-navy mb-1">
          Source
        </span>
        <span className="block font-serif italic text-caption text-muted-text leading-relaxed tracking-normal">
          {source}
        </span>
        {href && (
          <span className="block mt-2 font-mono uppercase tracking-wider text-eyebrow text-navy">
            Open ↗
          </span>
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={tooltipId}
        className={wrapperClasses}
      >
        {cueAndTooltip}
      </a>
    );
  }

  return (
    <span aria-describedby={tooltipId} className={wrapperClasses}>
      {cueAndTooltip}
    </span>
  );
}
