import { useCallback, useEffect, useRef, useState } from 'react';

import { useTutorialContext } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TutorialId } from '@/constants/tutorials';
import { useVoiceOfferEligible } from '@/hooks/review/useVoicePriming';
import { analytics } from '@/services/analytics';
import {
  ensurePermissions,
  getPermissionStatus,
  type NotificationPermissionSource,
} from '@/services/notificationService';
import type { AppDispatch } from '@/store/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { remindersToggled } from '@/store/settingsSlice';
import {
  loadNotificationPromptState,
  recordAccepted,
  recordFirstWordOffer,
  recordImpression,
} from '@/utils/notificationPromptStorage';

/** The two moments the priming card appears in. */
type PrimingSource = Extract<NotificationPermissionSource, 'review_complete' | 'first_word_saved'>;

/**
 * "Turn on reminders", from either moment: remembered as accepted whatever the
 * OS answers, then the OS dialog, which is never shown without this card first.
 */
async function acceptPriming(source: PrimingSource, dispatch: AppDispatch): Promise<void> {
  void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_ACCEPTED, { source });
  await recordAccepted();

  const granted = await ensurePermissions({ source, primed: true });
  if (granted) {
    // useSmartNotifications watches this setting and schedules the plan.
    dispatch(remindersToggled(true));
  }
}

function declinePriming(source: PrimingSource): void {
  void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_DECLINED, { source });
}

/** After a decline, ask once more only after this many further sessions */
const PRIMING_REASK_SESSION_GAP = 5;

/**
 * Completions the speak-the-answer offer gets first, while it is still open.
 *
 * Voice is otherwise invisible until a learner has finished two whole sessions,
 * which is most of the reason almost nobody has ever turned it on. This ask
 * loses far less by waiting: it keeps its full two-impression budget, just
 * shifted later.
 *
 * The bound matters. Waiting on "voice has been answered" alone would starve
 * this ask forever for anyone who neither accepts nor declines, and because
 * `recordImpression` only fires when the card actually renders, the re-ask
 * window would never open either. Two sessions is also why this is a range
 * rather than an equality: `recordSessionCompleted()` is fired fire-and-forget
 * from `useReviewCompletion` on the same tick this effect reads storage, so the
 * counter may read either side of the increment.
 */
const VOICE_FIRST_SESSION_GRACE = 2;

export interface UseNotificationPrimingResult {
  showPrimingCard: boolean;
  /**
   * Eligibility has finished resolving. It is asynchronous (AsyncStorage read
   * plus a permission query), so `showPrimingCard` is `false` for the first
   * commits regardless of the answer. Anything that shares the slot must wait
   * for this before concluding the slot is free, or it renders a card that is
   * about to be replaced and reports an impression for it.
   */
  resolved: boolean;
  accept: () => Promise<void>;
  decline: () => void;
}

/**
 * Eligibility + actions for the notification priming card on the review
 * completion screen. The card shows at most twice ever, and never once the user
 * has decided — the settings toggle remains the path back. The first showing
 * waits for the speak-the-answer offer to have had its turn (see
 * VOICE_FIRST_SESSION_GRACE); the second comes PRIMING_REASK_SESSION_GAP
 * further sessions later, if the first was declined.
 *
 * The OS permission dialog fires only from accept(), so users are never hit
 * with an unprimed system prompt.
 */
