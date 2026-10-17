import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { audioQueries, readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { bookmarkService } from '@/services/bookmark';
import { checkAuthentication } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
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
  const { showToast } = useToast();
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);

  /**
   * What both mutations do once the server has confirmed: report it, write the
   * new membership straight into the cache, then refetch the lists that derive
   * from it. Identical for add and remove apart from the boolean, so it is
   * written once — the two copies were a standing invitation for one list to be
   * invalidated and the other not.
   */
  const onMutationSuccess = useCallback(
    (inList: boolean, userId: string, articleId: ArticleId) => {
      void analytics.track(ANALYTICS_EVENTS.ARTICLE_BOOKMARKED, {
        article_id: articleId,
        action: inList ? 'add' : 'remove',
      });

      // Immediately update cache to reflect the new membership
      queryClient.setQueryData(
        readingProgressQueries.isInReadingList(userId, articleId).queryKey,
        inList,
      );

      // Then refetch to ensure consistency
      refetchReadingListStatus();
      void queryClient.invalidateQueries({
        queryKey: readingProgressQueries.readingList(userId).queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: audioQueries.tracks(userId, audioPreference).queryKey,
      });
    },
    [queryClient, audioPreference, refetchReadingListStatus],
  );

  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: ArticleId }) =>
      bookmarkService.addToReadingList(userId, articleId),
    onSuccess: (_data, { userId, articleId }) => onMutationSuccess(true, userId, articleId),
    // Only add can violate the unique constraint — there is no duplicate-key
    // failure mode for a delete, which is why remove has no such filter.
    onError: (error: Error) => {
      // Silently handle errors - no toast notifications for bookmarks actions
      const errorMessage = error.message;
      if (
        !errorMessage.includes('reading_list_position_unique') &&
        !errorMessage.includes('duplicate key value')
      ) {
        // Only log non-duplicate errors to console for debugging
        void handleError(new Error(`Failed to add to reading list: ${errorMessage}`), {
          showToast: false,
          captureSentry: false,
        });
      }
    },
  });

  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: ArticleId }) =>
      bookmarkService.removeFromReadingList(userId, articleId),
    onSuccess: (_data, { userId, articleId }) => onMutationSuccess(false, userId, articleId),
    onError: (error: Error) => {
      // Silently handle errors - no toast notifications for bookmarks actions
      void handleError(error, { showToast: false, captureSentry: false });
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
        // No redirect: the Stack.Protected guards own auth navigation. While the
        // app still holds a session they bounce `/auth` to Explore, which dropped
        // the reader's place; a session that is really gone flips the guard on
        // SIGNED_OUT and navigates by itself.
        showToast(STRINGS.PLEASE_SIGN_IN_TO_SAVE_ARTICLES, undefined, ToastType.INFO);
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
    [addToReadingListMutation, removeFromReadingListMutation, showToast],
  );

  return {
    handleToggleReadingList,
    addToReadingListMutation,
    removeFromReadingListMutation,
  };
};
