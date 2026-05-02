/**
 * CountyTooltip — floating card shown on county hover in CountyMap.
 * Anatomy per DESIGN_SYSTEM §4.14.
 *
 * Pointer-only affordance. AT users read the same data through the
 * per-Geography aria-label set in CountyMap — no `role="tooltip"` here
 * because there is no triggering element wiring `aria-describedby` to
 * a stable id, which is what the WAI-ARIA APG tooltip pattern requires
 * for AT discovery. role="tooltip" without the pairing is decorative;
 * we'd rather be honest in the markup.
 *
 * Positioning: `(x, y)` are pointer coords (clientX/clientY) supplied by
 * the parent — `position: fixed` is the correct reference frame. The card
 * measures itself in useLayoutEffect and clamps inside the viewport. The
 * pre-measurement render is `visibility: hidden` to eliminate the 1-frame
 * edge-flash that React 19 concurrent rendering can introduce on slower
 * devices.
 *
 * No-data variant: olympic/paralympic per_100k null → em dash.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import type { EvidenceLevel } from '../lib/api';
import { fmtPerCapita } from '../lib/format';
import EvidenceLabel from './EvidenceLabel';
import { cn } from '../lib/utils';

export interface CountyTooltipData {
  countyName: string;
  state: string;
  olympicPer100k: number | null;
  paralympicPer100k: number | null;
  olympicEvidence?: EvidenceLevel;
  paralympicEvidence?: EvidenceLevel;
}

interface CountyTooltipProps extends CountyTooltipData {
  /** Viewport-relative pointer coords. Card offsets 12px down/right by default. */
  x: number;
  y: number;
  className?: string;
}

const DASH = '—';
const OFFSET = 12;
const VIEWPORT_PADDING = 8;

export default function CountyTooltip({
  countyName,
  state,
  olympicPer100k,
  paralympicPer100k,
  olympicEvidence,
  paralympicEvidence,
  x,
  y,
  className,
}: CountyTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x + OFFSET, top: y + OFFSET });
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + OFFSET;
    let top = y + OFFSET;
    if (left + rect.width + VIEWPORT_PADDING > vw) {
      left = Math.max(VIEWPORT_PADDING, x - rect.width - OFFSET);
    }
    if (top + rect.height + VIEWPORT_PADDING > vh) {
      top = Math.max(VIEWPORT_PADDING, y - rect.height - OFFSET);
    }
    setPos({ left, top });
    if (!measured) setMeasured(true);
  }, [x, y, measured]);

  return (
    <div
      ref={ref}
      style={{
        left: pos.left,
        top: pos.top,
        visibility: measured ? 'visible' : 'hidden',
      }}
      className={cn(
        'pointer-events-none fixed z-20 min-w-[200px] rounded-xl bg-card-white border border-soft-border shadow-md p-3',
        className,
      )}
    >
      <p className="text-body font-sans font-semibold text-navy leading-tight">
        {countyName}
      </p>
      <p className="font-serif italic text-caption text-muted-text leading-tight mb-2">
        {state}
      </p>

      <dl className="flex flex-col gap-1 mb-2">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
            Olympic / 100k
          </dt>
          <dd className="font-mono text-caption tabular text-body-text">
            {olympicPer100k === null ? DASH : fmtPerCapita(olympicPer100k)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
            Paralympic / 100k
          </dt>
          <dd className="font-mono text-caption tabular text-body-text">
            {paralympicPer100k === null ? DASH : fmtPerCapita(paralympicPer100k)}
          </dd>
        </div>
      </dl>

      {(olympicEvidence || paralympicEvidence) && (
        <div className="flex flex-wrap gap-2">
          {olympicEvidence && (
            <EvidenceLabel level={olympicEvidence} label={`O: ${olympicEvidence}`} />
          )}
          {paralympicEvidence && (
            <EvidenceLabel level={paralympicEvidence} label={`P: ${paralympicEvidence}`} />
          )}
        </div>
      )}
    </div>
  );
}
