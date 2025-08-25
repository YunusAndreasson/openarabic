import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { readingProgressService } from '@/services/readingProgress';

export function useLastReadArticle() {
  const { user } = useAuth();

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

  return {
    lastReadArticle,
    lastReadProgress,
    isLoading: isLoadingProgress || isLoadingArticle,
    hasLastReadArticle: !!lastReadArticle && !!lastReadProgress,
  };
}
