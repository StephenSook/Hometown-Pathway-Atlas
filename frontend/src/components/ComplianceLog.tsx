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
 * Production safety: `demoMode` only takes effect on a dev build OR a
 * loopback host (`localhost` / `127.0.0.1`). Cloud Run hosts (`*.run.app`)
 * are intentionally NOT in the allow-list so a production deploy never
 * leaks the scripted "Cobb County produces Olympic athletes" causal-verb
 * fixture. A dev console.warn surfaces when demoMode was requested but
 * env-disabled (e.g. demo rehearsal on a preview URL).
 *
 * `prefers-reduced-motion` honored via Framer's useReducedMotion in
 * LogEntry — CSS clamp in index.css does not affect Framer's JS-driven
 * animations.
 *
 * Accessible name on the aside is wired via aria-labelledby pointing at
 * the visible "Live audit" eyebrow id — keeps the landmark name
 * synchronized with on-screen text.
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, X } from 'lucide-react';
import type { ComplianceLogEntry } from '../lib/api';
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
  return host === 'localhost' || host === '127.0.0.1';
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
  const [srMessage, setSrMessage] = useState('');

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
  useEffect(() => {
    if (!effectiveDemoMode) return;
    let cancelled = false;
    setDisplayed([]);
    const timeouts = demoComplianceScript.map((entry, i) =>
      setTimeout(
        () => {
          if (cancelled) return;
          setDisplayed((prev) => {
            const filtered = prev.filter((e) => entryKey(e) !== entryKey(entry));
            return [...filtered, entry];
          });
        },
        DEMO_DELAYS_MS[i] ?? 0,
      ),
    );
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [effectiveDemoMode]);

  // Live mode — sync from props (already coerced to safe array)
  useEffect(() => {
    if (effectiveDemoMode) return;
    setDisplayed(safeEntries);
  }, [safeEntries, effectiveDemoMode]);

  // sr-only announcement for fail→fixed — visual color morph is silent to
  // AT because role="log" only broadcasts on add/remove, not in-place prop
  // changes.
  useEffect(() => {
    const lastFixed = displayed.findLast((e) => e.status === 'fixed');
    if (lastFixed) {
      setSrMessage(
        `${lastFixed.check} rewritten in conditional phrasing in our indexed sources.`,
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

  const rulesEntries = displayed.filter((e) => e.layer === 'rules');
  const geminiEntries = displayed.filter((e) => e.layer === 'gemini');

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

      <aside
        id={labelId}
        aria-labelledby={`${labelId}-eyebrow`}
        className={cn(
          'fixed z-30 rounded-2xl bg-card-white border border-soft-border shadow-lg flex-col overflow-hidden',
          // Desktop: always-visible right sidebar
          'md:flex md:right-4 md:top-24 md:bottom-4 md:w-[380px]',
          // Mobile: bottom drawer when open, hidden when closed. Desktop
          // resets unset mobile-only positioning so left/bottom/max-h don't
          // collide with the desktop block above.
          mobileOpen
            ? 'flex left-4 right-4 bottom-20 max-h-[60vh] md:left-auto md:bottom-4 md:max-h-none'
            : 'hidden md:flex',
          className,
        )}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-soft-border shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-navy" aria-hidden="true" />
            <p
              id={`${labelId}-eyebrow`}
              className="font-mono uppercase tracking-wider text-eyebrow text-navy"
            >
              Live audit
            </p>
          </div>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-teal opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-teal" />
          </span>
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
