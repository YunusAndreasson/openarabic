import React, { memo, useMemo } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseCardProps } from '@/types/ui/card.types';

const BaseCard: React.FC<BaseCardProps> = memo(
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
  }) => {
    const colors = useColors();

    const { handlePressIn, handlePressOut } = usePressAnimation();

    const baseStyles = useMemo(() => {
      let calculatedShadow = {};

      if (shadowSize !== 'none') {
        const baseShadow = {
          shadowColor: colors.shadow,
          elevation: 8, // LAYOUT.ELEVATION.MEDIUM equivalent
          shadowOpacity: 0.3, // LAYOUT.ELEVATION.MEDIUM equivalent
          shadowRadius: 10, // LAYOUT.ELEVATION.MEDIUM equivalent
          shadowOffset: { width: 0, height: 4 }, // LAYOUT.ELEVATION.MEDIUM equivalent
        };

        switch (shadowSize) {
          case 'small':
            calculatedShadow = {
              ...baseShadow,
              elevation: 4, // LAYOUT.ELEVATION.SMALL equivalent
              shadowOpacity: 0.25, // LAYOUT.ELEVATION.SMALL equivalent
              shadowRadius: 6, // LAYOUT.ELEVATION.SMALL equivalent
              shadowOffset: { width: 0, height: 2 }, // LAYOUT.ELEVATION.SMALL equivalent
            };
            break;
          case 'large':
            calculatedShadow = {
              ...baseShadow,
              elevation: 12, // LAYOUT.ELEVATION.LARGE equivalent
              shadowOpacity: 0.35, // LAYOUT.ELEVATION.LARGE equivalent
              shadowRadius: 14, // LAYOUT.ELEVATION.LARGE equivalent
              shadowOffset: { width: 0, height: 6 }, // LAYOUT.ELEVATION.LARGE equivalent
            };
            break;
          default:
            calculatedShadow = baseShadow;
        }
      }

      return {
        shadow: calculatedShadow,
        background: {
          backgroundColor: colors.card,
        },
      };
    }, [colors.shadow, colors.card, shadowSize]);

    const combinedCardStyle = useMemo(
      () => [styles.card, baseStyles.background, baseStyles.shadow, style],
      [baseStyles, style]
    );

    const combinedContentStyle = useMemo(() => [styles.content, contentStyle], [contentStyle]);

    if (isLoading) {
      return (
        <View style={combinedCardStyle}>
          {loadingComponent || <View style={combinedContentStyle} />}
        </View>
      );
    }

    if (!onPress && !onLongPress) {
      return (
        <View style={combinedCardStyle}>
          <View style={combinedContentStyle}>{children}</View>
        </View>
      );
    }

    return (
      <Pressable
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
    overflow: 'hidden',
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
