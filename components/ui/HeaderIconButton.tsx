import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple } from '@/utils/layoutUtils';

type ButtonSize = 'small' | 'medium' | 'large';

export interface HeaderIconButtonProps {
  /** Icon name from Ionicons */
  iconName: keyof typeof Ionicons.glyphMap;
  /** Press handler - haptic feedback is automatically added */
  onPress: () => void;
  /** Button size - determines width, height, and icon size */
  size?: ButtonSize;
  /** Icon color - defaults to theme text color */
  iconColor?: string;
  /** Background color - defaults to theme elevation1 */
  backgroundColor?: string;
  /** Whether to show border - defaults to false */
  withBorder?: boolean;
  /** Border color - only used if withBorder is true */
  borderColor?: string;
  /** Opacity - defaults to LAYOUT.OPACITY.HOVER */
  opacity?: number;
  /** Test ID for testing */
  testID?: string;
  /** Hit slop size - defaults based on button size */
  hitSlop?: 'small' | 'medium' | 'large';
}

const SIZE_CONFIG = {
  small: {
    dimension: MIN_TOUCH_TARGET.SMALL,
    iconSize: LAYOUT.BUTTON.ICON_SIZE.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    hitSlop: LAYOUT.HIT_SLOP.SMALL,
  },
  medium: {
    dimension: MIN_TOUCH_TARGET.MEDIUM,
    iconSize: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    hitSlop: LAYOUT.HIT_SLOP.MEDIUM,
  },
  large: {
    dimension: MIN_TOUCH_TARGET.LARGE,
    iconSize: LAYOUT.BUTTON.ICON_SIZE.LARGE,
    borderRadius: MIN_TOUCH_TARGET.LARGE / 2,
    hitSlop: LAYOUT.HIT_SLOP.LARGE,
  },
} as const;

const HIT_SLOP_MAP = {
  small: LAYOUT.HIT_SLOP.SMALL,
  medium: LAYOUT.HIT_SLOP.MEDIUM,
  large: LAYOUT.HIT_SLOP.LARGE,
} as const;

/**
 * Reusable circular icon button for headers
 *
 * Provides consistent styling and behavior:
 * - Automatic haptic feedback on press
 * - Android ripple effect
 * - Configurable size, colors, and border
 * - Optimized with memoization
 *
 * @example
 * <HeaderIconButton
 *   iconName="close"
 *   onPress={handleClose}
 *   size="medium"
 * />
 *
 * @example
 * <HeaderIconButton
 *   iconName="chevron-up"
 *   onPress={toggleSort}
 *   size="small"
 *   withBorder
 * />
 */
export const HeaderIconButton = memo<HeaderIconButtonProps>(
  ({
    iconName,
    onPress,
    size = 'medium',
    iconColor,
    backgroundColor,
    withBorder = false,
    borderColor,
    opacity = LAYOUT.OPACITY.HOVER,
    testID,
    hitSlop,
  }) => {
    const colors = useColors();

    const config = SIZE_CONFIG[size];
    const finalHitSlop = hitSlop ? HIT_SLOP_MAP[hitSlop] : config.hitSlop;

    // Handle press with haptic feedback
    const handlePress = useCallback(() => {
      selectionFeedback();
      onPress();
    }, [onPress]);

    // Memoize dynamic button style
    const buttonStyle = useMemo(
      () => [
        styles.button,
        {
          width: config.dimension,
          height: config.dimension,
          borderRadius: config.borderRadius,
          backgroundColor: backgroundColor ?? colors.elevation1,
          opacity,
          ...(withBorder && {
            borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
            borderColor: borderColor ?? colors.border,
          }),
        },
      ],
      [
        config.dimension,
        config.borderRadius,
        backgroundColor,
        colors.elevation1,
        colors.border,
        opacity,
        withBorder,
        borderColor,
      ],
    );

    // Memoize ripple config
    const rippleConfig = useMemo(
      () => createAndroidRipple(colors, size === 'small' ? 'small' : undefined),
      [colors, size],
    );

    const finalIconColor = iconColor ?? colors.text;

    return (
      <Pressable
        style={buttonStyle}
        onPress={handlePress}
        hitSlop={finalHitSlop}
        android_ripple={rippleConfig}
        testID={testID}
      >
        <Ionicons name={iconName} size={config.iconSize} color={finalIconColor} />
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
});

HeaderIconButton.displayName = 'HeaderIconButton';
