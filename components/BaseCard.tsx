import React, { useMemo } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { usePressAnimation } from '../hooks/animations';
import { LoadingContainer } from './Loader';
import { BaseCardProps } from '@/types/ui/card.types';
import { AnimatedStyleProp } from '@/types/ui/base.types';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

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

  // Card border for light mode only
  const borderStyle = useMemo(
    () =>
      !isDarkMode && shadowSize !== 'none'
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder }
        : {},
    [isDarkMode, shadowSize, colors.cardBorder]
  );

  // Combined card style
  const combinedCardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: colors.cardBackground,
      },
      shadowStyle,
      borderStyle,
      style,
    ],
    [colors.cardBackground, shadowStyle, borderStyle, style]
  );

  // Combine content style
  const combinedContentStyle = useMemo(() => [styles.content, contentStyle], [contentStyle]);

  // Render loading state if needed
  if (isLoading) {
    return (
      <View style={combinedCardStyle as AnimatedStyleProp<any>}>
        {loadingComponent || <LoadingContainer size="medium" />}
      </View>
    );
  }

  // Non-interactive card
  if (!onPress) {
    return (
      <View style={combinedCardStyle as AnimatedStyleProp<any>} testID={testID}>
        <View style={combinedContentStyle}>{children}</View>
      </View>
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
      style={({ pressed }) => [
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
  },
  image: {
    minHeight: 120,
    width: '100%',
  },
  content: {
    overflow: 'hidden',
  },
});

export default React.memo(BaseCard);
