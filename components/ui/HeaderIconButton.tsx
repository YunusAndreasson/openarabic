import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';

type ButtonSize = 'small' | 'medium' | 'large';

export interface HeaderIconButtonProps {
  /** Icon name from Ionicons */
  iconName: keyof typeof Ionicons.glyphMap;
  /** Press handler */
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

// iOS 26 UIBarButton has fixed 36pt width - use this for header buttons to ensure circular glass
const IOS_BAR_BUTTON_SIZE = 36;

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

    // Use shared button press hook (no animation for header buttons)
    const { handlePress, rippleConfig } = useButtonPress({
      onPress,
      rippleSize: size === 'small' ? 'small' : undefined,
    });

    // Memoize dynamic button style
    const finalBackgroundColor = backgroundColor ?? colors.elevation1;
    const isTransparent = finalBackgroundColor === colors.transparent;
    // iOS 26 header buttons: use 36pt to match native UIBarButton for circular glass
    const isIOSHeaderButton = Platform.OS === 'ios' && isTransparent;
    const buttonDimension = isIOSHeaderButton ? IOS_BAR_BUTTON_SIZE : config.dimension;
    const buttonRadius = isIOSHeaderButton ? IOS_BAR_BUTTON_SIZE / 2 : config.borderRadius;

    const buttonStyle = useMemo(
      () => [
        styles.button,
        {
          width: buttonDimension,
          height: buttonDimension,
          borderRadius: buttonRadius,
          backgroundColor: finalBackgroundColor,
          // Use full opacity for transparent buttons (native header icons), otherwise apply provided opacity
          opacity: isTransparent ? LAYOUT.OPACITY.FULL : opacity,
          ...(withBorder && {
            borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
            borderColor: borderColor ?? colors.border,
          }),
        },
      ],
      [
        buttonDimension,
        buttonRadius,
        finalBackgroundColor,
        colors.border,
        opacity,
        isTransparent,
        withBorder,
        borderColor,
      ],
    );

    const finalIconColor = iconColor ?? colors.text;
    // Use medium icon for iOS header buttons - fits nicely in 36pt glass
    const iconSize = isIOSHeaderButton ? LAYOUT.BUTTON.ICON_SIZE.MEDIUM : config.iconSize;

    return (
      <Pressable
        style={buttonStyle}
        onPress={handlePress}
        hitSlop={finalHitSlop}
        android_ripple={rippleConfig}
        testID={testID}
      >
        <Ionicons name={iconName} size={iconSize} color={finalIconColor} />
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

HeaderIconButton.displayName = 'HeaderIconButton';
