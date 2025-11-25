import { type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { getDarkModeBorderStyle, getThemeAwareElevation, LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { BaseCardProps } from '@/types/ui/card.types';
import { createCardContentStyle } from '@/utils/textStyleUtils';

export const BaseCard: FC<BaseCardProps> = ({
  children,
  style,
  onPress,
  onLongPress,
  loading = false, // Always false when not specified
  shadowSize = 'medium', // Most common value - hardcoded
  contentStyle,
  disabled = false, // Always false when not specified
  testID,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Use sophisticated press animation for better feel and scroll compatibility
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
  });

  // 2025 Dark Mode: Use theme-aware elevation (no shadows in dark mode)
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

  // 2025 Dark Mode: Borders replace shadows for visual card definition
  const darkModeBorder = getDarkModeBorderStyle(isDarkMode);

  const combinedCardStyle = [
    styles.card,
    { backgroundColor: colors.card },
    shadowStyles,
    shadowSize !== 'none' && {
      shadowColor: colors.shadow,
    },
    // Add subtle border in dark mode for card definition (replaces invisible shadows)
    // Using borderOverlay (15% opacity tint) for a softer, more refined look
    darkModeBorder,
    isDarkMode && { borderColor: colors.borderOverlay },
    style,
  ];

  const combinedContentStyle = [styles.content, contentStyle];

  // Combine base card style with disabled state (animated style handled separately)
  const baseCardStyle = [combinedCardStyle, disabled && { opacity: LAYOUT.OPACITY.MEDIUM }];

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
        style={{ flex: 1 }}
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
