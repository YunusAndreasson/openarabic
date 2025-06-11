import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, { useMemo } from 'react';

import ErrorState from '@/components/ErrorState';
import FilterModal from '@/components/FilterModal';
import { articlesService } from '@/services/articles';
import type { Author } from '@/types/articles.types';

export default function FilterModalScreen(): JSX.Element {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const numericCategoryId = parseInt(categoryId, 10);

  // Get articles for this category to extract available authors
  const {
    data: articles = [],
    error,
    refetch,
  } = useQuery({
    queryKey: ['filtered-articles', 'category', numericCategoryId],
    queryFn: () => articlesService.getArticles({ categoryId: numericCategoryId }),
    enabled: numericCategoryId > 0,
  });

  // Extract unique authors from articles
  const availableAuthors = useMemo(() => {
    const authorsMap = new Map<number, Author>();

    articles.forEach(article => {
      if (article.author?.id && article.author.name) {
        authorsMap.set(article.author.id, article.author);
      }
    });

    return Array.from(authorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [articles]);

  // Only show error if there's a real query error
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load filter options'}
        onRetry={refetch}
      />
    );
  }

  // Always show FilterModal (even while loading)
  return <FilterModal availableAuthors={availableAuthors} />;
}
