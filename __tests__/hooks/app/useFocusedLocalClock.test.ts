import { act, renderHook } from '@testing-library/react-native';
import { useIsFocused } from 'expo-router';
import { AppState } from 'react-native';

import { useFocusedLocalClock } from '@/hooks/app/useFocusedLocalClock';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }));

describe('useFocusedLocalClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.replaceProperty(AppState, 'currentState', 'active');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('refreshes across local midnight without a focus event', () => {
    const beforeMidnight = new Date(2026, 10, 25, 23, 59, 58).getTime();
    jest.setSystemTime(beforeMidnight);
    const { result } = renderHook(useFocusedLocalClock);

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current).toBe(beforeMidnight);
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current).toBe(new Date(2026, 10, 26).getTime());
  });

  it('refreshes for a wall clock jump on the same day', () => {
    const earlier = new Date(2026, 10, 25, 12).getTime();
    const later = new Date(2026, 10, 25, 14).getTime();
    jest.setSystemTime(earlier);
    const { result } = renderHook(useFocusedLocalClock);

    jest.setSystemTime(later);
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current).toBe(later + 1000);
  });

  it('stops sampling off screen and refreshes on return', () => {
    const start = new Date(2026, 10, 25, 23, 59, 59).getTime();
    jest.setSystemTime(start);
    const { result, rerender } = renderHook(useFocusedLocalClock);

    jest.mocked(useIsFocused).mockReturnValue(false);
    rerender(undefined);
    act(() => jest.advanceTimersByTime(2000));
    expect(result.current).toBe(start);
    jest.mocked(useIsFocused).mockReturnValue(true);
    rerender(undefined);
    expect(result.current).toBe(start + 2000);
  });
});
