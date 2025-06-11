import React, { memo, useMemo } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
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
    const isDarkMode = useIsDarkMode();

    const { handlePressIn, handlePressOut } = usePressAnimation();

    const baseStyles = useMemo(() => {
      let calculatedShadow = {};

      if (shadowSize !== 'none') {
        const baseShadow = {
          shadowColor: colors.shadow,
          ...LAYOUT.SHADOW.MEDIUM,
          elevation: isDarkMode ? 0 : 4,
        };

        switch (shadowSize) {
          case 'small':
            calculatedShadow = {
              ...baseShadow,
              ...LAYOUT.SHADOW.SMALL,
              elevation: isDarkMode ? 0 : 2,
            };
            break;
          case 'large':
            calculatedShadow = {
              ...baseShadow,
              ...LAYOUT.SHADOW.LARGE,
              elevation: isDarkMode ? 0 : 6,
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
    }, [colors.shadow, colors.cardBorder, colors.card, isDarkMode, shadowSize]);

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
