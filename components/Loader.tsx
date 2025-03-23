import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { ThemedView } from './ThemedView';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation } from '../hooks/animations';
import {
  LoaderProps,
  LoadingScreenProps,
  LoadingContainerProps,
  AppLoaderProps,
} from '@/types/ui.types';

/**
 * Loader component that displays a pulsating circle
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const colors = useColors();
  const loaderColor = color || colors.text;

  // Use opacity animation for pulsing effect
  const { animatedStyle, setOpacity } = useOpacityAnimation({
    initialOpacity: 0.4,
    duration: 1200,
  });

  // Start animation on mount
  useEffect(() => {
    let isActive = true;
    const animate = () => {
      if (!isActive) return;
      setOpacity(1);
      setTimeout(() => {
        if (!isActive) return;
        setOpacity(0.4);
        setTimeout(() => {
          if (!isActive) return;
          animate();
        }, 1200);
      }, 1200);
    };
    animate();
    return () => {
      isActive = false;
    };
  }, [setOpacity]);

  // Size configuration with safe defaults
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
        return 4;
      case 'medium':
        return 3;
      case 'small':
        return 2;
      default:
        return 4;
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
      shadowColor: loaderColor,
      shadowOffset: { width: 0, height: 0 },
    }),
    [circleSize, loaderColor, borderWidth]
  );

  return (
    <View style={[styles.container, style as ViewStyle]}>
      <Animated.View style={[styles.circle, circleStyle, animatedStyle]} />
    </View>
  );
};

/**
 * A full-screen loading component that uses ThemedView for consistent styling
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ color }) => {
  const colors = useColors();

  // Use opacity animation for fade-in effect
  const { animatedStyle } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
  });

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
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
  appLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
