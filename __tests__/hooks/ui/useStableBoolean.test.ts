import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { useStableBoolean } from '@/hooks/ui/useStableBoolean';

describe('useStableBoolean', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with the provided value', () => {
    const { result } = renderHook(() => useStableBoolean(true));
    expect(result.current).toBe(true);
  });

  it('should delay updating the value', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value), {
      initialProps: { value: false },
    });

    expect(result.current).toBe(false);

    // Change the value
    rerender({ value: true });

    // Should still be false before delay
    expect(result.current).toBe(false);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should now be true after delay
    expect(result.current).toBe(true);
  });

  it('should cancel pending updates when value changes again', () => {
    const { result, rerender } = renderHook(({ value }) => useStableBoolean(value), {
      initialProps: { value: false },
    });

    // Change to true
    rerender({ value: true });
    expect(result.current).toBe(false);

    // Change back to false before delay completes
    rerender({ value: false });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should still be false (cancelled the true update)
    expect(result.current).toBe(false);
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useStableBoolean(value, delay), {
      initialProps: { value: false, delay: 500 },
    });

    rerender({ value: true, delay: 500 });

    // After 100ms, should still be false
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);

    // After 500ms, should be true
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe(true);
  });
});
