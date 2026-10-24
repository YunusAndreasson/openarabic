import { useQueryClient } from '@tanstack/react-query';

import { rootEnrichmentQueries } from '@/constants/queries';
import type { RootId } from '@/types/branded.types';

/**
 * Fire-and-forget fetch of a word's root explanation, for the press that opens
 * the word: the navigation transition is the head start, so the explanation is
 * painted by the time the word lands instead of arriving a beat late and
 * pushing the memory panel and stats down mid-read. The query's infinite
 * staleTime means it is paid once per word.
 *
 * `query`, not the deprecated `prefetchQuery`: same effect, but `query`
 * rejects where `prefetchQuery` swallowed, so the catch is explicit.
 */
export function useRootEnrichmentPrefetch(): (rootId: RootId) => void {
  const queryClient = useQueryClient();

  return (rootId: RootId) => {
    void queryClient.query(rootEnrichmentQueries.detail(rootId)).catch(() => undefined);
  };
}
