import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { LAYOUT } from '../constants/layout';
import Animated, { cancelAnimation } from 'react-native-reanimated';
import type { AnimatedStyleProp } from '@/hooks/animations/types';
import { useProgressAnimation } from '../hooks/animations';
import { ProgressBarProps } from '@/types/ui.types';

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
  } = useProgressAnimation(
    normalizedProgress, // Always initialize with current progress to avoid flashing
    animationDuration
  );

  // Effect to handle animation when triggered or when progress changes
  useEffect(() => {
    // Determine if animation should be immediate or animated
    const shouldAnimate = animationTriggered && prevProgressRef.current !== normalizedProgress;

    // Only animate if progress is actually changing
    if (shouldAnimate) {
      // Animate to the new target value
      updateProgress(normalizedProgress);
    } else {
      // Direct update without animation - ensures we're always showing the correct value
      cancelAnimation(animatedProgress);
      animatedProgress.value = normalizedProgress;
    }

    // Update the previous progress ref for the next comparison
    prevProgressRef.current = normalizedProgress;

    // Clean up animation when component unmounts or key changes
    return () => {
      cancelAnimation(animatedProgress);
    };
  }, [normalizedProgress, animationTriggered, updateProgress, animatedProgress]);

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
            animatedStyle as any,
            {
              backgroundColor: progressFillColor,
              borderRadius: height / 2,
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
