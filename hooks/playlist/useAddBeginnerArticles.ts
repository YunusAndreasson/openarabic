import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { articleQueries, readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { bookmarkService } from '@/services/bookmark';
import { useAppDispatch } from '@/store/hooks';
import { resetEditMode } from '@/store/editModeSlice';
import { ToastType } from '@/types/enums';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';
import { managedRequest } from '@/utils/supabaseHelpers';

/** Number of beginner articles to add */
const BEGINNER_ARTICLE_COUNT = 10;

interface UseAddBeginnerArticlesOptions {
  onSuccess?: () => void;
}

interface UseAddBeginnerArticlesResult {
  addArticles: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** False until the catalog has loaded — disable the CTA meanwhile */
  hasArticlesAvailable: boolean;
}

/**
 * One-tap quick start for the Playlist empty state: adds a set of
 * beginner-friendly articles to the user's reading list. Idempotent —
 * addManyToReadingList is an upsert on (user_id, article_id).
 */
export function useAddBeginnerArticles(
  options?: UseAddBeginnerArticlesOptions,
): UseAddBeginnerArticlesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const dispatch = useAppDispatch();

  // Fetch all articles to get beginner articles
  const { data: allArticles = [] } = useQuery(articleQueries.all());

  // Get beginner articles
  const beginnerArticleIds = useMemo(
    () => getBeginnerArticles(allArticles, BEGINNER_ARTICLE_COUNT).map(a => a.id),
    [allArticles],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (beginnerArticleIds.length === 0) {
        throw new Error('No beginner articles available');
      }

      // One upsert for the whole set: it succeeds or fails as one, so a failure
      // is one report and one toast — ten parallel requests could fail as ten.
      // Articles already in the list are left as they are, so a retry is safe.
      await bookmarkService.addManyToReadingList(user.id, beginnerArticleIds, managedRequest());

      return { addedCount: beginnerArticleIds.length };
    },
    onSuccess: ({ addedCount }) => {
      if (!user?.id) return;

      // Show toast with haptic immediately (don't wait for cache invalidation)
      successFeedback();
      showToast(STRINGS.ARTICLES_ADDED_SUCCESS, undefined, ToastType.SUCCESS);

      // Track analytics
      void analytics.track(ANALYTICS_EVENTS.BEGINNER_ARTICLES_ADDED, {
        count: addedCount,
      });

      // Reset edit mode in case it was persisted from previous session
      dispatch(resetEditMode('playlist'));

      // Invalidate queries in background (UI updates when ready)
      void readingProgressQueries.onListChanged(queryClient, user.id);

      // Call onSuccess callback
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      void handleError(error);
      showToast(STRINGS.FAILED_TO_ADD_BEGINNER_ARTICLES, undefined, ToastType.ERROR);
    },
  });

  return {
    addArticles: () => mutation.mutate(),
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    hasArticlesAvailable: beginnerArticleIds.length > 0,
  };
}