export function useNotificationPriming(): UseNotificationPrimingResult {
  const dispatch = useAppDispatch();
  const guided = useAppSelector(state => state.firstPage.guided);
  const reminderTime = useAppSelector(state => state.settings.reminderTime);
  const [showPrimingCard, setShowPrimingCard] = useState(false);
  const [resolved, setResolved] = useState(false);
  const voiceOfferOpen = useVoiceOfferEligible();
  const impressionRecordedRef = useRef(false);
  // Once this ask has yielded the slot to the voice offer on this screen, it
  // stays yielded for the life of the screen. Without the latch, answering the
  // voice card flips `voiceOfferOpen` false, this effect re-runs, and the
  // reminders card fades in over the celebration the learner is still reading —
  // two asks back to back, which is exactly what sharing one slot is meant to
  // prevent. It would also spend one of this ask's two lifetime impressions on
  // a card shown at the worst possible moment. The next session re-evaluates.
  const yieldedToVoiceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      // Feature already on (or the user is mid-accept) — nothing to ask.
      if (guided || reminderTime.enabled || impressionRecordedRef.current) return;
      if (yieldedToVoiceRef.current) return;

      const state = await loadNotificationPromptState();
      if (state.accepted) return;

      // Stand aside while the voice offer is still unanswered and new. Once the
      // grace has passed, or a later session finds voice already answered, this
      // ask takes the slot as before.
      if (voiceOfferOpen && state.sessionsCompleted < VOICE_FIRST_SESSION_GRACE) {
        yieldedToVoiceRef.current = true;
        return;
      }

      const withinPolicy =
        state.impressions === 0 ||
        (state.impressions === 1 &&
          state.sessionsCompleted - state.lastImpressionSession >= PRIMING_REASK_SESSION_GAP);
      if (!withinPolicy) return;

      // Denied users get the settings-toggle path (system-settings deep link),
      // 'unavailable' means Expo Go Android — no notifications module at all.
      const status = await getPermissionStatus();
      if (status === 'denied' || status === 'unavailable') return;

      if (cancelled || impressionRecordedRef.current) return;
      impressionRecordedRef.current = true;
      setShowPrimingCard(true);
      void recordImpression();
      void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_SHOWN, {
        source: 'review_complete',
      });
    };

    void evaluate().finally(() => {
      if (!cancelled) setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [guided, reminderTime.enabled, voiceOfferOpen]);

  const accept = useCallback(async (): Promise<void> => {
    await acceptPriming('review_complete', dispatch);
    // OS-denied: hide silently — no follow-up alert on a celebration screen.
    setShowPrimingCard(false);
  }, [dispatch]);

  const decline = useCallback((): void => {
    declinePriming('review_complete');
    setShowPrimingCard(false);
  }, []);

  return { showPrimingCard, resolved, accept, decline };
}

export interface UseFirstWordNotificationPrimingResult {
  showPrimingCard: boolean;
  /** A word was just saved into an empty study list: offer reminders, if this is the moment. */
  offer: () => void;
  accept: () => Promise<void>;
  decline: () => void;
}

/**
 * The same ask, right after the learner's first saved word: the first moment
 * "we'll remind you when it's due" is about something they have. Shown once,
 * only while the OS has never been asked (a denial goes through settings, a
 * grant needs nothing), never while the welcome intro is still to come, and
 * not at all once reminders are on or the review card was accepted.
 *
 * It has its own flag rather than one of the review card's two impressions, so
 * that card still gets its turn after a "Not now" here.
 */
export function useFirstWordNotificationPriming(): UseFirstWordNotificationPrimingResult {
  const dispatch = useAppDispatch();
  const guided = useAppSelector(state => state.firstPage.guided);
  const remindersEnabled = useAppSelector(state => state.settings.reminderTime.enabled);
  const { shouldShowTutorial } = useTutorialContext();
  const [showPrimingCard, setShowPrimingCard] = useState(false);
  // One evaluation at a time: two quick saves must not both pass the checks.
  const evaluatingRef = useRef(false);

  const evaluate = async (): Promise<void> => {
    const state = await loadNotificationPromptState();
    if (state.accepted || state.firstWordOfferShown) return;
    if ((await getPermissionStatus()) !== 'undetermined') return;

    await recordFirstWordOffer();
    setShowPrimingCard(true);
    void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_SHOWN, {
      source: 'first_word_saved',
    });
  };

  const offer = (): void => {
    if (guided || remindersEnabled || showPrimingCard || evaluatingRef.current) return;
    if (shouldShowTutorial(TutorialId.WELCOME_INTRO)) return;

    evaluatingRef.current = true;
    void evaluate().finally(() => {
      evaluatingRef.current = false;
    });
  };

  const accept = async (): Promise<void> => {
    await acceptPriming('first_word_saved', dispatch);
    setShowPrimingCard(false);
  };

  const decline = (): void => {
    declinePriming('first_word_saved');
    setShowPrimingCard(false);
  };

  return { showPrimingCard, offer, accept, decline };
}
