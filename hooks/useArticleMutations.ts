import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

// Services
import { useToast } from '@/components/ToastProvider';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
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
    onSuccess: result => {
      // Invalidate queries to update UI
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
      });

      queryClient.invalidateQueries({
        queryKey: ['dueWords', userId],
      });

      // Always refetch stats
      queryClient.invalidateQueries({
        queryKey: ['vocabularyStats'],
      });

      // Show success toast
      showToast(result ? 'Word added to study list' : 'Word removed from study list');
    },
    onError: error => {
      handleError(error instanceof Error ? error : String(error));
      // Show error toast to user
      showToast('Error updating study list');

      // Refresh study words data anyway to ensure UI is consistent
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
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
    (wordId: number) => {
      if (!userId) return;
      toggleWordMutation.mutate({ userId, wordId });
    },
    [userId, toggleWordMutation]
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
