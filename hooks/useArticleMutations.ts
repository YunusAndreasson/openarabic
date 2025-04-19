import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

// Services
import { useToast } from '@/components/ToastProvider';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

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
 * @param userId - The current user ID
 * @param refetchReadingListStatus - Function to refetch reading list status
 * @returns Object with mutation functions
 */
export const useArticleMutations = (
  userId: string | undefined,
  refetchReadingListStatus: () => void
): ArticleMutationsResult => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Add to reading list mutation
  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.addToReadingList(userId, articleId),
    onSuccess: () => {
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });

      // Show success toast
      showToast('Added to bookmarks');
    },
    onError: error => {
      // Check for the specific constraint error
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

      // Show success toast
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
    onSuccess: () => {
      // Invalidate queries to update UI
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['dueWords', userId],
      });

      // Also invalidate the queries used in bookmarks screen
      queryClient.invalidateQueries({
        queryKey: ['studyWordsCounts', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['enhancedAudioTracks', userId],
      });

      // Always refetch stats
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
      // Invalidate queries to update UI
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['dueWords', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['fsrs-words', userId],
      });

      // Also invalidate the queries used in bookmarks screen
      queryClient.invalidateQueries({
        queryKey: ['studyWordsCounts', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['enhancedAudioTracks', userId],
      });

      // Always refetch stats
      queryClient.invalidateQueries({
        queryKey: ['vocabularyStats'],
      });
    },
  });

  // Handle toggling reading list
  const handleToggleReadingList = useCallback(
    (articleId: number | undefined, isInReadingList: boolean) => {
      if (!userId || !articleId) return;

      if (isInReadingList) {
        removeFromReadingListMutation.mutate({ userId, articleId });
      } else {
        addToReadingListMutation.mutate({ userId, articleId });
      }
    },
    [userId, addToReadingListMutation, removeFromReadingListMutation]
  );

  // Handle word press
  const handleWordPress = useCallback(
    (wordId: number) => {
      if (!userId) {
        showToast('Sign in to add words to your study list');
        return;
      }

      toggleWordMutation.mutate({ userId, wordId });
    },
    [userId, toggleWordMutation, showToast]
  );

  // Handle root press
  const handleRootPress = useCallback(
    (rootId: number) => {
      console.log('handleRootPress called with rootId:', rootId);
      console.log('Current userId:', userId);

      // Check if user is authenticated via supabase directly
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Current session:', session ? 'Active' : 'No session');
        console.log('Session user ID:', session?.user?.id);

        if (session?.user && (!userId || userId !== session.user.id)) {
          console.log('Session exists but userId state is not in sync');
        }
      });

      if (!userId) {
        console.log('Authentication error: User not signed in');
        showToast('Sign in to add roots to your study list');
        return;
      }

      toggleRootMutation.mutate(
        { userId, rootId },
        {
          onError: error => {
            // Log detailed error
            console.error(
              'Root toggle error:',
              error instanceof Error ? error.message : String(error)
            );
            if (error instanceof Error && error.message.includes('User must be authenticated')) {
              console.log('Authentication error: User ID exists but session is invalid');
              showToast('Your session has expired. Please sign in again.');
            }
          },
        }
      );
    },
    [userId, toggleRootMutation, showToast]
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
