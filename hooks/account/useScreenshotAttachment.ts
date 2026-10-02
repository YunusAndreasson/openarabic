import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { handleError, toError } from '@/utils/errorHandling';
import { USER_STORAGE_KEYS } from '@/constants/storageKeys';
import { requestPhotoLibraryAccess } from '@/utils/photoLibraryAccess';

interface UseScreenshotAttachmentOptions {
  /** User ID for permission caching (falls back to 'anonymous') */
  userId?: string;
  /** Image quality (0-1), defaults to 0.8 */
  quality?: number;
}

interface UseScreenshotAttachmentResult {
  /** The URI of the selected screenshot, or null if none selected */
  screenshotUri: string | null;
  /** Handler to open the image picker and select a screenshot */
  handleAddScreenshot: () => Promise<void>;
  /** Handler to remove the current screenshot */
  handleRemoveScreenshot: () => void;
}

/**
 * Hook for managing screenshot attachment with proper permission handling.
 *
 * Handles:
 * - Permission checking and caching of denial state
 * - Pre-disclosure alert for Google Play compliance
 * - Permission request with proper fallback
 * - Image picker launch and state management
 *
 * @example
 * ```tsx
 * const { screenshotUri, handleAddScreenshot, handleRemoveScreenshot } =
 *   useScreenshotAttachment({ userId: user?.id });
 *
 * // In render:
 * {screenshotUri ? (
 *   <ScreenshotPreview uri={screenshotUri} onRemove={handleRemoveScreenshot} />
 * ) : (
 *   <AddScreenshotButton onPress={handleAddScreenshot} />
 * )}
 * ```
 */
export function useScreenshotAttachment({
  userId,
  quality = 0.8,
}: UseScreenshotAttachmentOptions = {}): UseScreenshotAttachmentResult {
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  const handleAddScreenshot = useCallback(async () => {
    try {
      const canPick = await requestPhotoLibraryAccess({
        deniedKey: USER_STORAGE_KEYS.screenshotPermissionDenied(userId),
        deniedMessage:
          'Photo library access is needed to attach screenshots. Please enable it in Settings.',
        disclosureTitle: 'Screenshot Upload Notice',
        disclosureMessage:
          'OpenArabic collects screenshot images to help our team investigate and resolve reported issues. Screenshots are uploaded to our servers and attached to your feedback report.',
      });
      if (!canPick) return;

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshotUri(result.assets[0].uri);
      }
    } catch (error) {
      void handleError(toError(error), {
        showToast: false,
        analyticsEventName: 'Screenshot_Picker_Error',
      });
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  }, [userId, quality]);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshotUri(null);
  }, []);

  return {
    screenshotUri,
    handleAddScreenshot,
    handleRemoveScreenshot,
  };
}
