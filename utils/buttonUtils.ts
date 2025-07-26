import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';

// ===== FLOATING ACTION BUTTON CONSTANTS =====
export const FLOATING_ACTION_BUTTON_CONSTANTS = {
  BUTTON_SIZE: MIN_TOUCH_TARGET.MEDIUM,
  BUTTON_RADIUS: MIN_TOUCH_TARGET.MEDIUM / 2,
  RIPPLE_RADIUS: MIN_TOUCH_TARGET.MEDIUM / 2,
  ICON_SIZE: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  SPACING: LAYOUT.SPACING.SMALL,
  TOP_MARGIN: LAYOUT.SPACING.SMALL,
  SIDE_MARGIN: LAYOUT.SPACING.SMALL,
  Z_INDEX: LAYOUT.Z_INDEX.OVERLAY,
} as const;

// ===== BUTTON STYLE INTERFACES =====
export interface ButtonStyleConfig {
  width: number;
  height: number;
  borderRadius: number;
  backgroundColor: string;
  alignItems: 'center';
  justifyContent: 'center';
  opacity: number;
  level?: number;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

export interface ButtonPositionConfig {
  position: 'absolute';
  top: number;
  left?: number;
  right?: number;
  zIndex: number;
  flexDirection?: 'row';
  gap?: number;
}

// ===== BUTTON STYLE UTILITIES =====

/**
 * Creates the base button style for floating action buttons
 * @param colors - Theme colors
 * @param isDarkMode - Whether the app is in dark mode
 * @returns Button style configuration
 */
export const createButtonStyle = (colors: ThemeColors, isDarkMode: boolean): ButtonStyleConfig => ({
  width: FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_SIZE,
  height: FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_SIZE,
  borderRadius: FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_RADIUS,
  backgroundColor: colors.elevation1,
  alignItems: 'center',
  justifyContent: 'center',
  // Reduce prominence in light mode where light colors are more visible
  opacity: isDarkMode ? 0.7 : 0.45, // More subtle in light mode, more visible in dark mode
  ...LAYOUT.ELEVATION.SUBTLE,
});

/**
 * Creates the active button style for floating action buttons
 * @param baseStyle - Base button style
 * @param colors - Theme colors
 * @param isDarkMode - Whether the app is in dark mode
 * @returns Active button style configuration
 */
export const createActiveButtonStyle = (
  baseStyle: ButtonStyleConfig,
  colors: ThemeColors,
  isDarkMode: boolean
): ButtonStyleConfig => ({
  ...baseStyle,
  backgroundColor: colors.elevation2,
  // Slightly higher opacity for active state but still more subtle in light mode
  opacity: isDarkMode ? 0.85 : 0.6,
});

/**
 * Calculates button positions for floating action buttons
 * @param topInset - Safe area top inset
 * @returns Object containing close button and action buttons positioning
 */
export const calculateButtonPositions = (topInset: number) => {
  const topPosition = topInset + FLOATING_ACTION_BUTTON_CONSTANTS.TOP_MARGIN;

  const closeButtonStyle: ButtonPositionConfig = {
    position: 'absolute',
    top: topPosition,
    left: FLOATING_ACTION_BUTTON_CONSTANTS.SIDE_MARGIN,
    zIndex: FLOATING_ACTION_BUTTON_CONSTANTS.Z_INDEX,
  };

  const actionButtonsStyle: ButtonPositionConfig = {
    position: 'absolute',
    top: topPosition,
    right: FLOATING_ACTION_BUTTON_CONSTANTS.SIDE_MARGIN,
    zIndex: FLOATING_ACTION_BUTTON_CONSTANTS.Z_INDEX,
    flexDirection: 'row',
    gap: FLOATING_ACTION_BUTTON_CONSTANTS.SPACING,
  };

  return {
    closeButtonStyle,
    actionButtonsStyle,
  };
};

/**
 * Creates ripple configuration for Android floating action buttons
 * @param colors - Theme colors
 * @returns Android ripple configuration
 */
export const createRippleConfig = (colors: ThemeColors) => ({
  color: colors.tint,
  radius: FLOATING_ACTION_BUTTON_CONSTANTS.RIPPLE_RADIUS,
});

/**
 * Determines icon color based on button state
 * @param isActive - Whether the button is in active state
 * @param colors - Theme colors
 * @returns Icon color string
 */
export const getIconColor = (isActive: boolean, colors: ThemeColors): string => {
  return isActive ? colors.tint : colors.secondaryText;
};

/**
 * Creates accessibility label for floating action buttons
 * @param buttonType - Type of button ('close', 'playlist', 'play')
 * @param isActive - Whether the button is in active state
 * @returns Accessibility label string
 */
export const createAccessibilityLabel = (
  buttonType: 'close' | 'playlist' | 'play',
  isActive: boolean
): string => {
  switch (buttonType) {
    case 'close':
      return 'Close article';
    case 'playlist':
      return isActive ? 'Remove from listening list' : 'Add to listening list';
    case 'play':
      return isActive ? 'Stop audio playback' : 'Start audio playback';
    default:
      return '';
  }
};

/**
 * Determines icon name based on button type and state
 * @param buttonType - Type of button ('close', 'playlist', 'play')
 * @param isActive - Whether the button is in active state
 * @returns Icon name string
 */
export const getIconName = (
  buttonType: 'close' | 'playlist' | 'play',
  isActive: boolean
): string => {
  switch (buttonType) {
    case 'close':
      return 'close';
    case 'playlist':
      return isActive ? 'headset' : 'headset-outline';
    case 'play':
      return isActive ? 'stop' : 'play';
    default:
      return '';
  }
};
