import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { usePulseAnimation, useFadeInAnimation } from '@/hooks/animations';

interface LoaderProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

/**
 * A simple pulsating circle loader
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const colors = useColors();
  // Use provided color or default to text color (which will be white in dark mode, black in light mode)
  const loaderColor = color || colors.text;

  // Use standardized pulse animation
  const { animatedStyle: pulseAnimatedStyle, pulse } = usePulseAnimation(1.1);
  const { animatedStyle: opacityAnimatedStyle, startAnimation: startFadeIn } = useFadeInAnimation(
    0,
    300
  );

  useEffect(() => {
    // Start animations
    startFadeIn();
    pulse();

    // Set up pulse interval
    const intervalId = setInterval(() => {
      pulse();
    }, 1400); // Slightly faster than the animation duration for a continuous effect

    return () => {
      clearInterval(intervalId);
    };
  }, [pulse, startFadeIn]);

  // Size configuration
  const circleSize = size === 'large' ? 40 : 20;
  const borderWidth = size === 'large' ? 4 : 2;

  // Combine animated styles
  const combinedAnimatedStyle = useMemo(() => {
    return [
      pulseAnimatedStyle,
      opacityAnimatedStyle,
      {
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        borderWidth: borderWidth,
        borderColor: loaderColor,
        backgroundColor: 'transparent',
      },
    ];
  }, [pulseAnimatedStyle, opacityAnimatedStyle, circleSize, borderWidth, loaderColor]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[styles.circle, combinedAnimatedStyle]}
        entering={FadeIn.duration(300).easing(Easing.out(Easing.cubic))}
        exiting={FadeOut.duration(200)}
      />
    </View>
  );
};

interface LoadingScreenProps {
  color?: string;
}

/**
 * A full-screen loading component that uses ThemedView for consistent styling
 * and automatically handles background colors.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ color }) => {
  const colors = useColors();

  return (
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(400)}>
      <ThemedView style={styles.fullScreen}>
        <Animated.View style={styles.loaderContainer} entering={FadeIn.duration(500)}>
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

  return (
    <Animated.View
      style={[styles.componentLoader, { height }, style]}
      entering={FadeIn.duration(300)}
    >
      <Loader size={size} color={color || colors.tint} />
    </Animated.View>
  );
};

Loader.displayName = 'Loader';
LoadingScreen.displayName = 'LoadingScreen';
LoadingContainer.displayName = 'LoadingContainer';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
    padding: LAYOUT.SPACING.SMALL,
  },
  circle: {
    opacity: 0.8,
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
