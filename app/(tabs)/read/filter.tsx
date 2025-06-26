import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { InteractionManager } from 'react-native';

import ErrorState from '@/components/ErrorState';
import FilteredArticleView from '@/components/home/FilteredArticleView';
import HorizontalFeaturedSection from '@/components/home/HorizontalFeaturedSection';
import { useToast } from '@/components/providers/ToastProvider';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmarks';
import type { Article } from '@/types/articles.types';

export default function FilterScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const type = params['type'] as string | undefined;
  const id = params['id'] as string | undefined;
  const numericId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();

  const { prefetchArticle } = useAppPreloader();
  const { editMode } = useEditMode('bookmarks');

  // Check if parameters are invalid
  const hasInvalidParams =
    (type === 'category' && (!id || Number.isNaN(numericId) || numericId <= 0)) ||
    (type === 'bookmark' && !user?.id) ||
    !['category', 'bookmark'].includes(type || '');

  // Handle navigation leak in useEffect to avoid setState during render
  useEffect(() => {
    if (hasInvalidParams && !type && numericId > 0) {
      router.replace(getArticleRoute(numericId));
    }
  }, [hasInvalidParams, type, numericId]);

  const cacheKey = useMemo(() => {
    if (type === 'bookmark') {
      return ['bookmarked-articles', user?.id];
    }
    return ['filtered-articles', type, numericId];
  }, [type, numericId, user?.id]);

  const {
    data: articles = [],
    error,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (type === 'bookmark') {
        if (!user?.id) {
          throw new Error(STRINGS.FAILED_TO_LOAD_BOOKMARKS);
        }
        return await bookmarkService.getBookmarkedArticles(user.id);
      }

      if (Number.isNaN(numericId) || numericId <= 0) {
        throw new Error(STRINGS.INVALID_FILTER_ID.replace('{id}', String(id)));
      }

      if (type !== 'category') {
        throw new Error(STRINGS.INVALID_FILTER_TYPE.replace('{type}', String(type)));
      }

      return await articlesService.getArticles({ categoryId: numericId });
    },
    enabled: !hasInvalidParams,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Use the new filtering hook that handles Redux state
  const filteredAndSortedArticles = useFilteredArticles(articles);

  const handleRetry = useCallback(() => {
    router.back();
  }, []);

  const handleArticlePress = useCallback(
    (article: Article) => {
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(getArticleRoute(article.id, article.title));
    },
    [prefetchArticle]
  );

  // Handle bookmark deletion
  const handleArticleDelete = useCallback(
    async (articleId: number) => {
      if (type !== 'bookmark' || !user?.id) return;

      try {
        await bookmarkService.removeBookmark(user.id, articleId);
        showToast(STRINGS.REMOVED_FROM_BOOKMARKS, 2000, 'success');
        refetch(); // Refresh the list
      } catch (error) {
        // Error is already handled by the service
        console.error('Failed to remove bookmark:', error);
      }
    },
    [type, user?.id, refetch, showToast]
  );

  // Handle bookmark reordering
  const handleArticleReorder = useCallback(
    async (orderedArticleIds: number[]) => {
      if (type !== 'bookmark' || !user?.id) return;

      try {
        await bookmarkService.reorderBookmarks(user.id, orderedArticleIds);
        refetch(); // Refresh to show new order
      } catch (error) {
        // Error is already handled by the service
        console.error('Failed to reorder bookmarks:', error);
      }
    },
    [type, user?.id, refetch]
  );

  // Create header component with featured article
  const HeaderComponent = useMemo(() => {
    if (!articles.length || type === 'bookmark') return null;

    return (
      <HorizontalFeaturedSection
        articlesData={articles}
        refreshKey={0}
        scope={type === 'bookmark' ? 'bookmarks' : `category-${numericId}`}
        onArticlePress={handleArticlePress}
      />
    );
  }, [articles, type, numericId, handleArticlePress]);

  // Show error for invalid parameters first
  if (hasInvalidParams) {
    // If it looks like an article navigation leak, show loading while redirecting
    if (!type && numericId > 0) {
      return <></>;
    }

    return (
      <ErrorState
        message={STRINGS.INVALID_FILTER_PARAMETERS.replace('{type}', String(type)).replace(
          '{id}',
          String(id)
        )}
        onRetry={handleRetry}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={refetch}
      />
    );
  }

  return (
    <FilteredArticleView
      articles={filteredAndSortedArticles}
      onArticlePress={handleArticlePress}
      onArticleDelete={type === 'bookmark' ? handleArticleDelete : undefined}
      onArticleReorder={type === 'bookmark' ? handleArticleReorder : undefined}
      editMode={type === 'bookmark' ? editMode : false}
      totalCount={articles.length}
      loading={isLoading}
      HeaderComponent={HeaderComponent}
    />
  );
}
