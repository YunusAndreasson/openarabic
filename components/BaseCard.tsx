import React, { useMemo } from 'react';
import { StyleSheet, Pressable, StyleProp, ViewStyle, View } from 'react-native';
import Animated, { AnimatedStyleProp } from 'react-native-reanimated';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { LoadingContainer } from './Loader';
import { usePressAnimation } from '../hooks/animations/usePressAnimation';
import { BaseCardProps } from '@/types/ui.types';

/**
 * BaseCard is a foundational component that provides consistent styling for all card elements
 * in the application. It handles border radius, shadows, press animations, and loading states.
 */
const BaseCard: React.FC<BaseCardProps> = ({
  children,
  onPress,
  isLoading = false,
  style,
  shadowSize = 'medium',
  includePressAnimation = true,
  loadingComponent,
}) => {
  const colors = useColors();

  // Use press animation hook for smooth press feedback
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    includeOpacity: true,
  });

  // Memoize the shadow style calculation
  const shadowStyle = useMemo(() => {
    const baseShadow = {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    };

    switch (shadowSize) {
      case 'small':
        return {
          ...baseShadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        };
      case 'large':
        return {
          ...baseShadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 5,
        };
      case 'medium':
      default:
        return baseShadow;
    }
  }, [colors.shadow, shadowSize]);

  // Memoize the combined card style
  const cardStyle = useMemo(
    () => [
      styles.card,
      shadowStyle,
      {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
      },
      style,
    ],
    [shadowStyle, colors.cardBackground, colors.cardBorder, style]
  );

  // Render loading state if needed
  if (isLoading) {
    return <View style={cardStyle}>{loadingComponent || <LoadingContainer size="medium" />}</View>;
  }

  // Non-interactive card
  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  // Interactive card with press handling
  return (
    <Pressable
      onPress={onPress}
      onPressIn={includePressAnimation ? handlePressIn : undefined}
      onPressOut={includePressAnimation ? handlePressOut : undefined}
      android_ripple={{
        color: colors.textOverlay,
        borderless: false,
        foreground: true,
      }}
    >
      <Animated.View
        style={[
          cardStyle,
          includePressAnimation && (animatedStyle as AnimatedStyleProp<ViewStyle>),
        ]}
      >
        <View style={styles.contentContainer}>{children}</View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
});

export default React.memo(BaseCard);
