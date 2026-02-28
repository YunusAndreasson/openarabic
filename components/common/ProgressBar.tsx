import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { ProgressBarProps } from '@/types/ui/loader.types';

// CSS easing equivalent of Easing.out(Easing.cubic)
const PROGRESS_EASING = cubicBezier(0.33, 1, 0.68, 1);

/**
 * An animated, crash-resistant progress bar component that displays progress.
 *
 * Features:
 * - Smooth CSS transitions via Reanimated v4
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

  // Handle invalid inputs that could crash (React Compiler auto-memoizes)
  let safeProgress = 0;
  if (typeof rawProgress === 'number' && !isNaN(rawProgress) && isFinite(rawProgress)) {
    // Clamp to 0-100 range and ensure it's a safe number
    safeProgress = Math.max(0, Math.min(100, rawProgress));
  }

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

  // Fill styles with CSS transition for smooth width animation
  const transitionFillStyle = [
    defaultStyles.fill,
    {
      backgroundColor: progressFillColor,
      borderRadius: height / 2,
      width: `${safeProgress}%`,
      transitionProperty: 'width',
      transitionDuration: `${animationDuration}ms`,
      transitionTimingFunction: PROGRESS_EASING,
    },
    fillStyle,
  ] as StyleProp<ViewStyle>;

  return (
    <View style={containerStyle}>
      <Animated.View style={transitionFillStyle} />
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
