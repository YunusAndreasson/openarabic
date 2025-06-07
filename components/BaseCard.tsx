import React, { memo, useMemo } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';

import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { BaseCardProps } from '@/types/ui/card.types';

import { LAYOUT } from '../constants/layout';
import { usePressAnimation } from '../hooks/animations';
import { useColors } from '../hooks/useColors';

/**
 * BaseCard is the foundation component for all card-type UI elements
 * in the application. It handles border radius, shadows, press animations, and loading states.
 */

// Disable prop-types validation since we're using TypeScript types

const BaseCard: React.FC<BaseCardProps> = memo(
  ({
    children,
    style,
    onPress,
    isLoading = false,
    shadowSize = 'medium',
    includePressAnimation = true,
    loadingComponent,
    contentStyle,
    disabled = false,
    testID,
  }) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    // Use press animation hook for smooth press feedback
    const { handlePressIn, handlePressOut } = usePressAnimation();

    // Memoize both shadow and border styles together for better performance
    const baseStyles = useMemo(() => {
      // Get shadow properties from LAYOUT constants
      let calculatedShadow = {};

      if (shadowSize !== 'none') {
        const baseShadow = {
          shadowColor: colors.shadow,
          ...LAYOUT.SHADOW.MEDIUM,
          elevation: isDarkMode ? 0 : 4, // Increased elevation in light mode for better visibility
        };

        switch (shadowSize) {
          case 'small':
            calculatedShadow = {
              ...baseShadow,
              ...LAYOUT.SHADOW.SMALL,
              elevation: isDarkMode ? 0 : 2, // Increased from 1
            };
            break;
          case 'large':
            calculatedShadow = {
              ...baseShadow,
              ...LAYOUT.SHADOW.LARGE,
              elevation: isDarkMode ? 0 : 6, // Increased from 5
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

    // Combined card style with stable reference
    const combinedCardStyle = useMemo(
      () => [styles.card, baseStyles.background, baseStyles.shadow, style],
      [baseStyles, style]
    );

    // Combine content style with stable reference
    const combinedContentStyle = useMemo(() => [styles.content, contentStyle], [contentStyle]);

    // Render loading state if needed
    if (isLoading) {
      return (
        <View style={combinedCardStyle} testID={testID}>
          {loadingComponent || <View style={combinedContentStyle} />}
        </View>
      );
    }

    // Non-interactive card
    if (!onPress) {
      return (
        <View style={combinedCardStyle} testID={testID}>
          <View style={combinedContentStyle}>{children}</View>
        </View>
      );
    }

    // Interactive card with press handling
    return (
      <Pressable
        disabled={disabled}
        testID={testID}
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
        minHeight: 1, // Prevent content collapse on Android
      },
    }),
  },
});

// Add display name for better debugging
BaseCard.displayName = 'BaseCard';

export default BaseCard;
