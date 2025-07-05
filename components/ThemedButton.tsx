import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo, type JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DEFAULT_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
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
  hapticFeedback = true,
  ...props
}: ThemedButtonProps): JSX.Element {
  const colors = useColors();

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    opacityAmount: LAYOUT.OPACITY.PRESSED,
  });

  const handlePress = useCallback(
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

  const textColor = variant === 'filled' ? colors.background : colors.tint;
  const iconSize = useMemo(() => getIconSize(size, customIconSize), [size, customIconSize]);

  // Button styles
  const buttonStyle = [
    styles.button,
    variant === 'filled'
      ? { backgroundColor: disabled ? colors.disabled : colors.tint }
      : {
          backgroundColor: colors.transparent,
          borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
          borderColor: disabled ? colors.disabled : colors.tint,
        },
    size === 'small' && styles.buttonSmall,
    size === 'large' && styles.buttonLarge,
    style,
  ];

  const buttonTextStyle = [
    styles.buttonText,
    size === 'small' && styles.buttonTextSmall,
    size === 'large' && styles.buttonTextLarge,
    textWeight === 'normal' && styles.normalText,
  ];

  // Accessibility properties
  const accessibilityLabel = props.accessibilityLabel || title;
  const accessibilityState = {
    disabled: disabled || loading,
    busy: loading,
    ...props.accessibilityState,
  };

  return (
    <AnimatedTouchable
      style={[buttonStyle, disablePressAnimation ? {} : animatedStyle]}
      onPressIn={disablePressAnimation ? undefined : handlePressIn}
      onPressOut={disablePressAnimation ? undefined : handlePressOut}
      disabled={disabled || loading}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      accessibilityHint={loading ? 'Button is loading' : undefined}
      {...props}
    >
      <View style={styles.innerContainer}>
        {icon && (
          <View style={[styles.iconContainer, size === 'small' && styles.iconContainerSmall]}>
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
              colorName={disabled ? 'disabled' : variant === 'filled' ? 'background' : 'tint'}
              style={[buttonTextStyle, loading && !icon && { opacity: 0 }]}
              type={getTextType(size, textWeight)}
            >
              {textWeight === 'normal' ? title : title?.toUpperCase()}
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
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  buttonLarge: {
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  buttonSmall: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.HEAVY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_WIDE,
    textAlign: 'center',
  },
  buttonTextLarge: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_WIDE,
  },
  buttonTextSmall: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
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
  normalText: {
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
    textTransform: 'none',
  },
});

export const ThemedButton = memo(ThemedButtonComponent);
