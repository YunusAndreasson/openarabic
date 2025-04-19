import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';

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
  toggleWordMutation: UseMutationResult<boolean, Error, { userId: string; wordId: number }>;
  toggleRootMutation: UseMutationResult<boolean, Error, { userId: string; rootId: number }>;
}

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

  // Mutations setup - add to reading list
  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.addToReadingList(userId, articleId),
    onSuccess: () => {
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
      showToast('Added to bookmarks');
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('reading_list_position_unique') ||
        errorMessage.includes('duplicate key value')
      ) {
        showToast('Article already in bookmarks');
      } else {
        showToast('Failed to add to bookmarks');
      }
    },
  });

  // Remove from reading list mutation
  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.removeFromReadingList(userId, articleId),
    onSuccess: () => {
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
      showToast('Removed from bookmarks');
    },
    onError: () => {
      // Error handled silently
    },
  });

  // Toggle word study status mutation
  const toggleWordMutation = useMutation({
    mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) => {
      return studyWordsFSRSService.toggleFSRSStudyWord(userId, wordId);
    },
    onMutate: async ({ userId, wordId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['studyWords', userId] });

      // Snapshot the previous value
      const previousStudyWords = queryClient.getQueryData(['studyWords', userId]) as {
        sentence_word_id: number;
      }[];

      // Optimistically update the cache
      queryClient.setQueryData(
        ['studyWords', userId],
        (old: { sentence_word_id: number }[] = []) => {
          const exists = old.some(sw => sw.sentence_word_id === wordId);
          if (exists) {
            return old.filter(sw => sw.sentence_word_id !== wordId);
          } else {
            return [...old, { sentence_word_id: wordId }];
          }
        }
      );

      return { previousStudyWords };
    },
    onError: (error, { userId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['studyWords', userId], context?.previousStudyWords);

      handleError(error instanceof Error ? error : String(error));
      // Show error toast to user
      showToast('Error updating study list');

      // Refresh study words data anyway to ensure UI is consistent
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
      });
    },
    onSuccess: (_, { userId }) => {
      // Immediately invalidate and refetch study words
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
        refetchType: 'all',
      });

      // Call the refetchStudyWords function if provided
      if (refetchStudyWords) {
        setTimeout(() => {
          refetchStudyWords();
        }, 100); // Slight delay to ensure database has completed the operation
      }

      // Invalidate other related queries
      queryClient.invalidateQueries({
        queryKey: ['dueWords', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['studyWordsCounts', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['enhancedAudioTracks', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vocabularyStats'],
      });
    },
  });

  // Toggle root study status mutation
  const toggleRootMutation = useMutation({
    mutationFn: async ({ userId, rootId }: { userId: string; rootId: number }) => {
      return studyWordsFSRSService.toggleFSRSStudyRoot(userId, rootId);
    },
    onMutate: async ({ userId, rootId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['studyWords', userId] });

      // Snapshot the previous value
      const previousStudyWords = queryClient.getQueryData(['studyWords', userId]) as {
        root_id: number;
      }[];

      // Optimistically update the cache
      queryClient.setQueryData(['studyWords', userId], (old: { root_id: number }[] = []) => {
        const exists = old.some(sw => sw.root_id === rootId);
        if (exists) {
          return old.filter(sw => sw.root_id !== rootId);
        } else {
          return [...old, { root_id: rootId }];
        }
      });

      return { previousStudyWords };
    },
    onError: (error, { userId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['studyWords', userId], context?.previousStudyWords);

      handleError(error instanceof Error ? error : String(error));
      // Show error toast to user
      showToast('Error updating study list');

      // Refresh study words data anyway to ensure UI is consistent
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
      });
    },
    onSuccess: (_, { userId }) => {
      // Immediately invalidate and refetch study words
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
        refetchType: 'all',
      });

      // Call the refetchStudyWords function if provided
      if (refetchStudyWords) {
        setTimeout(() => {
          refetchStudyWords();
        }, 100); // Slight delay to ensure database has completed the operation
      }

      // Invalidate other related queries
      queryClient.invalidateQueries({
        queryKey: ['dueWords', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['fsrs-words', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['studyWordsCounts', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['enhancedAudioTracks', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vocabularyStats'],
      });
    },
  });

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
            showToast('Please sign in to manage your reading list');
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
        showToast('Failed to update reading list');
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
            showToast('Please sign in to add words to your study list');
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
        showToast('Error adding word to study list');
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
            showToast('Please sign in to add roots to your study list');
            router.replace('/auth');
            return;
          }

          // Use the refreshed session
          toggleRootMutation.mutate(
            { userId: refreshData.session.user.id, rootId },
            {
              onError: error => {
                console.error(
                  'Root toggle error:',
                  error instanceof Error ? error.message : String(error)
                );
                showToast('Error updating study list');
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
              showToast('Error updating study list');
            },
          }
        );
      } catch (error) {
        showToast('Error adding root to study list');
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
