/**
 * signed_in, reminders_enabled and notifications_enabled on every event, kept
 * up to date as the app state changes.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';

let mockRemindersEnabled = false;
jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ settings: { reminderTime: { enabled: mockRemindersEnabled } } }),
}));

jest.mock('@/services/analytics', () => ({
  analytics: { registerSuperProperties: jest.fn() },
}));

jest.mock('@/services/notificationService', () => ({
  refreshNotificationsEnabled: jest.fn(),
}));

import { useAnalyticsSuperProperties } from '@/hooks/app/useAnalyticsSuperProperties';
import { analytics } from '@/services/analytics';
import { refreshNotificationsEnabled } from '@/services/notificationService';

type ChangeListener = (state: AppStateStatus) => void;
let changeListeners: ChangeListener[] = [];

describe('useAnalyticsSuperProperties', () => {
  beforeEach(() => {
    mockRemindersEnabled = false;
    changeListeners = [];
    jest.mocked(AppState.addEventListener).mockImplementation((_type, listener) => {
      changeListeners.push(listener as ChangeListener);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  test('registers nothing until the app is ready', () => {
    renderHook(() => useAnalyticsSuperProperties({ appReady: false, signedIn: true }));

    expect(analytics.registerSuperProperties).not.toHaveBeenCalled();
    expect(refreshNotificationsEnabled).not.toHaveBeenCalled();
  });

  test('signed_in and reminders_enabled follow the session and the setting', () => {
    const { rerender } = renderHook<void, { signedIn: boolean }>(
      ({ signedIn }) => useAnalyticsSuperProperties({ appReady: true, signedIn }),
      { initialProps: { signedIn: true } },
    );
    expect(analytics.registerSuperProperties).toHaveBeenLastCalledWith({
      signed_in: true,
      reminders_enabled: false,
    });

    mockRemindersEnabled = true;
    rerender({ signedIn: false });

    expect(analytics.registerSuperProperties).toHaveBeenLastCalledWith({
      signed_in: false,
      reminders_enabled: true,
    });
  });

  // The grant can change in system settings while the app is away.
  test('notifications_enabled is read at launch and again on every return', async () => {
    renderHook(() => useAnalyticsSuperProperties({ appReady: true, signedIn: true }));
    await waitFor(() => expect(refreshNotificationsEnabled).toHaveBeenCalledTimes(1));

    act(() => {
      changeListeners.forEach(listener => listener('background'));
      changeListeners.forEach(listener => listener('active'));
    });

    expect(refreshNotificationsEnabled).toHaveBeenCalledTimes(2);
  });
});
