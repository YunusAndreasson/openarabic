import { useEffect } from 'react';
import { useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';

/**
 * The practice charts' entrance: the data grows up off its baseline as ONE
 * `scaleY` on the group that holds it, never a spring per bar.
 *
 * Hand the result to a Skia `Group` as its `transform`, with the group's
 * `origin` on the baseline. Plays on mount and again whenever `replayKey`
 * changes; `delayMs` offsets one chart from another so two never start on the
 * same frame.
 */
export function useBaselineGrowth(replayKey?: unknown, delayMs = 0) {
  const growth = useSharedValue(0);

  useEffect(() => {
    growth.set(0);
    const grow = withTiming(1, TIMING_CONFIG.PROGRESS);
    growth.set(delayMs > 0 ? withDelay(delayMs, grow) : grow);
  }, [growth, replayKey, delayMs]);

  return useDerivedValue(() => {
    'worklet';
    return [{ scaleY: growth.get() }];
  });
}
