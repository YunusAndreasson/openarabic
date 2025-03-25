import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { ThemedView } from './ThemedView';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { usePulseAnimation } from '../hooks/animations';
import {
  LoaderProps,
  LoadingScreenProps,
  LoadingContainerProps,
  AppLoaderProps,
} from '@/types/ui/loader.types';

/**
 * Loader component that displays a pulsating circle
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const colors = useColors();
  const loaderColor = color || colors.text;

  // Use pulse animation hook with gentle style for smooth scaling effect
  const { animatedStyle } = usePulseAnimation({
    style: 'gentle',
    pulseMagnitude: 1.15,
    duration: 2000,
    autoStart: true,
  });

  // Size configuration with safe defaults - always defaulting to large
  const circleSize = useMemo(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'large':
        return 52;
      case 'medium':
        return 40;
      case 'small':
        return 28;
      default:
        return 52; // Default to large if invalid size
    }
  }, [size]);

  const borderWidth = useMemo(() => {
    if (typeof size === 'number') return 4;
    switch (size) {
      case 'large':
        return 5; // Slightly thicker for better visibility
      case 'medium':
        return 3;
      case 'small':
        return 2;
      default:
        return 5;
    }
  }, [size]);

  // Base circle style
  const circleStyle = useMemo(
    () => ({
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      backgroundColor: colors.transparent,
      borderColor: loaderColor,
      borderWidth,
      shadowColor: loaderColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 8,
    }),
    [circleSize, loaderColor, borderWidth, colors.transparent]
  );

  return (
    <View style={[styles.container, style as ViewStyle]}>
      <Animated.View
        style={[styles.circle, circleStyle, animatedStyle as AnimatedStyle<ViewStyle>]}
      />
    </View>
  );
};

/**
 * A full-screen loading component that uses ThemedView for consistent styling
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ color }) => {
  const colors = useColors();

  // Use opacity animation from hooks/animations for fade-in effect
  const { animatedStyle } = usePulseAnimation({
    style: 'standard',
    autoStart: true,
  });

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle as AnimatedStyle<ViewStyle>]}>
      <ThemedView style={styles.fullScreen}>
        <View style={styles.loaderContainer}>
          <Loader size="large" color={color || colors.tint} />
        </View>
      </ThemedView>
    </Animated.View>
  );
};

/**
 * A simple loader container for component-level loading states
 */
export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  size = 'medium',
  color,
  style,
  containerStyle,
}) => {
  const colors = useColors();

  return (
    <View style={[styles.componentLoader, containerStyle]}>
      <Loader size={size} color={color || colors.text} style={style} />
    </View>
  );
};

/**
 * App-wide loader to be used during splash transition
 * Displays a minimal loading screen with themed background
 * and can be shown before the full UI is ready
 */
export const AppLoader: React.FC<AppLoaderProps> = ({ color }) => {
  const colors = useColors();

  return (
    <View style={[styles.appLoader, { backgroundColor: colors.background }]}>
      <Loader size="large" color={color || colors.tint} />
    </View>
  );
};

// Component display names for debugging
Loader.displayName = 'Loader';
LoadingScreen.displayName = 'LoadingScreen';
LoadingContainer.displayName = 'LoadingContainer';
AppLoader.displayName = 'AppLoader';

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
  appLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
});
