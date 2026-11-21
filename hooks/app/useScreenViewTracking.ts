import { useSegments } from 'expo-router';
import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';

/**
 * Screen Viewed, once each time the focused route changes.
 *
 * `screen` is the route template from `useSegments` — `article/[id]`,
 * `(tabs)/practice/dictionary` — so it never carries an id. Nothing is sent
 * while the app runs in the background (an iOS background launch mounts the
 * root with nobody looking); the screen it is on goes out when it comes to the
 * foreground instead. A return to the same screen is not a new view: App
 * Resumed counts those.
 */
export function useScreenViewTracking(enabled: boolean): void {
  const screen = useSegments().join('/');
  const lastTrackedRef = useRef<string | null>(null);

  const trackIfNew = useEffectEvent(() => {
    if (!enabled || !screen || screen === lastTrackedRef.current) return;
    if (AppState.currentState === 'background') return;

    lastTrackedRef.current = screen;
    void analytics.track(ANALYTICS_EVENTS.SCREEN_VIEWED, { screen });
  });

  useEffect(() => {
    trackIfNew();
  }, [enabled, screen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') trackIfNew();
    });
    return () => subscription.remove();
  }, []);
}
