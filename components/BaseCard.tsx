import { memo, useMemo, type FC } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseCardProps } from '@/types/ui/card.types';

const BaseCard: FC<BaseCardProps> = memo(
  ({
    children,
    style,
    onPress,
    onLongPress,
    isLoading = false,
    shadowSize = 'medium',
    includePressAnimation = true,
    loadingComponent,
    contentStyle,
    disabled = false,
    testID,
  }) => {
    const colors = useColors();

    const { handlePressIn, handlePressOut } = usePressAnimation();

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
          shadowOffset: { width: 0, height: 1 },
        },
        style,
      ],
      [colors.card, shadowStyles, shadowSize, colors.shadow, style]
    );

    const combinedContentStyle = useMemo(() => [styles.content, contentStyle], [contentStyle]);

    if (isLoading) {
      return (
        <View style={combinedCardStyle} testID={testID}>
          {loadingComponent || <View style={combinedContentStyle} />}
        </View>
      );
    }

    if (!onPress && !onLongPress) {
      return (
        <View style={combinedCardStyle} testID={testID}>
          <View style={combinedContentStyle}>{children}</View>
        </View>
      );
    }

    return (
      <Pressable
        testID={testID}
        disabled={disabled}
        android_ripple={{
          color: colors.navigationRipple,
          borderless: false,
          foreground: true,
        }}
        style={({ pressed }: { pressed: boolean }) => [
          combinedCardStyle,
          pressed && !disabled && includePressAnimation && { opacity: LAYOUT.OPACITY.PRESSED },
          disabled && { opacity: LAYOUT.OPACITY.MEDIUM },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={includePressAnimation ? handlePressIn : undefined}
        onPressOut={includePressAnimation ? handlePressOut : undefined}
      >
        <View style={combinedContentStyle}>{children}</View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    position: 'relative',
    zIndex: LAYOUT.Z_INDEX.CARD,
  },
  content: {
    overflow: 'hidden',
    position: 'relative',
    zIndex: LAYOUT.Z_INDEX.BASE,
    ...Platform.select({
      android: {
        minHeight: 1,
      },
    }),
  },
});

BaseCard.displayName = 'BaseCard';

export default BaseCard;
