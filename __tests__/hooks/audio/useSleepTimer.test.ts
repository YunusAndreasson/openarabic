import { renderHook, act } from '@testing-library/react-native';
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
  it('starts countdown and triggers completion', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.remainingTime).toBe(60);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.state.remainingTime).toBe(59);

    act(() => {
      jest.advanceTimersByTime(59 * 1000);
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.remainingTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels an active timer', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
      jest.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.actions.cancelTimer();
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.remainingTime).toBe(0);

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('handles invalid duration', () => {
    const { result } = renderHook(() => useSleepTimer());

    act(() => {
      result.current.actions.startTimer(0);
    });

    expect(handleError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      toastMessage: 'Failed to start sleep timer',
      analyticsEventName: 'Sleep_Timer_Start_Error',
    }));
  });

  it('clears timer on unmount', () => {
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

  it('allows starting a new timer after completion', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSleepTimer(onComplete));

    act(() => {
      result.current.actions.startTimer(1);
    });

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.remainingTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.actions.startTimer(1);
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.remainingTime).toBe(60);

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.remainingTime).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
