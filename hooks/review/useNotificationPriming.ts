import { useCallback, useEffect, useRef, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { ensurePermissions, getPermissionStatus } from '@/services/notificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setReminderTime } from '@/store/settingsSlice';
import {
  loadNotificationPromptState,
  recordAccepted,
  recordImpression,
} from '@/utils/notificationPromptStorage';

/** After a decline, ask once more only after this many further sessions */
const PRIMING_REASK_SESSION_GAP = 5;

export interface UseNotificationPrimingResult {
  showPrimingCard: boolean;
  accept: () => Promise<void>;
  decline: () => void;
}

/**
 * Eligibility + actions for the notification priming card on the review
 * completion screen. The card shows at most twice ever (first session, then
 * once more after PRIMING_REASK_SESSION_GAP further sessions if declined) and
 * never once the user has decided — the settings toggle remains the path back.
 *
 * The OS permission dialog fires only from accept(), so users are never hit
 * with an unprimed system prompt.
 */
export function useNotificationPriming(): UseNotificationPrimingResult {
  const dispatch = useAppDispatch();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);
  const [showPrimingCard, setShowPrimingCard] = useState(false);
  const impressionRecordedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      // Feature already on (or the user is mid-accept) — nothing to ask.
      if (reminderTime.enabled || impressionRecordedRef.current) return;

      const state = await loadNotificationPromptState();
      if (state.accepted) return;

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
      analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_SHOWN);
    };

    void evaluate();
    return () => {
      cancelled = true;
    };
  }, [reminderTime.enabled]);

  const accept = useCallback(async (): Promise<void> => {
    analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_ACCEPTED);
    await recordAccepted();

    const granted = await ensurePermissions();
    analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PERMISSION_RESULT, { granted });

    if (granted) {
      // useSmartNotifications watches this setting and schedules the plan.
      dispatch(setReminderTime({ ...reminderTime, enabled: true }));
    }
    // OS-denied: hide silently — no follow-up alert on a celebration screen.
    setShowPrimingCard(false);
  }, [dispatch, reminderTime]);

  const decline = useCallback((): void => {
    analytics.track(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_DECLINED);
    setShowPrimingCard(false);
  }, []);

  return { showPrimingCard, accept, decline };
}
