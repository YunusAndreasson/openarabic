import { memo, useCallback, useMemo, type FC } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
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

    const getPressableStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        combinedCardStyle,
        pressed && !disabled && includePressAnimation && { opacity: LAYOUT.OPACITY.PRESSED },
        disabled && { opacity: LAYOUT.OPACITY.MEDIUM },
      ],
      [combinedCardStyle, disabled, includePressAnimation]
    );

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
        style={getPressableStyle}
        onPress={onPress}
        onLongPress={onLongPress}
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
        minHeight: LAYOUT.BORDER.WIDTH.NORMAL,
      },
    }),
  },
});

BaseCard.displayName = 'BaseCard';

export default BaseCard;
