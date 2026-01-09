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
interface SpacingOptions {
  horizontal?: SpacingScale;
  vertical?: SpacingScale;
  top?: SpacingScale;
  bottom?: SpacingScale;
  left?: SpacingScale;
  right?: SpacingScale;
  all?: SpacingScale;
}

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
    const horizontalKey = `${type}Horizontal` as keyof ViewStyle;
    style[horizontalKey] = SPACING_MAP[options.horizontal] as never;
  }

  if (options.vertical) {
    const verticalKey = `${type}Vertical` as keyof ViewStyle;
    style[verticalKey] = SPACING_MAP[options.vertical] as never;
  }

  if (options.top) {
    const topKey = `${type}Top` as keyof ViewStyle;
    style[topKey] = SPACING_MAP[options.top] as never;
  }

  if (options.bottom) {
    const bottomKey = `${type}Bottom` as keyof ViewStyle;
    style[bottomKey] = SPACING_MAP[options.bottom] as never;
  }

  if (options.left) {
    const leftKey = `${type}Left` as keyof ViewStyle;
    style[leftKey] = SPACING_MAP[options.left] as never;
  }

  if (options.right) {
    const rightKey = `${type}Right` as keyof ViewStyle;
    style[rightKey] = SPACING_MAP[options.right] as never;
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
