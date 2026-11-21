/**
 * App Opened once per launch the learner sees; First Open once per install, and
 * Install Attribution after them (services/installAttribution has the rules).
 *
 * iOS launches the app into the background, where it becomes ready with nobody
 * looking. That used to count as an open, and the real open after it was never
 * counted, because App Resumed needs a background transition first.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn(), registerSuperProperties: jest.fn() },
}));

const mockInstall = { firstOpen: true };
jest.mock('@/services/analyticsInstall', () => ({
  loadInstallRecord: async () => ({ installDate: '2026-11-21', installKind: 'new' }),
}));

// Through the mocked analytics, so the order of all three can be read off one list.
jest.mock('@/services/installAttribution', () => ({
  trackFirstOpen: async () => {
    if (!mockInstall.firstOpen) return;
    mockInstall.firstOpen = false;
    const { analytics } =
      jest.requireMock<typeof import('@/services/analytics')>('@/services/analytics');
    await analytics.track('First Open', { install_kind: 'new' });
  },
  startInstallAttribution: async () => {
    const { analytics } =
      jest.requireMock<typeof import('@/services/analytics')>('@/services/analytics');
    await analytics.track('Install Attribution', { referrer_0: 'utm_source=meta' });
  },
}));

import { useAppOpenTracking } from '@/hooks/app/useAppOpenTracking';
import { analytics } from '@/services/analytics';

type ChangeListener = (state: AppStateStatus) => void;

let changeListeners: ChangeListener[] = [];
const setAppState = (state: AppStateStatus): void => {
  (AppState as { currentState: AppStateStatus }).currentState = state;
};
const moveTo = (state: AppStateStatus): void => {
  setAppState(state);
  changeListeners.forEach(listener => listener(state));
};

const trackedEvents = () => jest.mocked(analytics.track).mock.calls.map(([event]) => event);

describe('useAppOpenTracking', () => {
  beforeEach(() => {
    mockInstall.firstOpen = true;
    changeListeners = [];
    setAppState('active');
    jest.mocked(AppState.addEventListener).mockImplementation((_type, listener) => {
      changeListeners.push(listener as ChangeListener);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  test('a foreground launch is App Opened, after First Open and the install date', async () => {
    renderHook(() => useAppOpenTracking(true, jest.fn()));

    await waitFor(() => expect(trackedEvents()).toContain(ANALYTICS_EVENTS.INSTALL_ATTRIBUTION));
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.APP_OPENED, {
      launch: 'foreground',
    });
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.FIRST_OPEN, {
      install_kind: 'new',
    });
    // Install Attribution waits on the Play Store, so it never holds up App Opened.
    expect(trackedEvents()).toEqual([
      ANALYTICS_EVENTS.FIRST_OPEN,
      ANALYTICS_EVENTS.APP_OPENED,
      ANALYTICS_EVENTS.INSTALL_ATTRIBUTION,
    ]);
    expect(analytics.registerSuperProperties).toHaveBeenCalledWith({ install_date: '2026-11-21' });
  });

  test('nothing is sent before the app is ready', async () => {
    renderHook(() => useAppOpenTracking(false, jest.fn()));

    await act(async () => {
      await Promise.resolve();
    });
    expect(analytics.track).not.toHaveBeenCalled();
  });

  test("iOS's 'unknown' while a foreground launch settles counts as foreground", async () => {
    setAppState('unknown');

    renderHook(() => useAppOpenTracking(true, jest.fn()));

    await waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.APP_OPENED, {
        launch: 'foreground',
      }),
    );
  });

  test('a background launch waits, and the first move to active is its App Opened', async () => {
    setAppState('background');
    const onOpen = jest.fn();

    renderHook(() => useAppOpenTracking(true, onOpen));
    await act(async () => {
      await Promise.resolve();
    });
    expect(analytics.track).not.toHaveBeenCalled();

    // An interruption on the way up is not the open yet
    act(() => moveTo('inactive'));
    expect(onOpen).not.toHaveBeenCalled();

    act(() => moveTo('active'));
    await waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.APP_OPENED, {
        launch: 'after_background_launch',
      }),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    // The install's first open is this one, not the background launch
    await waitFor(() =>
      expect(trackedEvents()).toEqual([
        ANALYTICS_EVENTS.FIRST_OPEN,
        ANALYTICS_EVENTS.APP_OPENED,
        ANALYTICS_EVENTS.INSTALL_ATTRIBUTION,
      ]),
    );
  });

  test('App Opened goes out once per launch; later returns are App Resumed, not this', async () => {
    const { rerender } = renderHook<void, { ready: boolean }>(
      ({ ready }) => useAppOpenTracking(ready, jest.fn()),
      {
        initialProps: { ready: true },
      },
    );
    await waitFor(() => expect(trackedEvents()).toContain(ANALYTICS_EVENTS.APP_OPENED));

    rerender({ ready: true });
    act(() => moveTo('background'));
    act(() => moveTo('active'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(trackedEvents().filter(event => event === ANALYTICS_EVENTS.APP_OPENED)).toHaveLength(1);
  });
});
