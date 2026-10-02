/**
 * A stored photo-library refusal is re-checked against the OS.
 *
 * The flag only records that the OS once said no. The "Permission Required"
 * alert sends the learner to Settings — so once they allow access there, the
 * next tap has to go through instead of showing the same alert forever.
 */

import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { PermissionStatus } from 'expo-image-picker';

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
  toError: (error: unknown) => error,
}));

import { USER_STORAGE_KEYS } from '@/constants/storageKeys';
import { useScreenshotAttachment } from '@/hooks/account/useScreenshotAttachment';

const DENIED_KEY = USER_STORAGE_KEYS.screenshotPermissionDenied('user-1');

function osPermission(status: PermissionStatus.GRANTED | PermissionStatus.DENIED) {
  return {
    status,
    granted: status === PermissionStatus.GRANTED,
    canAskAgain: false,
    expires: 'never' as const,
  };
}

describe('useScreenshotAttachment', () => {
  beforeEach(() => {
    // Re-armed per test: the suite-wide `resetMocks` wipes implementations.
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation(async key => (key === DENIED_KEY ? 'true' : null));
    jest.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
    // Tap through the upload disclosure the hook shows before the picker.
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.text === 'Continue')?.onPress?.();
    });
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///shot.png', width: 1, height: 1 }],
    });
  });

  test('a refusal since allowed in Settings no longer blocks the picker', async () => {
    jest
      .mocked(ImagePicker.getMediaLibraryPermissionsAsync)
      .mockResolvedValue(osPermission(PermissionStatus.GRANTED));
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValue(osPermission(PermissionStatus.GRANTED));

    const { result } = renderHook(() => useScreenshotAttachment({ userId: 'user-1' }));
    await act(async () => {
      await result.current.handleAddScreenshot();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(DENIED_KEY);
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Permission Required',
      expect.anything(),
      expect.anything(),
    );
    expect(result.current.screenshotUri).toBe('file:///shot.png');
  });

  test('a refusal the OS still holds shows the Settings alert, not the picker', async () => {
    jest
      .mocked(ImagePicker.getMediaLibraryPermissionsAsync)
      .mockResolvedValue(osPermission(PermissionStatus.DENIED));

    const { result } = renderHook(() => useScreenshotAttachment({ userId: 'user-1' }));
    await act(async () => {
      await result.current.handleAddScreenshot();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Permission Required',
      expect.any(String),
      expect.any(Array),
    );
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});
