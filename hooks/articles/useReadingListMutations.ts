import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { checkAuthentication } from '@/services/supabase';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import {
  readingListAddMutation,
  readingListRemoveMutation,
  type ReadingListVariables,
} from '@/utils/mutationDefaults';

interface ReadingListMutationsResult {
  handleToggleReadingList: (
    articleId: ArticleId | undefined,
    isInReadingList: boolean,
  ) => Promise<boolean>;

  addToReadingListMutation: UseMutationResult<void, Error, ReadingListVariables>;

  removeFromReadingListMutation: UseMutationResult<void, Error, ReadingListVariables>;
}

/**
 * Hook for reading list (bookmarks) mutations
 * Handles adding and removing articles from user's reading list — from the
 * reader's bookmark and the playlist's delete alike, so both get the same
 * analytics, the same refresh and the same offline queueing.
 *
 * @returns Object with reading list mutation functions
 */
export const useReadingListMutations = (): ReadingListMutationsResult => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  /**
   * What both mutations do once the server has confirmed: report it, then
   * refresh everything the list feeds. Identical for add and remove apart from
   * the boolean, so it is written once — the two copies were a standing
   * invitation for one list to be invalidated and the other not.
   *
   * Returned, so the mutation settles only once the list has refetched.
   * Whether one article is saved is a `select` of that list, and the reader's
   * button holds its optimistic state exactly until the mutation settles — were
   * it to settle first, the button would flick back to the old state until the
   * refetch landed.
   */
  const onMutationSuccess = useCallback(
    (inList: boolean, userId: string, articleId: ArticleId) => {
      void analytics.track(ANALYTICS_EVENTS.ARTICLE_BOOKMARKED, {
        article_id: articleId,
        action: inList ? 'add' : 'remove',
      });

      return readingProgressQueries.onListChanged(queryClient, userId);
    },
    [queryClient],
  );

  const addToReadingListMutation = useMutation({
    ...readingListAddMutation,
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
    ...readingListRemoveMutation,
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
