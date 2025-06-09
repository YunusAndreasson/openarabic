import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams, router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo, useEffect, useState } from 'react';

import ErrorState from '@/components/ErrorState';
import type { SortOption, SortDirection } from '@/components/SortingControls';
import FilteredArticleView from '@/components/home/FilteredArticleView';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

export type FilterSortOption = 'title' | 'author';

// Define sort options for filtered articles - same as listen screen
const createFilterSortOptions = (): SortOption<FilterSortOption>[] => [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
];

export default function FilterScreen(): JSX.Element {
  const params = useGlobalSearchParams();
  const type = params.type as string;
  const id = params.id as string;
  const numericId = parseInt(id, 10);

  const { prefetchArticle } = useAppPreloader();

  // Sorting state - same defaults as listen screen
  const [currentSort, setCurrentSort] = useState<FilterSortOption>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const {
    data: articles = [],
    error,
    refetch,
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
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Sort articles based on current sort and direction - same as listen screen
  const sortedArticles = useMemo(() => {
    if (!articles.length) return [];

    const sortedList = [...articles];

    if (currentSort === 'title') {
      sortedList.sort((a, b) => {
        const result = a.title.localeCompare(b.title);
        return sortDirection === 'desc' ? -result : result;
      });
    } else if (currentSort === 'author') {
      sortedList.sort((a, b) => {
        const authorA = a.author?.name || '';
        const authorB = b.author?.name || '';
        const result = authorA.localeCompare(authorB);
        return sortDirection === 'desc' ? -result : result;
      });
    }

    return sortedList;
  }, [articles, currentSort, sortDirection]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      prefetchArticle(article.id);
      router.push(
        `/(tabs)/read/article/${article.id}?headerTitle=${encodeURIComponent(article.title)}`
      );
    },
    [prefetchArticle]
  );

  // Handle sorting
  const handleSortChange = useCallback((sort: string, direction: SortDirection) => {
    setCurrentSort(sort as FilterSortOption);
    setSortDirection(direction);
  }, []);

  // Memoized sort options
  const sortOptions = useMemo(() => createFilterSortOptions(), []);

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

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load articles'}
        onRetry={refetch}
      />
    );
  }

  return (
    <FilteredArticleView
      articles={sortedArticles}
      onArticlePress={handleArticlePress}
      // Pass sorting props to FilteredArticleView
      sortOptions={sortOptions}
      currentSort={currentSort}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
    />
  );
}
