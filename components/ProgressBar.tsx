import React, { useMemo, useEffect, useRef, memo } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { ProgressBarProps } from '@/types/ui/loader.types';

import { useProgressAnimation } from '../hooks/animations';
import { useIsDarkMode } from '../hooks/useThemeDetection';

/**
 * A customizable progress bar component that can be used to display the
 * progress of an action or process.
 *
 * Features:
 * - Theme integration with light/dark mode
 * - Customizable colors and dimensions
 * - Smooth animation support
 * - Optional shadow effects based on platform
 */
function ProgressBarComponent({
  progress,
  height = LAYOUT.SPACING.MEDIUM,
  style,
  fillStyle,
  backgroundColor,
  fillColor,
  animationTriggered = false,
  animationDuration = 2000,
}: ProgressBarProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Store the previous progress value to avoid unnecessary animations
  const prevProgressRef = useRef(progress);

  // Ensure progress is within valid range (0-100)
  const normalizedProgress = useMemo(() => {
    // Handle invalid inputs gracefully
    if (isNaN(progress)) return 0;
    return Math.max(0, Math.min(100, progress));
  }, [progress]);

  // Use the standardized progress animation hook
  const {
    animatedStyle,
    updateProgress,
    progress: animatedProgress,
  } = useProgressAnimation(normalizedProgress, animationDuration);

  // Effect to handle animation when triggered or when progress changes
  useEffect(() => {
    // Always ensure progress doesn't go backwards
    const targetProgress = Math.max(normalizedProgress, prevProgressRef.current);

    // Determine if animation should be immediate or animated
    const shouldAnimate = animationTriggered && prevProgressRef.current !== targetProgress;

    // Only animate if progress is actually changing and increasing
    if (shouldAnimate && targetProgress > prevProgressRef.current) {
      // Animate to the new target value
      updateProgress(targetProgress);
    } else {
      // Direct update without animation - ensures we're always showing the correct value
      // But never allow progress to decrease
      cancelAnimation(animatedProgress);
      animatedProgress.value = targetProgress;
    }

    // Update the previous progress ref for the next comparison
    prevProgressRef.current = targetProgress;

    // Clean up animation when component unmounts or key changes
    return () => {
      cancelAnimation(animatedProgress);
    };
  }, [normalizedProgress, animationTriggered, animatedProgress, updateProgress]);

  // Determine background color based on theme if not provided
  const bgColor = useMemo(() => {
    if (backgroundColor) return backgroundColor;
    return isDarkMode ? colors.elevation1 : `${colors.text}15`;
  }, [backgroundColor, isDarkMode, colors.elevation1, colors.text]);

  // Determine fill color based on theme if not provided
  const progressFillColor = useMemo(() => {
    return fillColor || colors.tint;
  }, [fillColor, colors.tint]);

  // Memoize all styles at once to prevent unnecessary style object creation
  const styles = useMemo(
    () => ({
      container: [
        defaultStyles.container,
        {
          height,
          backgroundColor: bgColor,
          borderRadius: height / 2,
        },
        style,
      ],
      fillContainer: [
        defaultStyles.fillContainer,
        {
          borderRadius: height / 2,
        },
      ],
      fill: [
        defaultStyles.fill,
        animatedStyle as AnimatedStyleProp<ViewStyle>,
        {
          backgroundColor: progressFillColor,
          borderRadius: height / 2,
        },
        fillStyle,
      ],
    }),
    [height, bgColor, style, animatedStyle, progressFillColor, fillStyle]
  );

  return (
    <View
      style={styles.container as StyleProp<ViewStyle>}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: normalizedProgress }}
    >
      <View style={styles.fillContainer}>
        <Animated.View style={styles.fill} />
      </View>
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  fillContainer: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
});

// Memoize the component to prevent unnecessary re-renders
export const ProgressBar = memo(ProgressBarComponent);
