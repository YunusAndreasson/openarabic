import { renderHook, act } from '@testing-library/react-hooks';
import { useAnimationTrigger } from '../../hooks/useAnimationTrigger';

// Add a console log to see if the test is running
console.log('Running useAnimationTrigger tests...');

describe('useAnimationTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with animations not triggered', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(false, true, false, startAnimation));

    expect(result.current.animationsTriggered).toBe(false);
  });

  test('should trigger animations when conditions are met', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(true, true, false, startAnimation));

    // After initial render, animations should be triggered
    expect(startAnimation).toHaveBeenCalled();
    expect(result.current.animationsTriggered).toBe(true);
  });

  test('should not trigger animations when data is not ready', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(false, true, false, startAnimation));

    expect(startAnimation).not.toHaveBeenCalled();
    expect(result.current.animationsTriggered).toBe(false);
  });

  test('should not trigger animations when layout is not ready', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(true, false, false, startAnimation));

    expect(startAnimation).not.toHaveBeenCalled();
    expect(result.current.animationsTriggered).toBe(false);
  });

  test('should not trigger animations when loading', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(true, true, true, startAnimation));

    expect(startAnimation).not.toHaveBeenCalled();
    expect(result.current.animationsTriggered).toBe(false);
  });

  test('should respect delay parameter', () => {
    const startAnimation = jest.fn();
    renderHook(() => useAnimationTrigger(true, true, false, startAnimation, 100));

    // Before delay, animation should not be triggered
    expect(startAnimation).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // After delay, animation should be triggered
    expect(startAnimation).toHaveBeenCalled();
  });

  test('should reset animations when conditions change', () => {
    const startAnimation = jest.fn();
    const { result, rerender } = renderHook(
      ({ isDataReady }) => useAnimationTrigger(isDataReady, true, false, startAnimation),
      { initialProps: { isDataReady: true } }
    );

    // Initially animations should be triggered
    expect(result.current.animationsTriggered).toBe(true);

    // Change data ready state
    rerender({ isDataReady: false });

    // Animations should be reset
    expect(result.current.animationsTriggered).toBe(false);
  });

  test('should manually trigger animations', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(false, true, false, startAnimation));

    // Initially animations should not be triggered
    expect(result.current.animationsTriggered).toBe(false);

    act(() => {
      result.current.triggerAnimations();
    });

    // After manual trigger, animations should be triggered
    expect(startAnimation).toHaveBeenCalled();
    expect(result.current.animationsTriggered).toBe(true);
  });

  test('should reset animations when resetAnimations is called', () => {
    const startAnimation = jest.fn();
    const { result } = renderHook(() => useAnimationTrigger(true, true, false, startAnimation));

    // Initially animations should be triggered
    expect(result.current.animationsTriggered).toBe(true);

    // Reset animations
    act(() => {
      result.current.resetAnimations();
    });

    // Animations should be reset
    expect(result.current.animationsTriggered).toBe(false);

    // startAnimation should not be called again immediately after reset
    startAnimation.mockClear();

    // Verify that animations don't auto-trigger immediately after reset
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(startAnimation).not.toHaveBeenCalled();
  });

  test('should clear timeout when unmounted', () => {
    const startAnimation = jest.fn();
    const { unmount } = renderHook(() =>
      useAnimationTrigger(true, true, false, startAnimation, 500)
    );

    // Clear the mock to focus on calls after unmount
    startAnimation.mockClear();

    // Unmount the component before the delay completes
    unmount();

    // Advance timers past the delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Animation should not be triggered after unmount
    expect(startAnimation).not.toHaveBeenCalled();
  });

  test('should handle rapid changes in isDataReady', () => {
    const startAnimation = jest.fn();
    const { rerender } = renderHook(
      ({ isDataReady }) => useAnimationTrigger(isDataReady, true, false, startAnimation, 100),
      { initialProps: { isDataReady: false } }
    );

    // Change to true
    rerender({ isDataReady: true });

    // Change back to false before delay completes
    rerender({ isDataReady: false });

    // Advance timers past the delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Animation should not be triggered
    expect(startAnimation).not.toHaveBeenCalled();
  });

  test('should handle rapid changes in isLoading', () => {
    const startAnimation = jest.fn();
    const { rerender } = renderHook(
      ({ isLoading }) => useAnimationTrigger(true, true, isLoading, startAnimation),
      { initialProps: { isLoading: true } }
    );

    // Initially animations should not be triggered due to loading
    expect(startAnimation).not.toHaveBeenCalled();

    // Stop loading
    rerender({ isLoading: false });

    // Animation should be triggered
    expect(startAnimation).toHaveBeenCalled();

    // Reset mock
    startAnimation.mockClear();

    // Start loading again
    rerender({ isLoading: true });

    // Stop loading again
    rerender({ isLoading: false });

    // Animation should be triggered again
    expect(startAnimation).toHaveBeenCalled();
  });

  test('should not trigger animations multiple times if conditions remain met', () => {
    const startAnimation = jest.fn();
    const { rerender } = renderHook(
      ({ isLayoutReady }) => useAnimationTrigger(true, isLayoutReady, false, startAnimation),
      { initialProps: { isLayoutReady: true } }
    );

    // Animation should be triggered once initially
    expect(startAnimation).toHaveBeenCalledTimes(1);

    // Rerender with same props
    rerender({ isLayoutReady: true });

    // Animation should not be triggered again
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });

  test('should handle case when all conditions become ready simultaneously', () => {
    const startAnimation = jest.fn();
    const { rerender } = renderHook(
      ({ isDataReady, isLayoutReady, isLoading }) =>
        useAnimationTrigger(isDataReady, isLayoutReady, isLoading, startAnimation),
      { initialProps: { isDataReady: false, isLayoutReady: false, isLoading: true } }
    );

    // Initially no conditions are met
    expect(startAnimation).not.toHaveBeenCalled();

    // Make all conditions ready at once
    rerender({ isDataReady: true, isLayoutReady: true, isLoading: false });

    // Animation should be triggered
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });

  test('should handle zero delay correctly', () => {
    const startAnimation = jest.fn();
    renderHook(() => useAnimationTrigger(true, true, false, startAnimation, 0));

    // With zero delay, animation should be triggered immediately
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });

  test('should handle negative delay as zero', () => {
    const startAnimation = jest.fn();
    renderHook(() => useAnimationTrigger(true, true, false, startAnimation, -100));

    // With negative delay (treated as zero), animation should be triggered immediately
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });

  test('should prevent immediate re-triggering after reset', () => {
    const startAnimation = jest.fn();
    const { result, rerender } = renderHook(
      ({ isDataReady }) => useAnimationTrigger(isDataReady, true, false, startAnimation),
      { initialProps: { isDataReady: true } }
    );

    // Initially animations should be triggered
    expect(startAnimation).toHaveBeenCalledTimes(1);
    expect(result.current.animationsTriggered).toBe(true);

    // Reset animations
    act(() => {
      result.current.resetAnimations();
    });

    // Animations should be reset
    expect(result.current.animationsTriggered).toBe(false);

    // Rerender with same props - should not trigger animations again immediately
    rerender({ isDataReady: true });

    // Animation should not be triggered again immediately after reset
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });

  test('should handle rapid changes in isDataReady', () => {
    const startAnimation = jest.fn();
    const { rerender } = renderHook(
      ({ isDataReady }) => useAnimationTrigger(isDataReady, true, false, startAnimation, 50),
      { initialProps: { isDataReady: false } }
    );

    // Initially animations should not be triggered
    expect(startAnimation).not.toHaveBeenCalled();

    // Rapidly change isDataReady multiple times
    rerender({ isDataReady: true });
    rerender({ isDataReady: false });
    rerender({ isDataReady: true });
    rerender({ isDataReady: false });
    rerender({ isDataReady: true });

    // Before delay, animation should not be triggered
    expect(startAnimation).not.toHaveBeenCalled();

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Animation should be triggered once after delay
    expect(startAnimation).toHaveBeenCalledTimes(1);
  });
});
