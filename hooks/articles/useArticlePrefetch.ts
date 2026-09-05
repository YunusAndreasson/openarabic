import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { articleQueries } from '@/constants/queries';
import type { ArticleId } from '@/types/branded.types';

/**
 * Fire-and-forget prefetch of an article's detail query, meant for `onPressIn`
 * on article cards: the press-feedback window hides the fetch so the reader
 * screen mounts against a warm cache. No-op when the detail is already cached
 * (Infinity staleTime).
 */
export function useArticlePrefetch(): (articleId: ArticleId) => void {
  const queryClient = useQueryClient();

  return useCallback(
    (articleId: ArticleId) => {
      // query() rejects where prefetchQuery swallowed — keep this fire-and-forget.
      void queryClient.query(articleQueries.detail(articleId)).catch(() => undefined);
    },
    [queryClient],
  );
}
