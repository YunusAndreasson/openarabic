import { type FC, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_CARD, usePressAnimation } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { BaseCardProps } from '@/types/ui/card.types';

// Static constants extracted outside component - zero per-render allocations
const PRESSABLE_STYLE = { flex: 1 } as const;

const SHADOW_LEVEL_MAP = {
  subtle: 'SUBTLE',
  small: 'SMALL',
  medium: 'MEDIUM',
  large: 'LARGE',
} as const;

export const BaseCard: FC<BaseCardProps> = ({
  children,
  style,
  onPress,
  onLongPress,
  loading = false,
  shadowSize = 'medium',
  contentStyle,
  disabled = false,
  testID,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Press animation - using shared preset for zero allocations
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation(PRESS_ANIMATION_CARD);

  // Memoize computed styles to prevent recreation on every render
  const { baseCardStyle } = useMemo(() => {
    // Theme-aware elevation (no shadows in dark mode)
    const shadowStyles =
      shadowSize !== 'none' ? getThemeAwareElevation(SHADOW_LEVEL_MAP[shadowSize], isDarkMode) : {};

    const cardStyle = [
      styles.card,
      { backgroundColor: colors.card },
      shadowStyles,
      shadowSize !== 'none' && { shadowColor: colors.shadow },
      style,
      disabled && { opacity: LAYOUT.OPACITY.MEDIUM },
    ];

    return { baseCardStyle: cardStyle };
  }, [colors.card, colors.shadow, isDarkMode, shadowSize, style, disabled]);

  // Non-pressable paths use plain View (no animation overhead)
  if (loading) {
    return (
      <View style={baseCardStyle} testID={testID}>
        <View style={contentStyle} />
      </View>
    );
  }

  if (!onPress && !onLongPress) {
    return (
      <View style={baseCardStyle} testID={testID}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <Animated.View style={[baseCardStyle, animatedStyle]}>
      <Pressable
        testID={testID}
        disabled={disabled}
        android_ripple={{
          color: colors.navigationRipple,
          borderless: false,
          foreground: true,
        }}
        style={PRESSABLE_STYLE}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
      >
        <View style={contentStyle}>{children}</View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden', // Clip absolute children (progress bars) to border radius
  },
});

BaseCard.displayName = 'BaseCard';
