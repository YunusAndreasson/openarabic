import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface LoaderProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

/**
 * A simple pulsating circle loader with dramatic zoom animation
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const colors = useColors();
  const loaderColor = color || colors.text;

  // Animation values
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.5);

  // Start animation immediately
  useEffect(() => {
    const startAnimation = () => {
      // Animate scale with dramatic zoom effect
      scale.value = withSequence(
        withTiming(0.7, {
          duration: 200,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1.25, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          150,
          withTiming(0.3, {
            duration: 500,
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        withDelay(200, withTiming(0.3, { duration: 0 }))
      );

      // Animate opacity in sync with scale
      opacity.value = withSequence(
        withTiming(0.8, {
          duration: 200,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          150,
          withTiming(0.5, {
            duration: 500,
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        withDelay(200, withTiming(0.5, { duration: 0 }))
      );
    };

    // Start the animation cycle
    const intervalId = setInterval(startAnimation, 1350);
    startAnimation();

    return () => {
      clearInterval(intervalId);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  // Size configuration
  const circleSize = size === 'large' ? 52 : 28;
  const borderWidth = size === 'large' ? 4 : 2;

  // Dynamic styles based on animation values
  const animatedStyle = useAnimatedStyle(() => {
    const scaleProgress = (scale.value - 0.3) / 0.95; // Normalized progress (0.3 to 1.25 range)

    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      borderWidth: borderWidth * (0.6 + scaleProgress * 0.8),
      shadowRadius: 4 + scaleProgress * 15,
      shadowOpacity: 0.2 + scaleProgress * 0.5,
      elevation: Math.round(4 + scaleProgress * 15),
    };
  });

  // Base circle styles
  const circleStyle = useMemo(
    () => ({
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      borderColor: loaderColor,
      backgroundColor: 'transparent',
      shadowColor: loaderColor,
      shadowOffset: { width: 0, height: 0 },
    }),
    [circleSize, loaderColor]
  );

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.circle, circleStyle, animatedStyle]} />
    </View>
  );
};

interface LoadingScreenProps {
  color?: string;
}

/**
 * A full-screen loading component that uses ThemedView for consistent styling
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ color }) => {
  const colors = useColors();
  const containerOpacity = useSharedValue(0);
  const loaderOpacity = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    loaderOpacity.value = withDelay(
      50,
      withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      })
    );

    return () => {
      cancelAnimation(containerOpacity);
      cancelAnimation(loaderOpacity);
    };
  }, [containerOpacity, loaderOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    flex: 1,
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  return (
    <Animated.View style={containerStyle}>
      <ThemedView style={styles.fullScreen}>
        <Animated.View style={[styles.loaderContainer, loaderStyle]}>
          <Loader size="large" color={color || colors.tint} />
        </Animated.View>
      </ThemedView>
    </Animated.View>
  );
};

interface LoadingContainerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
  height?: number;
}

/**
 * A component-level loading container for consistent styling
 */
export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  size = 'small',
  color,
  style,
  height = 160,
}) => {
  const colors = useColors();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.componentLoader, { height }, style, animatedStyle]}>
      <Loader size={size} color={color || colors.tint} />
    </Animated.View>
  );
};

// Component display names for debugging
Loader.displayName = 'Loader';
LoadingScreen.displayName = 'LoadingScreen';
LoadingContainer.displayName = 'LoadingContainer';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 64,
    padding: LAYOUT.SPACING.SMALL,
  },
  circle: {
    // Base styles only - specific styles moved to circleStyle for better memoization
  },
  fullScreen: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  componentLoader: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
