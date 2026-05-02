/**
 * LogEntry — single audit row in the ComplianceLog stream.
 * Anatomy per DESIGN_SYSTEM §4.16-4.17.
 *
 * Status semantics (locked):
 * - pass  → soft-border dot, mutes after parent removes from displayed list
 * - fail  → status-amber dot, expansion shows banned phrase strikethrough
 * - fixed → accent-teal dot, expansion shows safe rewrite in teal
 *
 * In-place fail→fixed crossfade: the parent (ComplianceLog) keys this row by
 * `(layer, check)` only — when status morphs from fail to fixed, the SAME
 * component instance receives new props and animates the dot/text colors via
 * Framer transitions. AnimatePresence on the expansion panel keys by status,
 * so the before-strikethrough exits and the after-rewrite enters as a smooth
 * height-collapse swap inside the same row.
 *
 * Auto-collapse for pass entries is owned by the PARENT — this component
 * fires `onCollapse` after PASS_COLLAPSE_MS so the parent can actually remove
 * the entry from state (and the empty-column placeholder can take over).
 *
 * Color contrast: the `before` phrase uses dark `text-body-text` with an
 * amber strikethrough decoration rather than amber text on white, which
 * fails AA at the 11px mono size per DESIGN_SYSTEM §8.1.
 */

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ComplianceLogEntry, ComplianceStatus } from '../lib/api';
import { fmtTimestamp } from '../lib/format';
import { cn } from '../lib/utils';

interface LogEntryProps {
  entry: ComplianceLogEntry;
  /** When false (default), pass entries fire onCollapse after 1.5s. */
  persist?: boolean;
  onCollapse?: () => void;
  className?: string;
}

const PASS_COLLAPSE_MS = 1500;

const STATUS_BG_HEX: Record<ComplianceStatus, string> = {
  pass: '#E7E2D9', // soft-border
  fail: '#D97706', // status-amber
  fixed: '#2E8B57', // accent-teal
};

const STATUS_TEXT_HEX: Record<ComplianceStatus, string> = {
  pass: '#6B7280', // muted-text
  fail: '#D97706', // status-amber
  fixed: '#2E8B57', // accent-teal
};

const COLOR_TRANSITION = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const };

export default function LogEntry({
  entry,
  persist = false,
  onCollapse,
  className,
}: LogEntryProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (persist || entry.status !== 'pass' || !onCollapse) return;
    const t = setTimeout(onCollapse, PASS_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [entry.status, persist, onCollapse]);

  const showExpansion =
    (entry.status === 'fail' || entry.status === 'fixed') &&
    (entry.before || entry.after);

  const colorTransition = reduceMotion ? { duration: 0 } : COLOR_TRANSITION;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }
      }
      className={cn('flex flex-col gap-1.5 py-1.5', className)}
    >
      <div className="flex items-center gap-2">
        <motion.span
          aria-hidden="true"
          animate={{ backgroundColor: STATUS_BG_HEX[entry.status] }}
          transition={colorTransition}
          className="inline-block h-2 w-2 rounded-full shrink-0"
        />
        <time
          dateTime={entry.ts}
          className="font-mono text-eyebrow tabular text-muted-text shrink-0"
        >
          {fmtTimestamp(entry.ts)}
        </time>
        <span className="font-mono text-eyebrow text-body-text truncate flex-1">
          {entry.check}
        </span>
        <motion.span
          animate={{ color: STATUS_TEXT_HEX[entry.status] }}
          transition={colorTransition}
          className="font-mono uppercase text-eyebrow tracking-wider shrink-0"
        >
          {entry.status}
        </motion.span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showExpansion && (
          <motion.div
            key={entry.status}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
            }
            className="ml-4 pl-3 border-l border-soft-border flex flex-col gap-1 overflow-hidden"
          >
            {entry.before && (
              <p
                aria-label={`Caught phrase: ${entry.before}`}
                className="font-mono text-eyebrow text-body-text line-through decoration-status-amber decoration-2 leading-snug"
              >
                {entry.before}
              </p>
            )}
            {entry.after && (
              <p
                aria-label={`Rewritten as: ${entry.after}`}
                className="font-mono text-eyebrow text-accent-teal leading-snug"
              >
                {entry.after}
              </p>
            )}
            {entry.details && !entry.before && !entry.after && (
              <p className="font-serif italic text-eyebrow text-muted-text">
                {entry.details}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
