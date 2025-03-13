/**
 * Enhanced tests for useFadeInAnimation
 *
 * These tests verify the hook's API surface and behavior with different parameters.
 * The actual animation behavior is handled by the react-native-reanimated library,
 * which we're mocking here.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useFadeInAnimation } from '../../../hooks/animations';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn(val => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({ opacity: 0, transform: [{ translateY: 15 }] })),
    withTiming: jest.fn((val, config, callback) => {
      // Call the callback if provided
      if (callback) {
        callback(true);
      }
      return val;
    }),
    withDelay: jest.fn((delay, animation, callback) => {
      // Call the callback if provided
      if (callback) {
        callback(true);
      }
      return animation;
    }),
    FadeIn: {
      duration: jest.fn().mockReturnValue({
        delay: jest.fn().mockReturnValue({}),
      }),
    },
    FadeOut: {
      duration: jest.fn().mockReturnValue({
        delay: jest.fn().mockReturnValue({}),
      }),
    },
    runOnJS: jest.fn(fn => fn),
  };
});

describe('useFadeInAnimation', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('has the expected API surface', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('startAnimation');
    expect(typeof result.current.startAnimation).toBe('function');
    expect(result.current).toHaveProperty('reverseAnimation');
    expect(typeof result.current.reverseAnimation).toBe('function');
    expect(result.current).toHaveProperty('opacity');
    expect(result.current).toHaveProperty('entering');
    expect(result.current).toHaveProperty('exiting');
  });

  it('initializes with the correct default values', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Default initial opacity should be 0
    expect(result.current.opacity.value).toBe(0);
  });

  it('initializes with custom initial opacity', () => {
    const initialOpacity = 0.5;
    const { result } = renderHook(() => useFadeInAnimation(initialOpacity));

    expect(result.current.opacity.value).toBe(initialOpacity);
  });

  it('initializes with custom duration', () => {
    const customDuration = 500;
    const { result } = renderHook(() => useFadeInAnimation(0, customDuration));

    // We can't directly test the duration since it's used internally,
    // but we can ensure the hook doesn't crash with custom duration
    expect(result.current).toHaveProperty('animatedStyle');
  });

  it('calls the completion callback when animation finishes', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Create a mock callback
    const mockCallback = jest.fn();

    // Start the animation with the callback
    act(() => {
      result.current.startAnimation(0, mockCallback);
    });

    // The mock implementation of withTiming immediately calls the callback
    // so we can verify it was called
    expect(mockCallback).toHaveBeenCalled();
  });

  it('calls the completion callback when reverse animation finishes', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Create a mock callback
    const mockCallback = jest.fn();

    // Start the reverse animation with the callback
    act(() => {
      result.current.reverseAnimation(0, mockCallback);
    });

    // The mock implementation of withTiming immediately calls the callback
    // so we can verify it was called
    expect(mockCallback).toHaveBeenCalled();
  });

  it('handles animation with delay', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Start the animation with a delay
    const delay = 300;
    act(() => {
      result.current.startAnimation(delay);
    });

    // We can't test the actual delay timing, but we can verify
    // the withDelay function was called with the correct delay
    const reanimated = require('react-native-reanimated');
    expect(reanimated.withDelay).toHaveBeenCalledWith(delay, expect.anything());
  });

  it('configures entering and exiting animations with the correct duration', () => {
    const customDuration = 750;
    const { result } = renderHook(() => useFadeInAnimation(0, customDuration));

    // Verify that FadeIn.duration and FadeOut.duration were called with the correct duration
    const reanimated = require('react-native-reanimated');

    // Check that entering and exiting properties exist
    expect(result.current.entering).toBeDefined();
    expect(result.current.exiting).toBeDefined();

    // Verify FadeIn.duration was called with the custom duration
    expect(reanimated.FadeIn.duration).toHaveBeenCalledWith(customDuration);

    // Verify FadeOut.duration was called with the custom duration
    expect(reanimated.FadeOut.duration).toHaveBeenCalledWith(customDuration);
  });

  it('configures entering and exiting animations with default duration when not specified', () => {
    // Default duration should be 300ms
    const { result } = renderHook(() => useFadeInAnimation());

    // Verify that FadeIn.duration and FadeOut.duration were called with the default duration
    const reanimated = require('react-native-reanimated');

    // Check that entering and exiting properties exist
    expect(result.current.entering).toBeDefined();
    expect(result.current.exiting).toBeDefined();

    // Verify FadeIn.duration was called with the default duration (300)
    expect(reanimated.FadeIn.duration).toHaveBeenCalledWith(300);

    // Verify FadeOut.duration was called with the default duration (300)
    expect(reanimated.FadeOut.duration).toHaveBeenCalledWith(300);
  });

  it('handles extreme initial opacity values', () => {
    // Test with negative value (should be clamped to 0 internally by Reanimated)
    const { result: resultNegative } = renderHook(() => useFadeInAnimation(-0.5));
    expect(resultNegative.current.opacity.value).toBe(-0.5);

    // Test with value > 1 (should be clamped to 1 internally by Reanimated)
    const { result: resultHigh } = renderHook(() => useFadeInAnimation(1.5));
    expect(resultHigh.current.opacity.value).toBe(1.5);
  });

  it('handles multiple sequential animation calls', () => {
    const { result } = renderHook(() => useFadeInAnimation());
    const reanimated = require('react-native-reanimated');

    // Start animation
    act(() => {
      result.current.startAnimation(0);
    });

    // Verify withTiming was called once
    expect(reanimated.withTiming).toHaveBeenCalledTimes(1);
    expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.anything(), expect.anything());

    // Reset mock
    reanimated.withTiming.mockClear();

    // Call reverse animation
    act(() => {
      result.current.reverseAnimation(0);
    });

    // Verify withTiming was called again with initial opacity
    expect(reanimated.withTiming).toHaveBeenCalledTimes(1);
    expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.anything(), expect.anything());
  });

  it('handles animation with different initial opacity values', () => {
    const initialOpacity = 0.3;
    const { result } = renderHook(() => useFadeInAnimation(initialOpacity));
    const reanimated = require('react-native-reanimated');

    // Start animation
    act(() => {
      result.current.startAnimation(0);
    });

    // Verify withTiming was called with target opacity 1
    expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.anything(), expect.anything());

    // Reset mock
    reanimated.withTiming.mockClear();

    // Call reverse animation
    act(() => {
      result.current.reverseAnimation(0);
    });

    // Verify withTiming was called with initial opacity
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      initialOpacity,
      expect.anything(),
      expect.anything()
    );
  });

  it('handles animation callbacks with error state', () => {
    // Override the withTiming mock to simulate an error
    const reanimated = require('react-native-reanimated');
    reanimated.withTiming.mockImplementationOnce(
      (value: number, config: any, callback?: (finished: boolean) => void) => {
        if (callback) {
          // Call with false to indicate error/cancellation
          callback(false);
        }
        return value;
      }
    );

    const { result } = renderHook(() => useFadeInAnimation());
    const mockCallback = jest.fn();

    // Start animation with callback
    act(() => {
      result.current.startAnimation(0, mockCallback);
    });

    // Callback should still be called even with error state
    expect(mockCallback).toHaveBeenCalled();
  });

  it('handles animation with zero duration', () => {
    const { result } = renderHook(() => useFadeInAnimation(0, 0));
    const reanimated = require('react-native-reanimated');

    // Start animation
    act(() => {
      result.current.startAnimation(0);
    });

    // Verify withTiming was called with duration 0
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 0 }),
      expect.anything()
    );
  });

  it('creates consistent animated style based on opacity value', () => {
    const { result } = renderHook(() => useFadeInAnimation());
    const reanimated = require('react-native-reanimated');

    // Verify useAnimatedStyle was called
    expect(reanimated.useAnimatedStyle).toHaveBeenCalled();

    // The actual style is mocked, but we can verify it exists
    expect(result.current.animatedStyle).toBeDefined();
  });

  it('handles multiple animation calls with different delays', () => {
    const { result } = renderHook(() => useFadeInAnimation());
    const reanimated = require('react-native-reanimated');

    // Start animation with first delay
    act(() => {
      result.current.startAnimation(100);
    });

    // Verify withDelay was called with first delay
    expect(reanimated.withDelay).toHaveBeenCalledWith(100, expect.anything());

    // Reset mock
    reanimated.withDelay.mockClear();

    // Start animation with second delay
    act(() => {
      result.current.startAnimation(200);
    });

    // Verify withDelay was called with second delay
    expect(reanimated.withDelay).toHaveBeenCalledWith(200, expect.anything());
  });
});
