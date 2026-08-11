import { Ionicons } from '@/components/ui/Icon';
import { useEffect, useRef, useState, type JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import type { ColorName } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_BUTTON } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import type { ThemedButtonProps } from '@/types/ui/button.types';
import { tonalSurface } from '@/utils/colorUtils';
import { createPadding } from '@/utils/layoutUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Text type per size. This is the ONLY place a button's font size is decided.
 *
 * It used to pick a type here and then override `fontSize` again via
 * `createButtonTextStyle()`, so every button rendered one step larger than its
 * declared type — a `label`-typed small button came out at 16pt, not 13, and
 * the type survived only as a fontFamily hint. The declared type now wins,
 * giving a real 13 / 16 / 18 ramp.
 */
const TEXT_TYPE_MAP = {
  small: 'label',
  medium: 'bodyBold',
  large: 'heading3',
} as const;

const ICON_SIZE_MAP = {
  small: LAYOUT.BUTTON.ICON_SIZE.SMALL,
  medium: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  large: LAYOUT.BUTTON.ICON_SIZE.LARGE,
} as const;

const OPTIMISTIC_LOADING_TIMEOUT_MS = 500;

export function ThemedButton({
  variant = 'filled', // Most common value - hardcoded
  tone = 'default',
  title,
  icon,
  iconPosition = 'leading',
  loading = false, // Always false when not specified
  style,
  disabled = false, // Always false when not specified
  onPress,
  size = 'medium', // Most common value - hardcoded
  enableOptimisticLoading = false, // Only enable when explicitly requested
  uppercase = false, // Sentence case is the design-system default
  fullWidth = false,
  hapticType = 'light',
  accessibilityRole = 'button',
  ...props
}: ThemedButtonProps): JSX.Element {
  const colors = useColors();

  // Optimistic loading state - only when explicitly enabled
  const [optimisticLoading, setOptimisticLoading] = useState(false);
  const optimisticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActuallyLoading = loading || (enableOptimisticLoading && optimisticLoading);
  const isInert = disabled || isActuallyLoading;

  useEffect(() => {
    return () => {
      if (optimisticTimeoutRef.current) clearTimeout(optimisticTimeoutRef.current);
    };
  }, []);

  // Haptics, ripple and press-scale all come from the shared engine — this
  // component used to hand-roll all three, which is how the app ended up with
  // three different press feels depending on which button you touched.
  const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
    useButtonPress({
      onPress: (event?: GestureResponderEvent) => {
        if (enableOptimisticLoading) {
          setOptimisticLoading(true);
          onPress?.(event);
          optimisticTimeoutRef.current = setTimeout(() => {
            setOptimisticLoading(false);
          }, OPTIMISTIC_LOADING_TIMEOUT_MS);
        } else {
          onPress?.(event);
        }
      },
      disabled: isInert,
      hapticType,
      animationOptions: PRESS_ANIMATION_BUTTON,
    });

  // The hue the button paints itself with. `tone` is orthogonal to `variant`, so
  // a destructive action can be a quiet ghost or a loud filled button.
  const hue = tone === 'destructive' ? colors.error : colors.tint;
  const onHueColorName: ColorName = tone === 'destructive' ? 'onError' : 'onTint';

  // Single source of truth for text/icon color
  const textColorName: ColorName = isInert
    ? 'disabled'
    : variant === 'filled'
      ? onHueColorName
      : tone === 'destructive'
        ? 'error'
        : 'tint';
  const textColor = colors[textColorName];
  const iconSize = ICON_SIZE_MAP[size];

  // Android Material Design 3 ripple config (must be a prop, not style)
  const androidRipple = Platform.OS === 'android' ? rippleConfig : undefined;

  const surfaceStyle = (() => {
    if (variant === 'filled') {
      return {
        backgroundColor: isInert ? colors.disabledButtonBg : hue,
        borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
        borderColor: isInert ? colors.cardBorder : hue,
      };
    }
    if (variant === 'tonal') {
      return isInert
        ? {
            backgroundColor: colors.disabledButtonBg,
            borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
            borderColor: colors.cardBorder,
          }
        : {
            ...tonalSurface(colors.elevation2, hue),
            borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
          };
    }
    if (variant === 'outlined') {
      return {
        borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
        borderColor: isInert ? colors.border : hue,
        backgroundColor: colors.transparent,
      };
    }
    // ghost — no fill, no border. Tertiary actions ("Not now", "Skip", inline links).
    return { backgroundColor: colors.transparent };
  })();

  // Button styles
  const buttonStyle = [
    styles.button,
    size === 'large' && styles.buttonLarge,
    size === 'small' && styles.buttonSmall,
    variant === 'ghost' && styles.buttonGhost,
    fullWidth && styles.buttonFullWidth,
    surfaceStyle,
  ];

  const iconContainerStyle = [
    iconPosition === 'trailing' ? styles.iconContainerTrailing : styles.iconContainer,
    size === 'small' && iconPosition === 'leading' && styles.iconContainerSmall,
  ];

  // A spinner takes the icon slot and the label stays put. Replacing the label
  // instead — what the icon-less path used to do — made the button jump between
  // a sized label and a bare spinner on every press.
  const showGlyph = Boolean(icon) || isActuallyLoading;
  const glyph = showGlyph ? (
    <View style={iconContainerStyle}>
      {isActuallyLoading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : icon ? (
        <Ionicons color={textColor} name={icon} size={iconSize} />
      ) : null}
    </View>
  ) : null;

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ busy: isActuallyLoading, disabled: isInert }}
      android_ripple={androidRipple}
      disabled={isInert}
      // A 32pt-tall button is under the 44pt minimum; hit slop makes up the rest.
      hitSlop={size === 'small' ? LAYOUT.HIT_SLOP.SMALL : undefined}
      style={[buttonStyle, animatedStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <View style={styles.innerContainer}>
        {iconPosition === 'leading' ? glyph : null}

        <ThemedText
          skipDefaultColor
          colorName={textColorName}
          numberOfLines={1}
          style={styles.buttonText}
          type={TEXT_TYPE_MAP[size]}
        >
          {uppercase ? title?.toUpperCase() : title}
        </ThemedText>

        {iconPosition === 'trailing' ? glyph : null}
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
  // A ghost button has no surface to pad against, so horizontal padding only
  // pushes its label away from its neighbours — keep it tight. The 44pt
  // minHeight from `button` stays: with no fill to aim at, the touch target is
  // the only thing making it hittable.
  buttonGhost: {
    ...createPadding({ horizontal: 'SMALL', vertical: 'SMALL' }),
  },
  buttonFullWidth: {
    alignSelf: 'stretch',
  },
  buttonText: {
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  iconContainerTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  iconContainerSmall: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  innerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

ThemedButton.displayName = 'ThemedButton';
