import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

/** Number of common words to add */
const COMMON_WORDS_COUNT = 10;

interface UseAddCommonWordsOptions {
  onSuccess?: () => void;
}

interface UseAddCommonWordsResult {
  addWords: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Hook to add common words to the user's practice list.
 * Automatically fetches and adds 10 essential Arabic words.
 */
export function useAddCommonWords(options?: UseAddCommonWordsOptions): UseAddCommonWordsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch common words
  const { data: commonWords = [] } = useQuery({
    queryKey: ['commonWordsForAdd'],
    queryFn: () => studyWordsFSRSService.getCommonRoots(COMMON_WORDS_COUNT),
    staleTime: Infinity,
  });

  // Get root IDs (cast from database number to branded RootId)
  const rootIds = useMemo(() => commonWords.map(w => w.id as RootId), [commonWords]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (rootIds.length === 0) {
        throw new Error('No common words available');
      }

      // Add common roots to study list
      const addedCount = await studyWordsFSRSService.addMultipleRoots(user.id, rootIds);

      return { addedCount };
    },
    onSuccess: ({ addedCount }) => {
      if (!user?.id) return;

      // Show toast with haptic immediately (don't wait for cache invalidation)
      successFeedback();
      showToast(STRINGS.WORDS_ADDED_SUCCESS, undefined, ToastType.SUCCESS);

      // Track analytics
      analytics.track(ANALYTICS_EVENTS.COMMON_WORDS_ADDED, {
        count: addedCount,
      });

      // Invalidate queries in background (UI updates when ready)
      fsrsQueries.invalidateCommon(queryClient, user.id, DEFAULT_SESSION_COOLDOWN_HOURS);

      // Call onSuccess callback
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      handleError(error);
      showToast(STRINGS.FAILED_TO_ADD_COMMON_WORDS, undefined, ToastType.ERROR);
    },
  });

  return {
    addWords: () => mutation.mutate(),
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
