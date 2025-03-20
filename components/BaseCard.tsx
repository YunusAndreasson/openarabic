import React from 'react';
import { StyleSheet, Pressable, StyleProp, ViewStyle, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { LoadingContainer } from './Loader';

interface BaseCardProps {
  /**
   * Content to render inside the card
   */
  children: React.ReactNode;

  /**
   * Function to call when the card is pressed
   */
  onPress?: () => void;

  /**
   * Whether the card is in a loading state
   */
  isLoading?: boolean;

  /**
   * Additional styles to apply to the card
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Shadow size to apply to the card
   */
  shadowSize?: 'small' | 'medium' | 'large';

  /**
   * Whether to apply animation effects
   */
  animated?: boolean;

  /**
   * Whether to include press animation
   */
  includePressAnimation?: boolean;

  /**
   * Custom loading component to use
   */
  loadingComponent?: React.ReactNode;
}

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
  animated = true,
  includePressAnimation = true,
  loadingComponent,
}) => {
  const colors = useColors();

  // Define shadow styles based on size
  const getShadowStyle = () => {
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
  };

  // Apply theme colors and shadow styles
  const cardStyle = [
    styles.card,
    getShadowStyle(),
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    style,
  ];

  // Render loading state if needed
  if (isLoading) {
    return (
      <Animated.View
        style={cardStyle}
        entering={animated ? FadeIn.duration(300).springify() : undefined}
      >
        {loadingComponent || <LoadingContainer size="medium" />}
      </Animated.View>
    );
  }

  // Non-interactive card
  if (!onPress) {
    return (
      <Animated.View
        style={cardStyle}
        entering={animated ? FadeIn.duration(300).springify() : undefined}
      >
        {children}
      </Animated.View>
    );
  }

  // Interactive card with press handling
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyle, includePressAnimation && pressed && styles.pressedCard]}
      android_ripple={{
        color: colors.textOverlay,
        borderless: false,
        foreground: true,
      }}
    >
      <Animated.View
        entering={animated ? FadeIn.duration(300).springify() : undefined}
        style={styles.contentContainer}
      >
        {children}
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
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
});

export default React.memo(BaseCard);
