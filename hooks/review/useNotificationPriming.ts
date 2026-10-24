import { useCallback, useEffect, useRef, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useVoiceOfferEligible } from '@/hooks/review/useVoicePriming';
import { analytics } from '@/services/analytics';
import { ensurePermissions, getPermissionStatus } from '@/services/notificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { remindersToggled } from '@/store/settingsSlice';
import {
  loadNotificationPromptState,
  recordAccepted,
  recordImpression,
} from '@/utils/notificationPromptStorage';

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
      if (reminderTime.enabled || impressionRecordedRef.current) return;
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
      void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_SHOWN);
    };

    void evaluate().finally(() => {
      if (!cancelled) setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [reminderTime.enabled, voiceOfferOpen]);

  const accept = useCallback(async (): Promise<void> => {
    void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_ACCEPTED);
    await recordAccepted();

    const granted = await ensurePermissions();
    void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, { granted });

    if (granted) {
      // useSmartNotifications watches this setting and schedules the plan.
      dispatch(remindersToggled(true));
    }
    // OS-denied: hide silently — no follow-up alert on a celebration screen.
    setShowPrimingCard(false);
  }, [dispatch]);

  const decline = useCallback((): void => {
    void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_DECLINED);
    setShowPrimingCard(false);
  }, []);

  return { showPrimingCard, resolved, accept, decline };
}
