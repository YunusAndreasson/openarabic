import React, { useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation, usePulseAnimation } from '../hooks/animations';

interface LoaderProps {
  size?: number | 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

/**
 * Loader component that displays a pulsating circle
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const colors = useColors();
  const loaderColor = color || colors.text;

  // Use the dramatic pulse animation style with autoStart
  const { animatedStyle, stopAnimation } = usePulseAnimation({
    style: 'dramatic',
    autoStart: true,
  });

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  // Size configuration
  const circleSize = typeof size === 'number' ? size : size === 'large' ? 52 : 28;
  const borderWidth = typeof size === 'number' ? 4 : size === 'large' ? 4 : 2;

  // Base circle style
  const circleStyle = useMemo(
    () => ({
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      backgroundColor: 'transparent',
      borderColor: loaderColor,
      borderWidth,
      shadowColor: loaderColor,
      shadowOffset: { width: 0, height: 0 },
    }),
    [circleSize, loaderColor, borderWidth]
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

  // Use opacity animation hooks with auto-start
  const { animatedStyle: containerStyle } = useOpacityAnimation({
    initialOpacity: 0,
    autoStart: true,
    delay: 0,
  });

  const { animatedStyle: loaderStyle } = useOpacityAnimation({
    initialOpacity: 0,
    autoStart: true,
    delay: 50,
  });

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

  // Use opacity animation hook with auto-start
  const { animatedStyle } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 200,
    autoStart: true,
  });

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
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
