import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  withSequence,
  WithTimingConfig,
  FadeIn,
} from 'react-native-reanimated';

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
    const pulseAnim = useSharedValue(0.9);

    const animationConfig = useMemo<WithTimingConfig>(
      () => ({
        duration: 1800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      []
    );

    useEffect(() => {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1.05, animationConfig), withTiming(0.95, animationConfig)),
        -1,
        true
      );

      return () => {
        pulseAnim.value = withTiming(0.9, { duration: 100 });
      };
    }, [animationConfig, pulseAnim]);

    const animatedCircleStyle = useAnimatedStyle(
      () => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: circleColor,
        backgroundColor: 'transparent',
        transform: [{ scale: pulseAnim.value }],
        opacity,
      }),
      [size, circleColor, opacity, borderWidth]
    );

    return (
      <View style={[styles.container, style]}>
        <Animated.View
          style={[styles.circle, animatedCircleStyle]}
          entering={FadeIn.duration(500).easing(Easing.out(Easing.cubic))}
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
