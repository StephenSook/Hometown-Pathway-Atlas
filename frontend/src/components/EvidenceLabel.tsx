/**
 * EvidenceLabel — tri-color status pill per DESIGN_SYSTEM.md §4.8 + §1.1
 *
 * Used everywhere parity / quality / confidence is shown:
 * - ParityPanel (§4.4) — Olympic + Paralympic evidence per pillar
 * - AnalogCard (§4.10) — match quality
 * - PatternGapPanel (§4.15) — gap confidence
 * - AdaptiveAccessCard (§4.7) — Move United proxy confidence
 *
 * Status semantic (tri-color, locked across all confidence/quality/severity):
 * - high   → accent-teal (#2E8B57) bg, white text — verified / strong evidence
 * - medium → status-amber (#D97706) bg, body-text (#1C2433) text — pending
 *           (NOT white text — fails AA contrast at small sizes per §8.1)
 * - low    → soft-border (#E7E2D9) bg, muted-text (#6B7280) — sparse data
 *
 * WCAG 1.4.1: color paired with text label always. Never color-only.
 */

import type { EvidenceLevel } from '../lib/api';
import { cn } from '../lib/utils';

interface EvidenceLabelProps {
  level: EvidenceLevel;
  /** Override default "evidence: X" prefix. */
  label?: string;
  className?: string;
}

const STYLES: Record<EvidenceLevel, string> = {
  high: 'bg-accent-teal text-card-white',
  medium: 'bg-status-amber text-body-text',
  low: 'bg-soft-border text-muted-text',
};

export default function EvidenceLabel({
  level,
  label,
  className,
}: EvidenceLabelProps) {
  const text = label ?? `evidence: ${level}`;

  return (
    <span
      role="status"
      aria-label={text}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1',
        'font-mono uppercase tracking-wider text-eyebrow whitespace-nowrap',
        STYLES[level],
        className,
      )}
    >
      {text}
    </span>
  );
}
