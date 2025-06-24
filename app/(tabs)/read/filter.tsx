import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { InteractionManager } from 'react-native';

import ErrorState from '@/components/ErrorState';
import FilteredArticleView from '@/components/home/FilteredArticleView';
import GenericFeaturedSection from '@/components/home/GenericFeaturedSection';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

export default function FilterScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const type = params['type'] as string | undefined;
  const id = params['id'] as string | undefined;
  const numericId = Number(id);

  const { prefetchArticle } = useAppPreloader();

  // Check if parameters are invalid
  const hasInvalidParams = type !== 'category' || !id || Number.isNaN(numericId) || numericId <= 0;

  // Handle navigation leak in useEffect to avoid setState during render
  useEffect(() => {
    if (hasInvalidParams && !type && numericId > 0) {
      router.replace(getArticleRoute(numericId));
    }
  }, [hasInvalidParams, type, numericId]);

  const cacheKey = useMemo(() => ['filtered-articles', type, numericId], [type, numericId]);

  const {
    data: articles = [],
    error,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
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
  }, [router]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(getArticleRoute(article.id, article.title));
    },
    [prefetchArticle, router]
  );

  // Create header component with featured article
  const CategoryHeaderComponent = useMemo(() => {
    if (!articles.length) return null;

    return (
      <GenericFeaturedSection
        articlesData={articles}
        refreshKey={0}
        scope={`category-${numericId}`}
        onArticlePress={handleArticlePress}
      />
    );
  }, [articles, numericId, handleArticlePress]);

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
      totalCount={articles.length}
      loading={isLoading}
      HeaderComponent={CategoryHeaderComponent}
    />
  );
}
