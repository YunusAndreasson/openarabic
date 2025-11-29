import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_SESSION_COOLDOWN_HOURS, MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
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
import type { StudyWord } from '@/types/vocabulary.types';
import { normalizeTimestamp } from '@/utils/dateTimeUtils';
import { handleError } from '@/utils/errorHandling';
import { errorFeedback } from '@/utils/haptics';

type StudyWordContext = {
  previousStudyWords: StudyWord[];
};

interface StudyWordMutationsResult {
  handleWordPress: (wordId: RootId) => void;
  handleRootPress: (rootId: RootId) => Promise<boolean | undefined>;
  toggleWordMutation: UseMutationResult<
    boolean,
    Error,
    { userId: string; wordId?: RootId; rootId?: number },
    StudyWordContext
  >;
  toggleRootMutation: UseMutationResult<
    boolean,
    Error,
    { userId: string; wordId?: RootId; rootId?: number },
    StudyWordContext
  >;
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
  const { dailyWordLimit, canAddWord, incrementDailyWordCount } = useDailyWordLimit();

  // Lightweight capacity guard: prevent adding when capacity is low (red phase)
  // Only applies when user has more than 100 words to avoid being annoying for new users
  const isCapacityLow = useCallback(
    (userId: string | undefined): boolean => {
      if (!userId) return false;
      const all = queryClient.getQueryData<unknown>(
        fsrsQueries.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS).queryKey,
      );
      if (Array.isArray(all)) {
        const words = all as {
          fsrs_due: string | null;
          fsrs_last_review: string;
          fsrs_stability?: number | null;
          fsrs_difficulty?: number | null;
          fsrs_reps?: number | null;
        }[];

        // Don't apply capacity restrictions for users with 100 or fewer words
        if (words.length <= 100) return false;

        if (words.length === 0) return false;
        const valid = words.filter(w => w.fsrs_stability != null && w.fsrs_difficulty != null);
        let capacityScore: number;
        if (valid.length >= Math.max(1, Math.floor(words.length * 0.5))) {
          const avgStability =
            valid.reduce((s, w) => s + (w.fsrs_stability ?? 0), 0) / valid.length;
          const avgDifficulty =
            valid.reduce((s, w) => s + (w.fsrs_difficulty ?? 5), 0) / valid.length;
          const avgReps = valid.reduce((s, w) => s + (w.fsrs_reps ?? 0), 0) / valid.length;
          const stabilityFactor = Math.min(avgStability / 30, 1) * 45;
          const repsFactor = Math.min(avgReps / 10, 1) * 30;
          const difficultyFactor = Math.max(0, (10 - avgDifficulty) / 10) * 25;
          capacityScore = Math.max(
            15,
            Math.min(100, Math.round(stabilityFactor + repsFactor + difficultyFactor)),
          );
        } else {
          // Fallback heuristic based on due words ratio with cooldown
          const nowMs = Date.now();
          const cutoffMs = nowMs - DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;
          const dueCount = words.reduce((count, w) => {
            const dueStr = normalizeTimestamp(w.fsrs_due);
            const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;
            const isDue = Number.isFinite(dueMs) && dueMs <= nowMs;
            const lastStr = normalizeTimestamp(w.fsrs_last_review);
            const lastMs = lastStr ? Date.parse(lastStr) : 0;
            const recentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
            return count + (isDue && !recentlyReviewed ? 1 : 0);
          }, 0);
          const ratio = dueCount / Math.max(1, words.length);
          capacityScore = ratio > 0.25 ? 30 : ratio > 0.1 ? 50 : 75;
        }
        return capacityScore < MEMORY_CAPACITY_THRESHOLDS.POOR;
      }
      return false;
    },
    [queryClient],
  );

  // Shared mutation options factory for toggling study words/roots
  // DRY: Consolidates duplicate logic between toggleWord and toggleRoot
  const createToggleStudyOptions = useCallback(
    () => ({
      mutationFn: async ({
        userId,
        wordId,
        rootId,
      }: {
        userId: string;
        wordId?: RootId;
        rootId?: number;
      }) => {
        const id = (wordId ?? rootId) as number;
        return studyWordsFSRSService.toggleFSRSStudyRoot(userId, id);
      },
      onMutate: async ({
        userId,
        wordId,
        rootId,
      }: {
        userId: string;
        wordId?: RootId;
        rootId?: number;
      }): Promise<StudyWordContext> => {
        // CRITICAL: Use fsrsQueries.all() to match what UI components read
        // This ensures optimistic updates are immediately visible in both underlines and buttons
        await queryClient.cancelQueries({
          queryKey: fsrsQueries.all(userId).queryKey,
        });
        const previousStudyWords =
          (queryClient.getQueryData(fsrsQueries.all(userId).queryKey) as StudyWord[]) || [];

        const id = (wordId ?? rootId) as number;
        queryClient.setQueryData<StudyWord[]>(fsrsQueries.all(userId).queryKey, (old = []) => {
          const exists = old.some(sw => sw.root_id === id);
          if (exists) {
            return old.filter(sw => sw.root_id !== id);
          }
          // For optimistic add, create a minimal StudyWord-like object
          // The actual full object will be fetched on success
          return [...old, { root_id: id } as StudyWord];
        });

        return { previousStudyWords };
      },
      onError: (error: Error, { userId }: { userId: string }, context?: StudyWordContext) => {
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
        _: boolean,
        { userId, wordId, rootId }: { userId: string; wordId?: RootId; rootId?: number },
        context?: StudyWordContext,
      ) => {
        // Track word added/removed (fire and forget - don't block UI)
        const id = (wordId ?? rootId) as number;
        const wasInStudyList = context?.previousStudyWords?.some(sw => sw.root_id === id) ?? false;

        if (wasInStudyList) {
          analytics.track(ANALYTICS_EVENTS.WORD_REMOVED_FROM_STUDY, {
            root_id: id,
          });
        } else {
          analytics.track(ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY, {
            root_id: id,
            source: 'article',
          });
        }

        // Invalidate queries in background (don't await - optimistic update already applied)
        fsrsQueries.invalidateCommon(queryClient, userId, DEFAULT_SESSION_COOLDOWN_HOURS);
        if (audioPreference) {
          audioQueries.invalidateAll(queryClient, userId);
        }

        // Call refetch callback if provided (also don't await)
        refetchStudyWords?.();
      },
    }),
    [queryClient, refetchStudyWords, showToast, audioPreference],
  );

  // Memoize shared toggle options (used by both word and root mutations)
  const toggleStudyOptions = useMemo(() => createToggleStudyOptions(), [createToggleStudyOptions]);

  // Initialize mutations with memoized options
  const toggleWordMutation = useMutation<
    boolean,
    Error,
    { userId: string; wordId?: RootId; rootId?: number },
    StudyWordContext
  >(toggleStudyOptions);
  const toggleRootMutation = useMutation<
    boolean,
    Error,
    { userId: string; wordId?: RootId; rootId?: number },
    StudyWordContext
  >(toggleStudyOptions);

  // Handle word press with validation
  const handleWordPress = useCallback(
    async (wordId: RootId) => {
      try {
        // Check daily word limit first
        const canAdd = await canAddWord();
        if (!canAdd) {
          showToast(DailyWordLimitStatus.REACHED, 6000, ToastType.IMPORTANT);
          return;
        }

        // Use centralized auth check (handles getSession automatically)
        let userId: string;
        try {
          const { user } = await checkAuthentication();
          userId = user.id;
        } catch {
          showToast(STRINGS.PLEASE_SIGN_IN_TO_ADD_WORDS, undefined, ToastType.INFO);
          router.replace(ROUTE_PATHS.AUTH);
          return;
        }

        // Capacity guard
        if (isCapacityLow(userId)) {
          showToast(STRINGS.COMPLETE_DUE_FIRST, 3000, ToastType.INFO);
          return;
        }

        // Increment daily word count and proceed
        const incrementSuccess = await incrementDailyWordCount();
        if (!incrementSuccess) {
          showToast(DailyWordLimitStatus.REACHED, 6000, ToastType.IMPORTANT);
          return;
        }

        // Use the authenticated user ID
        toggleWordMutation.mutate({ userId, wordId });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [toggleWordMutation, showToast, canAddWord, incrementDailyWordCount, isCapacityLow],
  );

  // Handle root press with validation
  const handleRootPress = useCallback(
    async (rootId: RootId): Promise<boolean | undefined> => {
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

        // Only check daily limit for add operations (when word doesn't exist)
        if (!wordExists) {
          const canAdd = await canAddWord();
          if (!canAdd) {
            const limitMessage =
              dailyWordLimit === 0
                ? DailyWordLimitStatus.REACHED
                : `Daily limit of ${dailyWordLimit} words reached. You can increase it in Account settings.`;
            showToast(limitMessage, 6000, ToastType.IMPORTANT);
            errorFeedback(); // Use error haptic for daily limit reached
            return undefined;
          }
        }

        // Capacity guard
        if (isCapacityLow(currentUserId)) {
          showToast(STRINGS.COMPLETE_DUE_FIRST, 3000, ToastType.INFO);
          return undefined;
        }

        // Increment daily word count only for add operations
        if (!wordExists) {
          const incrementSuccess = await incrementDailyWordCount();
          if (!incrementSuccess) {
            const limitMessage =
              dailyWordLimit === 0
                ? DailyWordLimitStatus.REACHED
                : `Daily limit of ${dailyWordLimit} words reached. You can increase it in Account settings.`;
            showToast(limitMessage, 6000, ToastType.IMPORTANT);
            errorFeedback(); // Use error haptic for daily limit reached
            return undefined;
          }
        }

        // Always use the user ID from the session directly
        const result = await toggleRootMutation.mutateAsync({
          userId: currentUserId,
          rootId: rootId as number,
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
      dailyWordLimit,
      queryClient,
      isCapacityLow,
    ],
  );

  return {
    handleWordPress,
    handleRootPress,
    toggleWordMutation,
    toggleRootMutation,
  };
};
