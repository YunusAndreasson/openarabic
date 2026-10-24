import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { simpleAudioService } from '@/services/audioPlayer';
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
      // Rejected up front rather than thrown and caught: nothing past this
      // check can fail, and a throw inside a try is something the React
      // Compiler cannot compile, which left this whole hook unmemoized.
      if (!minutes || minutes <= 0 || minutes > 180) {
        void handleError(new Error(`Invalid timer duration: ${minutes} minutes`), {
          toastMessage: STRINGS.FAILED_TO_START_SLEEP_TIMER,
          analyticsEventName: 'Sleep_Timer_Start_Error',
        });
        return;
      }

      const durationMs = minutes * 60 * 1000;
      const end = Date.now() + durationMs;

      clearTimerTimeout();

      setEndTime(end);
      setIsActive(true);
      // The service checks this at every track end, which keeps working in
      // the background where the timeout below does not.
      simpleAudioService.setSleepDeadline(end);

      timeoutRef.current = setTimeout(fireCompletion, durationMs);
    },
    [clearTimerTimeout, fireCompletion],
  );

  const cancelTimer = useCallback(() => {
    setIsActive(false);
    setEndTime(0);
    clearTimerTimeout();
    simpleAudioService.setSleepDeadline(null);
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
  //
  // Registered once per mount: the check reads the latest timer state through
  // an effect event, where depending on it re-registered the listener on every
  // render of the app-root provider.
  const expireIfPastDeadline = useEffectEvent(() => {
    if (!isActive || endTime === 0) return;
    if (Date.now() >= endTime) {
      fireCompletion();
    }
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') expireIfPastDeadline();
    });
    return () => subscription?.remove();
  }, []);

  return {
    state: { isActive, endTime },
    actions: { startTimer, cancelTimer },
  };
}
