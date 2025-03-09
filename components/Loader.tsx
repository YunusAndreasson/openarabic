import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';
import Animated from 'react-native-reanimated';
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

  // Use our custom fade-in animation hook
  const { animatedStyle: fadeAnimatedStyle, startAnimation } = useFadeInAnimation(0, 300);

  useEffect(() => {
    // Start animations
    startFadeIn();
    pulse();
    startAnimation();

    // Set up pulse interval
    const intervalId = setInterval(() => {
      pulse();
    }, 1400); // Slightly faster than the animation duration for a continuous effect

    return () => {
      clearInterval(intervalId);
    };
  }, [pulse, startFadeIn, startAnimation]);

  // Size configuration
  const circleSize = size === 'large' ? 40 : 20;
  const borderWidth = size === 'large' ? 4 : 2;

  // Combine all animated styles
  const combinedAnimatedStyle = useMemo(() => {
    return [
      pulseAnimatedStyle,
      opacityAnimatedStyle,
      fadeAnimatedStyle,
      {
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        borderWidth: borderWidth,
        borderColor: loaderColor,
        backgroundColor: 'transparent',
      },
    ];
  }, [
    pulseAnimatedStyle,
    opacityAnimatedStyle,
    fadeAnimatedStyle,
    circleSize,
    borderWidth,
    loaderColor,
  ]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.circle, combinedAnimatedStyle]} />
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

  // Use our custom fade-in animation hooks
  const { animatedStyle: containerStyle, startAnimation: startContainerAnimation } =
    useFadeInAnimation(0, 400);
  const { animatedStyle: loaderStyle, startAnimation: startLoaderAnimation } = useFadeInAnimation(
    0,
    500
  );

  // Start animations when component mounts
  useEffect(() => {
    startContainerAnimation();
    startLoaderAnimation();
  }, [startContainerAnimation, startLoaderAnimation]);

  return (
    <Animated.View style={[{ flex: 1 }, containerStyle]}>
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

  // Use our custom fade-in animation hook
  const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

  // Start animation when component mounts
  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  return (
    <Animated.View style={[styles.componentLoader, { height }, style, animatedStyle]}>
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
