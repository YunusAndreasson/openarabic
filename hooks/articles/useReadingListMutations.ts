import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { audioQueries, readingProgressQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { analytics } from '@/services/analytics';
import { bookmarkService } from '@/services/bookmark';
import { checkAuthentication } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';

interface ReadingListMutationsResult {
  handleToggleReadingList: (
    articleId: ArticleId | undefined,
    isInReadingList: boolean,
  ) => Promise<boolean>;

  addToReadingListMutation: UseMutationResult<
    void,
    Error,
    { userId: string; articleId: ArticleId }
  >;

  removeFromReadingListMutation: UseMutationResult<
    void,
    Error,
    { userId: string; articleId: ArticleId }
  >;
}

/**
 * Hook for reading list (bookmarks) mutations
 * Handles adding and removing articles from user's reading list
 *
 * @param refetchReadingListStatus - Function to refetch reading list status
 * @returns Object with reading list mutation functions
 */
export const useReadingListMutations = (
  refetchReadingListStatus: () => void,
): ReadingListMutationsResult => {
  const queryClient = useQueryClient();
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);

  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: ArticleId }) =>
      bookmarkService.addToReadingList(userId, articleId),
    onSuccess: (_data, { userId, articleId }) => {
      // Track bookmark added
      analytics.track(ANALYTICS_EVENTS.ARTICLE_BOOKMARKED, {
        article_id: articleId,
        action: 'add',
      });

      // Immediately update cache to reflect the bookmark was added
      queryClient.setQueryData(
        readingProgressQueries.isInReadingList(userId, articleId).queryKey,
        true,
      );

      // Then refetch to ensure consistency
      refetchReadingListStatus();
      queryClient.invalidateQueries({
        queryKey: readingProgressQueries.readingList(userId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: audioQueries.tracks(userId, audioPreference).queryKey,
      });
    },
    onError: (error: Error) => {
      // Silently handle errors - no toast notifications for bookmarks actions
      const errorMessage = error.message;
      if (
        !errorMessage.includes('reading_list_position_unique') &&
        !errorMessage.includes('duplicate key value')
      ) {
        // Only log non-duplicate errors to console for debugging
        handleError(new Error(`Failed to add to reading list: ${errorMessage}`), {
          showToast: false,
          captureSentry: false,
        });
      }
    },
  });

  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: ArticleId }) =>
      bookmarkService.removeFromReadingList(userId, articleId),
    onSuccess: (_data, { userId, articleId }) => {
      // Track bookmark removed
      analytics.track(ANALYTICS_EVENTS.ARTICLE_BOOKMARKED, {
        article_id: articleId,
        action: 'remove',
      });

      // Immediately update cache to reflect the bookmark was removed
      queryClient.setQueryData(
        readingProgressQueries.isInReadingList(userId, articleId).queryKey,
        false,
      );

      // Then refetch to ensure consistency
      refetchReadingListStatus();
      queryClient.invalidateQueries({
        queryKey: readingProgressQueries.readingList(userId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: audioQueries.tracks(userId, audioPreference).queryKey,
      });
    },
    onError: (error: Error) => {
      // Silently handle errors - no toast notifications for bookmarks actions
      handleError(error, { showToast: false, captureSentry: false });
    },
  });

  // Handle toggling reading list with session refresh
  const handleToggleReadingList = useCallback(
    async (articleId: ArticleId | undefined, isInReadingList: boolean) => {
      if (!articleId) return false;

      let userId: string;
      try {
        const { user } = await checkAuthentication();
        userId = user.id;
      } catch {
        router.replace(ROUTE_PATHS.AUTH);
        return false;
      }

      try {
        // Await the mutation so optimistic callers remain pending until the
        // server confirms the new state. React Query still owns cache updates
        // and error handling through the mutation callbacks above.
        if (isInReadingList) {
          await removeFromReadingListMutation.mutateAsync({ userId, articleId });
        } else {
          await addToReadingListMutation.mutateAsync({ userId, articleId });
        }
        return true;
      } catch {
        // The mutation callbacks already report operational failures. Returning
        // false lets the optimistic UI roll back without claiming success.
        return false;
      }
    },
    [addToReadingListMutation, removeFromReadingListMutation],
  );

  return {
    handleToggleReadingList,
    addToReadingListMutation,
    removeFromReadingListMutation,
  };
};
