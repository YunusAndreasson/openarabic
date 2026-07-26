import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import { useTutorialContext } from '@/components/providers';
import { useFSRSData } from '@/components/providers/FSRSDataProvider';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { ONBOARDING_CONFIG, OnboardingStep } from '@/constants/onboarding';
import { STRINGS } from '@/constants/strings';
import { TutorialId } from '@/constants/tutorials';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import type { Article } from '@/types/articles.types';
import {
  getCachedOnboardingState,
  initializeOnboarding,
  loadOnboardingState,
  markChecklistCompleted,
  subscribeOnboarding,
} from '@/utils/onboardingStorage';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ChecklistItem {
  step: OnboardingStep;
  label: string;
  done: boolean;
}

/**
 * Drives the "Get started" checklist on Explore and gates the welcome intro.
 *
 * Completion per item is `local flag || server signal` so progress survives
 * reinstalls: reading progress and study words are server-derived; listening
 * has no server record and is local-only.
 *
 * Eligibility is evaluated exactly once (when no `initializedAt` exists yet):
 * established users — account older than ESTABLISHED_ACCOUNT_AGE_DAYS, or with
 * both study words and reading history — are permanently suppressed and never
 * see the intro or the checklist. While queries are still loading or erroring,
 * nothing is written, so the decision is retried next launch and neither
 * surface shows to an unknown cohort.
 */
export function useOnboardingChecklist(articlesData: Article[]) {
  const { user } = useAuth();
  const { completeTutorial } = useTutorialContext();
  const { studyWords, isLoading: isFSRSLoading, error: fsrsError } = useFSRSData();

  const articleIds = useMemo(() => articlesData.map(a => a.id), [articlesData]);
  const { data: progressMap, isLoading: isProgressLoading } = useBulkReadingProgress(articleIds);

  const state = useSyncExternalStore(subscribeOnboarding, getCachedOnboardingState);

  // Kick the initial storage load (no-op once cached)
  useEffect(() => {
    void loadOnboardingState();
  }, []);

  // One-time eligibility evaluation
  const hasEvaluatedRef = useRef(false);
  useEffect(() => {
    if (hasEvaluatedRef.current) return;
    if (!state || state.initializedAt) return;
    if (!user?.id) return;
    // Wait for both signals to settle; on error skip this session (retried next launch)
    if (isFSRSLoading || isProgressLoading) return;
    if (fsrsError) return;
    // Progress signal only means something once the catalog has loaded
    if (articlesData.length === 0) return;

    hasEvaluatedRef.current = true;

    const hasWords = (studyWords?.length ?? 0) > 0;
    const hasReadingHistory = (progressMap?.size ?? 0) > 0;
    const accountAgeDays = user.created_at
      ? (Date.now() - new Date(user.created_at).getTime()) / MS_PER_DAY
      : null;
    const isOldAccount =
      accountAgeDays !== null && accountAgeDays > ONBOARDING_CONFIG.ESTABLISHED_ACCOUNT_AGE_DAYS;
    const isEstablished = isOldAccount || (hasWords && hasReadingHistory);

    if (isEstablished) {
      void initializeOnboarding({ dismissed: true });
      completeTutorial(TutorialId.WELCOME_INTRO);
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_CHECKLIST_SUPPRESSED, {
        reason: isOldAccount ? 'account_age' : 'server_activity',
      });
    } else {
      void initializeOnboarding({ dismissed: false });
    }
  }, [
    state,
    user?.id,
    user?.created_at,
    isFSRSLoading,
    isProgressLoading,
    fsrsError,
    articlesData.length,
    studyWords,
    progressMap,
    completeTutorial,
  ]);

  const items: ChecklistItem[] = useMemo(() => {
    const readDone = Boolean(state?.readFirstText) || (progressMap?.size ?? 0) > 0;
    const saveDone = Boolean(state?.saveFirstWord) || (studyWords?.length ?? 0) > 0;
    const listenDone = Boolean(state?.listenToAudio);
    return [
      { step: OnboardingStep.READ_TEXT, label: STRINGS.CHECKLIST_READ, done: readDone },
      { step: OnboardingStep.SAVE_WORD, label: STRINGS.CHECKLIST_SAVE, done: saveDone },
      { step: OnboardingStep.LISTEN_AUDIO, label: STRINGS.CHECKLIST_LISTEN, done: listenDone },
    ];
  }, [state, progressMap, studyWords]);

  const doneCount = items.filter(item => item.done).length;
  const allDone = doneCount === items.length;

  // The intro and checklist share the eligibility decision
  const isEligible = Boolean(state?.initializedAt && !state.dismissed);
  const isChecklistVisible = isEligible && !state?.completedAt;

  // Track shown once per session, and item completions while visible
  const hasTrackedShownRef = useRef(false);
  useEffect(() => {
    if (isChecklistVisible && !hasTrackedShownRef.current) {
      hasTrackedShownRef.current = true;
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_CHECKLIST_SHOWN, { done_count: doneCount });
    }
  }, [isChecklistVisible, doneCount]);

  const previousDoneRef = useRef<Record<OnboardingStep, boolean> | null>(null);
  useEffect(() => {
    if (!isChecklistVisible) return;
    const previous = previousDoneRef.current;
    for (const item of items) {
      if (previous && !previous[item.step] && item.done) {
        analytics.track(ANALYTICS_EVENTS.ONBOARDING_CHECKLIST_ITEM_COMPLETED, {
          item: item.step,
          source: state?.[item.step] ? 'local' : 'server',
        });
      }
    }
    previousDoneRef.current = Object.fromEntries(
      items.map(item => [item.step, item.done]),
    ) as Record<OnboardingStep, boolean>;
  }, [items, isChecklistVisible, state]);

  const finalizeCompletion = useCallback(() => {
    analytics.track(ANALYTICS_EVENTS.ONBOARDING_CHECKLIST_COMPLETED);
    void markChecklistCompleted();
  }, []);

  // Stable identity so consumers can use the whole object as a memo dependency
  return useMemo(
    () => ({
      /** Eligibility resolved and not suppressed — the welcome intro may trigger */
      isEligible,
      /** The checklist card should render */
      isChecklistVisible,
      items,
      doneCount,
      allDone,
      /** Persist completion after the collapse animation (idempotent) */
      finalizeCompletion,
    }),
    [isEligible, isChecklistVisible, items, doneCount, allDone, finalizeCompletion],
  );
}

export type OnboardingChecklistState = ReturnType<typeof useOnboardingChecklist>;
