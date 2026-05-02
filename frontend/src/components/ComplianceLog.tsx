/**
 * ComplianceLog ★ — Pillar 4 demo moment.
 * Anatomy per DESIGN_SYSTEM §4.16 (most critical component on the page).
 *
 * Layout per §3:
 * - Desktop: fixed right sidebar (z-30, below navbar z-40, below modals z-50)
 * - Mobile: hidden by default, FAB toggles a bottom drawer (spec: "NEVER
 *   fixed sidebar on mobile — eats screen space"). FAB lives at bottom-right
 *   inside the same z-30 layer.
 *
 * Two columns split by hairline divider: RULES + GEMINI. Each column is a
 * `role="log" aria-live="polite"` region — entries announce as they arrive.
 * The "Awaiting checks…" placeholder lives OUTSIDE the live region to
 * prevent it being announced when the panel mounts.
 *
 * State ownership:
 * - `displayed` is the source of truth for what's rendered
 * - In demoMode, a setTimeout chain populates displayed per DEMO_DELAYS_MS
 * - In live mode, displayed mirrors `entries` prop
 * - Pass entries auto-collapse: LogEntry fires onCollapse callback after
 *   1.5s, ComplianceLog removes from displayed (so empty placeholder shows)
 * - fail→fixed entries dedupe by `(layer, check)` — the latest replaces the
 *   prior, and LogEntry's stable key gives an in-place crossfade
 *
 * Production safety: `demoMode` only takes effect on a dev build OR
 * `localhost` host (spec §4.16 verbatim guard). Cloud Run hosts (`*.run.app`)
 * are intentionally NOT in the allow-list so a production deploy never leaks
 * the scripted "Cobb County produces Olympic athletes" causal-verb fixture
 * into real user output. Demo recording uses a localhost dev server.
 *
 * `prefers-reduced-motion` honored via Framer's useReducedMotion (CSS clamp
 * in index.css does not affect Framer's JS-driven animations).
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, X } from 'lucide-react';
import type { ComplianceLogEntry } from '../lib/api';
import { demoComplianceScript } from '../lib/mocks';
import LogEntry from './LogEntry';
import { cn } from '../lib/utils';

interface ComplianceLogProps {
  entries?: ComplianceLogEntry[];
  /** Force the canonical pre-scripted demo sequence. Production-guarded. */
  demoMode?: boolean;
  className?: string;
}

const DEMO_DELAYS_MS = [0, 500, 1000, 4000];

function isDemoEnvironmentSafe(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost';
}

function entryKey(e: ComplianceLogEntry): string {
  return `${e.layer}-${e.check}`;
}

export default function ComplianceLog({
  entries = [],
  demoMode = false,
  className,
}: ComplianceLogProps) {
  const labelId = useId();
  const [displayed, setDisplayed] = useState<ComplianceLogEntry[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveDemoMode = demoMode === true && isDemoEnvironmentSafe();

  // Demo-mode scheduled sequence. Cleanup on unmount clears all pending
  // timeouts. Strict Mode dev double-mount: cleanup fires between, then
  // remount reschedules — net behavior is correct.
  useEffect(() => {
    if (!effectiveDemoMode) return;

    setDisplayed([]);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    demoComplianceScript.forEach((entry, i) => {
      const t = setTimeout(() => {
        setDisplayed((prev) => {
          const filtered = prev.filter((e) => entryKey(e) !== entryKey(entry));
          return [...filtered, entry];
        });
      }, DEMO_DELAYS_MS[i] ?? 0);
      timeouts.push(t);
    });
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [effectiveDemoMode]);

  // Live mode — sync from props
  useEffect(() => {
    if (effectiveDemoMode) return;
    setDisplayed(entries);
  }, [entries, effectiveDemoMode]);

  const handleCollapse = useCallback((entry: ComplianceLogEntry) => {
    setDisplayed((prev) =>
      prev.filter((e) => !(entryKey(e) === entryKey(entry) && e.status === 'pass')),
    );
  }, []);

  const rulesEntries = displayed.filter((e) => e.layer === 'rules');
  const geminiEntries = displayed.filter((e) => e.layer === 'gemini');

  return (
    <>
      {/* Mobile FAB — toggles drawer visibility. md: hides FAB since panel is always shown. */}
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
          // Mobile: bottom drawer, hidden until FAB toggles
          mobileOpen
            ? 'flex inset-x-4 bottom-20 max-h-[60vh]'
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
      {isEmpty ? (
        // Placeholder lives OUTSIDE the live region so AT doesn't announce
        // "Awaiting checks…" on every panel mount.
        <p className="px-3 pb-3 font-serif italic text-eyebrow text-muted-text">
          Awaiting checks…
        </p>
      ) : (
        <ul
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
          aria-label={`${heading} audit entries`}
          className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 flex flex-col"
        >
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <LogEntry
                key={entryKey(entry)}
                entry={entry}
                persist={persist}
                onCollapse={() => onCollapse(entry)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
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
