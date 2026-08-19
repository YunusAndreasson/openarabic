/**
 * useSwipeGesture Hook Tests
 *
 * Drives the handlers installed on the mocked pan gesture so the hook's
 * observable commit, cancellation, clamping, and callback behavior is covered.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { SCREEN_WIDTH } from '@/constants/layout';
import { useSwipeGesture } from '@/hooks/gestures/useSwipeGesture';
import type { SwipeExitPolicy } from '@/utils/gestureUtils';

type MockPanGesture = {
  _config: Record<string, unknown>;
  _handlers: {
    onBegin: () => void;
    onStart: (event: { translationX?: number }) => void;
    onUpdate: (event: { translationX?: number }) => void;
    onEnd: (event: { translationX?: number; velocityX?: number }, success: boolean) => void;
    onFinalize: () => void;
  };
};

const asMockGesture = (gesture: unknown) => gesture as MockPanGesture;
const { scheduleOnRN } = require('react-native-worklets') as { scheduleOnRN: jest.Mock };

describe('useSwipeGesture Hook', () => {
  beforeEach(() => {
    scheduleOnRN.mockImplementation((callback: unknown, ...args: unknown[]) => {
      if (typeof callback !== 'function') throw new TypeError('scheduleOnRN requires a callback');
      return callback(...args);
    });
  });

  describe('pan behavior', () => {
    test('installs the activation configuration on the pan gesture', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          enabled: false,
          minDistance: 20,
          activeOffsetX: [-10, 10],
          failOffsetY: [-24, 24],
          swipeThresholdRatio: 0.5,
          onSwipeLeft: jest.fn(),
          onSwipeRight: jest.fn(),
        }),
      );

      expect(asMockGesture(result.current.gesture)._config).toEqual({
        enabled: false,
        minDistance: 20,
        activeOffsetX: [-10, 10],
        failOffsetY: [-24, 24],
      });
      expect(result.current.swipeThreshold).toBe(SCREEN_WIDTH * 0.5);
      expect(result.current.translateX.get()).toBe(0);
      expect(result.current.isAnimatingRef.get()).toBe(false);
    });

    test('a right drag beyond the threshold commits and reports its lifecycle', () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();
      const onSwipeComplete = jest.fn();
      const onGestureBegin = jest.fn();
      const onGestureStart = jest.fn();
      const onGestureEnd = jest.fn();
      const onCommitArmedChange = jest.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft,
          onSwipeRight,
          onSwipeComplete,
          onGestureBegin,
          onGestureStart,
          onGestureEnd,
          onCommitArmedChange,
        }),
      );
      const gesture = asMockGesture(result.current.gesture);
      const translationX = result.current.swipeThreshold + 1;

      act(() => {
        gesture._handlers.onBegin();
        gesture._handlers.onStart({ translationX: 0 });
        gesture._handlers.onUpdate({ translationX });
        gesture._handlers.onEnd({ translationX, velocityX: 0 }, true);
      });

      expect(onGestureBegin).toHaveBeenCalledTimes(1);
      expect(onGestureStart).toHaveBeenCalledTimes(1);
      expect(onCommitArmedChange).toHaveBeenCalledWith(true, true);
      expect(onGestureEnd).toHaveBeenCalledTimes(1);
      expect(onSwipeRight).toHaveBeenCalledTimes(1);
      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeComplete).toHaveBeenCalledWith(true);
    });

    test('a cancelled drag never commits and returns the card to center', () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }));
      const gesture = asMockGesture(result.current.gesture);
      const translationX = -(result.current.swipeThreshold + 1);

      act(() => {
        gesture._handlers.onBegin();
        gesture._handlers.onStart({ translationX: 0 });
        gesture._handlers.onUpdate({ translationX });
        gesture._handlers.onEnd({ translationX, velocityX: 0 }, false);
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeRight).not.toHaveBeenCalled();
      expect(result.current.translateX.get()).toBe(0);
    });

    test('drag translation is clamped to the configured screen ratio', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          maxTranslationRatio: 0.5,
          onSwipeLeft: jest.fn(),
          onSwipeRight: jest.fn(),
        }),
      );
      const gesture = asMockGesture(result.current.gesture);

      act(() => {
        gesture._handlers.onBegin();
        gesture._handlers.onStart({ translationX: 0 });
        gesture._handlers.onUpdate({ translationX: SCREEN_WIDTH * 2 });
      });

      expect(result.current.translateX.get()).toBe(SCREEN_WIDTH * 0.5);
    });
  });

  describe('Configuration Defaults', () => {
    // Regression: the pan used to activate after 0.1pt of travel with a 1pt
    // active offset, so it stole touches from the card's own Pressable on any
    // tap with a hair of drift.
    test('activation thresholds leave room for a tap', () => {
      const { GESTURE_CONFIG, GESTURE_CONSTANTS } = require('@/utils/gestureUtils');

      expect(GESTURE_CONSTANTS.MIN_DISTANCE).toBeGreaterThanOrEqual(8);
      expect(GESTURE_CONFIG.ACTIVE_OFFSET_X[0]).toBeLessThanOrEqual(-8);
      expect(GESTURE_CONFIG.ACTIVE_OFFSET_X[1]).toBeGreaterThanOrEqual(8);
    });

    // Regression: a ~16pt commit distance meant a nudge permanently graded a
    // card through FSRS.
    test('commit distance requires a deliberate throw', () => {
      const { GESTURE_CONSTANTS } = require('@/utils/gestureUtils');

      expect(GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO).toBeGreaterThanOrEqual(0.15);
    });

    test('a mostly-vertical drag cannot activate the horizontal pan', () => {
      const { GESTURE_CONFIG } = require('@/utils/gestureUtils');

      expect(GESTURE_CONFIG.FAIL_OFFSET_Y[0]).toBeLessThan(0);
      expect(GESTURE_CONFIG.FAIL_OFFSET_Y[1]).toBeGreaterThan(0);
    });
  });

  // The rules that decide whether a released pan grades a card. Extracted from
  // the gesture worklet precisely so they can be exercised here — every case
  // below is a way the previous inline check mis-graded.
  describe('resolveSwipeCommit', () => {
    const SCREEN = 400;
    const THRESHOLD = SCREEN * 0.22; // 88pt

    const resolve = (translationX: number, velocityX: number) => {
      const { resolveSwipeCommit } = require('@/utils/gestureUtils');
      return resolveSwipeCommit({
        translationX,
        velocityX,
        swipeThreshold: THRESHOLD,
        screenWidth: SCREEN,
      });
    };

    test('commits a deliberate throw past the threshold', () => {
      expect(resolve(THRESHOLD + 1, 0)).toEqual({ commit: true, isRight: true });
      expect(resolve(-THRESHOLD - 1, 0)).toEqual({ commit: true, isRight: false });
    });

    test('does not commit a drag that stops short', () => {
      expect(resolve(THRESHOLD - 1, 0).commit).toBe(false);
      expect(resolve(-THRESHOLD + 1, 0).commit).toBe(false);
    });

    test('commits a fast flick that travelled a real distance', () => {
      // 40pt is past the 6%-of-screen (24pt) flick floor but well short of the
      // 88pt throw threshold — velocity is what carries it.
      expect(resolve(40, 1200)).toEqual({ commit: true, isRight: true });
      expect(resolve(-40, -1200)).toEqual({ commit: true, isRight: false });
    });

    // The premise the gesture's commit-time haptic rests on: this path grades a
    // card WITHOUT the drag ever reaching the arm threshold, so the detent that
    // normally fires at the line never fires at all. onEnd has to notice that
    // and tick once itself, or a thrown card grades in silence.
    test('the flick path commits below the arm threshold', () => {
      const flickTravel = 40;
      expect(flickTravel).toBeLessThan(THRESHOLD);
      expect(resolve(flickTravel, 1200).commit).toBe(true);
    });

    // Regression: velocity alone used to commit, so a quick jab that ended
    // where it started graded the card — and always as "Forgot", because the
    // direction was read from translationX === 0.
    test('does not commit a fast jab that barely moved', () => {
      expect(resolve(0, 2000).commit).toBe(false);
      expect(resolve(5, 2000).commit).toBe(false);
      expect(resolve(-5, -2000).commit).toBe(false);
    });

    // Regression: a flick whose velocity opposed its travel used to commit in
    // the direction of travel — grading the opposite of the user's intent.
    test('does not commit when velocity opposes the travel', () => {
      expect(resolve(40, -1200).commit).toBe(false);
      expect(resolve(-40, 1200).commit).toBe(false);
    });
  });

  // The swipe's only haptic. Release fires nothing on purpose, so this single
  // tick has to say both "you crossed the line" and "into which grade".
  describe('resolveDetentTone', () => {
    const tone = (armed: boolean, isRight: boolean) => {
      const { resolveDetentTone } = require('@/utils/gestureUtils');
      return resolveDetentTone(armed, isRight);
    };

    test('arming toward Knew it is the crisp detent', () => {
      expect(tone(true, true)).toBe('crisp');
    });

    // Regression: both directions used to fire the identical Rigid tick, so the
    // one haptic the swipe had told the user nothing about which way it went.
    // A miss reads heavier, matching how the grade bar weights its taps.
    test('arming toward Forgot is heavier than arming toward Knew it', () => {
      expect(tone(true, false)).toBe('heavy');
      expect(tone(true, false)).not.toBe(tone(true, true));
    });

    test('falling back below the line is the soft tick, whichever way it went', () => {
      expect(tone(false, true)).toBe('soft');
      expect(tone(false, false)).toBe('soft');
    });
  });

  // Whether a committed card leaves the screen. Extracted from the gesture
  // worklet for the same reason as resolveSwipeCommit above.
  describe('resolveCommitExit', () => {
    const exit = (policy: SwipeExitPolicy, isRight: boolean) => {
      const { resolveCommitExit } = require('@/utils/gestureUtils');
      return resolveCommitExit(policy, isRight);
    };

    test('a boolean policy applies to both directions', () => {
      expect(exit(true, true)).toBe(true);
      expect(exit(true, false)).toBe(true);
      expect(exit(false, true)).toBe(false);
      expect(exit(false, false)).toBe(false);
    });

    // Regression: the review card's "Forgot" swipe opens a restudy hold, so the
    // card must stay on screen. Under the old single boolean it flew off at full
    // opacity — nothing faded it, because the grade had not been committed yet —
    // and then teleported back to centre when the exit recentred on completion.
    test('a per-direction policy exits only the direction it names', () => {
      const reviewCard: SwipeExitPolicy = { left: false, right: true };

      expect(exit(reviewCard, true)).toBe(true);
      expect(exit(reviewCard, false)).toBe(false);
    });

    test('a per-direction policy can suppress both', () => {
      expect(exit({ left: false, right: false }, true)).toBe(false);
      expect(exit({ left: false, right: false }, false)).toBe(false);
    });
  });
});
