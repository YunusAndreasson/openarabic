import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { readingProgressService } from '@/services/readingProgress';

interface ContinueReadingData {
  type: 'reading_progress' | 'reading_list' | 'featured';
  article: any;
  progress?: any;
}

export function useLastReadArticle() {
  const { user } = useAuth();

  // Fetch reading progress data (highest priority)
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

  // Fetch reading list/bookmarks (second priority) - fetch for authenticated users
  const { data: readingList, isLoading: isLoadingReadingList } = useQuery({
    queryKey: ['reading-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return readingListService.getReadingList(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  // Fetch featured articles (third priority) - using existing articles query from cache
  const { data: articlesData } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 10 * 60 * 1000, // 10 minutes for articles
    refetchOnMount: false,
  });

  // Fetch article data for reading progress
  const { data: lastReadArticle, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', lastReadProgress?.article_id],
    queryFn: async () => {
      if (!lastReadProgress?.article_id) return null;
      return articlesService.getArticleById(lastReadProgress.article_id);
    },
    enabled: !!lastReadProgress?.article_id,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  // Determine what to show for "Continue Reading" - prioritize user's saved articles
  const continueReadingData = useMemo((): ContinueReadingData | null => {
    try {
      // Priority 1: Article with reading progress (highest priority)
      if (lastReadProgress && lastReadArticle) {
        return {
          type: 'reading_progress',
          article: lastReadArticle,
          progress: lastReadProgress,
        };
      }

      // Priority 2: Most recently bookmarked article (user's explicit choice)
      if (readingList && readingList.length > 0) {
        // Get the most recent article from reading list
        const recentArticle = readingList[0];
        if (recentArticle?.articles) {
          return {
            type: 'reading_list',
            article: recentArticle.articles,
          };
        }
      }

      // Priority 3: Featured/recommended article (fallback only)
      if (articlesData && articlesData.length > 0) {
        // Get the first available article as a featured recommendation
        const featuredArticle = articlesData[0];
        return {
          type: 'featured',
          article: featuredArticle,
        };
      }

      return null;
    } catch {
      // Gracefully handle errors in continue reading computation
      return null;
    }
  }, [lastReadProgress, lastReadArticle, readingList, articlesData]);

  // Show button if we have any type of article to continue with
  const showButton = !!continueReadingData;
  const hasLastReadArticle = !!lastReadArticle && !!lastReadProgress;

  return {
    // Original properties for backward compatibility
    lastReadArticle: continueReadingData?.article || null,
    lastReadProgress: continueReadingData?.progress || null,

    // Enhanced properties
    continueReadingData,
    articleType: continueReadingData?.type || null,

    isLoading: isLoadingProgress || isLoadingArticle || isLoadingReadingList,
    hasLastReadArticle,
    showButton,
  };
}
