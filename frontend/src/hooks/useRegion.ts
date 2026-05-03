/**
 * useRegion — typed wrapper around `api.region(zip)` for `/api/region`.
 *
 * Disabled when `zip` is null/undefined/empty so the hook is safe to call
 * before the user submits a ZIP. Returned `error` is typed as `ApiError`
 * because `api.region` is the only thing that throws on non-2xx responses
 * (see `lib/api.ts:122`).
 *
 * Errors auto-toast via `QueryCache.onError` in `lib/queryClient.ts` —
 * the consumer doesn't need to call toast.error itself, the user always
 * sees the toast even if the consumer forgets to render an error UI.
 *
 * Caller pattern (HomePage Day 4 swap):
 *
 * ```tsx
 * const [submittedZip, setSubmittedZip] = useState<string | null>(null);
 * const region = useRegion(submittedZip);
 * if (region.isPending) return <ResultsSkeleton />;
 * if (region.data) return <RegionHeader {...region.data} />;
 * // error case: toast already fired via QueryCache.onError, render fallback
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
