/**
 * Single QueryClient instance for the app — wired into App.tsx via
 * QueryClientProvider. Defaults are tuned for the hackathon demo:
 *
 * - `staleTime: 5min` → no surprise refetches mid-pitch when a judge
 *   alt-tabs away and back.
 * - `gcTime: 30min` → keep cache warm across hero ↔ results navigation
 *   so re-entering an already-fetched ZIP is instant.
 * - `retry: 1` → one retry only; default 3-attempt exponential backoff
 *   would stall the demo if the first request fails.
 * - `refetchOnWindowFocus: false` → demo killer otherwise.
 * - `refetchOnReconnect: true` → defensible default for actual outages.
 *
 * Errors thrown from `api.region/analogs/pathway` are `ApiError` instances
 * (see `lib/api.ts`); React Query passes them through to `useQuery.error`
 * with the typed shape per hook.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
