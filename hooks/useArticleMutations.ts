import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

// Services
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { readingListService } from '@/services/readingList';

/**
 * Hook for article-related mutations
 * @param userId - The current user ID
 * @param refetchReadingListStatus - Function to refetch reading list status
 * @returns Object with mutation functions
 */
export const useArticleMutations = (
  userId: string | undefined,
  refetchReadingListStatus: () => void
) => {
  const queryClient = useQueryClient();

  // Add to reading list mutation
  const addToReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.addToReadingList(userId, articleId),
    onSuccess: () => {
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      // Error handled silently
    },
  });

  // Remove from reading list mutation
  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.removeFromReadingList(userId, articleId),
    onSuccess: () => {
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      // Error handled silently
    },
  });

  // Toggle word study status mutation
  const toggleWordMutation = useMutation({
    mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) => {
      try {
        const result = await studyWordsFSRSService.toggleFSRSStudyWord(userId, wordId);
        return result;
      } catch (error) {
        throw error;
      }
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
      Toast.show({
        type: 'success',
        text1: result ? 'Word added to study list' : 'Word removed from study list',
        position: 'bottom',
        visibilityTime: 2000,
      });
    },
    onError: error => {
      // Show error toast to user
      Toast.show({
        type: 'error',
        text1: 'Error updating study list',
        text2: 'Please try again later',
        position: 'bottom',
        visibilityTime: 3000,
      });

      // Refresh study words data anyway to ensure UI is consistent
      queryClient.invalidateQueries({
        queryKey: ['studyWords', userId],
      });
    },
  });

  // Handler for toggling reading list status
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
