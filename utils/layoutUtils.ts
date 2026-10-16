import type { PressableAndroidRippleConfig } from 'react-native';

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

type SpacingProperty = 'padding' | 'margin';
type SpacingEdge = '' | 'Horizontal' | 'Vertical' | 'Top' | 'Bottom' | 'Left' | 'Right';

/**
 * Only the padding or margin properties a helper below can set. Typed as its
 * own record rather than as `ViewStyle`: since RN 0.88 `ViewStyle` is an
 * interface Expo widens for web (`userSelect?: string`, …), and spreading a
 * whole `ViewStyle` into `StyleSheet.create` carries those widened fields into
 * a text style, where they no longer type-check.
 */
type SpacingStyle = Partial<Record<`${SpacingProperty}${SpacingEdge}`, number>>;

/**
 * Generic helper to create spacing styles (padding or margin)
 * @param options - Spacing configuration
 * @param type - Type of spacing ('padding' or 'margin')
 * @returns Style with only the spacing properties set
 */
const createSpacing = (options: SpacingOptions, type: SpacingProperty): SpacingStyle => {
  const style: SpacingStyle = {};

  if (options.all) {
    style[type] = SPACING_MAP[options.all];
    return style;
  }

  if (options.horizontal) style[`${type}Horizontal`] = SPACING_MAP[options.horizontal];
  if (options.vertical) style[`${type}Vertical`] = SPACING_MAP[options.vertical];
  if (options.top) style[`${type}Top`] = SPACING_MAP[options.top];
  if (options.bottom) style[`${type}Bottom`] = SPACING_MAP[options.bottom];
  if (options.left) style[`${type}Left`] = SPACING_MAP[options.left];
  if (options.right) style[`${type}Right`] = SPACING_MAP[options.right];

  return style;
};

/**
 * Creates padding styles with consistent spacing
 * @param options - Padding configuration
 * @returns Style with padding
 */
export const createPadding = (options: SpacingOptions): SpacingStyle => {
  return createSpacing(options, 'padding');
};

/**
 * Creates margin styles with consistent spacing
 * @param options - Margin configuration
 * @returns Style with margin
 */
export const createMargin = (options: SpacingOptions): SpacingStyle => {
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
 * @param foreground - Draw the ripple ABOVE the content rather than behind it.
 *   Needed by surfaces that paint their own opaque background (cards), which
 *   would otherwise hide a background ripple entirely.
 * @returns Android ripple configuration
 */
export const createAndroidRipple = (
  colors: ThemeColors,
  size: 'small' | 'medium' | 'large' = 'medium',
  foreground = false,
): PressableAndroidRippleConfig => ({
  color: colors.navigationRipple,
  radius: RIPPLE_SIZE_MAP[size] / 2,
  foreground,
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
