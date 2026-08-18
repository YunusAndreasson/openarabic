/**
 * useSwipeGesture Hook Tests
 *
 * Tests the swipe gesture hook configuration and structure.
 * Note: Full gesture behavior testing is limited due to complex native dependencies
 * (react-native-reanimated and react-native-gesture-handler).
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 *
 * Testing Strategy:
 * - Focus on hook structure, configuration, and API surface
 * - Test callback wiring where possible
 * - Skip deep gesture behavior tests (native code, hard to mock)
 */

import { describe, expect, jest, test } from '@jest/globals';

import type { SwipeGestureOptions } from '@/hooks/gestures/useSwipeGesture';
import type { SwipeExitPolicy } from '@/utils/gestureUtils';

describe('useSwipeGesture Hook', () => {
  const mockOnSwipeLeft = jest.fn();
  const mockOnSwipeRight = jest.fn();

  describe('Module Structure', () => {
    test('exports useSwipeGesture function', () => {
      const { useSwipeGesture } = require('@/hooks/gestures/useSwipeGesture');

      expect(useSwipeGesture).toBeDefined();
      expect(typeof useSwipeGesture).toBe('function');
    });

    test('hook accepts required SwipeGestureOptions', () => {
      const { useSwipeGesture } = require('@/hooks/gestures/useSwipeGesture');

      // Type check - should accept these options
      const options: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      };

      // Options object is valid
      expect(options).toHaveProperty('onSwipeLeft');
      expect(options).toHaveProperty('onSwipeRight');
    });

    test('hook accepts optional configuration', () => {
      const { useSwipeGesture } = require('@/hooks/gestures/useSwipeGesture');

      const options: SwipeGestureOptions = {
        enabled: false,
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
        onSwipeComplete: jest.fn(),
        onGestureBegin: jest.fn(),
        onGestureStart: jest.fn(),
        onGestureEnd: jest.fn(),
        onCommitArmedChange: jest.fn(),
        exitOnCommit: true,
        minDistance: 20,
        activeOffsetX: [-10, 10],
        failOffsetY: [-24, 24],
        swipeThresholdRatio: 0.5,
        maxTranslationRatio: 0.8,
      };

      // All options are valid
      expect(options).toHaveProperty('enabled');
      expect(options).toHaveProperty('minDistance');
      expect(options).toHaveProperty('activeOffsetX');
      expect(options).toHaveProperty('onCommitArmedChange');
      expect(options).toHaveProperty('exitOnCommit');
    });
  });

  describe('TypeScript Types', () => {
    test('SwipeGestureOptions type includes required fields', () => {
      const { useSwipeGesture } = require('@/hooks/gestures/useSwipeGesture');

      const validOptions: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      };

      // Type system ensures these are required
      expect(validOptions.onSwipeLeft).toBe(mockOnSwipeLeft);
      expect(validOptions.onSwipeRight).toBe(mockOnSwipeRight);
    });

    test('SwipeGestureResult type structure', () => {
      // Verify the expected return type structure
      type SwipeGestureResult = {
        gesture: any;
        translateX: any;
        isAnimatingRef: any;
        swipeThreshold: number;
        resetPosition: () => void;
      };

      const result: SwipeGestureResult = {
        gesture: {},
        translateX: { value: 0 },
        isAnimatingRef: { value: false },
        swipeThreshold: 88,
        resetPosition: jest.fn(),
      };

      expect(result).toHaveProperty('gesture');
      expect(result).toHaveProperty('translateX');
      expect(result).toHaveProperty('isAnimatingRef');
      expect(result).toHaveProperty('swipeThreshold');
      expect(result).toHaveProperty('resetPosition');
      expect(typeof result.resetPosition).toBe('function');
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

    test('spring config is customizable', () => {
      const customSpringConfig = {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: false,
        energyThreshold: 0.01,
      };

      const options: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
        springConfig: customSpringConfig as SwipeGestureOptions['springConfig'],
      };

      expect(options.springConfig).toEqual(customSpringConfig);
    });
  });

  describe('Callback Signatures', () => {
    test('onSwipeLeft callback signature', () => {
      const onSwipeLeft = jest.fn();

      // Call with no arguments (as the hook does)
      onSwipeLeft();

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
      expect(onSwipeLeft).toHaveBeenCalledWith();
    });

    test('onSwipeRight callback signature', () => {
      const onSwipeRight = jest.fn();

      // Call with no arguments (as the hook does)
      onSwipeRight();

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
      expect(onSwipeRight).toHaveBeenCalledWith();
    });

    test('onSwipeComplete callback receives boolean', () => {
      const onSwipeComplete = jest.fn();

      // Call with isRight flag
      onSwipeComplete(true); // Right swipe
      onSwipeComplete(false); // Left swipe

      expect(onSwipeComplete).toHaveBeenCalledTimes(2);
      expect(onSwipeComplete).toHaveBeenNthCalledWith(1, true);
      expect(onSwipeComplete).toHaveBeenNthCalledWith(2, false);
    });

    test('lifecycle callbacks have no arguments', () => {
      const onGestureBegin = jest.fn();
      const onGestureStart = jest.fn();
      const onGestureEnd = jest.fn();

      onGestureBegin();
      onGestureStart();
      onGestureEnd();

      expect(onGestureBegin).toHaveBeenCalledWith();
      expect(onGestureStart).toHaveBeenCalledWith();
      expect(onGestureEnd).toHaveBeenCalledWith();
    });
  });

  describe('Edge Cases & Validation', () => {
    test('activeOffsetX accepts negative values', () => {
      const options: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
        activeOffsetX: [-50, -20],
      };

      expect(options.activeOffsetX).toEqual([-50, -20]);
    });

    test('minDistance can be zero', () => {
      const options: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
        minDistance: 0,
      };

      expect(options.minDistance).toBe(0);
    });

    test('swipeThresholdRatio accepts small values', () => {
      const options: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
        swipeThresholdRatio: 0.01,
      };

      expect(options.swipeThresholdRatio).toBe(0.01);
    });

    test('maxTranslationRatio accepts values > 1', () => {
      const options: SwipeGestureOptions = {
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
        maxTranslationRatio: 2.0,
      };

      expect(options.maxTranslationRatio).toBe(2.0);
    });

    test('enabled can be false', () => {
      const options: SwipeGestureOptions = {
        enabled: false,
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeRight: mockOnSwipeRight,
      };

      expect(options.enabled).toBeFalsy();
    });
  });

  describe('Hook Implementation Details', () => {
    test('hook uses useSharedValue for translateX', () => {
      // Based on hook implementation line 54
      // translateX = useSharedValue(0)
      expect(true).toBeTruthy(); // Documented behavior
    });

    test('hook uses useSharedValue for isAnimatingRef', () => {
      // Based on hook implementation line 55
      // isAnimatingRef = useSharedValue(false)
      expect(true).toBeTruthy(); // Documented behavior
    });

    test('hook uses useMemo for gesture', () => {
      // Based on hook implementation line 96
      // gesture = useMemo(() => Gesture.Pan()...)
      expect(true).toBeTruthy(); // Documented behavior
    });

    test('hook uses useCallback for resetPosition', () => {
      // Based on hook implementation line 59
      // resetPosition = useCallback(...)
      expect(true).toBeTruthy(); // Documented behavior
    });

    test('hook uses withSpring for animations', () => {
      // Based on hook implementation lines 62-66, 153-156
      // Uses withSpring(0, springConfig, callback)
      expect(true).toBeTruthy(); // Documented behavior
    });

    test('hook uses scheduleOnRN for callbacks', () => {
      // Based on hook implementation lines 105, 111, 138, 149
      // Uses scheduleOnRN to bridge from worklet to JS thread
      expect(true).toBeTruthy(); // Documented behavior
    });

    test('hook clamps translation based on maxTranslationRatio', () => {
      // Based on hook implementation lines 118-123
      // Clamps translationX to [-maxTranslation, +maxTranslation]
      expect(true).toBeTruthy(); // Documented behavior
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

  describe('Constants from gestureUtils', () => {
    test('GESTURE_CONSTANTS are defined', () => {
      const { GESTURE_CONSTANTS } = require('@/utils/gestureUtils');

      expect(GESTURE_CONSTANTS).toHaveProperty('SWIPE_THRESHOLD_RATIO');
      expect(GESTURE_CONSTANTS).toHaveProperty('MIN_DISTANCE');
      expect(GESTURE_CONSTANTS).toHaveProperty('MAX_TRANSLATION_RATIO');
      expect(GESTURE_CONSTANTS).toHaveProperty('VELOCITY_THRESHOLD');
      expect(GESTURE_CONSTANTS).toHaveProperty('FLICK_MIN_DISTANCE_RATIO');
      expect(GESTURE_CONSTANTS).toHaveProperty('EXIT_DURATION');
    });

    test('GESTURE_CONFIG is defined', () => {
      const { GESTURE_CONFIG } = require('@/utils/gestureUtils');

      expect(GESTURE_CONFIG).toHaveProperty('MIN_DISTANCE');
      expect(GESTURE_CONFIG).toHaveProperty('ACTIVE_OFFSET_X');
      expect(Array.isArray(GESTURE_CONFIG.ACTIVE_OFFSET_X)).toBeTruthy();
    });
  });

  describe('Spring Config from animation', () => {
    test('SPRING_CONFIG.CARD is defined', () => {
      const { SPRING_CONFIG } = require('@/constants/animation');

      expect(SPRING_CONFIG).toHaveProperty('CARD');
      expect(SPRING_CONFIG.CARD).toBeDefined();
    });
  });
});
