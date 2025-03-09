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

    // Start with animations not triggered
    const { result, rerender } = renderHook(
      ({ isDataReady }) => useAnimationTrigger(isDataReady, true, false, startAnimation),
      { initialProps: { isDataReady: false } }
    );

    // Initially animations should not be triggered
    expect(result.current.animationsTriggered).toBe(false);

    // Trigger animations by changing data ready state
    rerender({ isDataReady: true });

    // Now animations should be triggered
    expect(result.current.animationsTriggered).toBe(true);

    // Reset animations
    act(() => {
      result.current.resetAnimations();
    });

    // After reset, animations should not be triggered
    expect(result.current.animationsTriggered).toBe(false);
  });
});
