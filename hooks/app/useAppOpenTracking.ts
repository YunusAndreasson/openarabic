import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';

import { ANALYTICS_EVENTS, SUPER_PROPERTIES } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { loadInstallRecord } from '@/services/analyticsInstall';
import { startInstallAttribution, trackFirstOpen } from '@/services/installAttribution';

import {
  enterReminderSession,
  backgroundReminderSession,
  finishIdleReminderSession,
  REMINDER_SESSION_TIMEOUT_MS,
} from '@/services/reviewReminderJourney';

type AppOpenLaunch = 'cold' | 'warm' | 'after_background_launch';

/** `install_date` on every event from here on. */
const registerInstallDate = (): Promise<void> =>
  loadInstallRecord()
    .then(async record => {
      if (record) {
        await analytics.registerSuperProperties({
          [SUPER_PROPERTIES.INSTALL_DATE]: record.installDate,
        });
      }
    })
    .catch(() => {
      // Silent, like the rest of analytics: App Opened still goes out.
    });

/**
 * First Open the first time this install is opened, then App Opened; both after
 * the install date. Install Attribution follows, once the Play Store answers.
 */
const trackAppOpened = async (
  launch: AppOpenLaunch,
  installDateRegistered: Promise<void>,
): Promise<void> => {
  await installDateRegistered;

  if (launch !== 'warm') await trackFirstOpen();
  await analytics.track(ANALYTICS_EVENTS.APP_OPENED, { launch });
  if (launch !== 'warm') await startInstallAttribution();
};

/** A launch counts only while active. An inactive interruption is part of the same session. */
export function useAppOpenTracking(
  appReady: boolean,
  onOpenAfterBackgroundLaunch: () => void,
  owner?: string,
) {
  const installDateRef = useRef<Promise<void> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasOpened = useRef(false);
  const wasBackgrounded = useRef(false);
  const observe = useEffectEvent((state: typeof AppState.currentState) => {
    if (state === 'background') {
      wasBackgrounded.current = true;
      if (hasOpened.current) {
        void backgroundReminderSession().catch(() => undefined);
        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
          void finishIdleReminderSession(Date.now(), owner).catch(() => undefined);
        }, REMINDER_SESSION_TIMEOUT_MS);
      }
    }
    if (!appReady || state !== 'active' || (hasOpened.current && !wasBackgrounded.current)) return;

    clearTimeout(idleTimer.current);
    const launch = hasOpened.current
      ? 'warm'
      : wasBackgrounded.current
        ? 'after_background_launch'
        : 'cold';
    hasOpened.current = true;
    wasBackgrounded.current = false;
    if (launch === 'after_background_launch') onOpenAfterBackgroundLaunch();
    installDateRef.current ??= registerInstallDate();
    void trackAppOpened(
      launch,
      Promise.all([
        installDateRef.current,
        enterReminderSession(launch !== 'warm', Date.now(), owner).catch(() => undefined),
      ]).then(() => undefined),
    );
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', observe);
    observe(AppState.currentState);
    return () => {
      subscription.remove();
      clearTimeout(idleTimer.current);
    };
  }, [appReady]);
}
