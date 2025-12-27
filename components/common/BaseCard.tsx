import { type FC, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { PRESS_ANIMATION_CARD, usePressAnimation } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { BaseCardProps } from '@/types/ui/card.types';
import { createCardContentStyle } from '@/utils/textStyleUtils';

// Static style extracted outside component - zero per-render allocations
const PRESSABLE_STYLE = { flex: 1 } as const;

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
  const { baseCardStyle, combinedContentStyle } = useMemo(() => {
    // Theme-aware elevation (no shadows in dark mode)
    let shadowStyles = {};
    if (shadowSize !== 'none') {
      const level =
        shadowSize === 'subtle'
          ? 'SUBTLE'
          : shadowSize === 'small'
            ? 'SMALL'
            : shadowSize === 'large'
              ? 'LARGE'
              : 'MEDIUM';
      shadowStyles = getThemeAwareElevation(level, isDarkMode);
    }

    const cardStyle = [
      styles.card,
      { backgroundColor: colors.card },
      shadowStyles,
      shadowSize !== 'none' && { shadowColor: colors.shadow },
      style,
      disabled && { opacity: LAYOUT.OPACITY.MEDIUM },
    ];

    return {
      baseCardStyle: cardStyle,
      combinedContentStyle: [styles.content, contentStyle],
    };
  }, [colors.card, colors.shadow, isDarkMode, shadowSize, style, contentStyle, disabled]);

  if (loading) {
    return (
      <Animated.View style={[baseCardStyle, animatedStyle]} testID={testID}>
        <View style={combinedContentStyle} />
      </Animated.View>
    );
  }

  if (!onPress && !onLongPress) {
    return (
      <Animated.View style={[baseCardStyle, animatedStyle]} testID={testID}>
        <View style={combinedContentStyle}>{children}</View>
      </Animated.View>
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
        <View style={combinedContentStyle}>{children}</View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    position: 'relative',
    zIndex: LAYOUT.Z_INDEX.CARD,
  },
  content: createCardContentStyle(),
});

BaseCard.displayName = 'BaseCard';
