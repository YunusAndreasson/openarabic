/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useSleepTimer } from '../../../hooks/audio/useSleepTimer';
import { handleError } from '../../../utils/errorHandling';

/** The AppState 'change' listener useSleepTimer registered, so tests can
 *  simulate a foreground transition without a real AppState event. */
function getAppStateListener(): (status: AppStateStatus) => void {
  const call = jest.mocked(AppState.addEventListener).mock.calls.at(-1);
  const listener = call?.[1];
  if (!listener) throw new Error('AppState.addEventListener was not called');
  return listener as (status: AppStateStatus) => void;
}

jest.mock('../../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useSleepTimer', () => {
  test('starts timer and triggers completion after duration', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    expect(result.current.state.isActive).toBeTruthy();
    expect(result.current.state.endTime).toBeGreaterThan(0);

    // Should not fire before duration
    act(() => {
      jest.advanceTimersByTime(59 * 1000);
    });

    expect(onComplete).not.toHaveBeenCalled();

    // Should fire at duration
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.endTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('cancels an active timer', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    act(() => {
      result.current.actions.cancelTimer();
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.endTime).toBe(0);

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  test('cancel is safe to call when timer is not active', () => {
    const { result } = renderHook(() => useSleepTimer());

    expect(result.current.state.isActive).toBeFalsy();

    act(() => {
      result.current.actions.cancelTimer();
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.endTime).toBe(0);
  });

  test('handles invalid duration', () => {
    const { result } = renderHook(() => useSleepTimer());

    act(() => {
      result.current.actions.startTimer(0);
    });

    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        toastMessage: "Couldn't start timer. Try again",
        analyticsEventName: 'Sleep_Timer_Start_Error',
      }),
    );
  });

  test('clears timer on unmount', () => {
    const onComplete = jest.fn();
    const { result, unmount } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  test('allows starting a new timer after completion', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.actions.startTimer(1);
    });

    expect(result.current.state.isActive).toBeTruthy();
    expect(result.current.state.endTime).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  // Regression: measured live on the Android emulator — a backgrounded app
  // throttles JS timers, so a 5-minute setTimeout did not fire until the app
  // was foregrounded again several minutes late, during which a playing
  // queue kept auto-advancing uninterrupted. The wall-clock endTime must be
  // honored on foreground resume even when the underlying timer is late.
  test('fires completion on foreground resume if the deadline already passed', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(5);
    });

    // Simulate the setTimeout being throttled while backgrounded: move the
    // wall clock past the deadline WITHOUT letting the pending timer fire.
    act(() => {
      jest.setSystemTime(Date.now() + 6 * 60 * 1000);
    });

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      getAppStateListener()('active');
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.endTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // The now-stale setTimeout must not fire a second, duplicate completion.
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('does not fire early on foreground resume before the deadline', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(5);
    });

    act(() => {
      getAppStateListener()('active');
    });

    expect(result.current.state.isActive).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  test('ignores non-active AppState transitions', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(5);
    });

    act(() => {
      jest.setSystemTime(Date.now() + 6 * 60 * 1000);
    });

    act(() => {
      getAppStateListener()('background');
    });

    // Only an 'active' transition should trigger the catch-up check.
    expect(result.current.state.isActive).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
