import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';

import { useAndroidBackHandler } from '@/hooks/ui/useAndroidBackHandler';

type BackPress = Parameters<typeof BackHandler.addEventListener>[1];

const BACK_PRESS = { type: 'hardwareBackPress', timeStamp: 0 };

const originalPlatform = Platform.OS;
const mockRemove = jest.fn();
let pressBack: BackPress | undefined;

beforeEach(() => {
  pressBack = undefined;
  // Captures the registered handler, so a test can press back.
  jest.mocked(BackHandler.addEventListener).mockImplementation((_event, handler) => {
    pressBack = handler;
    return { remove: mockRemove };
  });
});

afterEach(() => {
  Platform.OS = originalPlatform;
});

describe('useAndroidBackHandler', () => {
  test('on Android, consumes the press and calls the latest handler', () => {
    Platform.OS = 'android';
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ onBack }: { onBack: () => void }) => useAndroidBackHandler(true, onBack),
      { initialProps: { onBack: first } },
    );

    rerender({ onBack: second });

    expect(pressBack?.(BACK_PRESS)).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    // A new handler is not a reason to re-register.
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
  });

  test('lets the platform handle back while disabled, and unsubscribes on disable', () => {
    Platform.OS = 'android';
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useAndroidBackHandler(enabled, jest.fn()),
      { initialProps: { enabled: false } },
    );

    expect(BackHandler.addEventListener).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  test('does nothing on iOS', () => {
    Platform.OS = 'ios';
    renderHook(() => useAndroidBackHandler(true, jest.fn()));

    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });
});
