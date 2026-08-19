import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Run an action once when the app returns after actually reaching the
 * background. The initial `active` event and inactive interruptions do not
 * count as a return.
 */
export function useResumeFromBackground(onResume: () => void, enabled = true): void {
  const wasBackgroundedRef = useRef(false);
  const handleResume = useEffectEvent(onResume);

  useEffect(() => {
    if (!enabled) {
      wasBackgroundedRef.current = false;
      return;
    }

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        wasBackgroundedRef.current = true;
        return;
      }
      if (nextState !== 'active' || !wasBackgroundedRef.current) return;
      wasBackgroundedRef.current = false;
      handleResume();
    });

    return () => subscription.remove();
  }, [enabled]);
}
