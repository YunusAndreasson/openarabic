import React, { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type {
  LoaderProps,
  LoadingScreenProps,
  LoadingContainerProps,
  AppLoaderProps,
} from '@/types/ui/loader.types';

import { usePulseAnimation } from '../hooks/animations';

import { ThemedView } from './ThemedView';

/**
 * Loader component that displays a pulsating circle
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const colors = useColors();
  const loaderColor = color || colors.text;

  // Use pulse animation hook with gentle style for smooth scaling effect
  const { animatedStyle } = usePulseAnimation({
    style: 'gentle',
    pulseMagnitude: 1.05,
    duration: 1000,
    autoStart: true,
  });

  // Size configuration with safe defaults - always defaulting to large
  const circleSize = useMemo(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'large':
        return LAYOUT.LOADER.LARGE;
      case 'medium':
        return LAYOUT.LOADER.MEDIUM;
      case 'small':
        return LAYOUT.LOADER.SMALL;
      default:
        return LAYOUT.LOADER.LARGE; // Default to large if invalid size
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
      backgroundColor: 'transparent',
      borderColor: loaderColor,
      borderWidth,
      ...styles.circleShadow,
    }),
    [circleSize, loaderColor, borderWidth]
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
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ color, style }) => {
  const colors = useColors();
  // Handle paddingTop separately to properly position loader
  const loaderContainerStyle = style?.paddingTop ? { paddingTop: style.paddingTop } : undefined;

  return (
    <ThemedView style={[styles.fullScreen, style]}>
      <View style={[styles.loaderContainer, loaderContainerStyle]}>
        <Loader size="large" color={color || colors.tint} />
      </View>
    </ThemedView>
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
    <Animated.View style={[styles.appLoader, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.circle,
            styles.appLoaderCircle,
            {
              backgroundColor: 'transparent',
              borderColor: color || colors.tint,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  appLoader: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  appLoaderCircle: {
    borderRadius: LAYOUT.LOADER.LARGE / 2,
    borderWidth: 5,
    height: LAYOUT.LOADER.LARGE,
    width: LAYOUT.LOADER.LARGE,
  },
  circle: {
    // Base styles only - specific styles moved to circleStyle for better memoization
  },
  circleShadow: {
    elevation: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  componentLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.SPACING.XLARGE,
    minWidth: LAYOUT.SPACING.XLARGE,
    padding: LAYOUT.SPACING.SMALL,
  },
  fullScreen: {
    flex: 1,
  },
  loaderContainer: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
});
