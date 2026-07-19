import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useRef } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  cancelSmartNotifications,
  dismissDeliveredSmartNotifications,
  syncSmartNotifications,
} from '@/services/notificationService';
import { useAppSelector } from '@/store/hooks';
import { buildNotificationPlan } from '@/utils/notificationPlanner';
import { writeSmartReminderPrefs } from '@/utils/smartReminderPrefs';

/**
 * Debounce so a burst of triggers (session invalidation refetch + foreground +
 * settings write) collapses into one reschedule.
 */
const SYNC_DEBOUNCE_MS = 3000;

/**
 * Keeps the scheduled smart-reminder plan in sync with the user's FSRS state.
 *
 * The plan is recomputed (debounced) whenever its inputs change: the word set
 * (which the post-session query invalidation refreshes), the reminder setting,
 * auth state, or the app coming to the foreground. Because due and slip dates
 * are fixed unless a review happens, a synced plan stays correct while the app
 * is closed; the background task only corrects multi-device staleness.
 *
 * Mount once at app root, next to useAppBadge.
 */
export function useSmartNotifications(): void {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);

  const userId = user?.id;
  const { data: words } = useQuery({
    ...fsrsQueries.all(userId ?? ''),
    enabled: isAuthenticated && !!userId,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSync = useEffectEvent(async (trigger: string) => {
    if (!isAuthenticated || !userId || !reminderTime.enabled) {
      await cancelSmartNotifications();
      return;
    }

    // Words query not yet resolved (offline launch, slow restore): skip the
    // sync entirely rather than wiping the scheduled plan against an empty
    // word set — the existing plan stays correct while the app is closed.
    // The data-change effect re-fires scheduleSync when `words` resolves.
    if (words === undefined) return;

    const lastCompletedAt = queryClient.getQueryData<number>(
      fsrsQueries.lastCompletedAtKey(userId),
    );
    const plan = buildNotificationPlan({
      words,
      now: new Date(),
      preferredHour: reminderTime.hour,
      preferredMinute: reminderTime.minute,
      ...(typeof lastCompletedAt === 'number' ? { lastSessionCompletedAt: lastCompletedAt } : {}),
    });
    await syncSmartNotifications(plan, trigger);
  });

  const scheduleSync = useEffectEvent((trigger: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSync(trigger);
    }, SYNC_DEBOUNCE_MS);
  });

  // Recompute when any planner input changes (includes sign-out → cancel path)
  useEffect(() => {
    scheduleSync('data-change');
  }, [words, reminderTime, isAuthenticated, userId]);

  // Mirror the setting for the headless background task
  useEffect(() => {
    void writeSmartReminderPrefs(reminderTime);
  }, [reminderTime]);

  // Foreground: clear delivered reminders from the tray, then refresh the plan
  const handleAppStateChange = useEffectEvent((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      void dismissDeliveredSmartNotifications();
      scheduleSync('foreground');
    }
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
