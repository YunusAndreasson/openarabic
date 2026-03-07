import { useCallback, useEffect, useRef, useState } from 'react';

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

        timeoutRef.current = setTimeout(() => {
          setIsActive(false);
          setEndTime(0);
          timeoutRef.current = null;
          onTimerComplete?.();
        }, durationMs);
      } catch (error) {
        handleError(error as Error, {
          toastMessage: STRINGS.FAILED_TO_START_SLEEP_TIMER,
          analyticsEventName: 'Sleep_Timer_Start_Error',
        });
      }
    },
    [clearTimerTimeout, onTimerComplete],
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

  return {
    state: { isActive, endTime },
    actions: { startTimer, cancelTimer },
  };
}
