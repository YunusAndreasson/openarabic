import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';

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

  useEffect(() => {
    // Create a pulsating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);

  // Size configuration
  const circleSize = size === 'large' ? 20 : 10;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: loaderColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    // The circle is styled inline
  },
});
