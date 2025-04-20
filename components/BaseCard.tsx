import React, { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { BaseCardProps } from '@/types/ui/card.types';

import { LAYOUT } from '../constants/layout';
import { usePressAnimation } from '../hooks/animations';
import { useColors } from '../hooks/useColors';

import { LoadingContainer } from './Loader';

type AnimatedViewStyle = AnimatedStyleProp<ViewStyle>;

/**
 * BaseCard is the foundation component for all card-type UI elements
 * in the application. It handles border radius, shadows, press animations, and loading states.
 */

// Disable prop-types validation since we're using TypeScript types
/* eslint-disable react/prop-types */
const BaseCard: React.FC<BaseCardProps> = memo(
  ({
    children,
    style,
    onPress,
    isLoading = false,
    shadowSize = 'medium',
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
          elevation: 3,
        };

        switch (shadowSize) {
          case 'small':
            calculatedShadow = {
              ...baseShadow,
              ...LAYOUT.SHADOW.SMALL,
              elevation: 1,
            };
            break;
          case 'large':
            calculatedShadow = {
              ...baseShadow,
              ...LAYOUT.SHADOW.LARGE,
              elevation: 5,
            };
            break;
          default:
            calculatedShadow = baseShadow;
        }
      }

      return {
        shadow: calculatedShadow,
        border: {
          borderWidth: isDarkMode ? 1 : 0.5,
          borderColor: isDarkMode ? colors.elevation3 : colors.cardBorder,
        },
        background: {
          backgroundColor: colors.card,
        },
      };
    }, [colors.shadow, colors.elevation3, colors.cardBorder, colors.card, isDarkMode, shadowSize]);

    // Combined card style with stable reference
    const combinedCardStyle = useMemo(
      () => [styles.card, baseStyles.background, baseStyles.shadow, baseStyles.border, style],
      [baseStyles, style]
    );

    // Combine content style with stable reference
    const combinedContentStyle = useMemo(() => [styles.content, contentStyle], [contentStyle]);

    // Render loading state if needed
    if (isLoading) {
      return (
        <Animated.View style={combinedCardStyle as AnimatedViewStyle}>
          {loadingComponent || <LoadingContainer size="medium" />}
        </Animated.View>
      );
    }

    // Non-interactive card
    if (!onPress) {
      return (
        <Animated.View style={combinedCardStyle as AnimatedViewStyle} testID={testID}>
          <View style={combinedContentStyle}>{children}</View>
        </Animated.View>
      );
    }

    // Interactive card with press handling
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        android_ripple={{
          color: colors.textOverlay,
          borderless: false,
          foreground: true,
        }}
        style={({ pressed }: { pressed: boolean }) => [
          combinedCardStyle,
          pressed && !disabled && { opacity: LAYOUT.OPACITY.PRESSED },
          disabled && { opacity: LAYOUT.OPACITY.DISABLED },
        ]}
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
  },
});

// Add display name for better debugging
BaseCard.displayName = 'BaseCard';

export default BaseCard;
