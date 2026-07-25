import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { audioQueries, fsrsQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useDailyWordLimit } from '@/hooks/vocabulary';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { checkAuthentication } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { RootId } from '@/types/branded.types';
import { DailyWordLimitStatus, ToastType } from '@/types/enums';
import type { StudyWord, StudyWordIntent } from '@/types/vocabulary.types';
import { OnboardingStep } from '@/constants/onboarding';
import { handleError } from '@/utils/errorHandling';
import { errorFeedback } from '@/utils/haptics';
import { evaluateDueBacklogGate } from '@/utils/newWordPacing';
import { markOnboardingStep } from '@/utils/onboardingStorage';

interface StudyWordContext {
  previousStudyWords: StudyWord[];
}

interface ToggleStudyVariables {
  userId: string;
  rootId: RootId;
  /** Explicit direction from the UI the user acted on; omitted = legacy toggle */
  intent?: StudyWordIntent;
}

interface StudyWordMutationsResult {
  handleRootPress: (rootId: RootId, intent?: StudyWordIntent) => Promise<boolean | undefined>;
  toggleRootMutation: UseMutationResult<boolean, Error, ToggleStudyVariables, StudyWordContext>;
}

/**
 * Hook for study word mutations
 * Handles adding and removing words from user's study list with validation
 *
 * @param refetchStudyWords - Function to refetch study words (returns a Promise)
 * @returns Object with study word mutation functions
 */
