import { memo, useEffect, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { ProgressBarProps } from '@/types/ui/loader.types';

/**
 * An animated, crash-resistant progress bar component that displays progress.
 *
 * Features:
 * - Smooth animated transitions using Reanimated
 * - Theme integration with light/dark mode
 * - Customizable colors and dimensions
 * - Crash prevention for invalid values
 */
function ProgressBarComponent({
  progress: rawProgress,
  height = LAYOUT.SPACING.MEDIUM,
  style,
  fillStyle,
  backgroundColor,
  fillColor,
  animationDuration = TIMING_CONFIG.PROGRESS.duration,
}: ProgressBarProps) {
  const colors = useColors();

  // Animated progress value for smooth transitions
  const progressValue = useSharedValue(0);

  const safeProgress = useMemo(() => {
    // Handle invalid inputs that could crash
    if (typeof rawProgress !== 'number' || isNaN(rawProgress) || !isFinite(rawProgress)) {
      return 0;
    }

    // Clamp to 0-100 range and ensure it's a safe number
    return Math.max(0, Math.min(100, rawProgress));
  }, [rawProgress]);

  // Animate progress changes smoothly
  useEffect(() => {
    progressValue.value = withTiming(safeProgress, {
      duration: animationDuration,
      easing: TIMING_CONFIG.PROGRESS.easing,
    });
  }, [safeProgress, progressValue, animationDuration]);

  // Determine background color based on theme if not provided
  const bgColor = useMemo(() => {
    if (backgroundColor) return backgroundColor;
    return colors.progressBackground;
  }, [backgroundColor, colors.progressBackground]);

  // Determine fill color based on theme if not provided
  const progressFillColor = useMemo(() => {
    return fillColor || colors.progressIndicator;
  }, [fillColor, colors.progressIndicator]);

  // Container styles (static)
  const containerStyle = useMemo(
    () =>
      [
        defaultStyles.container,
        {
          height,
          backgroundColor: bgColor,
          borderRadius: height / 2,
        },
        style,
      ] as StyleProp<ViewStyle>,
    [height, bgColor, style]
  );

  // Base fill styles (static parts)
  const baseFillStyle = useMemo(
    () =>
      [
        defaultStyles.fill,
        {
          backgroundColor: progressFillColor,
          borderRadius: height / 2,
        },
        fillStyle,
      ] as StyleProp<ViewStyle>,
    [height, progressFillColor, fillStyle]
  );

  // Animated fill width based on progress value
  const animatedFillStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${progressValue.value}%`,
    };
  }, [progressValue]);

  return (
    <View style={containerStyle}>
      <Animated.View style={[baseFillStyle, animatedFillStyle]} />
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
});

export const ProgressBar = memo(ProgressBarComponent);
