import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { OnboardingStep } from '@/constants/onboarding';
import { fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';
import { markOnboardingStep } from '@/utils/onboardingStorage';

/** Number of common words to add (matches the default daily word limit) */
const COMMON_WORDS_COUNT = 10;

// NB: this bulk path skips the due-backlog gate on purpose — its only consumer
// is the practice empty state, shown when the user has no study words at all.

interface UseAddCommonWordsOptions {
  onSuccess?: () => void;
}

interface UseAddCommonWordsResult {
  addWords: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** False until the source list has loaded — disable the CTA meanwhile */
  hasWordsAvailable: boolean;
}

/**
 * One-tap quick start for the Practice empty state: adds a starter set of
 * common Arabic words to the user's study list. Idempotent — the service
 * pre-filters roots already in study.
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

      // Seeded words count for the first-run checklist — the goal is a working
      // practice loop, however the words got there
      void markOnboardingStep(OnboardingStep.SAVE_WORD);

      // Invalidate queries in background (UI updates when ready)
      fsrsQueries.invalidateAll(queryClient, user.id);

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
    hasWordsAvailable: rootIds.length > 0,
  };
}
