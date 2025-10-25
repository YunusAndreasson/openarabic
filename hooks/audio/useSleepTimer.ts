import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

export interface SleepTimerState {
  isActive: boolean;
  remainingTime: number; // in seconds
}

export interface SleepTimerActions {
  startTimer: (minutes: number) => void;
  cancelTimer: () => void;
  autoCancel: () => void; // Automatically cancel when audio stops
}

export interface UseSleepTimerResult {
  state: SleepTimerState;
  actions: SleepTimerActions;
}

export function useSleepTimer(onTimerComplete?: () => void): UseSleepTimerResult {
  const [isActive, setIsActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear interval helper
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start timer function
  const startTimer = useCallback(
    (minutes: number) => {
      try {
        // Validate input
        if (!minutes || minutes <= 0 || minutes > 180) {
          throw new Error(`Invalid timer duration: ${minutes} minutes`);
        }

        const seconds = minutes * 60;
        setRemainingTime(seconds);
        setIsActive(true);

        // Clear any existing interval
        clearTimerInterval();

        // Start countdown
        intervalRef.current = setInterval(() => {
          setRemainingTime(prev => {
            const newTime = prev - 1;

            if (newTime <= 0) {
              setIsActive(false);
              clearTimerInterval();

              // Call completion callback
              if (onTimerComplete) {
                onTimerComplete();
              }
              return 0;
            }

            return newTime;
          });
        }, 1000);
      } catch (error) {
        handleError(error as Error, {
          toastMessage: STRINGS.FAILED_TO_START_SLEEP_TIMER,
          analyticsEventName: 'Sleep_Timer_Start_Error',
        });
      }
    },
    [clearTimerInterval, onTimerComplete],
  );

  // Cancel timer function
  const cancelTimer = useCallback(() => {
    try {
      setIsActive(false);
      setRemainingTime(0);
      clearTimerInterval();
    } catch (error) {
      handleError(error as Error, {
        toastMessage: STRINGS.FAILED_TO_CANCEL_SLEEP_TIMER,
        analyticsEventName: 'Sleep_Timer_Cancel_Error',
      });
    }
  }, [clearTimerInterval]);

  // Auto-cancel timer when audio stops (no user feedback needed)
  const autoCancel = useCallback(() => {
    if (isActive) {
      cancelTimer();
    }
  }, [isActive, cancelTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  const state: SleepTimerState = {
    isActive,
    remainingTime,
  };

  const actions: SleepTimerActions = {
    startTimer,
    cancelTimer,
    autoCancel,
  };

  const result = useMemo(
    () => ({
      state,
      actions,
    }),
    [state.isActive, state.remainingTime],
  );

  return result;
}
