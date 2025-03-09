import React, { useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { useButtonAnimation } from '@/hooks/animations';

interface ThemedButtonProps extends TouchableOpacityProps {
  /** Visual style variant of the button */
  variant?: 'filled' | 'outlined';
  /** Text displayed on the button */
  title: string;
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
  /** Optional custom icon component (overrides icon prop if both are provided) */
  iconComponent?: React.ReactNode;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Additional content to render inside the button */
  children?: React.ReactNode;
  /** Size of the icon in pixels */
  iconSize?: number;
  /** Optional style to apply to the content container */
  contentContainerStyle?: ViewStyle;
  /** Optional style to apply to the inner container */
  innerContainerStyle?: ViewStyle;
  /** Optional custom scale amount for the press animation (default is 0.95) */
  scaleAmount?: number;
}

/**
 * A themed button component that supports different visual styles,
 * icons, loading states, and press animations.
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
  const { animatedStyle, handlePressIn, handlePressOut } = useButtonAnimation(scaleAmount);

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
    const textColor = isFilled ? colors.background : colors.tint;

    // Only apply border for outlined variant on Android
    // iOS uses shadows instead
    const borderWidth = Platform.OS === 'android' ? (isFilled ? 0 : 1) : 0;

    return [
      styles.button,
      {
        backgroundColor,
        borderWidth,
        borderColor: colors.tint,
        shadowColor: colors.cardShadow,
      },
      isFilled && Platform.OS === 'ios' && styles.iosShadow,
      (disabled || loading) && styles.buttonDisabled,
      // Platform specific elevation
      Platform.OS === 'android' && isFilled && { elevation: 4 },
      style, // User style comes last to override default styles
    ];
  }, [variant, colors, disabled, loading, style]);

  // Default accessibility label to the title if not provided
  const finalAccessibilityLabel = accessibilityLabel || title;

  // Add loading/disabled state to accessibility label if needed
  const accessibilityState = {
    disabled: disabled || loading,
    busy: loading,
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={buttonStyles}
        disabled={disabled || loading}
        activeOpacity={1} // We're handling the opacity animation ourselves
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={finalAccessibilityLabel}
        accessibilityState={accessibilityState}
        {...props}
      >
        <View style={[styles.innerContainer, innerContainerStyle]}>
          {loading ? (
            <View style={styles.iconContainer}>
              <ActivityIndicator
                size="small"
                color={variant === 'filled' ? colors.background : colors.tint}
              />
            </View>
          ) : iconComponent ? (
            <View style={styles.iconContainer}>{iconComponent}</View>
          ) : icon ? (
            <View style={styles.iconContainer}>
              <Ionicons
                name={icon as any}
                size={iconSize}
                color={variant === 'filled' ? colors.background : colors.tint}
              />
            </View>
          ) : null}

          <View style={[styles.contentContainer, contentContainerStyle]}>
            <ThemedText
              style={[
                styles.buttonText,
                { color: variant === 'filled' ? colors.background : colors.tint },
              ]}
              skipDefaultColor
            >
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
  },
  iosShadow: {
    shadowOffset: { width: 0, height: 4 },
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
