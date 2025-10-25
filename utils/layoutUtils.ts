import type { ViewStyle } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';

/**
 * Spacing scale type for consistent usage across components
 */
export type SpacingScale = 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE' | 'XXLARGE';

/**
 * Maps spacing scale to actual values
 */
const SPACING_MAP: Record<SpacingScale, number> = {
  TINY: LAYOUT.SPACING.TINY,
  SMALL: LAYOUT.SPACING.SMALL,
  MEDIUM: LAYOUT.SPACING.MEDIUM,
  LARGE: LAYOUT.SPACING.LARGE,
  XLARGE: LAYOUT.SPACING.XLARGE,
  XXLARGE: LAYOUT.SPACING.XXLARGE,
};

/**
 * Spacing options type for padding and margin
 */
type SpacingOptions = {
  horizontal?: SpacingScale;
  vertical?: SpacingScale;
  top?: SpacingScale;
  bottom?: SpacingScale;
  left?: SpacingScale;
  right?: SpacingScale;
  all?: SpacingScale;
};

/**
 * Generic helper to create spacing styles (padding or margin)
 * @param options - Spacing configuration
 * @param type - Type of spacing ('padding' or 'margin')
 * @returns ViewStyle with spacing
 */
const createSpacing = (options: SpacingOptions, type: 'padding' | 'margin'): ViewStyle => {
  const style: ViewStyle = {};

  if (options.all) {
    style[type] = SPACING_MAP[options.all];
    return style;
  }

  if (options.horizontal) {
    (style as any)[`${type}Horizontal`] = SPACING_MAP[options.horizontal];
  }

  if (options.vertical) {
    (style as any)[`${type}Vertical`] = SPACING_MAP[options.vertical];
  }

  if (options.top) {
    (style as any)[`${type}Top`] = SPACING_MAP[options.top];
  }

  if (options.bottom) {
    (style as any)[`${type}Bottom`] = SPACING_MAP[options.bottom];
  }

  if (options.left) {
    (style as any)[`${type}Left`] = SPACING_MAP[options.left];
  }

  if (options.right) {
    (style as any)[`${type}Right`] = SPACING_MAP[options.right];
  }

  return style;
};

/**
 * Creates padding styles with consistent spacing
 * @param options - Padding configuration
 * @returns ViewStyle with padding
 */
export const createPadding = (options: SpacingOptions): ViewStyle => {
  return createSpacing(options, 'padding');
};

/**
 * Creates margin styles with consistent spacing
 * @param options - Margin configuration
 * @returns ViewStyle with margin
 */
export const createMargin = (options: SpacingOptions): ViewStyle => {
  return createSpacing(options, 'margin');
};

/**
 * Creates common container styles for layouts
 * @param options - Container configuration
 * @returns ViewStyle for container
 */
export const createContainerStyle = (options: {
  padding?: {
    horizontal?: SpacingScale;
    vertical?: SpacingScale;
    all?: SpacingScale;
  };
  margin?: {
    horizontal?: SpacingScale;
    vertical?: SpacingScale;
    all?: SpacingScale;
  };
  centered?: boolean;
  fullWidth?: boolean;
}): ViewStyle => {
  const style: ViewStyle = {};

  if (options.padding) {
    Object.assign(style, createPadding(options.padding));
  }

  if (options.margin) {
    Object.assign(style, createMargin(options.margin));
  }

  if (options.centered) {
    style.alignItems = 'center';
    style.justifyContent = 'center';
  }

  if (options.fullWidth) {
    style.width = '100%';
  }

  return style;
};

/**
 * Ripple size map for consistent Android ripple sizing
 */
const RIPPLE_SIZE_MAP = {
  small: MIN_TOUCH_TARGET.SMALL,
  medium: MIN_TOUCH_TARGET.MEDIUM,
  large: MIN_TOUCH_TARGET.LARGE,
} as const;

/**
 * Creates consistent Android ripple configuration
 * @param colors - Theme colors object
 * @param size - Size of the ripple radius
 * @returns Android ripple configuration
 */
export const createAndroidRipple = (
  colors: ThemeColors,
  size: 'small' | 'medium' | 'large' = 'medium',
) => ({
  color: colors.navigationRipple,
  radius: RIPPLE_SIZE_MAP[size] / 2,
});

/**
 * Common style patterns used throughout the app
 * Use these to avoid recreating common style combinations
 */
export const COMMON_STYLES = {
  /** Horizontal row with centered items */
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  /** Horizontal row with centered items and centered content */
  centeredRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  /** Medium border radius */
  roundedMedium: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  /** Full width container */
  fullWidth: {
    width: '100%' as const,
  },
  /** Flex 1 */
  flex1: {
    flex: 1,
  },
} as const;
