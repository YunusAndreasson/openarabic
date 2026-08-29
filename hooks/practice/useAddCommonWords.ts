import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { OnboardingStep } from '@/constants/onboarding';
import { fsrsQueries } from '@/constants/queries';
import { STARTER_WORD_COUNT } from '@/constants/starterWords';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useDailyWordLimit } from '@/hooks/vocabulary';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';
import { markOnboardingStep } from '@/utils/onboardingStorage';

/**
 * Number of common words to add (matches the default daily word limit).
 * Sourced from the starter-deck constant so the count and the curated list
 * cannot drift apart.
 */
const COMMON_WORDS_COUNT = STARTER_WORD_COUNT;

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
  const { incrementDailyWordCount } = useDailyWordLimit();

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
    onSuccess: async ({ addedCount }) => {
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

      // This bulk path skips the daily-limit CHECK on purpose (see note above),
      // but must still reserve today's quota for what it actually added —
      // otherwise the per-word add path (article/dictionary) lets the user add
      // a full second daily allowance right on top of this quick-start.
      // incrementDailyWordCount stops (returns false, no-ops) once the
      // configured ceiling is reached, so this can only cap the count, never
      // over-reserve past it.
      for (let i = 0; i < addedCount; i += 1) {
        await incrementDailyWordCount();
      }

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
