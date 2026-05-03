/**
 * useAnalogs — typed wrapper around `api.analogs(fips)` for
 * `/api/analogs/{fips}`.
 *
 * Dependent query: caller passes `useRegion(zip).data?.fips`. While
 * `region` is loading, fips is undefined → hook stays disabled. Once
 * region resolves and fips is available, this hook fires automatically.
 *
 * ```tsx
 * const region = useRegion(submittedZip);
 * const analogs = useAnalogs(region.data?.fips);
 * ```
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type ApiError, type AnalogsResponse } from '../lib/api';

export function useAnalogs(
  fips: string | null | undefined,
): UseQueryResult<AnalogsResponse, ApiError> {
  return useQuery<AnalogsResponse, ApiError>({
    queryKey: ['analogs', fips],
    queryFn: () => api.analogs(fips as string),
    enabled: Boolean(fips),
  });
}
