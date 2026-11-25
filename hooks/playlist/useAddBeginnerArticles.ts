import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { articleQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { guestArticlesAdded } from '@/store/guestLibrarySlice';
import { guestBookmark } from '@/utils/guestLibrary';
import { useAppDispatch } from '@/store/hooks';
import { resetEditMode } from '@/store/editModeSlice';
import { ToastType } from '@/types/enums';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { successFeedback } from '@/utils/haptics';
import { readingListAddManyMutation } from '@/utils/mutationDefaults';

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
  const { showToast } = useToast();
  const dispatch = useAppDispatch();

  // Fetch all articles to get beginner articles
  const { data: allArticles = [] } = useQuery(articleQueries.all());

  // Get beginner articles
  const beginnerArticles = useMemo(
    () => getBeginnerArticles(allArticles, BEGINNER_ARTICLE_COUNT),
    [allArticles],
  );

  const mutation = useMutation({
    ...readingListAddManyMutation,
    onSuccess: (_data, { userId, articleIds }) => {
      if (!userId || user?.id !== userId) return;

      // Show toast with haptic immediately (don't wait for cache invalidation)
      successFeedback();
      showToast(STRINGS.ARTICLES_ADDED_SUCCESS, undefined, ToastType.SUCCESS);

      // Track analytics
      void analytics.track(ANALYTICS_EVENTS.BEGINNER_ARTICLES_ADDED, {
        count: articleIds.length,
      });

      // Reset edit mode in case it was persisted from previous session
      dispatch(resetEditMode('playlist'));

      // Call onSuccess callback
      options?.onSuccess?.();
    },
  });

  return {
    addArticles: () => {
      if (user?.id) {
        mutation.mutate({
          userId: user.id,
          articleIds: beginnerArticles.map(article => article.id),
        });
      } else if (beginnerArticles.length > 0) {
        const now = new Date().toISOString();
        dispatch(guestArticlesAdded(beginnerArticles.map(article => guestBookmark(article, now))));
        dispatch(resetEditMode('playlist'));
        successFeedback();
        options?.onSuccess?.();
      }
    },
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    hasArticlesAvailable: beginnerArticles.length > 0,
  };
}
