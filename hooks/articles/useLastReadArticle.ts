import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { readingProgressService } from '@/services/readingProgress';

export function useLastReadArticle() {
  const { user } = useAuth();

  // Fetch reading progress data
  const { data: lastReadProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['last-read-article', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return readingProgressService.getLastReadArticle(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
  });

  // Fetch article data in parallel (not waiting for progress to complete)
  const { data: lastReadArticle, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', lastReadProgress?.article_id],
    queryFn: async () => {
      if (!lastReadProgress?.article_id) return null;
      return articlesService.getArticleById(lastReadProgress.article_id);
    },
    enabled: !!lastReadProgress?.article_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
  });

  // Show button as soon as we have progress data, even if article is still loading
  // This provides immediate visual feedback while article data loads in background
  const showButton = !!lastReadProgress;
  const hasLastReadArticle = !!lastReadArticle && !!lastReadProgress;

  return {
    lastReadArticle,
    lastReadProgress,
    isLoading: isLoadingProgress || isLoadingArticle,
    hasLastReadArticle,
    // New property for immediate button visibility
    showButton,
  };
}
