/**
 * EvidenceLabel — confidence/quality/severity pill primitive.
 *
 * Reused by ParityPanel, AnalogCard, PatternGapPanel, AdaptiveAccessCard.
 * Locks WCAG 1.4.1: every pill carries icon + text, never color-only.
 *
 * Tier semantic:
 * - high   = verified / strong evidence (accent-teal bg, white text + check icon)
 * - medium = pending / partial (status-amber bg, body-text NOT white per §8.1
 *            contrast rule, alert icon)
 * - low    = sparse data (neutral soft-border bg, muted-text + minus icon).
 *            Locked decision: low ≠ danger. Danger is reserved for hard errors
 *            per DESIGN_SYSTEM §1.1; sparse data is data quality, not failure.
 */

import { Check, AlertTriangle, Minus } from 'lucide-react';
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

const ICONS: Record<EvidenceLevel, typeof Check> = {
  high: Check,
  medium: AlertTriangle,
  low: Minus,
};

export default function EvidenceLabel({ level, label, className }: EvidenceLabelProps) {
  const text = label ?? `evidence: ${level}`;
  const Icon = ICONS[level];

  return (
    <span
      aria-label={text}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'font-mono uppercase tracking-wider text-eyebrow whitespace-nowrap',
        STYLES[level],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {text}
    </span>
  );
}
