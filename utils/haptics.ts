import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { store } from '@/store/store';

/**
 * Standardized haptic feedback patterns for consistent user experience
 * Based on semantic meaning rather than technical implementation
 *
 * Platform routing: iOS maps to the UIKit feedback generators. Android uses
 * performAndroidHapticsAsync — the expo-haptics docs deprecate the classic
 * impactAsync/notificationAsync path there (it's simulated through the legacy
 * Vibrator API), while performAndroidHapticsAsync drives the device's haptics
 * engine with semantic HapticFeedbackConstants and needs no VIBRATE permission.
 */

/** Minimum time between two firings of the SAME haptic pattern. */
const HAPTIC_DEBOUNCE_MS = 50;

/**
 * The distinct haptic patterns, used as debounce keys.
 *
 * The debounce is deliberately PER-PATTERN rather than global. A global block
 * meant that two semantically different haptics landing in the same 50ms —
 * exactly what happens when one interaction both crosses a gesture threshold
 * and commits (swipe-to-grade), or when a reveal is followed immediately by a
 * grade — silently dropped the second one. The user then felt a random subset
 * of the feedback the UI was trying to give. Repeats of the *same* pattern are
 * still what we want to swallow (double-fired press handlers), so keying by
 * pattern keeps the original protection without eating real signal.
 */
type HapticKind = 'selection' | 'light' | 'medium' | 'rigid' | 'success' | 'error';

const blockedKinds = new Set<HapticKind>();

/**
 * Internal function to check if haptic feedback should be triggered
 * based on debounce timing and user preferences
 */
const shouldTriggerHaptic = (kind: HapticKind): boolean => {
  // Check if haptics are enabled in settings
  // Use explicit false check to handle undefined (missing from old persisted state)
  // When undefined, default to enabled (true) as per initialState
  const state = store.getState();
  if (!state.settings.hapticsEnabled) {
    return false;
  }

  if (blockedKinds.has(kind)) {
    return false;
  }

  blockedKinds.add(kind);
  setTimeout(() => {
    blockedKinds.delete(kind);
  }, HAPTIC_DEBOUNCE_MS);

  return true;
};

/**
 * Fire a haptic without awaiting it, swallowing rejection.
 *
 * Every expo-haptics call returns a Promise<void>, and these helpers are
 * deliberately fire-and-forget (`: void`). Dropping the promise meant a device
 * with no haptics engine — common on budget/older Android hardware, which
 * rejects with "A haptics engine is not available on this device" — produced an
 * *unhandled rejection* on every single tap. Sentry's global handler reported
 * each one, making this the single largest source of production errors.
 *
 * Haptics are cosmetic: there is nothing to recover from and nothing to tell
 * the user, so the rejection is discarded rather than routed to handleError.
 */
const fireHaptic = (haptic: Promise<void>): void => {
  haptic.catch(() => {
    // No haptics engine / haptics unavailable — cosmetic only, nothing to do.
  });
};

/**
 * Selection feedback for subtle interactions like:
 * - Toggle switches
 * - Filter selection
 * - Slider adjustments
 */
export const selectionFeedback = (): void => {
  if (shouldTriggerHaptic('selection')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick));
    } else {
      fireHaptic(Haptics.selectionAsync());
    }
  }
};

/**
 * Light feedback for confirmatory interactions like:
 * - Secondary button presses
 * - Non-critical confirmations
 * - Navigation actions
 */
export const lightFeedback = (): void => {
  if (shouldTriggerHaptic('light')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key));
    } else {
      fireHaptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
  }
};

/**
 * Medium feedback for primary interactions like:
 * - Primary button presses
 * - Important selections
 * - Content actions
 */
export const mediumFeedback = (): void => {
  if (shouldTriggerHaptic('medium')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click));
    } else {
      fireHaptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    }
  }
};

/**
 * Crisp detent "click" for the moment a continuous gesture crosses a threshold
 * and the outcome flips — swipe-to-grade passing its commit point, a slider
 * snapping to a stop. This is the tick that tells the finger "release now and
 * it counts", so it has to read as mechanical rather than soft: `Rigid` is
 * UIKit's low-compression impact, and `Clock_Tick` is Android's detent tick
 * (the one a time picker uses).
 *
 * Fire it from a gesture worklet via `scheduleOnRN` — expo-haptics is
 * async/JS-thread-only (there is no worklet-callable variant in SDK 57), so
 * hopping the runtime boundary is the supported path.
 */
export const detentFeedback = (): void => {
  if (shouldTriggerHaptic('rigid')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick));
    } else {
      fireHaptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    }
  }
};

/**
 * Success feedback for positive outcomes like:
 * - Successful operations
 * - Achievements
 * - Completion states
 */
export const successFeedback = (): void => {
  if (shouldTriggerHaptic('success')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm));
    } else {
      fireHaptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }
  }
};

/**
 * Error feedback for negative outcomes like:
 * - Failed operations
 * - Input validation errors
 * - Critical warnings
 */
export const errorFeedback = (): void => {
  if (shouldTriggerHaptic('error')) {
    if (Platform.OS === 'android') {
      fireHaptic(Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject));
    } else {
      fireHaptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    }
  }
};
