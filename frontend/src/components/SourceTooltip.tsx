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
 *   - group-hover/source + group-focus-visible/source = mouse + keyboard reveal
 *   - No tabIndex injected on the no-href variant — avoids 20+ Tab stops
 *     across results view; AT users get the source via aria-describedby
 *     readout instead
 *
 * Group isolation: uses Tailwind named groups (`group/source` +
 * `group-hover/source:`) so the SourceTooltip's hover scope DOESN'T
 * collide with parent `.group` ancestors (e.g. AnalogCard wraps the
 * whole card in `.group` for hover scale effects). Without isolation,
 * hovering one SourceTooltip inside an AnalogCard fires ALL sibling
 * SourceTooltips simultaneously because Tailwind's plain `group-hover:`
 * matches the nearest `.group` ancestor — and CSS hover propagates up,
 * so the AnalogCard `.group` ancestor was matching every nested
 * SourceTooltip's group-hover selector. (Caught 2026-05-04.)
 *
 * Positioning: `placement` prop controls vertical anchor. 'auto' default
 * measures the trigger's viewport position on each hover/focus and flips
 * to render BELOW the trigger when it sits in the top 35% of the
 * viewport (avoids clipping above viewport top for triggers high on the
 * page). 'top' / 'bottom' explicit overrides also accepted. Arrow
 * direction follows placement (down-pointing when tooltip is above,
 * up-pointing when below).
 */

import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface SourceTooltipProps {
  /** Human-readable source citation (e.g., "Aspen Project Play, State of Play 2024"). */
  source: string;
  /** Optional URL — when present, wrapper becomes a link to the source. */
  href?: string;
  /** The metric being cited — number, label, or any inline content. */
  children: React.ReactNode;
  className?: string;
  /** Tooltip vertical placement. 'auto' (default) measures trigger
   *  position on hover/focus and flips to 'bottom' when trigger sits in
   *  the top 35% of the viewport (prevents clipping above viewport top
   *  for tooltips with long sources). */
  placement?: 'top' | 'bottom' | 'auto';
}

export default function SourceTooltip({
  source,
  href,
  children,
  className,
  placement = 'auto',
}: SourceTooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement | HTMLAnchorElement | null>(null);
  const [computedPlacement, setComputedPlacement] = useState<'top' | 'bottom'>(
    placement === 'bottom' ? 'bottom' : 'top',
  );

  const recalc = useCallback(() => {
    // Explicit placement props bypass measurement.
    if (placement === 'top' || placement === 'bottom') {
      setComputedPlacement(placement);
      return;
    }
    // Heuristic auto-flip: if trigger is in the top 35% of the viewport,
    // there isn't enough space above for a long source tooltip — flip to
    // render below the trigger instead. Avoids the clip-above-viewport
    // issue Stephen caught on the ParityPanel 1.17 / 0.00 source tooltips
    // (those numbers sit high on the page; tooltip body extended above
    // the viewport top, top text was clipped/obscured).
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next: 'top' | 'bottom' =
      rect.top < window.innerHeight * 0.35 ? 'bottom' : 'top';
    setComputedPlacement(next);
  }, [placement]);

  const wrapperClasses = cn(
    'group/source relative inline-flex items-baseline',
    href ? 'cursor-pointer no-underline text-inherit' : 'cursor-help',
    className,
  );

  const tooltipPositionClasses =
    computedPlacement === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  // Arrow direction follows placement. ::before = outer triangle (soft-
  // border color, 9px). ::after = inner triangle (card-white, 8px,
  // shifted by 1px to align flush with card edge). Two stacked triangles
  // produce the bordered-triangle effect via CSS only — no SVG.
  const arrowClasses =
    computedPlacement === 'top'
      ? cn(
          "before:content-[''] before:absolute before:top-full before:left-1/2",
          'before:-translate-x-1/2 before:border-[9px] before:border-transparent',
          'before:border-t-soft-border',
          "after:content-[''] after:absolute after:top-full after:left-1/2",
          'after:-translate-x-1/2 after:border-8 after:border-transparent',
          'after:border-t-card-white after:-mt-px',
        )
      : cn(
          "before:content-[''] before:absolute before:bottom-full before:left-1/2",
          'before:-translate-x-1/2 before:border-[9px] before:border-transparent',
          'before:border-b-soft-border',
          "after:content-[''] after:absolute after:bottom-full after:left-1/2",
          'after:-translate-x-1/2 after:border-8 after:border-transparent',
          'after:border-b-card-white after:-mb-px',
        );

  const cueAndTooltip = (
    <>
      <span className="border-b border-dotted border-muted-text/50 group-hover/source:border-navy group-focus-visible/source:border-navy transition-colors">
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-30',
          tooltipPositionClasses,
          'min-w-[240px] max-w-[380px]',
          'rounded-xl bg-card-white border border-soft-border shadow-md p-3',
          'text-left',
          'opacity-0 invisible',
          'group-hover/source:opacity-100 group-hover/source:visible',
          'group-focus-visible/source:opacity-100 group-focus-visible/source:visible',
          'group-focus-within/source:opacity-100 group-focus-within/source:visible',
          'transition-opacity duration-150',
          arrowClasses,
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
        ref={triggerRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={tooltipId}
        onMouseEnter={recalc}
        onFocus={recalc}
        className={wrapperClasses}
      >
        {cueAndTooltip}
      </a>
    );
  }

  return (
    <span
      ref={triggerRef as React.RefObject<HTMLSpanElement>}
      aria-describedby={tooltipId}
      onMouseEnter={recalc}
      onFocus={recalc}
      className={wrapperClasses}
    >
      {cueAndTooltip}
    </span>
  );
}
