/**
 * useGlobalStats — typed wrapper around `api.globalStats()` for
 * `/api/stats/global` (Vinh Layer D ship 2026-05-04).
 *
 * Single global call (no params). Returns precomputed atlas-wide
 * statistics that Layer A's HeroStat ("4 in 5") was hand-derived from,
 * plus additional fields for Layer D scrollytelling chapters.
 *
 * Cache aggressively: precomputed at backend build time, never changes
 * during a session. 30-minute staleTime + Infinity cacheTime so the
 * data survives across mount/unmount cycles within a session.
 *
 * Defensive against shape uncertainty: GlobalStats interface in
 * lib/api.ts uses optional fields + Record<string, unknown> catch-all
 * because the backend response shape was not yet observable at
 * frontend wire-up time (Vinh's deploy hadn't propagated). Consumers
 * should defensive-check before reading specific fields.
 *
 * Caller pattern:
 *
 * ```tsx
 * const stats = useGlobalStats();
 * if (stats.data?.pct_counties_no_representation !== undefined) {
 *   // Use the live value — but HERO_STAT.value is the canonical
 *   // hand-derived presentation; live is for validation only.
 * }
 * ```
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type ApiError, type GlobalStats } from '../lib/api';

export function useGlobalStats(): UseQueryResult<GlobalStats, ApiError> {
  return useQuery<GlobalStats, ApiError>({
    queryKey: ['globalStats'],
    queryFn: () => api.globalStats(),
    staleTime: 30 * 60 * 1000,
  });
}
