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
      Toast.show({
        type: 'success',
        text1: 'Added to bookmarks',
        position: 'bottom',
      });
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add to bookmarks',
        position: 'bottom',
      });
    },
  });

  // Remove from reading list mutation
  const removeFromReadingListMutation = useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: number }) =>
      readingListService.removeFromReadingList(userId, articleId),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Removed from bookmarks',
        position: 'bottom',
      });
      refetchReadingListStatus();
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove from bookmarks',
        position: 'bottom',
      });
    },
  });

  // Toggle word study status mutation
  const toggleWordMutation = useMutation({
    mutationFn: async ({ userId, wordId }: { userId: string; wordId: number }) =>
      studyWordsFSRSService.toggleFSRSStudyWord(userId, wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
      queryClient.invalidateQueries({ queryKey: ['dueWords', userId] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update word status',
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
