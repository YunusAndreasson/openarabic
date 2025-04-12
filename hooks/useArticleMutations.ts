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
  addToReadingListMutation: UseMutationResult<void, Error, { userId: string; articleId: number }>;
  removeFromReadingListMutation: UseMutationResult<
    void,
    Error,
    { userId: string; articleId: number }
  >;
  toggleWordMutation: UseMutationResult<boolean, Error, { userId: string; wordId: number }>;
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

  // Handler for toggling reading list status
  const handleToggleReadingList = useCallback(
    (articleId: number | undefined, isInReadingList: boolean) => {
      // If no user ID, do nothing
      if (!userId || !articleId) return;

      if (isInReadingList) {
        removeFromReadingListMutation.mutate({ userId, articleId });
      } else {
        addToReadingListMutation.mutate({ userId, articleId });
      }
    },
    [userId, addToReadingListMutation, removeFromReadingListMutation]
  );

  // Handler for word press
  const handleWordPress = useCallback(
    async (wordId: number) => {
      // If userId is not available from context, try to get it from supabase auth
      let effectiveUserId = userId;

      if (!effectiveUserId) {
        try {
          const { data } = await supabase.auth.getSession();
          effectiveUserId = data.session?.user?.id;
        } catch (error) {
          handleError(error instanceof Error ? error : String(error));
        }
      }

      if (!effectiveUserId) {
        showToast('Please sign in to add study words');
        return;
      }

      toggleWordMutation.mutate({ userId: effectiveUserId, wordId });
    },
    [userId, toggleWordMutation, showToast]
  );

  return {
    handleToggleReadingList,
    handleWordPress,
    addToReadingListMutation,
    removeFromReadingListMutation,
    toggleWordMutation,
  };
};

export default useArticleMutations;
