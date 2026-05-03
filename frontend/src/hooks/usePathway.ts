/**
 * usePathway — typed wrapper around `api.pathway(fips)` for
 * `/api/pathway/{fips}`.
 *
 * Dependent query mirroring useAnalogs — caller chains off
 * `useRegion(zip).data?.fips`. Backend (Vinh task 2.5) generates the
 * three Pattern Gap categories per spec.
 *
 * ```tsx
 * const region = useRegion(submittedZip);
 * const pathway = usePathway(region.data?.fips);
 * ```
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type ApiError, type PathwayResponse } from '../lib/api';

export function usePathway(
  fips: string | null | undefined,
): UseQueryResult<PathwayResponse, ApiError> {
  return useQuery<PathwayResponse, ApiError>({
    queryKey: ['pathway', fips],
    queryFn: () => api.pathway(fips as string),
    enabled: Boolean(fips),
  });
}
