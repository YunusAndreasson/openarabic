import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';

// Services
import { useToast } from '@/components/providers/ToastProvider';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

// Shared query keys used across mutation success handlers
const RELATED_QUERY_KEYS = (userId: string) =>
  [
    FSRS_QUERY_KEYS.all(userId),
    FSRS_QUERY_KEYS.due(userId),
    ['studyWordsCounts', userId] as const,
    ['enhancedAudioTracks', userId] as const,
    ['vocabulary-stats'] as const,
  ] as const;

interface ArticleMutationsResult {
  handleToggleReadingList: (articleId: number | undefined, isInReadingList: boolean) => void;
  handleWordPress: (wordId: number) => void;
  handleRootPress: (rootId: number) => void;
  addToReadingListMutation: UseMutationResult<void, Error, { userId: string; articleId: number }>;
  removeFromReadingListMutation: UseMutationResult<
    void,
    Error,
    { userId: string; articleId: number }
  >;
  toggleWordMutation: UseMutationResult<
    boolean,
    Error,
    { userId: string; wordId: number },
    StudyWordContext
  >;
  toggleRootMutation: UseMutationResult<
    boolean,
    Error,
    { userId: string; rootId: number },
    StudyWordContext
  >;
}

type StudyWordContext = {
  previousStudyWords: { root_id: number }[];
};

/**
 * Hook for article-related mutations
 * @param _userId - The current user ID (might be stale)
 * @param refetchReadingListStatus - Function to refetch reading list status
 * @param refetchStudyWords - Function to refetch study words
 *   (returns a Promise)
 * @returns Object with mutation functions
 */
