/**
 * Screen Viewed: the route template, once per change of screen, never while
 * the app runs in the background.
 */

import { act, renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';

let mockSegments: string[] = [];
jest.mock('expo-router', () => ({
  useSegments: () => mockSegments,
}));

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn() },
}));

import { useScreenViewTracking } from '@/hooks/app/useScreenViewTracking';
import { analytics } from '@/services/analytics';

type ChangeListener = (state: AppStateStatus) => void;

let changeListeners: ChangeListener[] = [];
const setAppState = (state: AppStateStatus): void => {
  (AppState as { currentState: AppStateStatus }).currentState = state;
};

const screensTracked = () =>
  jest
    .mocked(analytics.track)
    .mock.calls.filter(([event]) => event === ANALYTICS_EVENTS.SCREEN_VIEWED)
    .map(([, properties]) => properties?.['screen']);

describe('useScreenViewTracking', () => {
  beforeEach(() => {
    mockSegments = ['(tabs)', 'explore'];
    changeListeners = [];
    setAppState('active');
    jest.mocked(AppState.addEventListener).mockImplementation((_type, listener) => {
      changeListeners.push(listener as ChangeListener);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  test('sends the route template, which carries no id', () => {
    mockSegments = ['article', '[id]'];

    renderHook(() => useScreenViewTracking(true));

    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SCREEN_VIEWED, {
      screen: 'article/[id]',
    });
  });

  test('once per change of screen, not per render', () => {
    const { rerender } = renderHook(() => useScreenViewTracking(true));
    rerender({});

    mockSegments = ['(tabs)', 'practice'];
    rerender({});
    rerender({});

    expect(screensTracked()).toEqual(['(tabs)/explore', '(tabs)/practice']);
  });

  test('waits for the app to be ready', () => {
    const { rerender } = renderHook<void, { ready: boolean }>(
      ({ ready }) => useScreenViewTracking(ready),
      {
        initialProps: { ready: false },
      },
    );
    expect(analytics.track).not.toHaveBeenCalled();

    rerender({ ready: true });
    expect(screensTracked()).toEqual(['(tabs)/explore']);
  });

  test('nothing in the background; the screen goes out when the app comes forward', () => {
    setAppState('background');
    renderHook(() => useScreenViewTracking(true));
    expect(analytics.track).not.toHaveBeenCalled();

    act(() => {
      setAppState('active');
      changeListeners.forEach(listener => listener('active'));
    });

    expect(screensTracked()).toEqual(['(tabs)/explore']);
  });

  test('a return to the same screen is not a new view', () => {
    renderHook(() => useScreenViewTracking(true));

    act(() => {
      changeListeners.forEach(listener => listener('background'));
      changeListeners.forEach(listener => listener('active'));
    });

    expect(screensTracked()).toEqual(['(tabs)/explore']);
  });
});
