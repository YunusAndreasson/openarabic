import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  withSequence,
  WithTimingConfig,
} from 'react-native-reanimated';

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

  // Animation for pulsating effect using Reanimated shared value
  const pulseAnim = useSharedValue(0.8);

  // Animation configuration
  const animationConfig: WithTimingConfig = useMemo(
    () => ({
      duration: 800,
      easing: Easing.inOut(Easing.ease),
    }),
    []
  );

  useEffect(() => {
    // Create a pulsating animation with Reanimated
    pulseAnim.value = withRepeat(
      withSequence(withTiming(1.2, animationConfig), withTiming(0.8, animationConfig)),
      -1, // Infinite repetitions
      false // Don't reverse the animation
    );

    return () => {
      // Cleanup animation by setting to initial value
      pulseAnim.value = 0.8;
    };
  }, [animationConfig, pulseAnim]);

  // Size configuration
  const circleSize = size === 'large' ? 40 : 20;
  const borderWidth = size === 'large' ? 4 : 2;

  // Create animated style using Reanimated
  const animatedCircleStyle = useAnimatedStyle(
    () => ({
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      borderWidth: borderWidth,
      borderColor: loaderColor,
      backgroundColor: 'transparent',
      transform: [{ scale: pulseAnim.value }],
    }),
    [circleSize, borderWidth, loaderColor]
  );

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.circle, animatedCircleStyle]} />
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
    <ThemedView style={styles.fullScreen}>
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
