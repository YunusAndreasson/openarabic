import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { useStableBoolean } from '@/hooks/ui/useStableBoolean';

describe('useStableBoolean', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with the input value', () => {
    const { result } = renderHook(() => useStableBoolean(true));

    expect(result.current).toBe(true);
  });

  it('should delay state changes by default delay', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value), {
      initialProps: { value: false },
    });

    expect(result.current).toBe(false);

    // Change value
    rerender({ value: true });

    // Should not change immediately
    expect(result.current).toBe(false);

    // Advance time by default delay (TIMING_CONSTANTS.QUICK_DELAY)
    act(() => {
      jest.advanceTimersByTime(TIMING_CONSTANTS.QUICK_DELAY);
    });

    // Should now be updated
    expect(result.current).toBe(true);
  });

  it('should delay state changes by custom delay', () => {
    const customDelay = 500;
    const { result, rerender } = renderHook(({ value, delay }) => useStableBoolean(value, delay), {
      initialProps: { value: false, delay: customDelay },
    });

    expect(result.current).toBe(false);

    rerender({ value: true, delay: customDelay });

    expect(result.current).toBe(false);

    // Advance by half the delay - should not update yet
    act(() => {
      jest.advanceTimersByTime(customDelay / 2);
    });

    expect(result.current).toBe(false);

    // Advance by remaining time
    act(() => {
      jest.advanceTimersByTime(customDelay / 2);
    });

    expect(result.current).toBe(true);
  });

  it('should handle true to false transition', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 100), {
      initialProps: { value: true },
    });

    expect(result.current).toBe(true);

    rerender({ value: false });

    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(false);
  });

  it('should handle multiple rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 100), {
      initialProps: { value: false },
    });

    // Change to true
    rerender({ value: true });

    act(() => {
      jest.advanceTimersByTime(50); // Only halfway
    });

    // Change back to false before timer completes
    rerender({ value: false });

    // Timer should be reset
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should now be false (last value)
    expect(result.current).toBe(false);
  });

  it('should cancel pending timer when value changes again', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 100), {
      initialProps: { value: false },
    });

    rerender({ value: true });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Change to different value before timeout
    rerender({ value: false });

    // Original timer should be cancelled
    act(() => {
      jest.advanceTimersByTime(50); // Complete original timer duration
    });

    expect(result.current).toBe(false);

    // Complete new timer
    act(() => {
      jest.advanceTimersByTime(50); // Another 50ms for new timer
    });

    expect(result.current).toBe(false);
  });

  it('should not create timer when value stays the same', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 100), {
      initialProps: { value: true },
    });

    expect(result.current).toBe(true);

    // "Change" to same value
    rerender({ value: true });

    // Should remain true immediately (no delay since value didn't change)
    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);
  });

  it('should handle false -> true -> false -> true sequence', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 100), {
      initialProps: { value: false },
    });

    // false -> true
    rerender({ value: true });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);

    // true -> false
    rerender({ value: false });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);

    // false -> true
    rerender({ value: true });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);
  });

  it('should cleanup timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useStableBoolean(value, 100), {
      initialProps: { value: false },
    });

    rerender({ value: true });

    expect(result.current).toBe(false);

    // Unmount before timer completes
    unmount();

    // Timer should be cleaned up - advancing time should not cause issues
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // No errors should occur
  });

  it('should work with zero delay', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 0), {
      initialProps: { value: false },
    });

    rerender({ value: true });

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe(true);
  });

  it('should stabilize flickering boolean values', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value, 200), {
      initialProps: { value: true },
    });

    expect(result.current).toBe(true);

    // Simulate flicker: true -> false -> true quickly
    rerender({ value: false });
    expect(result.current).toBe(true); // Still true

    act(() => {
      jest.advanceTimersByTime(50);
    });

    rerender({ value: true }); // Back to true before delay completes
    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should remain true (no flicker visible)
    expect(result.current).toBe(true);
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useStableBoolean(value, delay), {
      initialProps: { value: false, delay: 100 },
    });

    rerender({ value: true, delay: 100 });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);

    // Change delay for next transition
    rerender({ value: false, delay: 200 });

    act(() => {
      jest.advanceTimersByTime(100); // Not enough for new delay
    });

    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(100); // Total 200ms
    });

    expect(result.current).toBe(false);
  });
});
