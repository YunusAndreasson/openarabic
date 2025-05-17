import { Ionicons } from '@expo/vector-icons';
import React, { memo, JSX, useMemo } from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import type {
  ThemedButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonTextWeight,
} from '@/types/ui/button.types';
import { lightFeedback } from '@/utils/haptics';

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
      return 18;
    case 'large':
      return 28;
    default:
      return 24;
  }
};

const IconContent = ({
  loading,
  iconComponent,
  icon,
  textColor,
  iconSize,
}: {
  loading: boolean;
  iconComponent?: React.ReactNode;
  icon?: string;
  textColor: string;
  iconSize: number;
}) => {
  if (loading) return <ActivityIndicator size="small" color={textColor} />;
  if (iconComponent) return iconComponent;
  if (icon)
    return (
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={iconSize} color={textColor} />
    );
  return null;
};

// Style generator functions
const getButtonStyle = (
  variant: ButtonVariant,
  size: ButtonSize,
  disabled: boolean,
  colors: ReturnType<typeof useColors>,
  style?: StyleProp<ViewStyle> | Animated.AnimateStyle<StyleProp<ViewStyle>>
) => [
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

const getButtonTextStyle = (size: ButtonSize, textWeight: ButtonTextWeight) => [
  styles.buttonText,
  size === 'small' && styles.buttonTextSmall,
  size === 'large' && styles.buttonTextLarge,
  textWeight === 'normal' && styles.normalText,
];

function ThemedButtonComponent({
  variant = 'filled',
  title,
  icon,
  iconComponent,
  loading = false,
  style,
  disabled = false,
  children,
  iconSize: customIconSize = 24,
  onPress,
  contentContainerStyle,
  innerContainerStyle,
  size = 'medium',
  textWeight = 'bold',
  ...props
}: ThemedButtonProps): JSX.Element {
  const colors = useColors();

  // Use the same animation config as BaseCard for consistency
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    opacityAmount: LAYOUT.OPACITY.PRESSED,
  });

  const handlePress = (event: GestureResponderEvent) => {
    lightFeedback();
    if (onPress && !disabled && !loading) {
      onPress(event);
    }
  };

  const textColor = variant === 'filled' ? colors.background : colors.tint;
  const iconSize = useMemo(() => getIconSize(size, customIconSize), [size, customIconSize]);
  const hasIcon = loading || iconComponent || icon;

  // Use extracted style functions
  const buttonTextStyle = getButtonTextStyle(size, textWeight);
  const buttonStyle = getButtonStyle(variant, size, disabled, colors, style);

  return (
    <AnimatedTouchable
      // @ts-expect-error - Known type issue with Reanimated's animated style
      style={[buttonStyle, animatedStyle]}
      disabled={disabled || loading}
      // Removed activeOpacity to allow custom animation to show
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <View style={[styles.innerContainer, innerContainerStyle]}>
        {hasIcon ? (
          <View style={[styles.iconContainer, size === 'small' && styles.iconContainerSmall]}>
            <IconContent
              loading={loading}
              iconComponent={iconComponent}
              icon={icon}
              textColor={textColor}
              iconSize={iconSize}
            />
          </View>
        ) : null}
        <View style={[styles.contentContainer, contentContainerStyle]}>
          <ThemedText
            type={getTextType(size, textWeight)}
            colorName={disabled ? 'disabled' : variant === 'filled' ? 'background' : 'tint'}
            skipDefaultColor
            style={buttonTextStyle}
          >
            {textWeight === 'normal' ? title : title?.toUpperCase()}
          </ThemedText>
          {children}
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
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  buttonTextLarge: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE - 1,
    letterSpacing: 2,
  },
  buttonTextSmall: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 1,
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
    fontWeight: '400',
    letterSpacing: 0.5,
    textTransform: 'none',
  },
});

export const ThemedButton = memo(ThemedButtonComponent);
