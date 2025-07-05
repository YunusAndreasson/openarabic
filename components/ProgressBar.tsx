import { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { ProgressBarProps } from '@/types/ui/loader.types';

/**
 * A simple, crash-resistant progress bar component that displays progress
 * without complex animations that could cause crashes.
 *
 * Features:
 * - Theme integration with light/dark mode
 * - Customizable colors and dimensions
 * - No animations to prevent crashes
 * - Crash prevention for invalid values
 */
function ProgressBarComponent({
  progress: rawProgress,
  height = LAYOUT.SPACING.MEDIUM,
  style,
  fillStyle,
  backgroundColor,
  fillColor,
  animationTriggered = false, // Ignored - no animations
  animationDuration = 0, // Ignored - no animations
}: ProgressBarProps) {
  // Ignore animation parameters to prevent linter errors
  void animationTriggered;
  void animationDuration;
  const colors = useColors();

  // CRITICAL: Safe progress calculation without shared values
  const safeProgress = useMemo(() => {
    // Handle invalid inputs that could crash
    if (typeof rawProgress !== 'number' || isNaN(rawProgress) || !isFinite(rawProgress)) {
      return 0;
    }

    // Clamp to 0-100 range and ensure it's a safe number
    return Math.max(0, Math.min(100, rawProgress));
  }, [rawProgress]);

  // Determine background color based on theme if not provided
  const bgColor = useMemo(() => {
    if (backgroundColor) return backgroundColor;
    return colors.progressBackground;
  }, [backgroundColor, colors.progressBackground]);

  // Determine fill color based on theme if not provided
  const progressFillColor = useMemo(() => {
    return fillColor || colors.progressIndicator;
  }, [fillColor, colors.progressIndicator]);

  // Simple, safe styles without animations
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
      ] as StyleProp<ViewStyle>,
      fill: [
        defaultStyles.fill,
        {
          backgroundColor: progressFillColor,
          borderRadius: height / 2,
          // CRITICAL: Use simple width percentage instead of animated values
          width: `${safeProgress}%`,
        },
        fillStyle,
      ] as StyleProp<ViewStyle>,
    }),
    [height, bgColor, style, progressFillColor, fillStyle, safeProgress]
  );

  return (
    <View style={styles.container}>
      <View style={styles.fill} />
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

// Memoize the component to prevent unnecessary re-renders
export const ProgressBar = memo(ProgressBarComponent);
