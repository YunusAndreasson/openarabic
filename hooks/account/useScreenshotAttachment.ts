import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { handleError, toError } from '@/utils/errorHandling';

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
  /** Clear the screenshot URI (useful for form reset) */
  clearScreenshot: () => void;
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
      const permissionDeniedKey = `screenshot_permission_denied_${userId || 'anonymous'}`;

      // Check if permission was previously denied (subsequent attempt)
      const wasPreviouslyDenied = await AsyncStorage.getItem(permissionDeniedKey);

      if (wasPreviouslyDenied === 'true') {
        // User is trying to use feature after denying permission - show informational alert
        // This is explicitly allowed by both Apple and Google Play policies
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to attach screenshots. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      // Show prominent disclosure BEFORE requesting permissions (Google Play requirement)
      // Note: No "Cancel" button per Apple guideline 5.1.1 - user must proceed to system dialog
      await new Promise<void>(resolve => {
        Alert.alert(
          'Screenshot Upload Notice',
          'OpenArabic collects screenshot images to help our team investigate and resolve reported issues. Screenshots are uploaded to our servers and attached to your feedback report.',
          [
            {
              text: 'Continue',
              onPress: () => resolve(),
            },
          ],
        );
      });

      // Check current permission status first
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

      let finalStatus = existingStatus;

      // Only request if not already granted
      if (existingStatus !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = newStatus;
      }

      if (finalStatus !== 'granted') {
        // Save denied state for subsequent attempts
        await AsyncStorage.setItem(permissionDeniedKey, 'true');
        // Accept denial silently (Apple requirement - no retry, no auto-redirect)
        return;
      }

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
      handleError(toError(error), {
        showToast: false,
        analyticsEventName: 'Screenshot_Picker_Error',
      });
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  }, [userId, quality]);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshotUri(null);
  }, []);

  const clearScreenshot = useCallback(() => {
    setScreenshotUri(null);
  }, []);

  return {
    screenshotUri,
    handleAddScreenshot,
    handleRemoveScreenshot,
    clearScreenshot,
  };
}
