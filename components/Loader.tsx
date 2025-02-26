import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Animated, Easing, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';

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

Loader.displayName = 'Loader';

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
});
