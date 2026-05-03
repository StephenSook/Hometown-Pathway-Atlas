/**
 * useRegion — typed wrapper around `api.region(zip)` for `/api/region`.
 *
 * Disabled when `zip` is null/undefined/empty so the hook is safe to call
 * before the user submits a ZIP. Returned `error` is typed as `ApiError`
 * because `api.region` is the only thing that throws on non-2xx responses
 * (see `lib/api.ts:122`).
 *
 * Caller pattern (HomePage Day 4 swap):
 *
 * ```tsx
 * const [submittedZip, setSubmittedZip] = useState<string | null>(null);
 * const region = useRegion(submittedZip);
 * if (region.isLoading) return <ResultsSkeleton />;
 * if (region.error) toast.error(region.error.message);
 * if (region.data) return <RegionHeader {...region.data} />;
 * ```
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, type ApiError, type RegionResponse } from '../lib/api';

export function useRegion(
  zip: string | null | undefined,
): UseQueryResult<RegionResponse, ApiError> {
  return useQuery<RegionResponse, ApiError>({
    queryKey: ['region', zip],
    queryFn: () => api.region(zip as string),
    enabled: Boolean(zip),
  });
}
