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

import { TIMING_CONFIG } from '@/constants/animation';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';

const reanimated = require('react-native-reanimated') as {
  withTiming: (value: number, config?: unknown, callback?: (finished?: boolean) => void) => number;
  withDelay: (delay: number, animation: number) => number;
};

// The width jest.setup's useWindowDimensions stub reports; the hook reads the
// live window, not a launch-time constant.
const WINDOW_WIDTH = 375;

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

      expect(result.current.translateX.get()).toBe(WINDOW_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(true);
    });

    test('a restudy continue throws the card off the left edge', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('left'));

      expect(result.current.translateX.get()).toBe(-WINDOW_WIDTH);
    });

    test('a fresh card rests at centre with the exit unlocked', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.translateX.get()).toBe(0);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('without a beat the throw starts from where the card rests', () => {
      const { result } = renderHook(() => useSwipeGesture());
      const setSpy = jest.spyOn(result.current.translateX, 'set');
      const delaySpy = jest.spyOn(reanimated, 'withDelay');

      act(() => result.current.commitTo('right', 0));

      // One assignment and no placement before it: there is no draw-back point
      // to jump to any more, so the card leaves from rest.
      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(WINDOW_WIDTH);
      expect(delaySpy).not.toHaveBeenCalled();
      expect(timings.map(t => t.value)).toEqual([WINDOW_WIDTH]);
      expect(timings[0]?.config).toBe(TIMING_CONFIG.CARD_EXIT);
    });

    test('a beat holds the card still, then throws', () => {
      const { result } = renderHook(() => useSwipeGesture());
      const setSpy = jest.spyOn(result.current.translateX, 'set');
      const delaySpy = jest.spyOn(reanimated, 'withDelay');

      act(() => result.current.commitTo('right', 140));

      // One assignment: the beat is a delay inside the animation, and the only
      // timing is the throw itself — no glide to an intermediate point.
      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(delaySpy).toHaveBeenCalledTimes(1);
      expect(delaySpy.mock.calls[0]?.[0]).toBe(140);
      expect(timings.map(t => t.value)).toEqual([WINDOW_WIDTH]);
    });

    test('a card already flying off cannot be re-thrown', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      act(() => result.current.commitTo('left'));

      // The second call is dropped entirely rather than reversing the card
      // mid-flight.
      expect(result.current.translateX.get()).toBe(WINDOW_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(true);
    });

    test('an exit that lands recentres the card and releases the lock', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      const throwOut = timings.find(t => t.value === WINDOW_WIDTH);
      act(() => throwOut?.callback?.(true));

      // Recentring under the advance fade is what stops a frame of the outgoing
      // position showing as the next card fades in.
      expect(result.current.translateX.get()).toBe(0);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('an exit that is cancelled releases the lock WITHOUT recentring', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      const throwOut = timings.find(t => t.value === WINDOW_WIDTH);
      act(() => throwOut?.callback?.(false));

      // The `finished` guard is load-bearing: assigning over a still-running
      // animation cancels it, which re-enters this same callback. Recentring
      // here would recurse until the stack blew, and the next card's own
      // recentre cancels this exit every single time.
      expect(result.current.translateX.get()).toBe(WINDOW_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('a released card can be thrown again', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => result.current.commitTo('right'));
      act(() => timings.find(t => t.value === WINDOW_WIDTH)?.callback?.(true));
      act(() => result.current.commitTo('left'));

      expect(result.current.translateX.get()).toBe(-WINDOW_WIDTH);
      expect(result.current.isAnimatingRef.get()).toBe(true);
    });
  });
});
