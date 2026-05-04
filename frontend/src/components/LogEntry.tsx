/**
 * LogEntry — single audit row in the ComplianceLog stream.
 * Anatomy per DESIGN_SYSTEM §4.16-4.17.
 *
 * Status semantics (locked):
 * - pass  → soft-border dot, parent removes from displayed list 1.5s after mount
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
 * Auto-collapse for pass entries: parent passes a STABLE `onCollapse(entry)`
 * callback. The `entry` close-over here means the effect's deps stay tight to
 * `entry` + `persist` + `onCollapse` — none of which change per-parent-render
 * once `onCollapse` is parent-side `useCallback`d. Live-mode pass entries
 * reliably collapse at 1.5s.
 *
 * Color contrast: the `before` phrase uses dark `text-body-text` (#1C2433 on
 * card-white = ~15.6:1, AAA) with an amber strikethrough decoration rather
 * than amber text on white. AT receives a sr-only prefix ("Banned phrase,
 * rewritten:") so the announcement carries the qualifier — text-decoration
 * is purely visual, AT can't infer "this was caught" from line-through alone.
 *
 * `useReducedMotion()` returns null on first render before matchMedia
 * resolves. Coercing via `?? false` prevents the falsy-null branch from
 * accidentally animating once for a reduced-motion user.
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
  onCollapse?: (entry: ComplianceLogEntry) => void;
  className?: string;
}

const PASS_COLLAPSE_MS = 1500;

// Hex constants must stay in sync with tailwind.config.ts color tokens.
// Changed 2026-05-02: muted-text + accent-teal darkened to pass WCAG AA
// per axe-core audit findings.
const STATUS_BG_HEX: Record<ComplianceStatus, string> = {
  pass: '#E7E2D9', // soft-border
  fail: '#D97706', // status-amber
  fixed: '#1F7A47', // accent-teal (darkened for AA)
};

const STATUS_TEXT_HEX: Record<ComplianceStatus, string> = {
  pass: '#475569', // muted-text (darkened for AA)
  fail: '#D97706', // status-amber
  fixed: '#1F7A47', // accent-teal (darkened for AA)
};

const COLOR_TRANSITION = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const };

export default function LogEntry({
  entry,
  persist = false,
  onCollapse,
  className,
}: LogEntryProps) {
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (persist || entry.status !== 'pass' || !onCollapse) return;
    const t = setTimeout(() => onCollapse(entry), PASS_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [entry, persist, onCollapse]);

  const showExpansion =
    (entry.status === 'fail' || entry.status === 'fixed') &&
    (entry.before || entry.after);

  const colorTransition = reduceMotion ? { duration: 0 } : COLOR_TRANSITION;
  const dotColor = STATUS_BG_HEX[entry.status];
  const textColor = STATUS_TEXT_HEX[entry.status];

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
          initial={{ backgroundColor: dotColor }}
          animate={{ backgroundColor: dotColor }}
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
          initial={{ color: textColor }}
          animate={{ color: textColor }}
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
              <p className="font-mono text-eyebrow text-body-text leading-snug">
                {/* Visible "FLAGGED" prefix so sighted users see this is the
                    auditor's CATCH, not Atlas's claim. sr-only "Banned
                    phrase, rewritten:" carries the same meaning for AT. The
                    strikethrough on the catch text reinforces the visual
                    "this got rewritten" signal. (Cold-check review 2026-05-04
                    flagged the bare strikethrough as ambiguous DQ exposure —
                    judges screenshotting mid-demo might not parse the
                    decoration as "caught" without an explicit label.) */}
                <span
                  aria-hidden="true"
                  className="inline-block mr-1.5 px-1 py-0.5 rounded text-[10px] uppercase tracking-wider bg-status-amber/20 text-status-amber font-semibold"
                >
                  Flagged
                </span>
                <span className="sr-only">Banned phrase, rewritten: </span>
                <span className="line-through decoration-status-amber decoration-2">
                  {entry.before}
                </span>
              </p>
            )}
            {entry.after && (
              <p className="font-mono text-eyebrow text-accent-teal leading-snug">
                <span
                  aria-hidden="true"
                  className="inline-block mr-1.5 px-1 py-0.5 rounded text-[10px] uppercase tracking-wider bg-accent-teal/20 font-semibold"
                >
                  Rewritten
                </span>
                <span className="sr-only">Approved rewrite: </span>
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
