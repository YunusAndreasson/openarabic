import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Animated, Easing, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';

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

  // Animation for pulsating effect
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  // Animation configuration
  const animationConfig = useMemo(
    () => ({
      duration: 800,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }),
    []
  );

  useEffect(() => {
    // Create a pulsating animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          ...animationConfig,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          ...animationConfig,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      // Properly clean up animation
      pulseAnimation.stop();
    };
  }, [animationConfig]);

  // Size configuration
  const circleSize = size === 'large' ? 40 : 20;
  const borderWidth = size === 'large' ? 4 : 2;

  // Compute dynamic styles based on props
  const dynamicCircleStyle = useMemo(
    () => ({
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      borderWidth: borderWidth,
      borderColor: loaderColor,
      // Use transparent color properly
      backgroundColor: 'transparent',
      transform: [{ scale: pulseAnim }],
    }),
    [circleSize, borderWidth, loaderColor, pulseAnim]
  );

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.circle, dynamicCircleStyle]} />
    </View>
  );
};

interface LoadingScreenProps {
  color?: string;
  fadeInDelay?: number;
  fadeInDuration?: number;
}

/**
 * A full-screen loading component that uses ThemedView for consistent styling
 * and automatically handles background colors and animations.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  color,
  fadeInDelay = 100,
  fadeInDuration = 600,
}) => {
  const colors = useColors();

  return (
    <ThemedView style={styles.fullScreen} fadeInDelay={fadeInDelay} fadeInDuration={fadeInDuration}>
      <View style={styles.loaderContainer}>
        <Loader size="large" color={color || colors.tint} />
      </View>
    </ThemedView>
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
    <View style={[styles.componentLoader, { height }, style]}>
      <Loader size={size} color={color || colors.tint} />
    </View>
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
