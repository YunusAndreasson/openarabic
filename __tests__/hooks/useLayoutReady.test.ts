import { renderHook, act } from '@testing-library/react-hooks';
import { useLayoutReady } from '../../hooks/useLayoutReady';

describe('useLayoutReady', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('should initialize with layout not ready', () => {
    // Override the default mock to not call the callback immediately
    global.requestAnimationFrame = jest.fn(() => 1);

    const { result } = renderHook(() => useLayoutReady());

    // Initially not ready
    expect(result.current.isLayoutReady).toBe(false);
  });

  test('should set layout ready after animation frame', () => {
    const { result } = renderHook(() => useLayoutReady());

    // After animation frame callback, should be ready
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should respect delay parameter', () => {
    // Override the default mock to call the callback immediately
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    const { result } = renderHook(() => useLayoutReady(100));

    // After animation frame but before delay, should not be ready
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // After delay, should be ready
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should reset layout ready state', () => {
    const { result } = renderHook(() => useLayoutReady());

    // After animation frame, should be ready
    expect(result.current.isLayoutReady).toBe(true);

    act(() => {
      result.current.resetLayout();
    });

    // After reset, should not be ready
    expect(result.current.isLayoutReady).toBe(false);
  });

  test('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useLayoutReady(100));

    unmount();

    // Should cancel animation frame
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  test('should handle environments where requestAnimationFrame is not available', () => {
    // Temporarily remove requestAnimationFrame
    const originalRequestAnimationFrame = global.requestAnimationFrame;
    const originalCancelAnimationFrame = global.cancelAnimationFrame;

    // @ts-ignore - Intentionally setting to undefined for test
    global.requestAnimationFrame = undefined;
    // @ts-ignore - Intentionally setting to undefined for test
    global.cancelAnimationFrame = undefined;

    const { result } = renderHook(() => useLayoutReady());

    // Should still set layout ready even without requestAnimationFrame
    expect(result.current.isLayoutReady).toBe(true);

    // Restore original functions
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  test('should handle environments where requestAnimationFrame is not available with delay', () => {
    // Temporarily remove requestAnimationFrame
    const originalRequestAnimationFrame = global.requestAnimationFrame;
    const originalCancelAnimationFrame = global.cancelAnimationFrame;

    // @ts-ignore - Intentionally setting to undefined for test
    global.requestAnimationFrame = undefined;
    // @ts-ignore - Intentionally setting to undefined for test
    global.cancelAnimationFrame = undefined;

    const { result } = renderHook(() => useLayoutReady(100));

    // Should not be ready initially due to delay
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // After delay, should be ready
    expect(result.current.isLayoutReady).toBe(true);

    // Restore original functions
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  test('should work with very short delays', () => {
    const { result } = renderHook(() => useLayoutReady(1));

    // After animation frame but before delay, should not be ready
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    // After short delay, should be ready
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should work with very long delays', () => {
    const { result } = renderHook(() => useLayoutReady(5000));

    // After animation frame but before delay, should not be ready
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(2500); // Half the delay
    });

    // After half the delay, should still not be ready
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(2500); // Remaining delay
    });

    // After full delay, should be ready
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should reset layout ready state and restart the process', () => {
    const { result } = renderHook(() => useLayoutReady(100));

    // After animation frame but before delay, should not be ready
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // After delay, should be ready
    expect(result.current.isLayoutReady).toBe(true);

    // Reset the layout
    act(() => {
      result.current.resetLayout();
    });

    // After reset, should not be ready
    expect(result.current.isLayoutReady).toBe(false);

    // Mock requestAnimationFrame to be called again after reset
    act(() => {
      const rafMock = global.requestAnimationFrame as jest.Mock;
      const lastCallback = rafMock.mock.calls[rafMock.mock.calls.length - 1][0];
      lastCallback(0);
    });

    // After animation frame but before delay, should still not be ready
    expect(result.current.isLayoutReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // After delay, should be ready again
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should handle multiple resets correctly', () => {
    const { result } = renderHook(() => useLayoutReady());

    // After animation frame, should be ready
    expect(result.current.isLayoutReady).toBe(true);

    // Reset multiple times
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.resetLayout();
      });

      // After each reset, should not be ready
      expect(result.current.isLayoutReady).toBe(false);

      // Mock requestAnimationFrame to be called again after reset
      act(() => {
        const rafMock = global.requestAnimationFrame as jest.Mock;
        const lastCallback = rafMock.mock.calls[rafMock.mock.calls.length - 1][0];
        lastCallback(0);
      });

      // After animation frame, should be ready again
      expect(result.current.isLayoutReady).toBe(true);
    }
  });

  test('should handle case when requestAnimationFrame callback is delayed', () => {
    // Override the default mock to not call the callback immediately
    global.requestAnimationFrame = jest.fn();

    const { result } = renderHook(() => useLayoutReady());

    // Initially not ready because callback hasn't been called
    expect(result.current.isLayoutReady).toBe(false);

    // Simulate delayed callback
    act(() => {
      const rafMock = global.requestAnimationFrame as jest.Mock;
      const callback = rafMock.mock.calls[0][0];
      callback(0);
    });

    // Now should be ready
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should handle case when both requestAnimationFrame and setTimeout are delayed', () => {
    // Override the default mock to not call the callback immediately
    global.requestAnimationFrame = jest.fn();

    const { result } = renderHook(() => useLayoutReady(100));

    // Initially not ready because callback hasn't been called
    expect(result.current.isLayoutReady).toBe(false);

    // Simulate delayed requestAnimationFrame callback
    act(() => {
      const rafMock = global.requestAnimationFrame as jest.Mock;
      const callback = rafMock.mock.calls[0][0];
      callback(0);
    });

    // Still not ready because of delay
    expect(result.current.isLayoutReady).toBe(false);

    // Advance timers to complete the delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now should be ready
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should clean up timeout when unmounted before delay completes', () => {
    jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() => useLayoutReady(500));

    // Unmount before delay completes
    unmount();

    // Should clean up both animation frame and timeout
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(global.clearTimeout).toHaveBeenCalled();
  });

  test('should handle zero delay correctly', () => {
    const { result } = renderHook(() => useLayoutReady(0));

    // With zero delay, should be ready immediately after animation frame
    expect(result.current.isLayoutReady).toBe(true);
  });

  test('should handle negative delay as zero', () => {
    const { result } = renderHook(() => useLayoutReady(-100));

    // With negative delay (treated as zero), should be ready immediately after animation frame
    expect(result.current.isLayoutReady).toBe(true);
  });
});
