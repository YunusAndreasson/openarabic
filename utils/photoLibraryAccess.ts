import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

interface PhotoLibraryAccessRequest {
  /** Storage key remembering that the OS refused — iOS never re-prompts. */
  deniedKey: string;
  /** Body of the "enable it in Settings" alert shown while that refusal stands. */
  deniedMessage: string;
  /** Title of the disclosure shown before the system prompt. */
  disclosureTitle: string;
  /** What the photo is used for and where it goes. */
  disclosureMessage: string;
}

/**
 * The store-compliant path to the photo library, shared by every picker:
 * remembered-denial check, prominent disclosure, then the system prompt.
 *
 * Resolves `true` when the picker may be launched. `false` means the caller
 * stops silently — either the Settings alert is already on screen or the
 * learner just refused the system prompt.
 */
export async function requestPhotoLibraryAccess({
  deniedKey,
  deniedMessage,
  disclosureTitle,
  disclosureMessage,
}: PhotoLibraryAccessRequest): Promise<boolean> {
  // Check if permission was previously denied (subsequent attempt)
  const wasPreviouslyDenied = (await AsyncStorage.getItem(deniedKey)) === 'true';

  // The flag records that the OS once said no — the learner may have
  // allowed access in Settings since (the alert below sends them there).
  // Trusting it forever sent every later tap to "enable it in Settings"
  // even after they had, so a grant clears it and the flow goes on.
  const isStillDenied =
    wasPreviouslyDenied &&
    (await ImagePicker.getMediaLibraryPermissionsAsync()).status !== 'granted';
  if (wasPreviouslyDenied && !isStillDenied) {
    await AsyncStorage.removeItem(deniedKey);
  }

  if (isStillDenied) {
    // User is trying to use feature after denying permission - show informational alert
    // This is explicitly allowed by both Apple and Google Play policies
    Alert.alert('Permission Required', deniedMessage, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ]);
    return false;
  }

  // Show prominent disclosure BEFORE requesting permissions (Google Play requirement)
  // Note: No "Cancel" button per Apple guideline 5.1.1 - user must proceed to system dialog
  await new Promise<void>(resolve => {
    Alert.alert(disclosureTitle, disclosureMessage, [
      { text: 'Continue', onPress: () => resolve() },
    ]);
  });

  // Only request if not already granted — this is what shows the system dialog
  let { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await ImagePicker.requestMediaLibraryPermissionsAsync());
  }

  if (status !== 'granted') {
    // Save denied state for subsequent attempts
    await AsyncStorage.setItem(deniedKey, 'true');
    // Accept denial silently (Apple requirement - no retry, no auto-redirect)
    return false;
  }

  return true;
}
