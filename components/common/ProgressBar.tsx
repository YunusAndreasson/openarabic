import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CSS_EASING, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useMotionStyle } from '@/hooks/animations/useMotionStyle';
import { useColors } from '@/hooks/theme/useColors';
import type { ProgressBarProps } from '@/types/ui/loader.types';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';

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
  if (typeof rawProgress === 'number' && Number.isFinite(rawProgress)) {
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

  // The fill's width eases to each new value on a CSS transition. A growing
  // width is movement, so Reduce Motion gets the new width at once
  // (`useMotionStyle`) — the CSS API would otherwise animate it regardless — and
  // so does a caller that asked for no animation (`animationDuration` 0).
  const widthTransition: ReanimatedCSSAnimationStyle | null =
    animationDuration > 0
      ? {
          transitionProperty: 'width',
          transitionDuration: `${animationDuration}ms`,
          transitionTimingFunction: CSS_EASING.OUT_CUBIC,
        }
      : null;
  const transition = useMotionStyle(widthTransition);

  const transitionFillStyle = [
    defaultStyles.fill,
    {
      backgroundColor: progressFillColor,
      borderRadius: height / 2,
      width: `${safeProgress}%` as const,
    },
    transition,
    fillStyle,
  ];

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
