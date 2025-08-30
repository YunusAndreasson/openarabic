import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo, type JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DEFAULT_ANIMATION_DURATION } from '@/constants/animation';
import { Theme } from '@/constants/colors';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useDebounce, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useCurrentTheme, useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ButtonSize, ButtonTextWeight, ThemedButtonProps } from '@/types/ui/button.types';
import { selectionFeedback } from '@/utils/haptics';

import { ThemedText } from './ThemedText';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * A themed button component that supports different visual styles,
 * icons, loading states, and press animations.
 *
 * This component follows the design system using:
 * - Colors from colors.ts via useColors hook
 * - Layout constants from layout.ts
 * - Types from ui.types.ts
 * - Animations from hooks/animations
 */
const getTextType = (size: ButtonSize, weight: ButtonTextWeight) => {
  if (weight === 'normal') {
    switch (size) {
      case 'small':
        return 'caption';
      case 'large':
        return 'heading3';
      default:
        return 'body';
    }
  }
  switch (size) {
    case 'small':
      return 'label';
    case 'large':
      return 'heading3';
    default:
      return 'bodyBold';
  }
};

const getIconSize = (size: ButtonSize, customSize?: number) => {
  if (customSize) return customSize;
  switch (size) {
    case 'small':
      return LAYOUT.BUTTON.ICON_SIZE.SMALL + 2; // closest predefined size
    case 'large':
      return LAYOUT.BUTTON.ICON_SIZE.XLARGE;
    default:
      return LAYOUT.BUTTON.ICON_SIZE.LARGE;
  }
};

function ThemedButtonComponent({
  variant = 'filled',
  title,
  icon,
  loading = false,
  style,
  disabled = false,
  iconSize: customIconSize = LAYOUT.BUTTON.ICON_SIZE.LARGE,
  onPress,
  size = 'medium',
  textWeight = 'bold',
  disablePressAnimation = false,
  uppercase = true,
  hapticFeedback = false,
  debounceMs = 300,
  ...props
}: ThemedButtonProps): JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const currentTheme = useCurrentTheme();

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    opacityAmount: LAYOUT.OPACITY.PRESSED,
  });

  // Create the press handler with haptic feedback
  const pressHandler = useCallback(
    (event: GestureResponderEvent) => {
      if (hapticFeedback) {
        selectionFeedback();
      }
      if (onPress && !disabled && !loading) {
        onPress(event);
      }
    },
    [onPress, disabled, loading, hapticFeedback]
  );

  // Apply debouncing to the press handler
  const [debouncedHandlePress, isDebouncing] = useDebounce(pressHandler, debounceMs);

  const textColor = disabled
    ? colors.secondaryText
    : variant === 'filled'
    ? currentTheme === Theme.Sepia
      ? colors.white // Use white text for sepia theme filled buttons for better contrast
      : isDarkMode
      ? colors.black
      : colors.text
    : colors.tint;
  const iconSize = useMemo(() => getIconSize(size, customIconSize), [size, customIconSize]);

  // Button styles
  const buttonStyle = useMemo(
    () => [
      styles.button,
      size === 'large' && styles.buttonLarge,
      size === 'small' && styles.buttonSmall,
      variant === 'filled' && {
        backgroundColor: disabled ? colors.cardBorder : colors.tint,
      },
      variant === 'outlined' && {
        borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        borderColor: disabled ? colors.border : colors.tint,
      },
    ],
    [size, variant, colors.tint, colors.cardBorder, disabled]
  );

  const buttonTextStyle = useMemo(
    () => [
      styles.buttonText,
      size === 'large' && styles.buttonTextLarge,
      size === 'small' && styles.buttonTextSmall,
    ],
    [size]
  );

  const iconContainerStyle = useMemo(
    () => [styles.iconContainer, size === 'small' && styles.iconContainerSmall],
    [size]
  );

  const textOpacityStyle = useMemo(
    () => (loading && !icon ? styles.hiddenText : null),
    [loading, icon]
  );

  // Accessibility properties
  const accessibilityLabel = props.accessibilityLabel || title;
  const accessibilityState = {
    disabled: disabled || loading || isDebouncing,
    busy: loading || isDebouncing,
    ...props.accessibilityState,
  };

  return (
    <AnimatedTouchable
      style={[buttonStyle, disablePressAnimation ? null : animatedStyle]}
      onPressIn={disablePressAnimation ? undefined : handlePressIn}
      onPressOut={disablePressAnimation ? undefined : handlePressOut}
      disabled={disabled || loading || isDebouncing}
      onPress={debouncedHandlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      accessibilityHint={loading ? 'Button is loading' : undefined}
      {...props}
    >
      <View style={styles.innerContainer}>
        {icon && (
          <View style={iconContainerStyle}>
            {loading ? (
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
          {loading && !icon ? (
            <Animated.View entering={FadeIn.duration(DEFAULT_ANIMATION_DURATION)}>
              <ActivityIndicator color={textColor} size="small" />
            </Animated.View>
          ) : (
            <ThemedText
              skipDefaultColor
              colorName={
                disabled
                  ? 'black'
                  : variant === 'filled'
                  ? currentTheme === Theme.Sepia
                    ? 'white'
                    : isDarkMode
                    ? 'black'
                    : 'text'
                  : 'tint'
              }
              style={[buttonTextStyle, textOpacityStyle]}
              type={getTextType(size, textWeight)}
            >
              {uppercase ? title?.toUpperCase() : title}
            </ThemedText>
          )}
        </View>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    minHeight: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  buttonLarge: {
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  buttonSmall: {
    minHeight: LAYOUT.BUTTON.HEIGHT.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE, // bump medium button text from 15 -> 17 for uppercase legibility
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.HEAVY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_WIDE,
    textAlign: 'center',
  },
  buttonTextLarge: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE, // bump large button text from 17 -> 20
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_WIDE,
  },
  buttonTextSmall: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // bump small button text from 13 -> 15
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
  },
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

export const ThemedButton = memo(ThemedButtonComponent);
