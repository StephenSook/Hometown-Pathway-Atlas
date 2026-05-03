/**
 * ErrorBoundary — root-level render-error catcher.
 *
 * React 19 default behavior on render-time exception is to unmount the
 * entire tree → blank screen. For a hackathon demo where judges might
 * trigger an unexpected code path mid-recording, blank-screen failure
 * is the worst possible outcome. This boundary catches the throw, logs
 * to console, and renders a branded Atlas fallback with a reset
 * action (clears URL state + reloads to hero).
 *
 * Class component (no react-error-boundary dep) — class is the only
 * way to use componentDidCatch / getDerivedStateFromError lifecycle
 * methods in React. Small enough to inline; not worth a new
 * dependency for one component.
 *
 * Wraps inside QueryClientProvider but OUTSIDE Toaster — Toaster
 * stays mounted so the boundary's reset action can fire its own
 * toast confirmation if needed (currently unused; reserved for
 * future hook-up).
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Atlas ErrorBoundary]', error, info);
  }

  reset = () => {
    if (typeof window !== 'undefined') {
      // Strip URL state so reload lands on a clean hero (avoids the
      // boundary catching the same render error on hydration loop).
      window.history.replaceState({}, '', window.location.pathname);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onReset,
}: {
  error?: Error;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      className="min-h-screen bg-warm-neutral flex items-center justify-center p-6"
    >
      <article
        className={cn(
          'max-w-lg w-full rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-8',
          'text-center',
        )}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-status-amber/10 mb-6">
          <AlertTriangle
            className="h-6 w-6 text-status-amber"
            aria-hidden="true"
          />
        </div>
        <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2">
          Hometown Pathway Atlas
        </p>
        <h1 className="text-h2 font-sans font-semibold text-navy mb-4">
          Something went wrong
        </h1>
        <p className="font-sans text-body text-body-text leading-relaxed mb-6">
          The app hit an unexpected error and couldn't render this view.
          Reset to start fresh — your URL state will clear and the page
          will reload to the hero.
        </p>
        {error?.message && (
          <details className="text-left mb-6">
            <summary className="font-mono text-caption text-muted-text cursor-pointer hover:text-navy">
              Show technical details
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-warm-neutral border border-soft-border font-mono text-eyebrow text-body-text overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-navy text-card-white px-5 py-3 font-mono uppercase tracking-wider text-eyebrow hover:bg-olympic-blue focus-ring transition-colors"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset and reload
        </button>
      </article>
    </div>
  );
}