export const useStudyWordMutations = (
  refetchStudyWords?: () => Promise<void>,
): StudyWordMutationsResult => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);
  const { dailyWordLimit, canAddWord, incrementDailyWordCount, getEffectiveLimitInfo } =
    useDailyWordLimit();

  // Pick the right "can't add" message: a recall-driven pause reads differently
  // from simply hitting the configured daily ceiling.
  const getLimitReachedMessage = useCallback(async (): Promise<string> => {
    const { status } = await getEffectiveLimitInfo();
    if (status === 'paused') {
      return DailyWordLimitStatus.PAUSED_LOW_RECALL;
    }
    return dailyWordLimit === 0
      ? DailyWordLimitStatus.REACHED
      : `Daily limit of ${dailyWordLimit} words reached. You can increase it in Account settings.`;
  }, [getEffectiveLimitInfo, dailyWordLimit]);

  // Due-backlog gate: block NEW saves while the review backlog is high. The
  // due key encodes cooldown/limit variants, so read every cached variant and
  // take the largest count; fails open when none is cached. Returns the
  // blocking count, or null when adding is fine.
  const getDueBacklogBlock = useCallback(
    (userId: string | undefined): number | null => {
      if (!userId) return null;
      const dueEntries = queryClient.getQueriesData<StudyWord[]>({
        queryKey: fsrsQueries.duePrefix(userId),
      });
      const dueCount = dueEntries.reduce(
        (max, [, words]) => (Array.isArray(words) ? Math.max(max, words.length) : max),
        0,
      );
      const gate = evaluateDueBacklogGate(dueCount);
      return gate.blocked ? gate.dueCount : null;
    },
    [queryClient],
  );

  const toggleStudyOptions = {
    mutationFn: async ({ userId, rootId, intent }: ToggleStudyVariables) => {
      return studyWordsFSRSService.toggleFSRSStudyRoot(userId, rootId, intent);
    },
    onMutate: async ({
      userId,
      rootId,
      intent,
    }: ToggleStudyVariables): Promise<StudyWordContext> => {
      // CRITICAL: Use fsrsQueries.all() to match what UI components read
      // This ensures optimistic updates are immediately visible in both underlines and buttons
      await queryClient.cancelQueries({
        queryKey: fsrsQueries.all(userId).queryKey,
      });
      const previousStudyWords =
        (queryClient.getQueryData(fsrsQueries.all(userId).queryKey) as StudyWord[]) || [];

      queryClient.setQueryData<StudyWord[]>(fsrsQueries.all(userId).queryKey, (old = []) => {
        const exists = old.some(sw => sw.root_id === rootId);
        // With explicit intent the optimistic direction matches the server's;
        // legacy toggles fall back to inverting the cached state.
        const shouldRemove = intent ? intent === 'remove' : exists;
        if (shouldRemove) {
          return old.filter(sw => sw.root_id !== rootId);
        }
        if (exists) {
          return old; // Add intent on an already-cached word — no duplicate
        }
        // For optimistic add, create a minimal StudyWord-like object
        // The actual full object will be fetched on success
        return [...old, { root_id: rootId } as StudyWord];
      });

      return { previousStudyWords };
    },
    onError: (error: Error, { userId }: ToggleStudyVariables, context?: StudyWordContext) => {
      // Revert optimistic update on error
      if (context?.previousStudyWords) {
        queryClient.setQueryData(fsrsQueries.all(userId).queryKey, context.previousStudyWords);
      }
      handleError(error);
      showToast(STRINGS.ERROR_UPDATING_STUDY_LIST, undefined, ToastType.ERROR);
      // Invalidate to ensure we have fresh data
      queryClient.invalidateQueries({
        queryKey: fsrsQueries.all(userId).queryKey,
      });
    },
    onSuccess: (
      nowInStudyList: boolean,
      { userId, rootId }: ToggleStudyVariables,
      context?: StudyWordContext,
    ) => {
      // Track word added/removed (fire and forget - don't block UI)
      const wasInStudyList =
        context?.previousStudyWords?.some(sw => sw.root_id === rootId) ?? false;

      if (!nowInStudyList && wasInStudyList) {
        analytics.track(ANALYTICS_EVENTS.WORD_REMOVED_FROM_STUDY, {
          root_id: rootId,
        });
      } else if (nowInStudyList && !wasInStudyList) {
        analytics.track(ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY, {
          root_id: rootId,
          source: 'article',
        });
        // First-run checklist signal (idempotent, fire-and-forget)
        void markOnboardingStep(OnboardingStep.SAVE_WORD);
      }
      // No event when an intent-carrying call was a no-op (state unchanged)

      // Invalidate queries in background (don't await - optimistic update already applied)
      fsrsQueries.invalidateAll(queryClient, userId);
      if (audioPreference) {
        audioQueries.invalidateAll(queryClient, userId);
      }

      // Call refetch callback if provided (also don't await)
      refetchStudyWords?.();
    },
  };

  const toggleRootMutation = useMutation<boolean, Error, ToggleStudyVariables, StudyWordContext>(
    toggleStudyOptions,
  );

  // Handle root press with validation
  const handleRootPress = useCallback(
    async (rootId: RootId, intent?: StudyWordIntent): Promise<boolean | undefined> => {
      try {
        // Use centralized auth check (handles getSession automatically)
        let currentUserId: string;
        try {
          const { user } = await checkAuthentication();
          currentUserId = user.id;
        } catch {
          showToast(STRINGS.PLEASE_SIGN_IN_TO_ADD_ROOTS, undefined, ToastType.INFO);
          router.replace(ROUTE_PATHS.AUTH);
          return undefined;
        }

        // Check if word already exists (remove operation should be allowed even if limit reached)
        // CRITICAL: Use same query as UI components for DRY consistency
        const existingWords = queryClient.getQueryData<StudyWord[]>(
          fsrsQueries.all(currentUserId).queryKey,
        );

        const wordExists =
          existingWords?.some((word: StudyWord) => word.root_id === rootId) ?? false;
        // Explicit intent (from the button the user saw) wins over the cache guess
        const isAdd = intent ? intent === 'add' : !wordExists;

        // Only check daily limit for add operations
        if (isAdd) {
          const canAdd = await canAddWord();
          if (!canAdd) {
            showToast(await getLimitReachedMessage(), 6000, ToastType.IMPORTANT);
            errorFeedback(); // Use error haptic for daily limit reached
            return undefined;
          }
        }

        // Due-backlog gate applies to adds only — removing must always be possible
        if (isAdd) {
          const backlogCount = getDueBacklogBlock(currentUserId);
          if (backlogCount !== null) {
            showToast(
              STRINGS.BACKLOG_CLEAR_REVIEWS_TOAST.replace('{count}', String(backlogCount)),
              3000,
              ToastType.INFO,
            );
            return undefined;
          }
        }

        // Increment daily word count only for add operations
        if (isAdd) {
          const incrementSuccess = await incrementDailyWordCount();
          if (!incrementSuccess) {
            showToast(await getLimitReachedMessage(), 6000, ToastType.IMPORTANT);
            errorFeedback(); // Use error haptic for daily limit reached
            return undefined;
          }
        }

        // Always use the user ID from the session directly
        const result = await toggleRootMutation.mutateAsync({
          userId: currentUserId,
          rootId,
          intent,
        });
        return result;
      } catch (error) {
        handleError(error as Error);
        return undefined;
      }
    },
    [
      toggleRootMutation,
      showToast,
      canAddWord,
      incrementDailyWordCount,
      getLimitReachedMessage,
      queryClient,
      getDueBacklogBlock,
    ],
  );

  return {
    handleRootPress,
    toggleRootMutation,
  };
};
