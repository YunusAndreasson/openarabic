import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams, router } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

import ErrorState from '@/components/ErrorState';
import FilteredArticleView from '@/components/home/FilteredArticleView';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import type { Article } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

export default function FilterScreen(): JSX.Element {
  const params = useGlobalSearchParams();
  const type = params.type as string;
  const id = params.id as string;
  const numericId = parseInt(id, 10);

  const { prefetchArticle } = useAppPreloader();

  // Check if parameters are invalid
  const hasInvalidParams =
    !type || !id || type !== 'category' || isNaN(numericId) || numericId <= 0;

  // Handle navigation leak in useEffect to avoid setState during render
  useEffect(() => {
    if (hasInvalidParams && !type && id && !isNaN(numericId) && numericId > 0) {
      router.replace(`/(tabs)/read/article/${id}`);
    }
  }, [hasInvalidParams, type, id, numericId]);

  const cacheKey = useMemo(() => ['filtered-articles', type, numericId], [type, numericId]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: category } = useQuery({
    queryKey: ['category', numericId],
    queryFn: async () => {
      try {
        return await categoriesService.getCategory(numericId);
      } catch (err) {
        handleError(err instanceof Error ? err : String(err));
        return null;
      }
    },
    enabled: type === 'category' && !isNaN(numericId) && !hasInvalidParams,
  });

  const {
    data: articles = [],
    isLoading: _isArticlesLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!numericId || isNaN(numericId)) {
        throw new Error(`Invalid ID provided: ${id}`);
      }

      try {
        if (type === 'category') {
          return await articlesService.getArticles({ categoryId: numericId });
        } else {
          throw new Error(`Invalid filter type: "${type}"`);
        }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to fetch articles');
      }
    },
    enabled: !hasInvalidParams,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetch().finally(() => setIsRefreshing(false));
  }, [refetch]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      prefetchArticle(article.id);
      router.push(
        `/(tabs)/read/article/${article.id}?headerTitle=${encodeURIComponent(article.title)}`
      );
    },
    [prefetchArticle]
  );

  // Set the header title dynamically based on the filter type and data
  useEffect(() => {
    let title = 'Filter';
    if (type === 'category' && category?.name) {
      title = capitalizeFirstLetter(category.name);
    } else if (type === 'category') {
      title = 'Category';
    }
    router.setParams({ headerTitle: title });
  }, [type, category?.name]);

  // Show error for invalid parameters first
  if (hasInvalidParams) {
    // If it looks like an article navigation leak, show loading while redirecting
    if (!type && id && !isNaN(numericId) && numericId > 0) {
      return <></>;
    }

    return (
      <ErrorState
        message={`Invalid filter parameters: type="${type}", id="${id}"`}
        onRetry={() => router.back()}
      />
    );
  }

  if (error && !isRefreshing) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load articles'}
        onRetry={refetch}
      />
    );
  }

  return (
    <FilteredArticleView
      articles={articles}
      isRefreshing={isRefreshing}
      onArticlePress={handleArticlePress}
      onRefresh={handleRefresh} // Note: Pull-to-refresh is disabled in modal context to avoid conflict with pull-to-close
    />
  );
}
