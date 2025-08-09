import { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { formatSecondsToClock } from '@/utils/time';

interface AudioProgressIndicatorProps {
  /** Current position in seconds */
  position: number;
  /** Total duration in seconds */
  duration: number;
  /** Progress percentage (0-100) */
  progressPercentage: number;
  /** Height of the progress bar */
  progressBarHeight?: number;
  /** Custom background color for progress bar */
  progressBackgroundColor?: string;
  /** Custom fill color for progress bar */
  progressFillColor?: string;
  /** Custom text color for time displays */
  textColor?: string;
  /** Container style */
  style?: ViewStyle;
  /** Whether to use white text (for dark backgrounds) */
  useWhiteText?: boolean;
}

const AudioProgressIndicator = ({
  position,
  duration,
  progressPercentage,
  progressBarHeight = LAYOUT.SPACING.TINY,
  progressBackgroundColor,
  progressFillColor,
  textColor,
  style,
  useWhiteText = false,
}: AudioProgressIndicatorProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const currentTime = useMemo(() => formatSecondsToClock(position || 0), [position]);
  const totalTime = useMemo(() => formatSecondsToClock(duration || 0), [duration]);

  // Determine colors based on props and theme
  const timeTextColor = useMemo(() => {
    if (textColor) return textColor;
    if (useWhiteText) return colors.white;
    return colors.secondaryText;
  }, [textColor, useWhiteText, colors.white, colors.secondaryText]);

  const barBackgroundColor = useMemo(() => {
    if (progressBackgroundColor) return progressBackgroundColor;
    return isDarkMode ? colors.elevation3 : colors.elevation2;
  }, [progressBackgroundColor, isDarkMode, colors.elevation3, colors.elevation2]);

  const barFillColor = useMemo(() => {
    if (progressFillColor) return progressFillColor;
    return colors.tint;
  }, [progressFillColor, colors.tint]);

  return (
    <View style={[styles.container, style]}>
      {/* Time Info */}
      <View style={styles.timeInfo}>
        <ThemedText style={[styles.timeText, { color: timeTextColor }]} type="caption">
          {currentTime}
        </ThemedText>
        <ThemedText style={[styles.timeText, { color: timeTextColor }]} type="caption">
          {totalTime}
        </ThemedText>
      </View>

      {/* Progress Bar */}
      <ProgressBar
        backgroundColor={barBackgroundColor}
        fillColor={barFillColor}
        height={progressBarHeight}
        progress={progressPercentage}
        style={styles.progressBar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.TINY,
  },

  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    opacity: 0.9,
  },

  progressBar: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

AudioProgressIndicator.displayName = 'AudioProgressIndicator';

export default memo(AudioProgressIndicator);
