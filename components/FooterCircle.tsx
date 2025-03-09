import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import Animated, { FadeIn } from 'react-native-reanimated';
import { usePulseAnimation } from '@/hooks/animations';

interface FooterCircleProps {
  color?: string;
  style?: ViewStyle;
  size?: number;
  opacity?: number;
  borderWidth?: number;
}

/**
 * A dimmed circle ring for the bottom of the page
 */
export const FooterCircle = React.memo<FooterCircleProps>(
  ({ color, style, size = 36, opacity = 0.6, borderWidth = 2 }) => {
    const colors = useColors();
    const circleColor = color || colors.text;

    // Use standardized pulse animation
    const { animatedStyle: pulseAnimatedStyle, pulse } = usePulseAnimation(1.05);

    // Start pulsing animation
    useEffect(() => {
      // Set up pulse interval
      pulse();
      const intervalId = setInterval(() => {
        pulse();
      }, 3600); // Match the original animation duration (1800 * 2)

      return () => {
        clearInterval(intervalId);
      };
    }, [pulse]);

    // Combine animated style with static properties
    const combinedAnimatedStyle = useMemo(
      () => ({
        ...pulseAnimatedStyle,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: circleColor,
        backgroundColor: 'transparent',
        opacity,
      }),
      [pulseAnimatedStyle, size, circleColor, opacity, borderWidth]
    );

    return (
      <View style={[styles.container, style]}>
        <Animated.View
          style={[styles.circle, combinedAnimatedStyle]}
          entering={FadeIn.duration(500)}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  circle: {},
});
