import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toLocalDateString } from '@/utils/dateTimeUtils';

const SAMPLE_INTERVAL_MS = 1000;
const CLOCK_JUMP_THRESHOLD_MS = 2000;

/** Refresh calendar-derived data on visible screens, including clock changes
 * while the screen stays mounted. Ordinary samples do not trigger renders. */
export function useFocusedLocalClock(): number {
  const focused = useIsFocused();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!focused) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let lastWallTime = Date.now();
    let lastMonotonicTime = performance.now();
    let previousDay = toLocalDateString(new Date(lastWallTime));
    let previousOffset = new Date(lastWallTime).getTimezoneOffset();

    function sample(force = false) {
      const wallTime = Date.now();
      const monotonicTime = performance.now();
      const date = new Date(wallTime);
      const day = toLocalDateString(date);
      const offset = date.getTimezoneOffset();
      const jump = Math.abs(wallTime - lastWallTime - (monotonicTime - lastMonotonicTime));
      if (
        force ||
        day !== previousDay ||
        offset !== previousOffset ||
        jump >= CLOCK_JUMP_THRESHOLD_MS
      ) {
        setNow(wallTime);
      }
      previousDay = day;
      previousOffset = offset;
      lastWallTime = wallTime;
      lastMonotonicTime = monotonicTime;
    }

    function stop() {
      clearInterval(timer);
      timer = undefined;
    }

    function start() {
      if (timer !== undefined) return;
      sample(true);
      timer = setInterval(sample, SAMPLE_INTERVAL_MS);
    }

    if (AppState.currentState === 'active' || AppState.currentState === null) start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [focused]);

  return now;
}
