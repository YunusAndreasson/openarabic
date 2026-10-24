import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useRef } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { fsrsQueries, gated } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  cancelSmartNotifications,
  dismissDeliveredSmartNotifications,
  syncReminderPlan,
} from '@/services/notificationService';
import { useAppSelector } from '@/store/hooks';
import { readSmartReminderPrefs, writeSmartReminderPrefs } from '@/utils/smartReminderPrefs';

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
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);

  const userId = user?.id;
  const { data: words } = useQuery(gated(fsrsQueries.all, userId));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * When the last session finished, for the planner's cooldown.
   *
   * The query cache is the live copy but it is memory only, so after a relaunch
   * it is empty while the cooldown may still be running. The mirror below is the
   * one durable copy, so it is read back here rather than only written: the
   * mount-time write used to save the settings WITHOUT the timestamp and erase
   * it, and the next plan re-added the reminder the session had just earned the
   * learner a break from. Signed out there is no session to cool down from, and
   * the write that follows clears whatever the last account left.
   */
  const resolveLastCompletedAt = useEffectEvent(async (): Promise<number | undefined> => {
    if (!userId) return undefined;
    const cached = queryClient.getQueryData<number>(fsrsQueries.lastCompletedAtKey(userId));
    if (typeof cached === 'number') return cached;
    return (await readSmartReminderPrefs())?.lastSessionCompletedAt;
  });

  /** Mirrors the setting, and the cooldown with it, for the headless task. */
  const writeMirror = useEffectEvent(async (): Promise<number | undefined> => {
    const lastSessionCompletedAt = await resolveLastCompletedAt();
    await writeSmartReminderPrefs({ ...reminderTime, lastSessionCompletedAt });
    return lastSessionCompletedAt;
  });

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

    // Keep the headless mirror's cooldown in step with the plan built here.
    const lastSessionCompletedAt = await writeMirror();
    await syncReminderPlan(words, { ...reminderTime, lastSessionCompletedAt }, trigger);
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

  // Mirror the setting for the headless background task. Not while auth is
  // still restoring: with no user yet there is no cooldown to resolve, and the
  // write would save the settings without it — erasing, on every launch, the
  // one durable copy the read-back above depends on.
  useEffect(() => {
    if (isAuthLoading) return;
    void writeMirror();
  }, [reminderTime, userId, isAuthLoading]);

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
