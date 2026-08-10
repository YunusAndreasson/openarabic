import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

export interface SleepTimerState {
  isActive: boolean;
  /** Unix timestamp (ms) when the timer expires, or 0 if inactive */
  endTime: number;
}

export interface SleepTimerActions {
  startTimer: (minutes: number) => void;
  cancelTimer: () => void;
}

export interface UseSleepTimerResult {
  state: SleepTimerState;
  actions: SleepTimerActions;
}

/**
 * Sleep timer hook — schedules a single setTimeout to fire the completion callback.
 * Stores the end timestamp so UI can derive remaining time locally without
 * causing re-renders every second in the global audio state tree.
 */
export function useSleepTimer(onTimerComplete?: () => void): UseSleepTimerResult {
  const [isActive, setIsActive] = useState(false);
  const [endTime, setEndTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimerTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const fireCompletion = useCallback(() => {
    clearTimerTimeout();
    setIsActive(false);
    setEndTime(0);
    onTimerComplete?.();
  }, [clearTimerTimeout, onTimerComplete]);

  const startTimer = useCallback(
    (minutes: number) => {
      try {
        if (!minutes || minutes <= 0 || minutes > 180) {
          throw new Error(`Invalid timer duration: ${minutes} minutes`);
        }

        const durationMs = minutes * 60 * 1000;
        const end = Date.now() + durationMs;

        clearTimerTimeout();

        setEndTime(end);
        setIsActive(true);

        timeoutRef.current = setTimeout(fireCompletion, durationMs);
      } catch (error) {
        handleError(error, {
          toastMessage: STRINGS.FAILED_TO_START_SLEEP_TIMER,
          analyticsEventName: 'Sleep_Timer_Start_Error',
        });
      }
    },
    [clearTimerTimeout, fireCompletion],
  );

  const cancelTimer = useCallback(() => {
    setIsActive(false);
    setEndTime(0);
    clearTimerTimeout();
  }, [clearTimerTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerTimeout();
    };
  }, [clearTimerTimeout]);

  // A backgrounded app throttles JS timers — measured on the Android emulator,
  // a 5-minute setTimeout did not fire until the app was foregrounded again
  // several minutes past its deadline, during which a playing queue kept
  // auto-advancing completely uninterrupted. That's the one case a "sleep"
  // timer must not fail in: the app is backgrounded because the listener put
  // the phone down. Re-checking the stored wall-clock `endTime` against
  // `Date.now()` on every foreground transition makes expiry correct
  // regardless of whether the underlying setTimeout fired on schedule, was
  // merely late, or is still pending.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      if (!isActive || endTime === 0) return;
      if (Date.now() >= endTime) {
        fireCompletion();
      }
    });
    return () => subscription?.remove();
  }, [isActive, endTime, fireCompletion]);

  return {
    state: { isActive, endTime },
    actions: { startTimer, cancelTimer },
  };
}
