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
import { studyWordsFSRSService, type StudyWordMutationResult } from '@/services/studyWordsFSRS';
import { checkAuthentication } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { StudyWord, StudyWordIntent } from '@/types/vocabulary.types';
import { OnboardingStep } from '@/constants/onboarding';
import { handleError } from '@/utils/errorHandling';
import { errorFeedback } from '@/utils/haptics';
import { STUDY_WORD_TOGGLE_MUTATION_KEY } from '@/utils/mutationDefaults';
import { evaluateDueBacklogGate, filterDueWords } from '@/utils/newWordPacing';
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
  toggleRootMutation: UseMutationResult<
    StudyWordMutationResult,
    Error,
    ToggleStudyVariables,
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
  const {
    dailyWordLimit,
    canAddWord,
    incrementDailyWordCount,
    decrementDailyWordCount,
    decrementIfAddedToday,
    getEffectiveLimitInfo,
  } = useDailyWordLimit();

  // Pick the right "can't add" message: a recall-driven pause reads differently
  // from simply hitting the configured daily ceiling.
  const getLimitReachedMessage = useCallback(async (): Promise<string> => {
    const { status } = await getEffectiveLimitInfo();
    if (status === 'paused') {
      return STRINGS.DAILY_LIMIT_PAUSED_LOW_RECALL;
    }
    return dailyWordLimit === 0
      ? STRINGS.DAILY_LIMIT_REACHED
      : STRINGS.DAILY_LIMIT_REACHED_COUNT.replace('{count}', String(dailyWordLimit));
  }, [getEffectiveLimitInfo, dailyWordLimit]);

  // Due-backlog gate: block NEW saves while the review backlog is high. The
  // due key encodes cooldown/limit variants, so read every cached variant and
  // take the largest count.
  //
  // Early in a session the due-specific query can still be mid-flight — its
  // UI-facing count already shows via placeholderData (the tab badge, the
  // Practice screen), but that placeholder never lands in the query cache
  // itself, so reading the cache alone sees nothing and the gate used to fail
  // open — letting adds through while the badge was visibly showing a huge
  // backlog. Fall back to deriving the same estimate from the (earlier-
  // resolving) full word list with the identical filter the placeholder uses,
  // so the gate can't disagree with what the user is already looking at.
  const getDueBacklogBlock = useCallback(
    (userId: string | undefined): number | null => {
      if (!userId) return null;
      // Only trust FRESH due-variant cache entries. fsrsQueries.invalidateAll
      // (called after every add/remove and every completed review session)
      // marks every fsrs-words query stale, but only actively refetches
      // variants with a live observer — a variant nothing is currently
      // watching (e.g. a different cooldown/limit combo some other screen
      // fetched earlier this session) stays stale with its old, now-wrong
      // count until something re-observes it. Counting that entry here could
      // block new adds for minutes after the backlog was actually cleared —
      // a false block, the mirror image of the fail-open bug this gate was
      // built to close. Skipping stale entries falls straight through to
      // derivedDueCount below, which is always computed fresh from the
      // (near-universally observed) full word list.
      const dueEntries = queryClient
        .getQueryCache()
        .findAll({ queryKey: fsrsQueries.duePrefix(userId) });
      const cachedDueCount = dueEntries.reduce((max, query) => {
        if (query.isStale()) return max;
        const words = query.state.data as StudyWord[] | undefined;
        return Array.isArray(words) ? Math.max(max, words.length) : max;
      }, 0);

      const allWords = queryClient.getQueryData<StudyWord[]>(fsrsQueries.all(userId).queryKey);
      const derivedDueCount = allWords
        ? filterDueWords(allWords, {
            lastCompletedAt: queryClient.getQueryData<number>(
              fsrsQueries.lastCompletedAtKey(userId),
            ),
            nowMs: Date.now(),
          }).length
        : 0;

      const gate = evaluateDueBacklogGate(Math.max(cachedDueCount, derivedDueCount));
      return gate.blocked ? gate.dueCount : null;
    },
    [queryClient],
  );

  const toggleStudyOptions = {
    mutationKey: STUDY_WORD_TOGGLE_MUTATION_KEY,
    mutationFn: async ({ userId, rootId, intent }: ToggleStudyVariables) => {
      return studyWordsFSRSService.setFSRSStudyRoot(userId, rootId, intent);
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
      void handleError(error);
      showToast(STRINGS.ERROR_UPDATING_STUDY_LIST, undefined, ToastType.ERROR);
      // Invalidate to ensure we have fresh data
      void queryClient.invalidateQueries({
        queryKey: fsrsQueries.all(userId).queryKey,
      });
    },
    onSuccess: (
      result: StudyWordMutationResult,
      { userId, rootId }: ToggleStudyVariables,
      context?: StudyWordContext,
    ) => {
      // Track word added/removed (fire and forget - don't block UI)
      const wasInStudyList =
        context?.previousStudyWords?.some(sw => sw.root_id === rootId) ?? false;

      if (result.changed && !result.inStudyList && wasInStudyList) {
        void analytics.track(ANALYTICS_EVENTS.WORD_REMOVED_FROM_STUDY, {
          root_id: rootId,
        });
        // A same-day add-then-remove nets to zero words spent against today's
        // cap; removing a word added on an earlier day must not refund it.
        const removedWord = context?.previousStudyWords?.find(sw => sw.root_id === rootId);
        void decrementIfAddedToday(removedWord?.created_at);
      } else if (result.changed && result.inStudyList && !wasInStudyList) {
        void analytics.track(ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY, {
          root_id: rootId,
          source: 'article',
        });
        // First-run checklist signal (idempotent, fire-and-forget)
        void markOnboardingStep(OnboardingStep.SAVE_WORD);
      }
      // No event when an intent-carrying call was a no-op (state unchanged)

      // Invalidate queries in background (don't await - optimistic update already applied)
      void fsrsQueries.invalidateAll(queryClient, userId);
      if (audioPreference) {
        void audioQueries.invalidateAll(queryClient, userId);
      }

      // Call refetch callback if provided (also don't await)
      void refetchStudyWords?.();
    },
  };

  const toggleRootMutation = useMutation<
    StudyWordMutationResult,
    Error,
    ToggleStudyVariables,
    StudyWordContext
  >(toggleStudyOptions);

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
        try {
          const result = await toggleRootMutation.mutateAsync({
            userId: currentUserId,
            rootId,
            intent,
          });
          if (isAdd && !result.changed) await decrementDailyWordCount();
          return result.inStudyList;
        } catch {
          // Adding reserves the daily quota before the network write so two
          // rapid presses cannot both pass the ceiling. Release that slot when
          // the write fails; otherwise transient errors permanently consume
          // today's allowance.
          if (isAdd) await decrementDailyWordCount();
          // The mutation's own onError already reported this failure (toast +
          // Sentry + analytics + optimistic-cache revert) — stop here instead
          // of re-throwing into the outer catch below, which would report the
          // same single failure a second time (a duplicate toast on top of
          // the friendly one onError already showed, plus a duplicate Sentry
          // capture and analytics event).
          return undefined;
        }
      } catch (error) {
        // Reached only by an error that did NOT come from the mutation above
        // — everything from the mutation itself already returned before this
        // catch runs.
        void handleError(error);
        return undefined;
      }
    },
    [
      toggleRootMutation,
      showToast,
      canAddWord,
      incrementDailyWordCount,
      decrementDailyWordCount,
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