export const useArticleMutations = (
  _userId: string | undefined,
  refetchReadingListStatus: () => void,
  refetchStudyWords?: () => Promise<void>
): ArticleMutationsResult => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Memoize mutation options for reading list
  const addToReadingListOptions = useMemo(
    () => ({
      mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
        readingListService.addToReadingList(userId, articleId),
      onSuccess: (_: void, { userId, articleId }: { userId: string; articleId: number }) => {
        // Immediately update cache to reflect the bookmark was added
        queryClient.setQueryData(['readingList', userId, articleId], true);

        // Then refetch to ensure consistency
        refetchReadingListStatus();
        queryClient.invalidateQueries({ queryKey: ['readingList', userId] });
      },
      onError: (error: Error) => {
        // Silently handle errors - no toast notifications for playlist actions
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
    [queryClient, refetchReadingListStatus]
  );

  // Memoize mutation options for removing from reading list
  const removeFromReadingListOptions = useMemo(
    () => ({
      mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
        readingListService.removeFromReadingList(userId, articleId),
      onSuccess: (_: void, { userId, articleId }: { userId: string; articleId: number }) => {
        // Immediately update cache to reflect the bookmark was removed
        queryClient.setQueryData(['readingList', userId, articleId], false);

        // Then refetch to ensure consistency
        refetchReadingListStatus();
        queryClient.invalidateQueries({ queryKey: ['readingList', userId] });
      },
      onError: (error: Error) => {
        // Silently handle errors - no toast notifications for playlist actions
        handleError(error, { showToast: false, captureSentry: false });
      },
    }),
    [queryClient, refetchReadingListStatus]
  );

  // Memoize mutation options for toggling word study status
  const toggleWordOptions = useMemo(
    () => ({
      mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) => {
        return studyWordsFSRSService.toggleFSRSStudyRoot(userId, wordId);
      },
      onMutate: async ({
        userId,
        wordId,
      }: {
        userId: string;
        wordId: number;
      }): Promise<StudyWordContext> => {
        await queryClient.cancelQueries({ queryKey: FSRS_QUERY_KEYS.all(userId) });
        const previousStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(userId)) as {
          root_id: number;
        }[];

        queryClient.setQueryData(FSRS_QUERY_KEYS.all(userId), (old: { root_id: number }[] = []) => {
          const exists = old.some(sw => sw.root_id === wordId);
          return exists ? old.filter(sw => sw.root_id !== wordId) : [...old, { root_id: wordId }];
        });

        return { previousStudyWords };
      },
      onError: (error: Error, { userId }: { userId: string }, context?: StudyWordContext) => {
        if (context?.previousStudyWords) {
          queryClient.setQueryData(FSRS_QUERY_KEYS.all(userId), context.previousStudyWords);
        }
        handleError(error);
        showToast(STRINGS.ERROR_UPDATING_STUDY_LIST, undefined, 'error');
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(userId) });
      },
      onSuccess: async (_: boolean, { userId }: { userId: string }) => {
        // Batch invalidate related queries
        RELATED_QUERY_KEYS(userId).forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });

        await refetchStudyWords?.();
      },
    }),
    [queryClient, refetchStudyWords, showToast]
  );

  // Memoize mutation options for toggling root study status
  const toggleRootOptions = useMemo(
    () => ({
      mutationFn: async ({ userId, rootId }: { userId: string; rootId: number }) => {
        return studyWordsFSRSService.toggleFSRSStudyRoot(userId, rootId);
      },
      onMutate: async ({
        userId,
        rootId,
      }: {
        userId: string;
        rootId: number;
      }): Promise<StudyWordContext> => {
        await queryClient.cancelQueries({ queryKey: FSRS_QUERY_KEYS.all(userId) });
        const previousStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(userId)) as {
          root_id: number;
        }[];

        queryClient.setQueryData(FSRS_QUERY_KEYS.all(userId), (old: { root_id: number }[] = []) => {
          const exists = old.some(sw => sw.root_id === rootId);
          return exists ? old.filter(sw => sw.root_id !== rootId) : [...old, { root_id: rootId }];
        });

        return { previousStudyWords };
      },
      onError: (error: Error, { userId }: { userId: string }, context?: StudyWordContext) => {
        if (context?.previousStudyWords) {
          queryClient.setQueryData(FSRS_QUERY_KEYS.all(userId), context.previousStudyWords);
        }
        handleError(error);
        showToast(STRINGS.ERROR_UPDATING_STUDY_LIST, undefined, 'error');
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(userId) });
      },
      onSuccess: async (_: boolean, { userId }: { userId: string }) => {
        // Batch invalidate related queries
        [...RELATED_QUERY_KEYS(userId), ['fsrs-words', userId] as const].forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });

        await refetchStudyWords?.();
      },
    }),
    [queryClient, refetchStudyWords, showToast]
  );

  // Initialize mutations with memoized options
  const addToReadingListMutation = useMutation<void, Error, { userId: string; articleId: number }>(
    addToReadingListOptions
  );
  const removeFromReadingListMutation = useMutation<
    void,
    Error,
    { userId: string; articleId: number }
  >(removeFromReadingListOptions);
  const toggleWordMutation = useMutation<
    boolean,
    Error,
    { userId: string; wordId: number },
    StudyWordContext
  >(toggleWordOptions);
  const toggleRootMutation = useMutation<
    boolean,
    Error,
    { userId: string; rootId: number },
    StudyWordContext
  >(toggleRootOptions);

  // Handle toggling reading list
  const handleToggleReadingList = useCallback(
    async (articleId: number | undefined, isInReadingList: boolean) => {
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
            // Silently redirect to auth - no toast for playlist actions
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
    [addToReadingListMutation, removeFromReadingListMutation, router]
  );

  // Handle word press
  const handleWordPress = useCallback(
    async (wordId: number) => {
      try {
        // Always get fresh session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          // Try to refresh the session first
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session) {
            showToast(STRINGS.PLEASE_SIGN_IN_TO_ADD_WORDS, undefined, 'info');
            router.replace(ROUTE_PATHS.AUTH);
            return;
          }

          // Use the refreshed session
          toggleWordMutation.mutate({ userId: refreshData.session.user.id, wordId });
          return;
        }

        // Always use the user ID from the session directly
        toggleWordMutation.mutate({ userId: session.user.id, wordId });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [toggleWordMutation, showToast, router]
  );

  // Handle root press
  const handleRootPress = useCallback(
    async (rootId: number) => {
      try {
        // Always get fresh session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          // Try to refresh the session first
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session) {
            showToast(STRINGS.PLEASE_SIGN_IN_TO_ADD_ROOTS, undefined, 'info');
            router.replace(ROUTE_PATHS.AUTH);
            return;
          }

          // Use the refreshed session
          toggleRootMutation.mutate({ userId: refreshData.session.user.id, rootId });
          return;
        }

        // Always use the user ID from the session directly
        toggleRootMutation.mutate({ userId: session.user.id, rootId });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [toggleRootMutation, showToast, router]
  );

  return {
    handleToggleReadingList,
    handleWordPress,
    handleRootPress,
    addToReadingListMutation,
    removeFromReadingListMutation,
    toggleWordMutation,
    toggleRootMutation,
  };
};

export default useArticleMutations;
