import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useEffect } from 'react';
import { InteractionManager } from 'react-native';

import ErrorState from '@/components/ErrorState';
import FilteredArticleView from '@/components/home/FilteredArticleView';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

export default function FilterScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const type = params['type'] as string;
  const id = params['id'] as string;
  const numericId = parseInt(id ?? '', 10);

  const { prefetchArticle } = useAppPreloader();

  // Check if parameters are invalid
  const hasInvalidParams =
    !type || !id || type !== 'category' || isNaN(numericId) || numericId <= 0;

  // Handle navigation leak in useEffect to avoid setState during render
  useEffect(() => {
    if (hasInvalidParams && !type && id && !isNaN(numericId) && numericId > 0) {
      router.replace(`/(tabs)/read/article/${id}`);
    }
  }, [hasInvalidParams, type, id, numericId, router]);

  const cacheKey = useMemo(() => ['filtered-articles', type, numericId], [type, numericId]);

  const {
    data: articles = [],
    error,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!numericId || isNaN(numericId)) {
        throw new Error(`Invalid ID provided: ${id}`);
      }

      if (type === 'category') {
        return await articlesService.getArticles({ categoryId: numericId });
      } else {
        throw new Error(`Invalid filter type: "${type}"`);
      }
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
  }, [router]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(
        `/(tabs)/read/article/${article.id}?headerTitle=${encodeURIComponent(article.title)}`
      );
    },
    [prefetchArticle, router]
  );

  // Show error for invalid parameters first
  if (hasInvalidParams) {
    // If it looks like an article navigation leak, show loading while redirecting
    if (!type && id && !isNaN(numericId) && numericId > 0) {
      return <></>;
    }

    return (
      <ErrorState
        message={`Invalid filter parameters: type="${type}", id="${id}"`}
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
      totalCount={articles.length}
      loading={isLoading}
    />
  );
}
