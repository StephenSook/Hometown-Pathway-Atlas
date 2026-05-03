/**
 * Single QueryClient instance for the app — wired into App.tsx via
 * QueryClientProvider. Defaults are tuned for the hackathon demo.
 *
 * Global error handling: every failed query (region/analogs/pathway)
 * fires a Sonner toast through the QueryCache.onError handler. Hooks
 * that consume the failed data still receive `error` on their useQuery
 * result, but the user always sees a toast — no consumer can forget to
 * handle the error path. ApiError surfaces the HTTP status in the
 * toast message; everything else falls back to a generic network
 * message.
 *
 * Defaults:
 * - `staleTime: 5min` → no surprise refetches mid-pitch when a judge
 *   alt-tabs away and back.
 * - `gcTime: 30min` → keep cache warm across hero ↔ results navigation
 *   so re-entering an already-fetched ZIP is instant.
 * - `retry`: custom function — skip 4xx (don't retry user errors like
 *   "ZIP not found"), retry once on 5xx / network. Default 3-attempt
 *   exponential backoff would stall the demo if the first request
 *   fails on Cloud Run cold start.
 * - `refetchOnWindowFocus: false` → demo killer otherwise.
 * - `refetchOnReconnect: true` → defensible default for actual outages.
 */

import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const queryName = String(query.queryKey[0] ?? 'request');
      const message =
        error instanceof ApiError
          ? `Could not load ${queryName} (HTTP ${error.status}). Try again or pick another ZIP.`
          : `Network error while loading ${queryName}. Check connection and retry.`;
      toast.error(message);
      if (import.meta.env.DEV) {
        console.error('[query]', query.queryKey, error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        // Don't retry 4xx — those are user-facing problems (bad ZIP,
        // not-found, validation). Retry once on 5xx + network.
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
