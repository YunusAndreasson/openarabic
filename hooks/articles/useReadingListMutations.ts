import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { AUDIO_QUERY_KEYS, READING_LIST_QUERY_KEYS } from '@/constants/queryKeys';
import { ROUTE_PATHS } from '@/constants/routes';
import { bookmarkService } from '@/services/bookmark';
import { supabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';

interface ReadingListMutationsResult {
  handleToggleReadingList: (
    articleId: ArticleId | undefined,
    isInReadingList: boolean
  ) => Promise<void>;
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
  refetchReadingListStatus: () => void
): ReadingListMutationsResult => {
  const queryClient = useQueryClient();
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);

  // Memoize mutation options for adding to reading list
  const addToReadingListOptions = useMemo(
    () => ({
      mutationFn: async ({ userId, articleId }: { userId: string; articleId: ArticleId }) =>
        bookmarkService.addToReadingList(userId, articleId),
      onSuccess: (_: void, { userId, articleId }: { userId: string; articleId: ArticleId }) => {
        // Immediately update cache to reflect the bookmark was added
        queryClient.setQueryData(READING_LIST_QUERY_KEYS.detail(userId, articleId), true);

        // Then refetch to ensure consistency
        refetchReadingListStatus();
        queryClient.invalidateQueries({ queryKey: READING_LIST_QUERY_KEYS.all(userId) });
        queryClient.invalidateQueries({ queryKey: AUDIO_QUERY_KEYS.tracks(userId, audioPreference) });
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
    }),
    [queryClient, refetchReadingListStatus, audioPreference]
  );

  // Memoize mutation options for removing from reading list
  const removeFromReadingListOptions = useMemo(
    () => ({
      mutationFn: async ({ userId, articleId }: { userId: string; articleId: ArticleId }) =>
        bookmarkService.removeFromReadingList(userId, articleId),
      onSuccess: (_: void, { userId, articleId }: { userId: string; articleId: ArticleId }) => {
        // Immediately update cache to reflect the bookmark was removed
        queryClient.setQueryData(READING_LIST_QUERY_KEYS.detail(userId, articleId), false);

        // Then refetch to ensure consistency
        refetchReadingListStatus();
        queryClient.invalidateQueries({ queryKey: READING_LIST_QUERY_KEYS.all(userId) });
        queryClient.invalidateQueries({ queryKey: AUDIO_QUERY_KEYS.tracks(userId, audioPreference) });
      },
      onError: (error: Error) => {
        // Silently handle errors - no toast notifications for bookmarks actions
        handleError(error, { showToast: false, captureSentry: false });
      },
    }),
    [queryClient, refetchReadingListStatus, audioPreference]
  );

  // Initialize mutations with memoized options
  const addToReadingListMutation = useMutation<
    void,
    Error,
    { userId: string; articleId: ArticleId }
  >(addToReadingListOptions);
  const removeFromReadingListMutation = useMutation<
    void,
    Error,
    { userId: string; articleId: ArticleId }
  >(removeFromReadingListOptions);

  // Handle toggling reading list with session refresh
  const handleToggleReadingList = useCallback(
    async (articleId: ArticleId | undefined, isInReadingList: boolean) => {
      if (!articleId) return;

      try {
        // Get the current session directly from Supabase
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session) {
            // Silently redirect to auth - no toast for bookmarks actions
            router.replace(ROUTE_PATHS.AUTH);
            return;
          }

          // Use the refreshed user ID
          if (isInReadingList) {
            removeFromReadingListMutation.mutate({
              userId: refreshData.session.user.id,
              articleId,
            });
          } else {
            addToReadingListMutation.mutate({ userId: refreshData.session.user.id, articleId });
          }
          return;
        }

        // Use the session user ID directly, not the potentially stale userId from props
        if (isInReadingList) {
          removeFromReadingListMutation.mutate({ userId: session.user.id, articleId });
        } else {
          addToReadingListMutation.mutate({ userId: session.user.id, articleId });
        }
      } catch (error) {
        handleError(error as Error);
      }
    },
    [addToReadingListMutation, removeFromReadingListMutation]
  );

  return {
    handleToggleReadingList,
    addToReadingListMutation,
    removeFromReadingListMutation,
  };
};
