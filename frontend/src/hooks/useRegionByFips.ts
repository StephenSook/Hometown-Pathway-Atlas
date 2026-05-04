/**
 * useRegionByFips — typed wrapper around `api.regionByFips(fips)` for
 * `/api/region/by-fips/{fips}` (Vinh task B7 ship 2026-05-04).
 *
 * Counterpart to useRegion(zip) — same RegionResponse payload shape,
 * different lookup key. Powers map drill-down: when a user clicks a
 * non-source, non-analog county on CountyMap and chooses "Open this
 * county profile" from the SelectedCountyCard CTA, HomePage hydrates
 * the results view from the FIPS instead of a ZIP. Skips the ZIP →
 * crosswalk roundtrip useRegion takes.
 *
 * Cache strategy: react-query keys on the FIPS so navigating between
 * counties never re-fires the network for an already-visited FIPS.
 * 10-minute stale matches `useCountyStats` (precomputed profile data
 * never changes within a session).
 *
 * Usage in HomePage (alongside useRegion(submittedZip)):
 *
 * ```tsx
 * const region = useRegion(isSparse ? null : submittedZip);
 * const regionByFips = useRegionByFips(submittedFips);
 * const activeRegion = isSparse
 *   ? mockSparseRegion
 *   : (regionByFips.data ?? region.data);
 * ```
 *
 * Errors auto-toast via `QueryCache.onError` in `lib/queryClient.ts`,
 * same path useRegion uses.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type ApiError, type RegionResponse } from '../lib/api';

export function useRegionByFips(
  fips: string | null | undefined,
): UseQueryResult<RegionResponse, ApiError> {
  return useQuery<RegionResponse, ApiError>({
    queryKey: ['regionByFips', fips],
    queryFn: () => api.regionByFips(fips as string),
    enabled: Boolean(fips),
    staleTime: 10 * 60 * 1000,
  });
}
