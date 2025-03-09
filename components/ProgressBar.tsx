import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle, Animated } from 'react-native';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { LAYOUT } from '../constants/layout';

interface ProgressBarProps {
  /**
   * Progress value between 0 and 100
   */
  progress: number;
  /**
   * Height of the progress bar
   * @default LAYOUT.SPACING.SMALL
   */
  height?: number;
  /**
   * Custom style for the container
   */
  style?: ViewStyle;
  /**
   * Custom style for the progress fill
   */
  fillStyle?: ViewStyle;
  /**
   * Custom background color for the progress bar
   * If not provided, uses theme-based color
   */
  backgroundColor?: string;
  /**
   * Custom fill color for the progress bar
   * If not provided, uses theme's tint color
   */
  fillColor?: string;
  /**
   * Whether to animate the progress bar
   * @default false
   */
  animationTriggered?: boolean;
  /**
   * Duration of the animation in milliseconds
   * @default 2000
   */
  animationDuration?: number;
}

/**
 * A reusable progress bar component that adapts to the current theme
 * and handles edge cases gracefully.
 */
function ProgressBarComponent({
  progress,
  height = LAYOUT.SPACING.SMALL,
  style,
  fillStyle,
  backgroundColor,
  fillColor,
  animationTriggered = false,
  animationDuration = 2000,
}: ProgressBarProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Create an animated value for width percentage
  const widthAnim = useRef(new Animated.Value(0)).current;

  // Flag to prevent multiple animations
  const hasAnimated = useRef(false);

  // Ensure progress is within valid range (0-100)
  const normalizedProgress = useMemo(() => {
    // Handle invalid inputs gracefully
    if (isNaN(progress)) return 0;
    return Math.max(0, Math.min(100, progress));
  }, [progress]);

  // Effect to handle animation when triggered
  useEffect(() => {
    if (animationTriggered && !hasAnimated.current) {
      // Mark that we've animated
      hasAnimated.current = true;

      // Reset to 0 first
      widthAnim.setValue(0);

      // Then animate to target percentage
      Animated.timing(widthAnim, {
        toValue: normalizedProgress,
        duration: animationDuration,
        useNativeDriver: false, // width changes can't use native driver
      }).start();
    }

    // Reset animation state when trigger changes
    if (!animationTriggered) {
      hasAnimated.current = false;
      // Set to actual percentage without animation
      widthAnim.setValue(normalizedProgress);
    }
  }, [widthAnim, normalizedProgress, animationTriggered, animationDuration]);

  // Convert the animated value to a percentage string for width
  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp', // prevent values outside of range
  });

  // Determine background color based on theme if not provided
  const bgColor = useMemo(() => {
    return backgroundColor || (isDarkMode ? colors.elevation1 : `${colors.text}15`);
  }, [backgroundColor, colors.elevation1, colors.text, isDarkMode]);

  // Determine fill color based on theme if not provided
  const progressFillColor = useMemo(() => {
    return fillColor || colors.tint;
  }, [fillColor, colors.tint]);

  // Memoize the container style to prevent unnecessary re-renders
  const containerStyle = useMemo(() => {
    return [
      styles.container,
      { height, backgroundColor: bgColor, borderRadius: height / 2 },
      style,
    ];
  }, [height, bgColor, style]);

  return (
    <View
      style={containerStyle}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: normalizedProgress }}
    >
      <View
        style={[
          styles.fillContainer,
          {
            borderRadius: height / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: progressFillColor,
              borderRadius: height / 2,
              width: widthInterpolated,
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fillContainer: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  fill: {
    height: '100%',
  },
});

// Memoize the component to prevent unnecessary re-renders
export const ProgressBar = React.memo(ProgressBarComponent);
