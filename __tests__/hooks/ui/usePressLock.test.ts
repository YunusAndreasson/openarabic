/**
 * usePressLock — the shared repeat-press guard behind every button.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { PRESS_LOCK_WINDOW_MS } from '@/constants/animation';
import { usePressLock } from '@/hooks/ui/usePressLock';

describe('usePressLock', () => {
  beforeEach(() => {
    // The hook reads Date.now(), which only advances with advanceTimersByTime
    // when the system clock is faked too.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('fires the first call', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => usePressLock(handler));

    act(() => result.current());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('ignores a second call in the same tick, with no timer advance', () => {
    // This is the case the previous state-based debounce failed: both presses
    // read the pre-commit flag and both fired.
    const handler = jest.fn();
    const { result } = renderHook(() => usePressLock(handler));

    act(() => {
      result.current();
      result.current();
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('fires again once the window has passed', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => usePressLock(handler));

    act(() => result.current());
    act(() => {
      jest.advanceTimersByTime(PRESS_LOCK_WINDOW_MS + 1);
    });
    act(() => result.current());

    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('still blocks a call on the last millisecond of the window', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => usePressLock(handler));

    act(() => result.current());
    act(() => {
      jest.advanceTimersByTime(PRESS_LOCK_WINDOW_MS - 1);
    });
    act(() => result.current());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('does not share a lock between instances', () => {
    // Tapping quickly between two different buttons must not be swallowed.
    const first = jest.fn();
    const second = jest.fn();
    const { result: firstResult } = renderHook(() => usePressLock(first));
    const { result: secondResult } = renderHook(() => usePressLock(second));

    act(() => {
      firstResult.current();
      secondResult.current();
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('forwards arguments to the handler', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => usePressLock(handler));

    act(() => result.current({ nativeEvent: {} }));

    expect(handler).toHaveBeenCalledWith({ nativeEvent: {} });
  });

  test('tolerates an undefined handler', () => {
    const { result } = renderHook(() => usePressLock(undefined));

    expect(() => act(() => result.current())).not.toThrow();
  });

  test('honours a custom window', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => usePressLock(handler, 1000));

    act(() => result.current());
    act(() => {
      jest.advanceTimersByTime(PRESS_LOCK_WINDOW_MS + 1);
    });
    act(() => result.current());

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
