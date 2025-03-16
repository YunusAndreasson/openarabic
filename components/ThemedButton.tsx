import React, { useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '@/hooks/animations';
import { ThemedButtonProps } from '@/types/ui.types';

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
export function ThemedButton({
  variant = 'filled',
  title,
  icon,
  iconComponent,
  loading = false,
  style,
  disabled = false,
  children,
  iconSize = 24,
  onPress,
  contentContainerStyle,
  innerContainerStyle,
  scaleAmount = 0.95,
  accessibilityLabel,
  ...props
}: ThemedButtonProps) {
  const colors = useColors();

  // Use the standardized press animation hook from animations
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'button',
    scaleAmount,
  });

  // Handle press with haptic feedback
  const handlePress = (event: GestureResponderEvent) => {
    if (onPress && !disabled && !loading) {
      // Only attempt haptic feedback if the button is interactive
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress(event);
    }
  };

  // Memoize derived styles to avoid recalculation on every render
  const buttonStyles = useMemo(() => {
    // Determine colors based on variant
    const isFilled = variant === 'filled';
    const backgroundColor = isFilled ? colors.tint : 'transparent';

    // Apply border for outlined variant consistently across platforms
    // This matches the ThemedCard border style
    const borderWidth = isFilled ? 0 : LAYOUT.BORDER.WIDTH.THIN;

    return [
      styles.button,
      {
        backgroundColor,
        borderWidth,
        borderColor: colors.tint,
        shadowColor: colors.cardShadow,
      },
      // Apply shadow consistently with ThemedCard
      isFilled && styles.buttonShadow,
      (disabled || loading) && styles.buttonDisabled,
      // Platform specific elevation
      Platform.OS === 'android' && isFilled && { elevation: 4 },
      style, // User style comes last to override default styles
    ];
  }, [variant, colors, disabled, loading, style]);

  // Determine text color based on variant
  const textColor = variant === 'filled' ? colors.background : colors.tint;

  // Default accessibility label to the title if not provided
  const finalAccessibilityLabel = accessibilityLabel || title;

  // Add loading/disabled state to accessibility label if needed
  const accessibilityState = {
    disabled: disabled || loading,
    busy: loading,
  };

  // Add accessibility hint for screen readers
  const accessibilityHint = disabled
    ? 'This button is currently disabled'
    : loading
      ? 'This button is currently loading'
      : undefined;

  // Determine if we need to render an icon container
  const hasIcon = loading || iconComponent || icon;

  return (
    <Animated.View style={animatedStyle as any}>
      <TouchableOpacity
        style={buttonStyles as any}
        disabled={disabled || loading}
        activeOpacity={LAYOUT.OPACITY.PRESSED} // Use standardized opacity from LAYOUT
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={finalAccessibilityLabel}
        accessibilityState={accessibilityState}
        accessibilityHint={accessibilityHint}
        {...props}
      >
        <View style={[styles.innerContainer, innerContainerStyle]}>
          {hasIcon && (
            <View style={styles.iconContainer}>
              {loading ? (
                <ActivityIndicator size="small" color={textColor} />
              ) : iconComponent ? (
                iconComponent
              ) : (
                <Ionicons name={icon as any} size={iconSize} color={textColor} />
              )}
            </View>
          )}

          <View style={[styles.contentContainer, contentContainerStyle]}>
            <ThemedText style={[styles.buttonText, { color: textColor }]} skipDefaultColor>
              {title}
            </ThemedText>
            {children}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.BUTTON.PADDING.VERTICAL.MEDIUM,
    paddingHorizontal: LAYOUT.BUTTON.PADDING.HORIZONTAL.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minWidth: 160,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
    overflow: 'hidden', // Match ThemedCard overflow handling
  },
  buttonShadow: {
    // Match ThemedCard shadow style for consistency
    ...LAYOUT.SHADOW.MEDIUM,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  iconContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
