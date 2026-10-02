import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { handleError, toError } from '@/utils/errorHandling';
import { USER_STORAGE_KEYS } from '@/constants/storageKeys';

interface UseProfilePhotoPickerOptions {
  /** User ID for storage key and permission caching */
  userId: string;
  /** Image quality (0-1), defaults to 0.8 */
  quality?: number;
  /** Callback when photo finishes loading from storage */
  onPhotoLoaded?: () => void;
}

interface UseProfilePhotoPickerResult {
  /** The URI of the profile photo, or null if none set */
  profilePhotoUri: string | null;
  /** Handler to open the image picker and select a photo */
  selectPhoto: () => Promise<void>;
  /** Clear the profile photo */
  clearPhoto: () => Promise<void>;
  /** Whether the photo has been loaded from storage */
  isLoaded: boolean;
}

/**
 * Hook for managing profile photo selection with local storage persistence.
 *
 * Handles:
 * - Loading saved photo from AsyncStorage on mount
 * - Permission checking and caching of denial state
 * - Pre-disclosure alert for Google Play compliance
 * - Image picker with square aspect ratio
 * - Saving selected photo to AsyncStorage
 *
 * Note: Photos are stored locally and never uploaded to servers.
 *
 * @example
 * ```tsx
 * const { profilePhotoUri, selectPhoto, isLoaded } = useProfilePhotoPicker({
 *   userId: user.id,
 *   onPhotoLoaded: () => fadeIn(),
 * });
 *
 * if (!isLoaded) return <Skeleton />;
 *
 * return profilePhotoUri ? (
 *   <Image source={{ uri: profilePhotoUri }} />
 * ) : (
 *   <InitialsAvatar />
 * );
 * ```
 */
export function useProfilePhotoPicker({
  userId,
  quality = 0.8,
  onPhotoLoaded,
}: UseProfilePhotoPickerOptions): UseProfilePhotoPickerResult {
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = USER_STORAGE_KEYS.profilePhoto(userId);

  // Load saved profile photo on mount
  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        const savedUri = await AsyncStorage.getItem(storageKey);
        if (savedUri) {
          setProfilePhotoUri(savedUri);
        }
      } catch (error) {
        void handleError(toError(error), { showToast: false });
      } finally {
        setIsLoaded(true);
        onPhotoLoaded?.();
      }
    };

    void loadProfilePhoto();
  }, [userId, storageKey, onPhotoLoaded]);

  const selectPhoto = useCallback(async () => {
    try {
      const permissionDeniedKey = USER_STORAGE_KEYS.photoPermissionDenied(userId);

      // Check if permission was previously denied (subsequent attempt)
      const wasPreviouslyDenied = await AsyncStorage.getItem(permissionDeniedKey);

      // The flag records that the OS once said no — the learner may have
      // allowed access in Settings since (the alert below sends them there).
      // Trusting it forever sent every later tap to "enable it in Settings"
      // even after they had, so a grant clears it and the flow goes on.
      const isStillDenied =
        wasPreviouslyDenied === 'true' &&
        (await ImagePicker.getMediaLibraryPermissionsAsync()).status !== 'granted';
      if (wasPreviouslyDenied === 'true' && !isStillDenied) {
        await AsyncStorage.removeItem(permissionDeniedKey);
      }

      if (isStillDenied) {
        // User is trying to use feature after denying permission - show informational alert
        // This is explicitly allowed by both Apple and Google Play policies
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to select a profile photo. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }

      // Show prominent disclosure BEFORE requesting permissions (Google Play requirement)
      // Note: No "Cancel" button per Apple guideline 5.1.1 - user must proceed to system dialog
      await new Promise<void>(resolve => {
        Alert.alert(
          'Profile Photo',
          'OpenArabic accesses your photo library to let you select a profile photo for your account. The photo is stored locally on your device and is never uploaded to our servers.',
          [
            {
              text: 'Continue',
              onPress: () => resolve(),
            },
          ],
        );
      });

      // Request permissions - this will show the system permission dialog
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        // Save denied state for subsequent attempts
        await AsyncStorage.setItem(permissionDeniedKey, 'true');
        // Accept denial silently (Apple requirement - no retry, no auto-redirect)
        return;
      }

      // Launch image picker with square aspect ratio for profile photos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;

        // Save to local storage
        await AsyncStorage.setItem(storageKey, selectedUri);

        // Update state
        setProfilePhotoUri(selectedUri);
      }
    } catch (error) {
      void handleError(toError(error), {
        toastMessage: 'Failed to select profile photo',
        showToast: true,
      });
    }
  }, [storageKey, userId, quality]);

  const clearPhoto = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      setProfilePhotoUri(null);
    } catch (error) {
      void handleError(toError(error), { showToast: false });
    }
  }, [storageKey]);

  return {
    profilePhotoUri,
    selectPhoto,
    clearPhoto,
    isLoaded,
  };
}
