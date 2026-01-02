import { Ionicons } from '@expo/vector-icons';
import React, { type JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_BUTTON, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ThemedButtonProps } from '@/types/ui/button.types';
import { createPadding } from '@/utils/layoutUtils';
import { createButtonTextStyle } from '@/utils/textStyleUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Static lookup maps - zero per-render allocations
const TEXT_TYPE_MAP = {
  small: { normal: 'caption', bold: 'label' },
  medium: { normal: 'body', bold: 'bodyBold' },
  large: { normal: 'heading3', bold: 'heading3' },
} as const;

const ICON_SIZE_MAP = {
  small: LAYOUT.BUTTON.ICON_SIZE.SMALL + 2,
  medium: LAYOUT.BUTTON.ICON_SIZE.LARGE,
  large: LAYOUT.BUTTON.ICON_SIZE.XLARGE,
} as const;

export function ThemedButton({
  variant = 'filled', // Most common value - hardcoded
  title,
  icon,
  loading = false, // Always false when not specified
  style,
  disabled = false, // Always false when not specified
  iconSize: customIconSize = LAYOUT.BUTTON.ICON_SIZE.LARGE, // Most common value - hardcoded
  onPress,
  size = 'medium', // Most common value - hardcoded
  textWeight = 'bold', // Most common value - hardcoded
  enableOptimisticLoading = false, // Only enable when explicitly requested
  uppercase = true, // Default to uppercase for most buttons
  ...props
}: ThemedButtonProps): JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(PRESS_ANIMATION_BUTTON);

  // Optimistic loading state - only when explicitly enabled
  const [optimisticLoading, setOptimisticLoading] = React.useState(false);
  const isActuallyLoading = loading || (enableOptimisticLoading && optimisticLoading);

  // Create the press handler with optional optimistic loading
  const pressHandler = (event: GestureResponderEvent) => {
    if (onPress && !disabled && !isActuallyLoading) {
      if (enableOptimisticLoading) {
        setOptimisticLoading(true); // Immediately show loading
        onPress(event);
        // Auto-clear optimistic loading after 500ms as fallback (much shorter)
        setTimeout(() => {
          setOptimisticLoading(false);
        }, 500);
      } else {
        onPress(event);
      }
    }
  };

  const textColor = disabled
    ? colors.disabled
    : variant === 'filled'
      ? isDarkMode
        ? colors.black // Dark text on sage tint background in dark mode
        : colors.white // White text on sage tint background in light mode
      : colors.tint;
  const iconSize = customIconSize ?? ICON_SIZE_MAP[size];

  // Button styles
  const buttonStyle = [
    styles.button,
    size === 'large' && styles.buttonLarge,
    size === 'small' && styles.buttonSmall,
    variant === 'filled' && {
      backgroundColor: isActuallyLoading || disabled ? colors.cardBorder : colors.tint,
      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
      borderColor: isActuallyLoading || disabled ? colors.cardBorder : colors.tint, // Transparent border matching background
    },
    variant === 'outlined' && {
      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
      borderColor: isActuallyLoading || disabled ? colors.border : colors.tint,
      backgroundColor: 'transparent', // Explicit transparent background
    },
  ];

  const buttonTextStyle = [
    styles.buttonText,
    size === 'large' && styles.buttonTextLarge,
    size === 'small' && styles.buttonTextSmall,
  ];

  const iconContainerStyle = [styles.iconContainer, size === 'small' && styles.iconContainerSmall];

  return (
    <AnimatedPressable
      style={[buttonStyle, animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isActuallyLoading}
      onPress={pressHandler}
      {...props}
    >
      <View style={styles.innerContainer}>
        {icon && (
          <View style={iconContainerStyle}>
            {isActuallyLoading ? (
              <ActivityIndicator color={textColor} size="small" />
            ) : (
              <Ionicons
                color={textColor}
                name={icon as keyof typeof Ionicons.glyphMap}
                size={iconSize}
              />
            )}
          </View>
        )}

        <View style={styles.contentContainer}>
          {isActuallyLoading && !icon ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <ThemedText
              skipDefaultColor
              colorName={
                disabled
                  ? 'disabled'
                  : variant === 'filled'
                    ? isDarkMode
                      ? 'black'
                      : 'white'
                    : 'tint'
              }
              style={[buttonTextStyle, isActuallyLoading && !icon && styles.hiddenText]}
              type={TEXT_TYPE_MAP[size][textWeight]}
            >
              {uppercase ? title?.toUpperCase() : title}
            </ThemedText>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    minHeight: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    ...createPadding({ horizontal: 'LARGE', vertical: 'MEDIUM' }),
  },
  buttonLarge: {
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
    ...createPadding({ horizontal: 'XLARGE', vertical: 'LARGE' }),
  },
  buttonSmall: {
    minHeight: LAYOUT.BUTTON.HEIGHT.SMALL,
    ...createPadding({ horizontal: 'MEDIUM', vertical: 'SMALL' }),
  },
  buttonText: createButtonTextStyle('medium'),
  buttonTextLarge: createButtonTextStyle('large'),
  buttonTextSmall: createButtonTextStyle('small'),
  contentContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  iconContainerSmall: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  innerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  hiddenText: {
    opacity: 0,
  },
});

ThemedButton.displayName = 'ThemedButton';
