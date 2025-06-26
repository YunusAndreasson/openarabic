import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { bookmarkService } from '@/services/bookmarks';
import { selectionFeedback } from '@/utils/haptics';

/**
 * Hook for managing bookmark state and mutations
 */
export const useBookmarks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get bookmark count
  const {
    data: bookmarkCount = 0,
    isLoading: isLoadingCount,
    error: countError,
  } = useQuery({
    queryKey: ['bookmark-count', user?.id],
    queryFn: () => bookmarkService.getBookmarkCount(user?.id as string),
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  // Add bookmark mutation
  const addBookmarkMutation = useMutation({
    mutationFn: ({ articleId }: { articleId: number }) =>
      bookmarkService.addBookmark(user?.id as string, articleId),
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['bookmarked-articles', user?.id] });

      selectionFeedback();
    },
  });

  // Remove bookmark mutation
  const removeBookmarkMutation = useMutation({
    mutationFn: ({ articleId }: { articleId: number }) =>
      bookmarkService.removeBookmark(user?.id as string, articleId),
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['bookmarked-articles', user?.id] });

      selectionFeedback();
    },
  });

  // Check if article is bookmarked
  const useIsBookmarked = (articleId: number | undefined) => {
    return useQuery({
      queryKey: ['is-bookmarked', user?.id, articleId],
      queryFn: () => bookmarkService.isBookmarked(user?.id as string, articleId as number),
      enabled: !!user?.id && !!articleId,
      refetchOnWindowFocus: false,
    });
  };

  // Toggle bookmark with optimistic updates
  const toggleBookmark = useCallback(
    async (articleId: number, isCurrentlyBookmarked: boolean) => {
      if (!user?.id || !articleId) return;

      // Optimistic update
      const bookmarkQueryKey = ['is-bookmarked', user.id, articleId];
      queryClient.setQueryData(bookmarkQueryKey, !isCurrentlyBookmarked);

      try {
        if (isCurrentlyBookmarked) {
          await removeBookmarkMutation.mutateAsync({ articleId });
        } else {
          await addBookmarkMutation.mutateAsync({ articleId });
        }
      } catch (error) {
        // Revert optimistic update on error
        queryClient.setQueryData(bookmarkQueryKey, isCurrentlyBookmarked);
        throw error;
      }
    },
    [user?.id, queryClient, addBookmarkMutation, removeBookmarkMutation]
  );

  return {
    bookmarkCount,
    isLoadingCount,
    countError,
    addBookmark: addBookmarkMutation.mutateAsync,
    removeBookmark: removeBookmarkMutation.mutateAsync,
    toggleBookmark,
    useIsBookmarked,
    isAddingBookmark: addBookmarkMutation.isPending,
    isRemovingBookmark: removeBookmarkMutation.isPending,
  };
};
