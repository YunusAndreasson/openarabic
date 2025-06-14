import React, { useMemo, useEffect, useRef, memo } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useProgressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { ProgressBarProps } from '@/types/ui/loader.types';

// Progress change required to trigger an animation (0-10000 scale)
const PROGRESS_THRESHOLD = 100; // 1%

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
  progress: rawProgress, // Rename to emphasize we're not using it directly
  height = LAYOUT.SPACING.MEDIUM,
  style,
  fillStyle,
  backgroundColor,
  fillColor,
  animationTriggered = false,
  animationDuration = 2000,
}: ProgressBarProps) {
  const colors = useColors();
  // CRITICAL: Intercept the incoming value and convert to integer immediately
  // This prevents the native bridge from seeing floating point values at all
  const intProgress = useMemo(() => {
    // Handle invalid inputs
    if (typeof rawProgress !== 'number' || isNaN(rawProgress)) {
      return 0;
    }

    // Convert to integer (preserving 2 decimal places of precision)
    // Clamping 0-100 range to 0-10000 integers
    return Math.max(0, Math.min(10000, Math.round(rawProgress * 100)));
  }, [rawProgress]);

  // Store the previous progress value to avoid unnecessary animations
  const prevProgressRef = useRef(intProgress);

  // Use the standardized progress animation hook
  const {
    animatedStyle,
    updateProgress,
    progress: animatedProgress,
  } = useProgressAnimation(intProgress, animationDuration);

  // Effect to handle animation when triggered or when progress changes
  useEffect(() => {
    // Always ensure progress doesn't go backwards
    const targetProgress = Math.max(intProgress, prevProgressRef.current);

    const progressDelta = targetProgress - prevProgressRef.current;

    // Determine if animation should be immediate or animated
    const shouldAnimate =
      animationTriggered &&
      progressDelta >= PROGRESS_THRESHOLD &&
      progressDelta > 0;

    if (shouldAnimate) {
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
  }, [intProgress, animationTriggered, animatedProgress, updateProgress]);

  // Determine background color based on theme if not provided
  const bgColor = useMemo(() => {
    if (backgroundColor) return backgroundColor;
    return colors.progressBackground;
  }, [backgroundColor, colors.progressBackground]);

  // Determine fill color based on theme if not provided
  const progressFillColor = useMemo(() => {
    return fillColor || colors.progressIndicator;
  }, [fillColor, colors.progressIndicator]);

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
    <Animated.View style={styles.container as StyleProp<ViewStyle>}>
      <View style={styles.fillContainer}>
        <Animated.View style={styles.fill} />
      </View>
    </Animated.View>
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
