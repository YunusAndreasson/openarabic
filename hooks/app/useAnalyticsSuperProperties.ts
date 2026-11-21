import { useEffect } from 'react';
import { AppState } from 'react-native';

import { SUPER_PROPERTIES } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { refreshNotificationsEnabled } from '@/services/notificationService';
import { useAppSelector } from '@/store/hooks';

/**
 * The super properties that follow app state, so every event can be split by
 * them: whether someone is signed in, has review reminders on, and lets the app
 * notify. `install_date` is registered with App Opened (useAppOpenTracking).
 *
 * The OS grant is read again on every return to the foreground, because it can
 * change in system settings while the app is away; an ask in the app updates
 * it as well (services/notificationService `ensurePermissions`).
 */
export function useAnalyticsSuperProperties({
  appReady,
  signedIn,
}: {
  appReady: boolean;
  signedIn: boolean;
}): void {
  const remindersEnabled = useAppSelector(state => state.settings.reminderTime.enabled);

  useEffect(() => {
    if (!appReady) return;
    void analytics.registerSuperProperties({
      [SUPER_PROPERTIES.SIGNED_IN]: signedIn,
      [SUPER_PROPERTIES.REMINDERS_ENABLED]: remindersEnabled,
    });
  }, [appReady, signedIn, remindersEnabled]);

  useEffect(() => {
    if (!appReady) return;
    void refreshNotificationsEnabled();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') void refreshNotificationsEnabled();
    });
    return () => subscription.remove();
  }, [appReady]);
}
