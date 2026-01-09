/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { act, renderHook } from '@testing-library/react-native';
import { useSleepTimer } from '../../../hooks/audio/useSleepTimer';
import { handleError } from '../../../utils/errorHandling';

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
  test('starts countdown and triggers completion', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    expect(result.current.state.isActive).toBeTruthy();
    expect(result.current.state.remainingTime).toBe(60);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.state.remainingTime).toBe(59);

    act(() => {
      jest.advanceTimersByTime(59 * 1000);
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.remainingTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('cancels an active timer', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
      jest.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.actions.cancelTimer();
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.remainingTime).toBe(0);

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  test('auto-cancels an active timer', () => {
    const { result } = renderHook(() => useSleepTimer());

    act(() => {
      result.current.actions.startTimer(5);
    });

    expect(result.current.state.isActive).toBeTruthy();

    act(() => {
      result.current.actions.autoCancel();
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.remainingTime).toBe(0);
  });

  test('auto-cancel does nothing when timer is not active', () => {
    const { result } = renderHook(() => useSleepTimer());

    expect(result.current.state.isActive).toBeFalsy();

    act(() => {
      result.current.actions.autoCancel();
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.remainingTime).toBe(0);
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
    expect(result.current.state.remainingTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.actions.startTimer(1);
    });

    expect(result.current.state.isActive).toBeTruthy();
    expect(result.current.state.remainingTime).toBe(60);

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.state.isActive).toBeFalsy();
    expect(result.current.state.remainingTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
