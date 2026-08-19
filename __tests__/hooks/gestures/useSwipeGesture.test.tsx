/**
 * Review card exit tests.
 *
 * This hook used to own a pan-to-commit swipe, and the swipe's tests were the
 * only thing that exercised `translateX` / `isAnimatingRef` at all — the exit
 * itself was never covered directly. The gesture is gone; these cover what it
 * left behind, which is the motion every committed grade still plays.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { CARD_EXIT_DRAW_BACK_RATIO, TIMING_CONFIG } from '@/constants/animation';
import { SCREEN_WIDTH } from '@/constants/layout';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';

const reanimated = require('react-native-reanimated') as {
  withTiming: (value: number, config?: unknown, callback?: (finished?: boolean) => void) => number;
};

const DRAW_BACK = SCREEN_WIDTH * CARD_EXIT_DRAW_BACK_RATIO;

/**
 * Every test runs against a captured `withTiming` so the exit's completion
 * callback can be invoked with an explicit `finished`. Two reasons it is
 * installed for the whole suite rather than per-test:
 *
 * - The global mock (jest.setup) fires the callback with NO arguments, so
 *   `finished` is permanently undefined and the guard separating "landed" from
 *   "cancelled" cannot be exercised.
 * - That same global mock schedules the callback via `setTimeout(cb, 0)`. A test
 *   that does not capture leaves a worklet queued against a torn-down hook's
 *   shared values, landing between tests — an ordering hazard under
 *   `--randomize` rather than a failure the suite would report.
 *
 * `restoreMocks: true` in jest.config already restores the spy between tests.
 */
let timings: { value: number; config: unknown; callback?: (finished?: boolean) => void }[] = [];

describe('review card exit', () => {
  beforeEach(() => {
    timings = [];
    jest.spyOn(reanimated, 'withTiming').mockImplementation((value, config, callback) => {
      timings.push({ value, config, callback });
      return value;
    });
  });

  describe('commitTo', () => {
    test('a "Knew it" throws the card off the right edge and locks the exit', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));

      expect(result.current.translateX.get()).toBe(SCREEN_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(true);
    });

    test('a restudy continue throws the card off the left edge', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('left'));

      expect(result.current.translateX.get()).toBe(-SCREEN_WIDTH);
    });

    test('the draw-back distance is where the wash reaches full strength', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.swipeThreshold).toBe(DRAW_BACK);
      expect(result.current.translateX.get()).toBe(0);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('without a beat the card is placed at the draw-back point and thrown on the same frame', () => {
      const { result } = renderHook(() => useSwipeGesture());
      const setSpy = jest.spyOn(result.current.translateX, 'set');

      act(() => result.current.commitTo('right', 0));

      // Two assignments, no animation between them: the placement is invisible
      // because the throw starts on the very same frame.
      expect(setSpy).toHaveBeenCalledTimes(2);
      expect(setSpy).toHaveBeenNthCalledWith(1, DRAW_BACK);
      expect(setSpy).toHaveBeenNthCalledWith(2, SCREEN_WIDTH);
    });

    test('a beat glides the card out to the draw-back point before the throw', () => {
      const { result } = renderHook(() => useSwipeGesture());
      const setSpy = jest.spyOn(result.current.translateX, 'set');

      act(() => result.current.commitTo('right', 140));

      // One assignment — the whole thing is a sequence, so the card is never
      // teleported to the draw-back point.
      expect(setSpy).toHaveBeenCalledTimes(1);

      const drawBack = timings.find(t => t.value === DRAW_BACK);
      expect(drawBack?.config).toEqual({
        duration: 140,
        easing: TIMING_CONFIG.MEDIUM.easing,
      });
      expect(timings.some(t => t.value === SCREEN_WIDTH)).toBe(true);
    });

    test('a card already flying off cannot be re-thrown', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      act(() => result.current.commitTo('left'));

      // The second call is dropped entirely rather than reversing the card
      // mid-flight.
      expect(result.current.translateX.get()).toBe(SCREEN_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(true);
    });

    test('an exit that lands recentres the card and releases the lock', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      const throwOut = timings.find(t => t.value === SCREEN_WIDTH);
      act(() => throwOut?.callback?.(true));

      // Recentring under the advance fade is what stops a frame of the outgoing
      // position showing as the next card fades in.
      expect(result.current.translateX.get()).toBe(0);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('an exit that is cancelled releases the lock WITHOUT recentring', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      const throwOut = timings.find(t => t.value === SCREEN_WIDTH);
      act(() => throwOut?.callback?.(false));

      // The `finished` guard is load-bearing: assigning over a still-running
      // animation cancels it, which re-enters this same callback. Recentring
      // here would recurse until the stack blew, and the next card's own
      // recentre cancels this exit every single time.
      expect(result.current.translateX.get()).toBe(SCREEN_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('a released card can be thrown again', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      act(() => timings.find(t => t.value === SCREEN_WIDTH)?.callback?.(true));
      act(() => result.current.commitTo('left'));

      expect(result.current.translateX.get()).toBe(-SCREEN_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(true);
    });
  });
});
