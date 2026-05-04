/**
 * ComplianceLog ★ — Pillar 4 demo moment.
 * Anatomy per DESIGN_SYSTEM §4.16 (most critical component on the page).
 *
 * Layout per §3:
 * - Desktop: fixed right sidebar (z-30, below navbar z-40, below modals z-50)
 * - Mobile: hidden by default, FAB toggles a bottom drawer (spec: "NEVER
 *   fixed sidebar on mobile — eats screen space"). FAB lives at bottom-right
 *   inside the same z-30 layer. Resize past md auto-closes the drawer to
 *   keep `aria-expanded` honest.
 *
 * Two columns split by hairline divider: RULES + GEMINI. Each column is a
 * `role="log" aria-live="polite"` region — entries announce as they arrive.
 * The "Awaiting checks…" placeholder lives OUTSIDE the live region to
 * prevent it being announced when the panel mounts. The `<ul>` stays
 * mounted across the empty↔populated transition so AnimatePresence can run
 * exit animations on the last entry collapsing.
 *
 * AT announcement for fail→fixed: Framer's color morph is invisible to
 * screen readers because the `(layer, check)` stable key means React
 * reconciles in place — no add/remove for `role="log"` to broadcast. A
 * sibling `role="status" aria-live="polite"` sr-only div emits a one-line
 * announcement when a fixed entry lands, so AT users hear the audit
 * complete the rewrite even though the visual moment is silent in the DOM.
 *
 * State ownership:
 * - `displayed` is the source of truth for what's rendered
 * - In demoMode, a setTimeout chain populates displayed per DEMO_DELAYS_MS,
 *   guarded by a `cancelled` flag so callbacks already in the JS task queue
 *   no-op cleanly when the component unmounts mid-sequence (e.g. user
 *   clicks "back to home" between fail T+1s and fixed T+4s)
 * - In live mode, displayed mirrors `entries` prop (Array.isArray-coerced)
 * - Pass entries auto-collapse via stable callback to LogEntry — closure
 *   stability is what keeps live-mode collapse working across parent
 *   re-renders
 *
 * Demo environment gate: `demoMode` takes effect on a dev build,
 * loopback hosts (`localhost` / `127.0.0.1`), or any `*.run.app` host
 * (the hackathon Cloud Run deploy lives there).
 *
 * Note: the `*.run.app` gate is COARSE — it allows any Cloud Run
 * tenant, not just our specific service hostname. The honest line of
 * defense against fixture leak in non-hackathon contexts is the
 * data-aware demoMode prop:
 *
 *   HomePage passes `demoMode={!compliance_log?.length}` — the demo
 *   only fires when the backend returns an empty compliance_log
 *   array. The moment Vinh task 2.9 (HybridAuditor) ships and
 *   populates real compliance_log entries, demoMode auto-flips to
 *   false and the fixture stops firing. Zero code change to switch
 *   to live audit. That's the real protection; the hostname check
 *   is a coarse opt-out for non-Cloud-Run-non-localhost forks.
 *
 * For tighter host enforcement post-hackathon: replace the endsWith
 * check with a `VITE_DEMO_HOST_ALLOWLIST` env var listing exact
 * known hostnames.
 *
 * A dev console.warn surfaces when demoMode was requested but env-
 * disabled (e.g. demo rehearsal on a non-allow-listed domain).
 *
 * `prefers-reduced-motion` honored via Framer's useReducedMotion in
 * LogEntry — CSS clamp in index.css does not affect Framer's JS-driven
 * animations.
 *
 * Accessible name on the aside is wired via aria-labelledby pointing at
 * the visible "Live audit" eyebrow id — keeps the landmark name
 * synchronized with on-screen text.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, ChevronRight, GripHorizontal, LocateFixed, Minus, RotateCcw, X } from 'lucide-react';
import type { ComplianceLogEntry } from '../lib/api';
import { fmtTimestamp } from '../lib/format';
import { demoComplianceScript } from '../lib/mocks';
import LogEntry from './LogEntry';
import { cn } from '../lib/utils';

interface ComplianceLogProps {
  entries?: ComplianceLogEntry[] | null;
  /** Force the canonical pre-scripted demo sequence. Production-guarded. */
  demoMode?: boolean;
  className?: string;
}

const DEMO_DELAYS_MS = [0, 500, 1000, 4000];

function isDemoEnvironmentSafe(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app')
  );
}

