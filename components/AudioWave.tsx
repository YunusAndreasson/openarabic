import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

interface AudioWaveProps {
  /**
   * Whether the audio is currently playing
   */
  isPlaying: boolean;

  /**
   * Color of the wave bars
   */
  color: string;

  /**
   * Size of the wave container
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Style for the container
   */
  style?: any;

  /**
   * Number of bars to display
   * @default 3
   */
  barCount?: number;

  /**
   * Animation duration in milliseconds
   * @default 500
   */
  animationDuration?: number;
}

/**
 * A component that displays an animated audio wave visualization
 */
export const AudioWave = React.memo(
  ({
    isPlaying,
    color,
    size = 'medium',
    style,
    barCount = 3,
    animationDuration = 500,
  }: AudioWaveProps) => {
    // Create animated values for each bar
    const animatedValues = useRef<Animated.Value[]>(
      Array.from({ length: barCount }, () => new Animated.Value(0.4))
    ).current;

    // Store the animation reference
    const animationsRef = useRef<Animated.CompositeAnimation>();

    // Memoize the array of animated values to prevent unnecessary re-renders
    const animations = useMemo(() => animatedValues, [animatedValues]);

    // Get dimensions based on size
    const dimensions = useMemo(() => {
      switch (size) {
        case 'small':
          return {
            containerHeight: 16,
            barWidth: 2,
            barHeight: 12,
            barRadius: 1,
            barGap: 1,
          };
        case 'large':
          return {
            containerHeight: 32,
            barWidth: 3,
            barHeight: 24,
            barRadius: 1.5,
            barGap: 2,
          };
        case 'medium':
        default:
          return {
            containerHeight: 24,
            barWidth: 2,
            barHeight: 16,
            barRadius: 1,
            barGap: 2,
          };
      }
    }, [size]);

    // Start or stop animations based on isPlaying state
    useEffect(() => {
      if (isPlaying) {
        // Create animation sequence for each bar with staggered delays
        const animationSequence = animations.map((anim, i) =>
          Animated.sequence([
            Animated.delay(i * 200), // Stagger the start of each bar's animation
            Animated.loop(
              Animated.sequence([
                Animated.timing(anim, {
                  toValue: 1,
                  duration: animationDuration,
                  useNativeDriver: true,
                }),
                Animated.timing(anim, {
                  toValue: 0.4,
                  duration: animationDuration,
                  useNativeDriver: true,
                }),
              ])
            ),
          ])
        );

        // Run all animations in parallel
        animationsRef.current = Animated.parallel(animationSequence);
        animationsRef.current.start();
      } else {
        // Stop animations when not playing
        if (animationsRef.current) {
          animationsRef.current.stop();
          animationsRef.current = undefined;
        }

        // Reset all bars to their initial state
        animations.forEach(anim => {
          anim.stopAnimation();
          anim.setValue(0.4);
        });
      }

      // Clean up animations on unmount or when isPlaying changes
      return () => {
        if (animationsRef.current) {
          animationsRef.current.stop();
          animationsRef.current = undefined;
        }
      };
    }, [isPlaying, animations, animationDuration]);

    return (
      <View style={[styles.container, { height: dimensions.containerHeight }, style]}>
        {animations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: color,
                width: dimensions.barWidth,
                height: dimensions.barHeight,
                borderRadius: dimensions.barRadius,
                marginHorizontal: dimensions.barGap / 2,
                transform: [{ scaleY: anim }],
              },
            ]}
          />
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    opacity: 0.8,
  },
});
