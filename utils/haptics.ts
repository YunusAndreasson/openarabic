import * as Haptics from 'expo-haptics';
import { handleError } from '@/utils/errorHandling';
/**
 * Standardized haptic feedback patterns for consistent user experience
 */

/**
 * Light feedback for subtle interactions like:
 * - Selection changes
 * - Toggle switches
 * - Pills/filters
 */
export const lightFeedback = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    handleError(error instanceof Error ? error : String(error));
  }
};

/**
 * Medium feedback for standard interactions like:
 * - Button presses
 * - Item selection
 * - Dialog confirmations
 */
export const mediumFeedback = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    handleError(error instanceof Error ? error : String(error));
  }
};

/**
 * Error feedback for negative outcomes like:
 * - Failed operations
 * - Input validation errors
 */
export const errorFeedback = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    handleError(error instanceof Error ? error : String(error));
  }
};
