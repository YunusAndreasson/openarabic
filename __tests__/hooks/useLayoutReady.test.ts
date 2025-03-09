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
});
