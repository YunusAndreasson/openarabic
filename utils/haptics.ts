import * as Haptics from 'expo-haptics';

/**
 * Standardized haptic feedback patterns for consistent user experience
 * Based on semantic meaning rather than technical implementation
 */

// Debounce mechanism to prevent double haptic feedback
let isHapticBlocked = false;
const HAPTIC_DEBOUNCE_MS = 50; // Minimum time between haptic feedback calls

/**
 * Internal function to check if haptic feedback should be triggered
 * based on debounce timing
 */
const shouldTriggerHaptic = (): boolean => {
  if (isHapticBlocked) {
    return false;
  }

  isHapticBlocked = true;
  setTimeout(() => {
    isHapticBlocked = false;
  }, HAPTIC_DEBOUNCE_MS);

  return true;
};

/**
 * Selection feedback for subtle interactions like:
 * - Toggle switches
 * - Filter selection
 * - Slider adjustments
 */
export const selectionFeedback = (): void => {
  if (shouldTriggerHaptic()) {
    Haptics.selectionAsync();
  }
};

/**
 * Light feedback for confirmatory interactions like:
 * - Secondary button presses
 * - Non-critical confirmations
 * - Navigation actions
 */
export const lightFeedback = (): void => {
  if (shouldTriggerHaptic()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Medium feedback for primary interactions like:
 * - Primary button presses
 * - Important selections
 * - Content actions
 */
export const mediumFeedback = (): void => {
  if (shouldTriggerHaptic()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Success feedback for positive outcomes like:
 * - Successful operations
 * - Achievements
 * - Completion states
 */
export const successFeedback = (): void => {
  if (shouldTriggerHaptic()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Error feedback for negative outcomes like:
 * - Failed operations
 * - Input validation errors
 * - Critical warnings
 */
export const errorFeedback = (): void => {
  if (shouldTriggerHaptic()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};
