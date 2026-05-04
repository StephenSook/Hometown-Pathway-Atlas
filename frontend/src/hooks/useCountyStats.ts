/**
 * useCountyStats — typed wrapper around `api.countyStats(fips)` for
 * `/api/stats/county/{fips}`.
 *
 * Used by CountyMap to enrich the hover/click tooltip with REAL
 * per-100k metrics for any county the user inspects, not just the
 * source + 3 analog peers we already have data for. Click-to-load
 * pattern — fetch fires only on user-intentional click, not on every
 * pixel of mouse movement. React Query caches per-fips so re-clicking
 * the same county is instant.
 *
 * ```tsx
 * const [clickedFips, setClickedFips] = useState<string | null>(null);
 * const stats = useCountyStats(clickedFips);
 * // stats.data populates with CountyStats when fetch resolves
 * ```
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type ApiError, type CountyStats } from '../lib/api';

export function useCountyStats(
  fips: string | null | undefined,
): UseQueryResult<CountyStats, ApiError> {
  return useQuery<CountyStats, ApiError>({
    queryKey: ['countyStats', fips],
    queryFn: () => api.countyStats(fips as string),
    enabled: Boolean(fips),
    // 10-minute stale — county profile data is precomputed at build
    // time, never changes during a session. Cache aggressively.
    staleTime: 10 * 60 * 1000,
  });
}
