import { useEffect } from 'react';
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

  // Handle invalid inputs that could crash (React Compiler auto-memoizes)
  let safeProgress = 0;
  if (typeof rawProgress === 'number' && !isNaN(rawProgress) && isFinite(rawProgress)) {
    // Clamp to 0-100 range and ensure it's a safe number
    safeProgress = Math.max(0, Math.min(100, rawProgress));
  }

  // Animate progress changes smoothly
  useEffect(() => {
    progressValue.set(
      withTiming(safeProgress, {
        duration: animationDuration,
        easing: TIMING_CONFIG.PROGRESS.easing,
      }),
    );
  }, [safeProgress, progressValue, animationDuration]);

  // Determine background color based on theme if not provided (React Compiler auto-memoizes)
  const bgColor = backgroundColor || colors.progressBackground;

  // Determine fill color based on theme if not provided (React Compiler auto-memoizes)
  const progressFillColor = fillColor || colors.progressIndicator;

  // Container styles (React Compiler auto-memoizes)
  const containerStyle = [
    defaultStyles.container,
    {
      height,
      backgroundColor: bgColor,
      borderRadius: height / 2,
    },
    style,
  ] as StyleProp<ViewStyle>;

  // Base fill styles (React Compiler auto-memoizes)
  const baseFillStyle = [
    defaultStyles.fill,
    {
      backgroundColor: progressFillColor,
      borderRadius: height / 2,
    },
    fillStyle,
  ] as StyleProp<ViewStyle>;

  // Animated fill width based on progress value
  const animatedFillStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${progressValue.get()}%`,
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

ProgressBarComponent.displayName = 'ProgressBar';

export const ProgressBar = ProgressBarComponent;
