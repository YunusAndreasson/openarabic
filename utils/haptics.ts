import * as Haptics from 'expo-haptics';

/**
 * Standardized haptic feedback patterns for consistent user experience
 */

/**
 * Light feedback for subtle interactions like:
 * - Selection changes
 * - Toggle switches
 * - Pills/filters
 */
export const lightFeedback = (): void => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium feedback for standard interactions like:
 * - Button presses
 * - Item selection
 * - Dialog confirmations
 */
export const mediumFeedback = (): void => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Error feedback for negative outcomes like:
 * - Failed operations
 * - Input validation errors
 */
export const errorFeedback = (): void => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};
