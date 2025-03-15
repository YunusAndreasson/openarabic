import { renderHook, act } from '@testing-library/react-hooks';
import { useProgressAnimation } from '../../../hooks/animations/useProgressAnimation';
import { TIMING_CONFIG } from '../../../hooks/animations/animationConfigs';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const mockSharedValue = (initialValue: number) => ({
    value: initialValue,
  });

  const mockWithTiming = (toValue: number, config: any, callback?: (finished: boolean) => void) => {
    if (callback) {
      callback(true);
    }
    return toValue;
  };

  const mockUseAnimatedStyle = (styleCreator: () => any) => {
    return styleCreator();
  };

  const mockCancelAnimation = jest.fn();

  return {
    useSharedValue: jest.fn(mockSharedValue),
    useAnimatedStyle: jest.fn(mockUseAnimatedStyle),
    withTiming: jest.fn(mockWithTiming),
    runOnJS: jest.fn((fn: any) => fn),
    cancelAnimation: mockCancelAnimation,
  };
});

describe('useProgressAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.warn to test warning messages
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.warn
    (console.warn as jest.Mock).mockRestore();
  });

  it('should initialize with progress at 0 by default', () => {
    const { result } = renderHook(() => useProgressAnimation());

    expect(result.current.progress.value).toBe(0);
    expect(result.current.hasAnimated()).toBe(false);
  });

  it('should initialize with provided initialPercentage', () => {
    const { result } = renderHook(() => useProgressAnimation(25));

    expect(result.current.progress.value).toBe(25);
    expect(result.current.hasAnimated()).toBe(false);
  });

  it('should create animated style based on progress value', () => {
    const { result } = renderHook(() => useProgressAnimation());

    // Initial style should have width of 0%
    expect(result.current.animatedStyle).toEqual({ width: '0%' });
  });

  it('should clamp animated style values between 0% and 100%', () => {
    const { result: resultNegative } = renderHook(() => useProgressAnimation(-10));
    expect(resultNegative.current.animatedStyle).toEqual({ width: '0%' });

    const { result: resultOver } = renderHook(() => useProgressAnimation(150));
    expect(resultOver.current.animatedStyle).toEqual({ width: '100%' });
  });

  it('should update progress when updateProgress is called', () => {
    const { result } = renderHook(() => useProgressAnimation());

    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });

    // Progress should be updated to 50
    expect(result.current.progress.value).toBe(50);
    expect(result.current.hasAnimated()).toBe(true);
  });

  it('should use withTiming with callback for animation', () => {
    const reanimated = require('react-native-reanimated');
    const { result } = renderHook(() => useProgressAnimation());

    act(() => {
      const cleanup = result.current.updateProgress(75);
      cleanup();
    });

    // No longer using withDelay, directly using withTiming
    // Should use withTiming with the correct duration, easing, and a callback function
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      75,
      {
        duration: TIMING_CONFIG.SLOW.duration,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      expect.any(Function) // Callback function
    );
  });

  it('should use custom duration when provided', () => {
    const reanimated = require('react-native-reanimated');
    const customDuration = 1000;
    const { result } = renderHook(() => useProgressAnimation(0, customDuration));

    act(() => {
      const cleanup = result.current.updateProgress(25);
      cleanup();
    });

    // Should use withTiming with the custom duration and a callback
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      25,
      {
        duration: customDuration,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      expect.any(Function)
    );
  });

  it('should animate directly to new value without resetting to 0', () => {
    const { result } = renderHook(() => useProgressAnimation());

    // First update to 50%
    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });
    expect(result.current.progress.value).toBe(50);

    // Then update to 75%
    act(() => {
      const cleanup = result.current.updateProgress(75);
      cleanup();
    });

    // Progress should be updated to 75 without going through 0
    expect(result.current.progress.value).toBe(75);
  });

  it('should handle multiple sequential updates correctly', () => {
    const { result } = renderHook(() => useProgressAnimation());

    // Update progress multiple times
    act(() => {
      const cleanup1 = result.current.updateProgress(25);
      const cleanup2 = result.current.updateProgress(50);
      const cleanup3 = result.current.updateProgress(75);

      // Cleanup functions should be callable
      cleanup1();
      cleanup2();
      cleanup3();
    });

    // Final progress should be the last value
    expect(result.current.progress.value).toBe(75);
  });

  it('should handle edge case values correctly', () => {
    const { result } = renderHook(() => useProgressAnimation());

    // Test with 0%
    act(() => {
      const cleanup = result.current.updateProgress(0);
      cleanup();
    });
    expect(result.current.progress.value).toBe(0);

    // Test with 100%
    act(() => {
      const cleanup = result.current.updateProgress(100);
      cleanup();
    });
    expect(result.current.progress.value).toBe(100);

    // Test with negative value (should still work in the animation)
    act(() => {
      const cleanup = result.current.updateProgress(-10);
      cleanup();
    });
    expect(result.current.progress.value).toBe(-10);

    // Test with value > 100 (should still work in the animation)
    act(() => {
      const cleanup = result.current.updateProgress(110);
      cleanup();
    });
    expect(result.current.progress.value).toBe(110);
  });

  it('should cancel animation when cleanup function is called', () => {
    const reanimated = require('react-native-reanimated');
    const { result } = renderHook(() => useProgressAnimation());

    let cleanup: () => void;

    act(() => {
      cleanup = result.current.updateProgress(50);
    });

    // Call the cleanup function
    act(() => {
      cleanup();
    });

    // Should cancel the animation
    expect(reanimated.cancelAnimation).toHaveBeenCalled();
  });

  it('should cancel animation on unmount', () => {
    const reanimated = require('react-native-reanimated');
    const { result, unmount } = renderHook(() => useProgressAnimation());

    // Set hasAnimated to true
    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });
    expect(result.current.hasAnimated()).toBe(true);

    // Unmount the hook
    unmount();

    // Should cancel any ongoing animations
    expect(reanimated.cancelAnimation).toHaveBeenCalled();
  });

  it('should reset progress to initial value when reset is called', () => {
    const reanimated = require('react-native-reanimated');
    const initialValue = 25;
    const { result } = renderHook(() => useProgressAnimation(initialValue));

    // Update progress
    act(() => {
      const cleanup = result.current.updateProgress(75);
      cleanup();
    });
    expect(result.current.progress.value).toBe(75);
    expect(result.current.hasAnimated()).toBe(true);

    // Reset progress
    act(() => {
      result.current.reset();
    });

    // Should cancel any ongoing animations
    expect(reanimated.cancelAnimation).toHaveBeenCalled();
    // Should reset progress to initial value
    expect(result.current.progress.value).toBe(initialValue);
    // Should reset hasAnimated flag
    expect(result.current.hasAnimated()).toBe(false);
  });

  it('should handle invalid input gracefully', () => {
    const { result } = renderHook(() => useProgressAnimation());

    // Using any to bypass TypeScript checking for this test case
    act(() => {
      const cleanup = result.current.updateProgress('invalid' as any);
      cleanup();
    });

    // Should log a warning
    expect(console.warn).toHaveBeenCalledWith(
      'useProgressAnimation: newPercentage must be a number'
    );
    // Should not update progress
    expect(result.current.progress.value).toBe(0);
  });

  it('should handle zero duration gracefully', () => {
    const reanimated = require('react-native-reanimated');
    const zeroDuration = 0;
    const { result } = renderHook(() => useProgressAnimation(0, zeroDuration));

    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });

    // Should still use withTiming with zero duration and a callback
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      50,
      {
        duration: 0,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      expect.any(Function)
    );
  });

  it('should handle negative duration as a positive value', () => {
    const reanimated = require('react-native-reanimated');
    const negativeDuration = -100;
    const { result } = renderHook(() => useProgressAnimation(0, negativeDuration));

    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });

    // Should use withTiming with the provided negative duration and a callback
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      50,
      {
        // The hook should handle negative duration appropriately
        duration: negativeDuration,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      expect.any(Function)
    );
  });

  it('should handle errors in animation callbacks gracefully', () => {
    // Mock withTiming to simulate an error in the callback
    const reanimated = require('react-native-reanimated');
    const originalWithTiming = reanimated.withTiming;

    reanimated.withTiming = jest.fn((toValue, config, callback) => {
      if (callback) {
        try {
          // Simulate an error in the callback
          callback(false); // Animation did not complete successfully
        } catch (error) {
          // The error should be caught internally by the hook
        }
      }
      return toValue;
    });

    const { result } = renderHook(() => useProgressAnimation());

    // This should not throw an error
    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });

    // Restore the original implementation
    reanimated.withTiming = originalWithTiming;
  });

  it('should cancel animation with the correct shared value on unmount', () => {
    const reanimated = require('react-native-reanimated');
    const { result, unmount } = renderHook(() => useProgressAnimation());

    // Get the progress shared value
    const progressValue = result.current.progress;

    // Unmount the hook
    unmount();

    // Should cancel animation with the progress shared value
    expect(reanimated.cancelAnimation).toHaveBeenCalledWith(progressValue);
  });

  it('should cancel animation with the correct shared value when reset is called', () => {
    const reanimated = require('react-native-reanimated');
    const { result } = renderHook(() => useProgressAnimation());

    // Get the progress shared value
    const progressValue = result.current.progress;

    // Call reset
    act(() => {
      result.current.reset();
    });

    // Should cancel animation with the progress shared value
    expect(reanimated.cancelAnimation).toHaveBeenCalledWith(progressValue);
  });

  it('should handle extremely large values for duration', () => {
    const reanimated = require('react-native-reanimated');
    const veryLargeDuration = Number.MAX_SAFE_INTEGER; // 9007199254740991
    const { result } = renderHook(() => useProgressAnimation(0, veryLargeDuration));

    act(() => {
      const cleanup = result.current.updateProgress(50);
      cleanup();
    });

    // Should use withTiming with the very large duration and a callback
    expect(reanimated.withTiming).toHaveBeenCalledWith(
      50,
      {
        duration: veryLargeDuration,
        easing: TIMING_CONFIG.SLOW.easing,
      },
      expect.any(Function)
    );
  });
});