function entryKey(e: ComplianceLogEntry): string {
  return `${e.layer}-${e.check}`;
}

export default function ComplianceLog({
  entries,
  demoMode = false,
  className,
}: ComplianceLogProps) {
  const labelId = useId();
  const safeEntries: ComplianceLogEntry[] = Array.isArray(entries) ? entries : [];
  const [displayed, setDisplayed] = useState<ComplianceLogEntry[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop collapse — sidebar shrinks to a compact chip showing aggregate
  // status. Stephen flagged 2026-05-04 that the 380px fixed sidebar
  // covered content on the results page (analog cards + pattern gaps +
  // Q&A right column). Collapsed default keeps the audit visible without
  // eating viewport width; clicking the chip expands the full panel.
  // Mobile keeps the existing FAB-drawer pattern (mobileOpen state).
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Desktop drag — Stephen explicitly requested 2026-05-04 the ability
  // to drag the audit panel anywhere on screen (e.g. flip it to the
  // LEFT side of the map so the right side of Cobb County metrics is
  // unobstructed). dragOffset is the cumulative translation from the
  // default right-4 top-24 position. Persists across collapse/expand
  // (chip + sidebar share the offset). Resets per page mount, no
  // localStorage — clean slate each session.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // hasMoved disambiguates click-vs-drag on the chip — chip is a button
  // (click expands), but Stephen wants drag-from-chip too. Threshold is
  // 5px of movement before the gesture is treated as a drag.
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number; hasMoved: boolean } | null>(null);
  const [srMessage, setSrMessage] = useState('');
  // Replay counter — incrementing it forces the demo useEffect to re-run
  // (counter is in the dep array), which replays the scripted scheduled
  // sequence from scratch. Lets judges + Stephen-during-recording rewatch
  // the Pillar 4 audit moment without page reload. Demo-mode only.
  const [replayKey, setReplayKey] = useState(0);

  const effectiveDemoMode = demoMode === true && isDemoEnvironmentSafe();

  // Surface env-blocked demoMode loudly — easy mistake during demo prep.
  useEffect(() => {
    if (demoMode && !effectiveDemoMode && typeof window !== 'undefined') {
      console.warn(
        `[ComplianceLog] demoMode requested but env guard blocked it. ` +
          `hostname: "${window.location.hostname}". ` +
          `Allow-list: dev build, localhost, 127.0.0.1.`,
      );
    }
  }, [demoMode, effectiveDemoMode]);

  // Demo-mode scheduled sequence with cancelled-flag pattern. The flag
  // catches callbacks already running when the component unmounts mid-
  // sequence (e.g. user navigates home between fail T+1s and fixed T+4s).
  //
  // Performance instrumentation in DEV only — `compliance-cycle-start` mark
  // fires when the demo sequence kicks off, `compliance-cycle-settle` fires
  // when the last entry (gemini fixed at T+4000ms) lands. Console-logs the
  // measured duration so pitch rehearsal can verify the cycle settles
  // before Beat 4 narration. Pitch beat math (verified 2026-05-03):
  // submit during Beat 2 (0:20-0:45 window) → Beat 4 narration starts 1:35.
  // Worst case: submit at end of Beat 2 → Beat 4 lands T+50s → 46s buffer
  // post-settle. Best case: submit at start → 75s buffer post-settle.
  useEffect(() => {
    if (!effectiveDemoMode) return;
    let cancelled = false;
    setDisplayed([]);
    if (import.meta.env.DEV && typeof performance !== 'undefined') {
      performance.mark('compliance-cycle-start');
    }
    const timeouts = demoComplianceScript.map((entry, i) =>
      setTimeout(
        () => {
          if (cancelled) return;
          setDisplayed((prev) => {
            const filtered = prev.filter((e) => entryKey(e) !== entryKey(entry));
            return [...filtered, entry];
          });
          const isLast = i === demoComplianceScript.length - 1;
          if (isLast && import.meta.env.DEV && typeof performance !== 'undefined') {
            performance.mark('compliance-cycle-settle');
            try {
              performance.measure(
                'compliance-cycle',
                'compliance-cycle-start',
                'compliance-cycle-settle',
              );
              const m = performance.getEntriesByName('compliance-cycle').at(-1);
              if (m) {
                console.info(
                  `[ComplianceLog] demo cycle settled in ${Math.round(m.duration)}ms ` +
                    `(target ≤5000ms; pitch Beat 4 narration starts T+50-75s post-submit, ` +
                    `so settled state visible ${Math.round(50000 - m.duration)}ms+ before Beat 4)`,
                );
              }
            } catch {
              // performance.measure throws if marks were cleared mid-cycle
              // by an unmount; safe to swallow — instrumentation only.
            }
          }
        },
        DEMO_DELAYS_MS[i] ?? 0,
      ),
    );
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      if (import.meta.env.DEV && typeof performance !== 'undefined') {
        performance.clearMarks('compliance-cycle-start');
        performance.clearMarks('compliance-cycle-settle');
        performance.clearMeasures('compliance-cycle');
      }
    };
    // replayKey is intentionally in the dep array so click-to-replay
    // restarts the scheduled timeout chain from T+0 with a fresh
    // cancelled-flag closure.
  }, [effectiveDemoMode, replayKey]);

  // Live mode — sync from props (already coerced to safe array)
  useEffect(() => {
    if (effectiveDemoMode) return;
    setDisplayed(safeEntries);
  }, [safeEntries, effectiveDemoMode]);

  // sr-only announcement for fail→fixed — visual color morph is silent to
  // AT because role="log" only broadcasts on add/remove, not in-place prop
  // changes. Timestamp suffix forces React to see a unique string per fix
  // event; otherwise two fixes with the same `check` field produce
  // identical message strings, React bails on setState, and aria-live
  // doesn't re-announce. Suffix doubles as informative chrome for AT users.
  useEffect(() => {
    const lastFixed = displayed.findLast((e) => e.status === 'fixed');
    if (lastFixed) {
      setSrMessage(
        `${lastFixed.check} rewritten in conditional phrasing in our indexed sources at ${fmtTimestamp(lastFixed.ts)}.`,
      );
    }
  }, [displayed]);

  // Auto-close mobile drawer when viewport crosses to md+ so aria-expanded
  // doesn't lie about a hidden FAB.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const handleCollapse = useCallback((entry: ComplianceLogEntry) => {
    setDisplayed((prev) =>
      prev.filter((e) => !(entryKey(e) === entryKey(entry) && e.status === 'pass')),
    );
  }, []);

  // Drag handlers — pointer events with setPointerCapture so drag continues
  // even when pointer leaves the header (captured to the element).
  // Skipped when pointer-down lands on a button (Minus / Reset / Replay)
  // so button clicks aren't hijacked into drag-start.
  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Skip drag-start when pointer-down lands on a button (Minus /
      // Reset / Replay) so button clicks aren't hijacked into drag.
      // The chip itself IS a button — the closest('button') check there
      // would short-circuit drag-from-chip. Bypass via the
      // data-allow-drag attribute set on the chip below.
      const target = e.target as HTMLElement;
      const allowDrag = e.currentTarget.dataset.allowDrag === 'true';
      if (!allowDrag && target.closest('button')) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        px: e.clientX,
        py: e.clientY,
        ox: dragOffset.x,
        oy: dragOffset.y,
        hasMoved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [dragOffset.x, dragOffset.y],
  );

  const handleDragPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.px;
      const dy = e.clientY - dragStartRef.current.py;
      // Mark as drag once the pointer has moved >5px from origin —
      // disambiguates intentional drag from click jitter on the chip.
      if (!dragStartRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
        dragStartRef.current.hasMoved = true;
      }
      if (dragStartRef.current.hasMoved) {
        setDragOffset({
          x: dragStartRef.current.ox + dx,
          y: dragStartRef.current.oy + dy,
        });
      }
    },
    [isDragging],
  );

  const handleDragPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      dragStartRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [isDragging],
  );

  // Chip-specific pointer-up: same cleanup as the header drag PLUS
  // expand-on-click semantics. If the gesture was a drag (>5px moved),
  // do NOT expand; if it was a click, expand to full sidebar.
  const handleChipPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const wasDrag = dragStartRef.current?.hasMoved ?? false;
      handleDragPointerUp(e);
      if (!wasDrag) setIsCollapsed(false);
    },
    [handleDragPointerUp],
  );

  const resetPosition = useCallback(() => {
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Apply the drag offset as a CSS transform. When unmoved, return undefined
  // so React doesn't emit an empty inline style attribute.
  const dragTransform =
    dragOffset.x !== 0 || dragOffset.y !== 0
      ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }
      : undefined;
  const isDragged = dragOffset.x !== 0 || dragOffset.y !== 0;

  const rulesEntries = displayed.filter((e) => e.layer === 'rules');
  const geminiEntries = displayed.filter((e) => e.layer === 'gemini');

  // Aggregate counts for the collapsed-chip status indicator. Pass +
  // fixed both count as healthy (fixed = caught + rewritten = the audit
  // worked); only fail counts as a current alert. allPass means the chip
  // shows pure green; any failures push amber/red status.
  const totalCount = displayed.length;
  const failCount = displayed.filter((e) => e.status === 'fail').length;
  const passCount = totalCount - failCount;

  return (
    <>
      {/* Mobile FAB — md:hidden so it never appears on desktop. */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls={labelId}
        aria-label={mobileOpen ? 'Hide live audit' : 'Show live audit'}
        className="md:hidden fixed bottom-4 right-4 z-30 rounded-full bg-navy text-card-white p-3 shadow-lg focus-ring"
      >
        {mobileOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Activity className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* Desktop COLLAPSED chip — compact pill showing aggregate audit
          status. Click to expand the full sidebar. Stays out of the way
          of analog cards / pattern gaps / Q&A which sit at the right
          edge of the max-w-7xl content column. */}
      {isCollapsed && (
        <button
          type="button"
          data-allow-drag="true"
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleChipPointerUp}
          onPointerCancel={handleDragPointerUp}
          aria-label={`Expand live audit (${passCount} of ${totalCount} checks passed). Drag to reposition.`}
          title="Click to expand · drag to reposition"
          style={dragTransform}
          className={cn(
            'hidden md:inline-flex fixed right-4 top-24 z-30 items-center gap-2 rounded-full bg-card-white border border-soft-border shadow-lg px-3 py-2 text-eyebrow font-mono uppercase tracking-wider text-navy hover:bg-warm-neutral focus-ring transition-colors select-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        >
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Audit</span>
          {totalCount > 0 && (
            <span className="text-muted-text">
              {passCount}/{totalCount}
            </span>
          )}
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                failCount > 0 ? 'bg-status-amber' : 'bg-accent-teal',
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                failCount > 0 ? 'bg-status-amber' : 'bg-accent-teal',
              )}
            />
          </span>
          <ChevronRight className="h-3 w-3 text-muted-text rotate-180" aria-hidden="true" />
        </button>
      )}

      <aside
        id={labelId}
        aria-labelledby={`${labelId}-eyebrow`}
        style={dragTransform}
        className={cn(
          'fixed z-30 rounded-2xl bg-card-white border border-soft-border shadow-lg flex-col overflow-hidden',
          // Desktop: full sidebar when expanded, hidden when collapsed
          // (the chip above takes its place).
          isCollapsed ? 'md:hidden' : 'md:flex md:right-4 md:top-24 md:bottom-4 md:w-[380px]',
          // Mobile: bottom drawer when open, hidden when closed. Desktop
          // resets unset mobile-only positioning so left/bottom/max-h don't
          // collide with the desktop block above.
          mobileOpen
            ? 'flex left-4 right-4 bottom-20 max-h-[60vh] md:left-auto md:bottom-4 md:max-h-none'
            : 'hidden md:flex',
          // Slight visual feedback during drag — soft elevation bump.
          isDragging && 'shadow-xl',
          className,
        )}
      >
        <header
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={handleDragPointerUp}
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b border-soft-border shrink-0 select-none',
            // Drag affordance — desktop only. Mobile FAB-drawer is too
            // small for a useful drag-anywhere pattern + would conflict
            // with touch scrolling.
            'md:cursor-grab',
            isDragging && 'md:cursor-grabbing',
          )}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal
              className="hidden md:inline h-3.5 w-3.5 text-muted-text/60"
              aria-hidden="true"
            />
            <Activity className="h-3.5 w-3.5 text-navy" aria-hidden="true" />
            <p
              id={`${labelId}-eyebrow`}
              className="font-mono uppercase tracking-wider text-eyebrow text-navy"
            >
              Live audit
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Replay button — demo-mode only. Lets judges + Stephen
                rewatch the Pillar 4 audit moment without page reload.
                Increments replayKey which is in the demo useEffect's
                dep array, forcing the scheduled timeout chain to
                restart from T+0 with a fresh cancelled-flag closure. */}
            {effectiveDemoMode && (
              <button
                type="button"
                onClick={() => setReplayKey((k) => k + 1)}
                aria-label="Replay audit sequence"
                title="Replay audit"
                className="inline-flex items-center justify-center rounded p-1 text-muted-text hover:text-navy hover:bg-warm-neutral transition-colors focus-ring"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent-teal opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-teal" />
            </span>
            {/* Reset position — desktop only, conditional. Snaps the
                panel back to its default right-4 top-24 anchor when the
                user has dragged it elsewhere. */}
            {isDragged && (
              <button
                type="button"
                onClick={resetPosition}
                aria-label="Reset audit panel to default position"
                title="Reset position"
                className="hidden md:inline-flex items-center justify-center rounded p-1 text-muted-text hover:text-navy hover:bg-warm-neutral transition-colors focus-ring"
              >
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {/* Collapse to chip — desktop only. Mobile uses the FAB
                pattern (X button on the FAB toggles drawer open/closed). */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse live audit to chip"
              title="Collapse"
              className="hidden md:inline-flex items-center justify-center rounded p-1 text-muted-text hover:text-navy hover:bg-warm-neutral transition-colors focus-ring"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 divide-x divide-soft-border flex-1 min-h-0">
          <Column
            heading="Rules"
            entries={rulesEntries}
            persist={!effectiveDemoMode}
            onCollapse={handleCollapse}
          />
          <Column
            heading="Gemini"
            entries={geminiEntries}
            persist={!effectiveDemoMode}
            onCollapse={handleCollapse}
          />
        </div>

        {/* Visually-hidden announcer for fail→fixed transition. role=log
         * fires on add/remove; in-place dedupe doesn't trigger it, so AT
         * users would otherwise hear the banned phrase but never the
         * rewrite. */}
        <div role="status" aria-live="polite" className="sr-only">
          {srMessage}
        </div>
      </aside>
    </>
  );
}

function Column({
  heading,
  entries,
  persist,
  onCollapse,
}: {
  heading: string;
  entries: ComplianceLogEntry[];
  persist: boolean;
  onCollapse: (entry: ComplianceLogEntry) => void;
}) {
  const isEmpty = entries.length === 0;
  return (
    <section className="flex flex-col min-h-0">
      <h3 className="px-3 pt-3 pb-2 font-mono uppercase tracking-wider text-eyebrow text-muted-text shrink-0">
        {heading}
      </h3>

      {/* Empty placeholder lives OUTSIDE the live region — wouldn't want AT
       * to announce "Awaiting checks…" on every panel mount. */}
      {isEmpty && (
        <p className="px-3 pb-3 font-serif italic text-eyebrow text-muted-text">
          Awaiting checks…
        </p>
      )}

      {/* `<ul>` stays mounted across empty↔populated transitions so
       * AnimatePresence can play exit animations on the last collapsing
       * entry. Hidden via class when empty so it doesn't take space.
       *
       * NOTE: dropped role="log" here. axe-core flagged that <li> children
       * are invalid inside a list whose role has been overridden to "log"
       * (role="log" doesn't expect list-item children semantically). The
       * sibling sr-only <div role="status" aria-live="polite"> below
       * handles AT broadcast for the fail→fixed moment, which is the only
       * announcement we actually need. The default <ul>/<li> semantics
       * are now respected for the visible entry list. */}
      <ul
        aria-label={`${heading} audit entries`}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto px-3 pb-3 flex flex-col',
          isEmpty && 'hidden',
        )}
      >
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <LogEntry
              key={entryKey(entry)}
              entry={entry}
              persist={persist}
              onCollapse={onCollapse}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

export function ComplianceLogSkeleton({ className }: { className?: string }) {
  return (
    <aside
      aria-busy="true"
      aria-label="Loading compliance audit"
      className={cn(
        'hidden md:flex fixed z-30 rounded-2xl bg-card-white border border-soft-border shadow-lg animate-pulse',
        'md:right-4 md:top-24 md:bottom-4 md:w-[380px]',
        'flex-col overflow-hidden',
        className,
      )}
    >
      <div className="px-4 py-3 border-b border-soft-border flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-soft-border" />
        <div className="h-2 w-2 rounded-full bg-soft-border" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-soft-border flex-1">
        {[0, 1].map((c) => (
          <div key={c} className="px-3 py-3 flex flex-col gap-2">
            <div className="h-3 w-16 rounded bg-soft-border" />
            {[0, 1, 2].map((r) => (
              <div key={r} className="h-3 w-full rounded bg-soft-border" />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
