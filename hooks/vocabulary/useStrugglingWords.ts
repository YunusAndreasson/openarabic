import { useQuery } from '@tanstack/react-query';

import { strugglingWordsService } from '@/services/strugglingWords';
import type { StudyWord } from '@/types/vocabulary.types';

// Query key prefix for struggling words data
export const STRUGGLING_WORDS_QUERY_KEY = 'struggling-words';

interface UseStrugglingWordsOptions {
  userId: string | undefined;
  limit?: number;
  enabled?: boolean;
}

interface UseStrugglingWordsResult {
  words: StudyWord[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the user's most difficult words based on FSRS data
 */
export function useStrugglingWords({
  userId,
  limit = 10,
  enabled = true,
}: UseStrugglingWordsOptions): UseStrugglingWordsResult {
  const queryEnabled = Boolean(enabled && userId);

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: [STRUGGLING_WORDS_QUERY_KEY, userId, limit],
    queryFn: () => strugglingWordsService.getStrugglingWords(userId as string, limit),
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Wrap refetch to avoid type errors with the Promise return
  const refetch = async (): Promise<void> => {
    if (queryEnabled) {
      await refetchQuery();
    }
  };

  return {
    words: data,
    isLoading: isLoading && queryEnabled,
    isError,
    error,
    refetch,
  };
}
