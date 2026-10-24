import { useEffect, useEffectEvent } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Take over Android's hardware/gesture back while `enabled`: the press calls
 * `onBack` and goes no further — no pop, no app exit. Disabled, or on iOS, the
 * platform's own back runs as usual.
 *
 * `onBack` is read through `useEffectEvent`, so a handler that closes over
 * state needs no dependency list and the listener is re-registered only when
 * `enabled` flips. Listeners registered later run first, which is what lets a
 * sheet opened over a tab root close before the tab's own handler sees the
 * press.
 */
export function useAndroidBackHandler(enabled: boolean, onBack: () => void): void {
  const handleBack = useEffectEvent(onBack);

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    // jest's react-native mock loses its return value to `resetMocks`, so the
    // subscription the native type promises is undefined there.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return () => subscription?.remove();
  }, [enabled]);
}
