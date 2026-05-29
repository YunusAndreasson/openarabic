import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';

type ButtonSize = 'small' | 'medium' | 'large';

export interface HeaderIconButtonProps {
  /** Icon name from Ionicons */
  iconName: IoniconName;
  /** Press handler */
  onPress: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Button size - determines width, height, and icon size */
  size?: ButtonSize;
  /** Icon color - defaults to theme text color */
  iconColor?: string;
  /** Background color - defaults to theme elevation1 */
  backgroundColor?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
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

/**
 * Reusable circular icon button for headers
 *
 * Provides consistent styling and behavior:
 * - Android ripple effect
 * - Configurable size and colors
 * - Optimized with memoization
 *
 * @example
 * <HeaderIconButton
 *   iconName="close"
 *   onPress={handleClose}
 *   size="medium"
 * />
 */
export const HeaderIconButton = memo<HeaderIconButtonProps>(
  ({
    iconName,
    onPress,
    onLongPress,
    size = 'medium',
    iconColor,
    backgroundColor,
    disabled = false,
    testID,
  }) => {
    const colors = useColors();

    const config = SIZE_CONFIG[size];

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
          // Use full opacity for transparent buttons (native header icons), otherwise apply hover opacity
          opacity: isTransparent ? LAYOUT.OPACITY.FULL : LAYOUT.OPACITY.HOVER,
        },
      ],
      [buttonDimension, buttonRadius, finalBackgroundColor, isTransparent],
    );

    const finalIconColor = iconColor ?? colors.text;
    // Use large icon for iOS header buttons - better visibility in 36pt glass
    const iconSize = isIOSHeaderButton ? LAYOUT.BUTTON.ICON_SIZE.LARGE : config.iconSize;

    return (
      <Pressable
        style={[buttonStyle, disabled && { opacity: LAYOUT.OPACITY.MEDIUM }]}
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={TIMING_CONSTANTS.LONG_PRESS_DELAY}
        hitSlop={config.hitSlop}
        android_ripple={rippleConfig}
        disabled={disabled}
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
