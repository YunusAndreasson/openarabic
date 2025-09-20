import { memo, useMemo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseCardProps } from '@/types/ui/card.types';
import { createCardContentStyle } from '@/utils/textStyleUtils';

const BaseCard: FC<BaseCardProps> = memo(
  ({
    children,
    style,
    onPress,
    onLongPress,
    isLoading = false, // Always false when not specified
    shadowSize = 'medium', // Most common value - hardcoded
    contentStyle,
    disabled = false, // Always false when not specified
    testID,
  }) => {
    const colors = useColors();

    // Use sophisticated press animation for better feel and scroll compatibility
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
    });

    const shadowStyles = useMemo(() => {
      if (shadowSize === 'none') return {};

      switch (shadowSize) {
        case 'small':
          return LAYOUT.ELEVATION.SMALL;
        case 'large':
          return LAYOUT.ELEVATION.LARGE;
        default:
          return LAYOUT.ELEVATION.MEDIUM;
      }
    }, [shadowSize]);

    const combinedCardStyle = useMemo(
      () => [
        styles.card,
        { backgroundColor: colors.card },
        shadowStyles,
        shadowSize !== 'none' && {
          shadowColor: colors.shadow,
        },
        style,
      ],
      [colors.card, shadowStyles, shadowSize, colors.shadow, style]
    );

    const combinedContentStyle = useMemo(() => [styles.content, contentStyle], [contentStyle]);

    // Combine base card style with disabled state (animated style handled separately)
    const baseCardStyle = useMemo(
      () => [combinedCardStyle, disabled && { opacity: LAYOUT.OPACITY.MEDIUM }],
      [combinedCardStyle, disabled]
    );

    if (isLoading) {
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
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    position: 'relative',
    zIndex: LAYOUT.Z_INDEX.CARD,
  },
  content: createCardContentStyle(),
});

BaseCard.displayName = 'BaseCard';

export default BaseCard;
