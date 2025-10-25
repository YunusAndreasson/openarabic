import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useToast } from '@/components/providers/ToastProvider';
import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  FSRS_QUERY_KEYS,
  MEMORY_CAPACITY_THRESHOLDS,
} from '@/constants/fsrs';
import { AUDIO_QUERY_KEYS } from '@/constants/queryKeys';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useDailyWordLimit } from '@/hooks/vocabulary';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { RootId } from '@/types/branded.types';
import { DailyWordLimitStatus, ToastType } from '@/types/enums';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { errorFeedback } from '@/utils/haptics';

type StudyWordContext = {
  previousStudyWords: { root_id: number }[];
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

// Shared query keys used across mutation success handlers
const RELATED_QUERY_KEYS = (userId: string, audioPreference?: 'arabic' | 'bilingual') =>
  [
    FSRS_QUERY_KEYS.all(userId),
    FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
    FSRS_QUERY_KEYS.due(userId),
    audioPreference
      ? AUDIO_QUERY_KEYS.tracks(userId, audioPreference)
      : (['enhancedAudioTracks', userId] as const),
    FSRS_QUERY_KEYS.stats(userId),
  ] as const;

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
        FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
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
          const normalizeTs = (ts: string | null | undefined) =>
            ts ? ts.replace(' ', 'T') : undefined;
          const dueCount = words.reduce((count, w) => {
            const dueStr = normalizeTs(w.fsrs_due);
            const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;
            const isDue = Number.isFinite(dueMs) && dueMs <= nowMs;
            const lastStr = normalizeTs(w.fsrs_last_review);
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
        await queryClient.cancelQueries({
          queryKey: FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
        });
        const previousStudyWords = queryClient.getQueryData(
          FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
        ) as {
          root_id: number;
        }[];

        const id = (wordId ?? rootId) as number;
        queryClient.setQueryData(
          FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
          (old: { root_id: number }[] = []) => {
            const exists = old.some(sw => sw.root_id === id);
            return exists ? old.filter(sw => sw.root_id !== id) : [...old, { root_id: id }];
          },
        );

        return { previousStudyWords };
      },
      onError: (error: Error, { userId }: { userId: string }, context?: StudyWordContext) => {
        if (context?.previousStudyWords) {
          queryClient.setQueryData(
            FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
            context.previousStudyWords,
          );
        }
        handleError(error);
        showToast(STRINGS.ERROR_UPDATING_STUDY_LIST, undefined, ToastType.ERROR);
        queryClient.invalidateQueries({
          queryKey: FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS),
        });
      },
      onSuccess: async (_: boolean, { userId }: { userId: string }) => {
        // Batch invalidate related queries
        RELATED_QUERY_KEYS(userId, audioPreference).forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });

        await refetchStudyWords?.();
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
          showToast(DailyWordLimitStatus.REACHED, 3000, ToastType.IMPORTANT);
          return;
        }

        // Always get fresh session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          // Try to refresh the session first
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session) {
            showToast(STRINGS.PLEASE_SIGN_IN_TO_ADD_WORDS, undefined, ToastType.INFO);
            router.replace(ROUTE_PATHS.AUTH);
            return;
          }

          // Capacity guard
          if (isCapacityLow(refreshData.session.user.id)) {
            showToast(STRINGS.COMPLETE_DUE_FIRST, 3000, ToastType.INFO);
            return;
          }

          // Increment daily word count and proceed
          const incrementSuccess = await incrementDailyWordCount();
          if (!incrementSuccess) {
            showToast(DailyWordLimitStatus.REACHED, 3000, ToastType.IMPORTANT);
            return;
          }

          // Use the refreshed session
          toggleWordMutation.mutate({ userId: refreshData.session.user.id, wordId });
          return;
        }

        // Capacity guard
        if (isCapacityLow(session.user.id)) {
          showToast(STRINGS.COMPLETE_DUE_FIRST, 3000, ToastType.INFO);
          return;
        }

        // Increment daily word count and proceed
        const incrementSuccess = await incrementDailyWordCount();
        if (!incrementSuccess) {
          showToast(DailyWordLimitStatus.REACHED, 3000, ToastType.IMPORTANT);
          return;
        }

        // Always use the user ID from the session directly
        toggleWordMutation.mutate({ userId: session.user.id, wordId });
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
        // Always get fresh session from Supabase first
        const {
          data: { session },
        } = await supabase.auth.getSession();

        let currentUserId: string;

        if (!session?.user) {
          // Try to refresh the session first
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session) {
            showToast(STRINGS.PLEASE_SIGN_IN_TO_ADD_ROOTS, undefined, ToastType.INFO);
            router.replace(ROUTE_PATHS.AUTH);
            return undefined;
          }

          currentUserId = refreshData.session.user.id;
        } else {
          currentUserId = session.user.id;
        }

        // Check if word already exists (remove operation should be allowed even if limit reached)
        const existingWords = queryClient.getQueryData<StudyWord[]>(
          FSRS_QUERY_KEYS.allWithCooldown(currentUserId, DEFAULT_SESSION_COOLDOWN_HOURS),
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
                : `Daily limit of ${dailyWordLimit} words reached`;
            showToast(limitMessage, 4000, ToastType.IMPORTANT);
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
                : `Daily limit of ${dailyWordLimit} words reached`;
            showToast(limitMessage, 4000, ToastType.IMPORTANT);
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
