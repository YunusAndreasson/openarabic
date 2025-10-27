import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { useDebounce } from '@/hooks/animations/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should execute callback immediately on first call', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    const [debouncedCallback] = result.current;

    act(() => {
      debouncedCallback();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should block subsequent calls during debounce period', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    // First call executes
    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Second and third calls are blocked
    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback(); // Should be blocked
    });

    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback(); // Should be blocked
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should allow execution after debounce delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    const [debouncedCallback] = result.current;

    act(() => {
      debouncedCallback(); // First call
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(300); // Wait for debounce period
    });

    act(() => {
      debouncedCallback(); // Should work after delay
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should return isDebouncing state', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    const [, isDebouncing1] = result.current;
    expect(isDebouncing1).toBe(false);

    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback();
    });

    const [, isDebouncing2] = result.current;
    expect(isDebouncing2).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const [, isDebouncing3] = result.current;
    expect(isDebouncing3).toBe(false);
  });

  it('should pass arguments to the callback', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    const [debouncedCallback] = result.current;

    act(() => {
      debouncedCallback('arg1', 'arg2', 123);
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should return the callback result', () => {
    const callback = jest.fn().mockReturnValue('result');
    const { result } = renderHook(() => useDebounce(callback, 300));

    const [debouncedCallback] = result.current;

    let returnValue: string | undefined;
    act(() => {
      returnValue = debouncedCallback();
    });

    expect(returnValue).toBe('result');
  });

  it('should work with custom delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 500));

    const [debouncedCallback] = result.current;

    act(() => {
      debouncedCallback();
    });

    act(() => {
      jest.advanceTimersByTime(400); // Not enough time
    });

    const [, isDebouncing1] = result.current;
    expect(isDebouncing1).toBe(true);

    act(() => {
      jest.advanceTimersByTime(100); // Total 500ms
    });

    const [, isDebouncing2] = result.current;
    expect(isDebouncing2).toBe(false);
  });

  it('should reset timer on new debounce attempts', async () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback(); // First call
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // After advancing time, isDebouncing should still be true
    const [, isDebouncing1] = result.current;
    expect(isDebouncing1).toBe(true);

    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback(); // Second call - should be blocked
    });

    // Still 1 because second call was blocked
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(200); // Total 300ms from first call
    });

    const [, isDebouncing2] = result.current;
    expect(isDebouncing2).toBe(false);
  });

  it('should handle rapid successive calls', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    // First call executes immediately
    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Subsequent calls within debounce period are blocked
    for (let i = 0; i < 9; i++) {
      act(() => {
        const [debouncedCallback] = result.current;
        debouncedCallback();
      });
    }

    // Should still be 1 - all other calls blocked
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should work with default delay (300ms) when not specified', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce(callback));

    act(() => {
      const [debouncedCallback] = result.current;
      debouncedCallback();
    });

    act(() => {
      jest.advanceTimersByTime(299);
    });

    const [, isDebouncing1] = result.current;
    expect(isDebouncing1).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    const [, isDebouncing2] = result.current;
    expect(isDebouncing2).toBe(false);
  });
});
