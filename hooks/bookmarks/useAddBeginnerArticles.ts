import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { bookmarkService } from '@/services/bookmark';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';

interface UseAddBeginnerArticlesOptions {
  onSuccess?: () => void;
}

interface UseAddBeginnerArticlesResult {
  addArticles: (articleIds: number[]) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Hook to add selected articles to the user's reading list.
 * Used in the empty state to help users start listening immediately.
 */
export function useAddBeginnerArticles(
  options?: UseAddBeginnerArticlesOptions,
): UseAddBeginnerArticlesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async (articleIds: number[]) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (articleIds.length === 0) {
        throw new Error('No articles selected');
      }

      // Add selected articles to reading list
      await Promise.all(
        articleIds.map(id => bookmarkService.addToReadingList(user.id, id as ArticleId)),
      );

      return { addedCount: articleIds.length };
    },
    onSuccess: async ({ addedCount }) => {
      if (!user?.id) return;

      // Track analytics
      analytics.track(ANALYTICS_EVENTS.BEGINNER_ARTICLES_ADDED, {
        count: addedCount,
      });

      // Invalidate reading list query to refresh
      await queryClient.invalidateQueries({ queryKey: ['readingList', user.id] });

      // Call onSuccess callback
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      handleError(error);
      showToast(STRINGS.FAILED_TO_ADD_BEGINNER_ARTICLES, undefined, ToastType.ERROR);
    },
  });

  return {
    addArticles: mutation.mutate,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
