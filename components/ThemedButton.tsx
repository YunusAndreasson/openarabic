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
import { lightFeedback } from '@/utils/haptics';
import Animated from 'react-native-reanimated';
import { usePressAnimation, SPRING_CONFIG } from '@/hooks/animations';
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
  accessibilityLabel,
  size = 'medium',
  textWeight = 'bold',
  ...props
}: ThemedButtonProps) {
  const colors = useColors();

  // Custom spring config for button with minimal animation and no "pulsating"
  const buttonSpringConfig = {
    ...SPRING_CONFIG.BUTTON,
    damping: 25,
    stiffness: 300,
    mass: 0.8,
    overshootClamping: true, // Prevent any "bounciness"
  };

  // Use the standard press animation hook with custom config
  const {
    animatedStyle,
    handlePressIn: onPressIn,
    handlePressOut: onPressOut,
  } = usePressAnimation({
    type: 'custom',
    scaleAmount: 0.98, // Subtle scale effect
    springConfig: buttonSpringConfig,
  });

  // Add haptic feedback
  const handlePressIn = () => {
    lightFeedback();
    onPressIn();
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (onPress && !disabled && !loading) {
      onPress(event);
    }
  };

  // Determine text size based on button size
  const getTextType = (size: 'small' | 'medium' | 'large', weight: 'normal' | 'bold') => {
    if (weight === 'normal') {
      switch (size) {
        case 'small':
          return 'caption';
        case 'large':
          return 'heading3';
        case 'medium':
        default:
          return 'body';
      }
    } else {
      switch (size) {
        case 'small':
          return 'label';
        case 'large':
          return 'heading3';
        case 'medium':
        default:
          return 'bodyBold';
      }
    }
  };

  // Get button dimensions based on size
  const buttonHeight = useMemo(() => {
    switch (size) {
      case 'small':
        return LAYOUT.BUTTON.HEIGHT.SMALL;
      case 'large':
        return LAYOUT.BUTTON.HEIGHT.LARGE;
      case 'medium':
      default:
        return LAYOUT.BUTTON.HEIGHT.MEDIUM;
    }
  }, [size]);

  const paddingVertical = useMemo(() => {
    switch (size) {
      case 'small':
        return LAYOUT.BUTTON.PADDING.VERTICAL.SMALL;
      case 'large':
        return LAYOUT.BUTTON.PADDING.VERTICAL.LARGE;
      case 'medium':
      default:
        return LAYOUT.BUTTON.PADDING.VERTICAL.MEDIUM;
    }
  }, [size]);

  const paddingHorizontal = useMemo(() => {
    switch (size) {
      case 'small':
        return LAYOUT.BUTTON.PADDING.HORIZONTAL.SMALL;
      case 'large':
        return LAYOUT.BUTTON.PADDING.HORIZONTAL.LARGE;
      case 'medium':
      default:
        return LAYOUT.BUTTON.PADDING.HORIZONTAL.MEDIUM;
    }
  }, [size]);

  const borderRadius = useMemo(() => {
    switch (size) {
      case 'small':
        return LAYOUT.BUTTON.BORDER_RADIUS.SMALL;
      case 'large':
        return LAYOUT.BUTTON.BORDER_RADIUS.LARGE;
      case 'medium':
      default:
        return LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM;
    }
  }, [size]);

  // Determine icon size based on button size
  const actualIconSize = useMemo(() => {
    if (iconSize !== 24) return iconSize; // User-specified size takes precedence

    switch (size) {
      case 'small':
        return 18;
      case 'large':
        return 28;
      case 'medium':
      default:
        return 24;
    }
  }, [size, iconSize]);

  // Memoize derived styles to avoid recalculation on every render
  const buttonStyles = useMemo(() => {
    // Determine colors based on variant
    const isFilled = variant === 'filled';
    const backgroundColor = isFilled ? colors.tint : 'transparent';

    // Apply border for outlined variant consistently across platforms
    // This matches the ThemedCard border style
    const borderWidth = isFilled ? 0 : LAYOUT.BORDER.WIDTH.NORMAL;

    return [
      styles.button,
      {
        backgroundColor,
        borderWidth,
        borderColor: colors.tint,
        shadowColor: colors.cardShadow,
        minHeight: buttonHeight,
        paddingVertical,
        paddingHorizontal,
        borderRadius,
      },
      // Apply shadow consistently with ThemedCard
      isFilled && styles.buttonShadow,
      (disabled || loading) && styles.buttonDisabled,
      // Platform specific elevation
      Platform.OS === 'android' && isFilled && { elevation: 4 },
      style, // User style comes last to override default styles
    ];
  }, [
    variant,
    colors,
    disabled,
    loading,
    style,
    buttonHeight,
    paddingVertical,
    paddingHorizontal,
    borderRadius,
  ]);

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

  // Determine text style based on weight
  const buttonTextStyle = [
    styles.buttonText,
    size === 'small' ? styles.buttonTextSmall : null,
    size === 'large' ? styles.buttonTextLarge : null,
    textWeight === 'normal' ? styles.normalText : null,
  ];

  return (
    <Animated.View style={animatedStyle as any}>
      <TouchableOpacity
        style={buttonStyles as any}
        disabled={disabled || loading}
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={finalAccessibilityLabel}
        accessibilityState={accessibilityState}
        accessibilityHint={accessibilityHint}
        {...props}
      >
        <View style={[styles.innerContainer, innerContainerStyle]}>
          {hasIcon && (
            <View
              style={[styles.iconContainer, size === 'small' ? styles.iconContainerSmall : null]}
            >
              {loading ? (
                <ActivityIndicator size={size === 'small' ? 'small' : 'small'} color={textColor} />
              ) : iconComponent ? (
                iconComponent
              ) : (
                <Ionicons name={icon as any} size={actualIconSize} color={textColor} />
              )}
            </View>
          )}

          <View style={[styles.contentContainer, contentContainerStyle]}>
            <ThemedText
              type={getTextType(size, textWeight)}
              colorName={variant === 'filled' ? 'background' : 'tint'}
              skipDefaultColor
              style={buttonTextStyle}
            >
              {textWeight === 'normal' ? title : title?.toUpperCase()}
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
    overflow: 'hidden',
  },
  buttonShadow: {
    ...LAYOUT.SHADOW.MEDIUM,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
  iconContainer: {
    marginRight: LAYOUT.SPACING.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSmall: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    letterSpacing: 1.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonTextSmall: {
    letterSpacing: 1,
    fontSize: 12,
  },
  buttonTextLarge: {
    letterSpacing: 2,
    fontSize: 16,
  },
  normalText: {
    letterSpacing: 0.5,
    fontWeight: '400',
    textTransform: 'none',
  },
});
