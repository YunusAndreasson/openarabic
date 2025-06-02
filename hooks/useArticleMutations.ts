import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';

// Services
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

import { useToast } from '../components/ToastProvider';

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
 * @returns Object with mutation functions
 */
export const useArticleMutations = (
  _userId: string | undefined,
  refetchReadingListStatus: () => void,
  refetchStudyWords?: () => void
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
        showToast('Saved for listening', undefined, 'success');
      },
      onError: (error: Error) => {
        const errorMessage = error.message;
        if (
          errorMessage.includes('reading_list_position_unique') ||
          errorMessage.includes('duplicate key value')
        ) {
          showToast('Already saved for listening', undefined, 'info');
        } else {
          showToast('Failed to save for listening', undefined, 'error');
        }
      },
    }),
    [queryClient, refetchReadingListStatus, showToast]
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
        showToast('Removed from listening list', undefined, 'info');
      },
      onError: () => {
        showToast('Failed to remove from listening list', undefined, 'error');
      },
    }),
    [queryClient, refetchReadingListStatus, showToast]
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
        await queryClient.cancelQueries({ queryKey: ['studyWords', userId] });
        const previousStudyWords = queryClient.getQueryData(['studyWords', userId]) as {
          root_id: number;
        }[];

        queryClient.setQueryData(['studyWords', userId], (old: { root_id: number }[] = []) => {
          const exists = old.some(sw => sw.root_id === wordId);
          return exists ? old.filter(sw => sw.root_id !== wordId) : [...old, { root_id: wordId }];
        });

        return { previousStudyWords };
      },
      onError: (error: Error, { userId }: { userId: string }, context?: StudyWordContext) => {
        if (context?.previousStudyWords) {
          queryClient.setQueryData(['studyWords', userId], context.previousStudyWords);
        }
        handleError(error);
        showToast('Error updating study list', undefined, 'error');
        queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
      },
      onSuccess: (_: boolean, { userId }: { userId: string }) => {
        // Batch invalidate related queries
        const relatedQueries = [
          ['studyWords', userId],
          ['dueWords', userId],
          ['studyWordsCounts', userId],
          ['enhancedAudioTracks', userId],
          ['vocabularyStats'],
        ];

        relatedQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });

        if (refetchStudyWords) {
          setTimeout(refetchStudyWords, 100);
        }
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
        await queryClient.cancelQueries({ queryKey: ['studyWords', userId] });
        const previousStudyWords = queryClient.getQueryData(['studyWords', userId]) as {
          root_id: number;
        }[];

        queryClient.setQueryData(['studyWords', userId], (old: { root_id: number }[] = []) => {
          const exists = old.some(sw => sw.root_id === rootId);
          return exists ? old.filter(sw => sw.root_id !== rootId) : [...old, { root_id: rootId }];
        });

        return { previousStudyWords };
      },
      onError: (error: Error, { userId }: { userId: string }, context?: StudyWordContext) => {
        if (context?.previousStudyWords) {
          queryClient.setQueryData(['studyWords', userId], context.previousStudyWords);
        }
        handleError(error);
        showToast('Error updating study list', undefined, 'error');
        queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
      },
      onSuccess: (_: boolean, { userId }: { userId: string }) => {
        // Batch invalidate related queries
        const relatedQueries = [
          ['studyWords', userId],
          ['dueWords', userId],
          ['fsrs-words', userId],
          ['studyWordsCounts', userId],
          ['enhancedAudioTracks', userId],
          ['vocabularyStats'],
        ];

        relatedQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });

        if (refetchStudyWords) {
          setTimeout(refetchStudyWords, 100);
        }
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
            showToast('Please sign in to manage your reading list', undefined, 'info');
            router.replace('/auth');
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
    [addToReadingListMutation, removeFromReadingListMutation, showToast]
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
            showToast('Please sign in to add words to your study list', undefined, 'info');
            router.replace('/auth');
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
    [toggleWordMutation, showToast]
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
            showToast('Please sign in to add roots to your study list', undefined, 'info');
            router.replace('/auth');
            return;
          }

          // Use the refreshed session
          toggleRootMutation.mutate(
            { userId: refreshData.session.user.id, rootId },
            {
              onError: () => {
                showToast('Error updating study list', undefined, 'error');
              },
            }
          );
          return;
        }

        // Always use the user ID from the session directly
        toggleRootMutation.mutate(
          { userId: session.user.id, rootId },
          {
            onError: () => {
              showToast('Error updating study list', undefined, 'error');
            },
          }
        );
      } catch (error) {
        handleError(error as Error);
      }
    },
    [toggleRootMutation, showToast]
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
