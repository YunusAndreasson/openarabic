import React, { useMemo } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { LoadingContainer } from './Loader';
import { usePressAnimation } from '../hooks/animations/usePressAnimation';
import { BaseCardProps } from '@/types/ui/card.types';
import { AnimatedStyleProp } from '@/types/ui/base.types';

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
    // Get shadow properties from LAYOUT constants
    const baseShadow = {
      shadowColor: colors.shadow,
      ...LAYOUT.SHADOW.MEDIUM, // Use medium shadow as base
      elevation: 3,
    };

    switch (shadowSize) {
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

  // Create base styles for the card
  const baseStyles = [
    styles.card,
    shadowStyle,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    style,
  ];

  // Render loading state if needed
  if (isLoading) {
    return (
      <View style={baseStyles as AnimatedStyleProp<any>}>
        {loadingComponent || <LoadingContainer size="medium" />}
      </View>
    );
  }

  // Non-interactive card
  if (!onPress) {
    return <View style={baseStyles as AnimatedStyleProp<any>}>{children}</View>;
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
        style={
          includePressAnimation
            ? ([baseStyles, animatedStyle] as AnimatedStyleProp<any>)
            : (baseStyles as AnimatedStyleProp<any>)
        }
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
