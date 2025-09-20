import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmark';
import { readingProgressService } from '@/services/readingProgress';
import type { Article } from '@/types/articles.types';
import type { ReadingProgressRow } from '@/types/dbRow.types';

interface ContinueReadingData {
  type: 'reading_progress' | 'reading_list' | 'featured';
  article: Article;
  progress?: ReadingProgressRow;
}

interface UseLastReadArticleReturn {
  // Original properties for backward compatibility
  lastReadArticle: Article | null;
  lastReadProgress: ReadingProgressRow | null;

  // Enhanced properties
  continueReadingData: ContinueReadingData | null;
  articleType: ContinueReadingData['type'] | null;

  isLoading: boolean;
  hasLastReadArticle: boolean;
  showButton: boolean;
}

export function useLastReadArticle(): UseLastReadArticleReturn {
  const { user } = useAuth();

  // Fetch reading progress data (highest priority)
  const { data: lastReadProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['last-read-article', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return readingProgressService.getLastReadArticle(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute - shorter stale time for Continue Reading
    refetchOnMount: true, // Always refetch when library screen mounts
  });

  // Fetch reading list/bookmarks (second priority) - fetch for authenticated users
  const { data: readingList, isLoading: isLoadingReadingList } = useQuery({
    queryKey: ['reading-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return bookmarkService.getReadingList(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
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

  // Determine what to show for "Continue Reading" - prioritize actual reading progress
  const continueReadingData = useMemo((): ContinueReadingData | null => {
    try {
      // Priority 1: Article with reading progress (ONLY priority - this is what user was actually reading)
      if (lastReadProgress && lastReadArticle) {
        return {
          type: 'reading_progress',
          article: lastReadArticle,
          progress: lastReadProgress,
        };
      }

      // Priority 2: Most recently bookmarked article (fallback only if no reading progress)
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

      // No continue reading available
      return null;
    } catch {
      // Gracefully handle errors in continue reading computation
      return null;
    }
  }, [lastReadProgress, lastReadArticle, readingList]);

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
