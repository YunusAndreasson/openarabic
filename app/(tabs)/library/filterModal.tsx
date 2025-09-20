import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';

import ErrorState from '@common/ErrorState';

import FilterModal from '@/components/library/FilterModal';
import { STRINGS } from '@/constants/strings';
import { authorsService } from '@/services/authors';

export default function FilterModalScreen(): JSX.Element {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const numericCategoryId = parseInt(categoryId ?? '', 10);

  // Get authors for this category directly
  const {
    data: availableAuthors = [],
    error,
    refetch,
  } = useQuery({
    queryKey: ['category-authors', numericCategoryId],
    queryFn: () => authorsService.getAuthorsByCategory(numericCategoryId),
    // Ensure deduplication even for cached data
    select: authors => {
      const map = new Map<number, (typeof authors)[number]>();
      for (const a of authors ?? []) map.set(a.id, a);
      return Array.from(map.values());
    },
    enabled: numericCategoryId > 0,
    staleTime: 86400000,
    gcTime: 172800000,
  });

  // Only show error if there's a real query error
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_FILTER_OPTIONS}
        onRetry={refetch}
      />
    );
  }

  // Always show FilterModal (even while loading)
  return <FilterModal availableAuthors={availableAuthors} />;
}
