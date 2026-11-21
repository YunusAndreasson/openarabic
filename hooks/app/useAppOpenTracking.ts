import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ANALYTICS_EVENTS, SUPER_PROPERTIES } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { loadInstallRecord } from '@/services/analyticsInstall';
import { startInstallAttribution, trackFirstOpen } from '@/services/installAttribution';

/**
 * - `foreground`: the app was on screen when it became ready.
 * - `after_background_launch`: iOS started it in the background (a background
 *   task, the voice-model download finishing) and this is the learner opening
 *   it later.
 *
 * A return to an app already running is App Resumed, sent by the root layout.
 */
type AppOpenLaunch = 'foreground' | 'after_background_launch';

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

  await trackFirstOpen();
  await analytics.track(ANALYTICS_EVENTS.APP_OPENED, { launch });
  await startInstallAttribution();
};

/**
 * App Opened once per launch the learner actually sees.
 *
 * iOS launches the app into the background (UIBackgroundModes processing, and
 * the relaunch that finishes a voice-model download), and the app becomes ready
 * there with nobody looking. Counting that as an open inflated every active
 * count, and the real open that followed was never counted at all: App Resumed
 * needs a background transition the app never made. So a launch that is ready
 * in the background waits, and the first move to `active` is its App Opened.
 *
 * `onOpenAfterBackgroundLaunch` lets the caller start its session clock there,
 * not at the background launch.
 */
export function useAppOpenTracking(appReady: boolean, onOpenAfterBackgroundLaunch: () => void) {
  // Set once, at the latch: a background launch registers it too, for the
  // events it sends before anyone opens the app.
  const installDateRef = useRef<Promise<void> | null>(null);
  const isOpenPendingRef = useRef(false);

  useEffect(() => {
    if (!appReady || installDateRef.current) return;
    const installDateRegistered = registerInstallDate();
    installDateRef.current = installDateRegistered;

    // 'unknown' and 'inactive' are a foreground launch still settling: iOS
    // reports 'unknown' until the app first becomes active.
    if (AppState.currentState === 'background') {
      isOpenPendingRef.current = true;
      return;
    }
    void trackAppOpened('foreground', installDateRegistered);
  }, [appReady]);

  const handleAppStateChange = useEffectEvent((nextAppState: AppStateStatus) => {
    const installDateRegistered = installDateRef.current;
    if (nextAppState !== 'active' || !isOpenPendingRef.current || !installDateRegistered) return;
    isOpenPendingRef.current = false;
    onOpenAfterBackgroundLaunch();
    void trackAppOpened('after_background_launch', installDateRegistered);
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);
}
