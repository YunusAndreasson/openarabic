import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { articleQueries, audioQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { bookmarkService } from '@/services/bookmark';
import { useAppDispatch } from '@/store/hooks';
import { resetEditMode } from '@/store/editModeSlice';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

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
}

/**
 * Hook to add beginner articles to the user's reading list.
 * Automatically fetches and adds 10 beginner-friendly articles.
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

  // Get 10 beginner articles
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

      // Add beginner articles to reading list
      await Promise.all(
        beginnerArticleIds.map(id => bookmarkService.addToReadingList(user.id, id as ArticleId)),
      );

      return { addedCount: beginnerArticleIds.length };
    },
    onSuccess: async ({ addedCount }) => {
      if (!user?.id) return;

      // Track analytics
      analytics.track(ANALYTICS_EVENTS.BEGINNER_ARTICLES_ADDED, {
        count: addedCount,
      });

      // Invalidate reading list and audio tracks queries to refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['readingList', user.id] }),
        audioQueries.invalidateAll(queryClient, user.id),
      ]);

      // Reset edit mode in case it was persisted from previous session
      dispatch(resetEditMode('listen'));

      // Show encouraging toast with haptic
      successFeedback();
      showToast(STRINGS.ARTICLES_ADDED_SUCCESS, undefined, ToastType.SUCCESS);

      // Call onSuccess callback
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      handleError(error);
      showToast(STRINGS.FAILED_TO_ADD_BEGINNER_ARTICLES, undefined, ToastType.ERROR);
    },
  });

  return {
    addArticles: () => mutation.mutate(),
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
