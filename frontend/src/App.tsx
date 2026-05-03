/**
 * Atlas — root app shell.
 * Skip-to-content link first per DESIGN_SYSTEM §8 keyboard nav requirement.
 * QueryClientProvider wraps the tree so useRegion/useAnalogs/usePathway
 * have a shared cache. Sonner Toaster mounted at root so any component
 * can fire toast.error for ApiError surfaces.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import HomePage from './pages/HomePage';
import { queryClient } from './lib/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-card-white focus:no-underline"
      >
        Skip to main content
      </a>
      <HomePage />
      <Toaster
        position="top-center"
        closeButton
        // Atlas-branded styling — drops Sonner's default richColors
        // pastels in favor of the editorial palette (warm-neutral bg
        // + navy text + soft-border + Instrument Serif italic
        // descriptions). Per-type variants tint the left border
        // (status-amber for warnings, accent-teal for success,
        // status-danger for errors) without flooding the toast in
        // saturated color — Atlas brand voice is restrained.
        toastOptions={{
          classNames: {
            toast:
              'font-sans text-body bg-card-white text-body-text border border-soft-border rounded-2xl shadow-card-resting',
            title: 'font-sans font-semibold text-navy text-body',
            description: 'font-serif italic text-caption text-muted-text',
            actionButton:
              'font-mono uppercase tracking-wider text-eyebrow bg-navy text-card-white rounded-md',
            cancelButton:
              'font-mono uppercase tracking-wider text-eyebrow text-muted-text hover:text-navy',
            closeButton:
              'border-soft-border bg-warm-neutral text-muted-text hover:text-navy',
            error: 'border-l-4 border-l-status-danger',
            success: 'border-l-4 border-l-accent-teal',
            warning: 'border-l-4 border-l-status-amber',
            info: 'border-l-4 border-l-olympic-blue',
          },
        }}
      />
    </QueryClientProvider>
  );
}
