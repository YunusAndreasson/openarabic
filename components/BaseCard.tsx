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

const BaseCard: React.FC<BaseCardProps> = ({
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

  // Memoize the shadow style calculation
  const shadowStyle = useMemo(() => {
    // Get shadow properties from LAYOUT constants
    const baseShadow = {
      shadowColor: colors.shadow,
      ...LAYOUT.SHADOW.MEDIUM, // Use medium shadow as base
      elevation: 3,
    };

    switch (shadowSize) {
      case 'none':
        return {};
      case 'small':
        return {
          ...baseShadow,
          ...LAYOUT.SHADOW.SMALL,
          elevation: 1,
        };
      case 'large':
        return {
          ...baseShadow,
          ...LAYOUT.SHADOW.LARGE,
          elevation: 5,
        };
      case 'medium':
      default:
        return baseShadow;
    }
  }, [colors.shadow, shadowSize]);

  // Card border style with increased visibility
  const borderStyle = useMemo(
    () => ({
      borderWidth: isDarkMode ? 1 : 0.5,
      borderColor: isDarkMode ? colors.elevation3 : colors.cardBorder,
    }),
    [isDarkMode, colors.elevation3, colors.cardBorder]
  );

  // Combined card style
  const combinedCardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: colors.card,
      },
      shadowStyle,
      borderStyle,
      style,
    ],
    [colors.card, shadowStyle, borderStyle, style]
  );

  // Combine content style
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
};

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

export default memo(BaseCard);
