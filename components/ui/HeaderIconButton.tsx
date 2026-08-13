import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { ICON_BUTTON_SIZES, type IconButtonSize } from '@/constants/iconButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';

export interface HeaderIconButtonProps {
  /** Icon name from Ionicons */
  icon: IoniconName;
  /**
   * What the button does, for screen readers.
   *
   * This whole family is icon-only, so without a label a screen reader
   * announces nothing usable. It had no such prop at all until now, which is
   * why every header button in the app was silent.
   */
  accessibilityLabel: string;
  /** Press handler */
  onPress: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Button size - determines width, height, and icon size */
  size?: IconButtonSize;
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
 *   icon="close"
 *   accessibilityLabel="Close"
 *   onPress={handleClose}
 *   size="medium"
 * />
 */
export const HeaderIconButton = memo<HeaderIconButtonProps>(
  ({
    icon,
    accessibilityLabel,
    onPress,
    onLongPress,
    size = 'medium',
    iconColor,
    backgroundColor,
    disabled = false,
    testID,
  }) => {
    const colors = useColors();

    const config = ICON_BUTTON_SIZES[size];

    // No scale animation here on purpose — a header button sits in native
    // chrome, and a chip that shrinks inside a navigation bar reads as loose.
    // It did, however, ship with no press response of ANY kind on iOS, where
    // there is no ripple to fall back on. A pressed-opacity is the inline
    // idiom for a bare glyph, and it costs the Android ripple nothing.
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
    const buttonRadius = isIOSHeaderButton ? IOS_BAR_BUTTON_SIZE / 2 : config.dimension / 2;

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
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        android_ripple={rippleConfig}
        delayLongPress={TIMING_CONSTANTS.LONG_PRESS_DELAY}
        disabled={disabled}
        hitSlop={config.hitSlop}
        style={({ pressed }) => [
          buttonStyle,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        testID={testID}
        onLongPress={onLongPress}
        onPress={handlePress}
      >
        <Ionicons color={finalIconColor} name={icon} size={iconSize} />
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
});

HeaderIconButton.displayName = 'HeaderIconButton';
