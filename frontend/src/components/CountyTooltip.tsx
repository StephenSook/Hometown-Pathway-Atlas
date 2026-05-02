/**
 * CountyTooltip — floating card shown on county hover in CountyMap.
 * Anatomy per DESIGN_SYSTEM §4.14.
 *
 * Pointer-only affordance: keyboard/AT users get the same data via the
 * `aria-label` set on each highlighted Geography in CountyMap. That's why
 * this component does NOT use `aria-live` — the tooltip remounts on every
 * county change, which would defeat live-region polling anyway.
 *
 * Positioning: `(x, y)` are pointer coords (clientX/clientY) supplied by
 * the parent, so `position: fixed` is the correct reference frame. After
 * mount the card measures itself and clamps inside the viewport so it
 * never renders off-screen at edges.
 *
 * No-data variant: when olympic/paralympic per_100k are null, render em dash.
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
  }, [x, y]);

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ left: pos.left, top: pos.top }}
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
