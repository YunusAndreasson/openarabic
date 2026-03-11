import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
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
  small: 'label',
  medium: 'bodyBold',
  large: 'heading3',
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
  onPress,
  size = 'medium', // Most common value - hardcoded
  enableOptimisticLoading = false, // Only enable when explicitly requested
  uppercase = false, // Sentence case — modern 2026 standard
  ...props
}: ThemedButtonProps): JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(PRESS_ANIMATION_BUTTON);

  // Optimistic loading state - only when explicitly enabled
  const [optimisticLoading, setOptimisticLoading] = useState(false);
  const optimisticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActuallyLoading = loading || (enableOptimisticLoading && optimisticLoading);

  useEffect(() => {
    return () => {
      if (optimisticTimeoutRef.current) clearTimeout(optimisticTimeoutRef.current);
    };
  }, []);

  // Create the press handler with optional optimistic loading
  const pressHandler = (event: GestureResponderEvent) => {
    if (onPress && !disabled && !isActuallyLoading) {
      if (enableOptimisticLoading) {
        setOptimisticLoading(true);
        onPress(event);
        optimisticTimeoutRef.current = setTimeout(() => {
          setOptimisticLoading(false);
        }, 500);
      } else {
        onPress(event);
      }
    }
  };

  // Single source of truth for text/icon color
  const textColorName = disabled ? 'disabled' : variant === 'filled' ? (isDarkMode ? 'black' : 'white') : 'tint';
  const textColor = colors[textColorName];
  const iconSize = ICON_SIZE_MAP[size];

  // Android Material Design 3 ripple config (must be a prop, not style)
  const androidRipple =
    Platform.OS === 'android'
      ? {
          color:
            variant === 'filled'
              ? 'rgba(255, 255, 255, 0.12)' // White ripple on colored background
              : `rgba(${
                  colors.tint
                    .replace('#', '')
                    .match(/.{2}/g)
                    ?.map(x => parseInt(x, 16))
                    .join(', ') || '86, 128, 102'
                }, 0.12)`, // Tint color ripple
          borderless: false,
          radius: LAYOUT.ANDROID.TOUCH_TARGET.RIPPLE_RADIUS,
        }
      : undefined;

  // Button styles
  const buttonStyle = [
    styles.button,
    size === 'large' && styles.buttonLarge,
    size === 'small' && styles.buttonSmall,
    variant === 'filled' && {
      backgroundColor:
        isActuallyLoading || disabled
          ? isDarkMode
            ? colors.elevation1 // Darker bg in dark mode for ~3:1 contrast with disabled text
            : colors.cardBorder
          : colors.tint,
      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
      borderColor: isActuallyLoading || disabled ? colors.cardBorder : colors.tint,
    },
    variant === 'outlined' && {
      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
      borderColor: isActuallyLoading || disabled ? colors.border : colors.tint,
      backgroundColor: colors.transparent,
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
      android_ripple={androidRipple}
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
              colorName={textColorName}
              style={[buttonTextStyle, isActuallyLoading && !icon && styles.hiddenText]}
              type={TEXT_TYPE_MAP[size]}
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
