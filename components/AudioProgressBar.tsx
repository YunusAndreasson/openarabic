import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { withOpacity } from '@/utils/colorUtils';

interface AudioProgressBarProps {
  progress: number; // Current progress in milliseconds
  duration: number; // Total duration in milliseconds
  isPlaying: boolean;
  showTimeRemaining?: boolean;
  compact?: boolean;
}

// Format time in MM:SS format
const formatTime = (milliseconds: number): string => {
  if (!milliseconds || isNaN(milliseconds)) return '00:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const AudioProgressBar: React.FC<AudioProgressBarProps> = ({
  progress,
  duration,
  isPlaying,
  showTimeRemaining = true,
  compact = false,
}) => {
  const colors = useColors();
  const playbackProgress = duration > 0 ? progress / duration : 0;
  const remainingTime = Math.max(0, duration - progress);

  // Animated values for smooth transitions
  const progressWidth = useSharedValue(playbackProgress);

  React.useEffect(() => {
    progressWidth.value = withSpring(playbackProgress, {
      damping: 15,
      stiffness: 150,
    });
  }, [playbackProgress, progressWidth]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value * 100}%`,
    };
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View
          style={[
            styles.compactProgressTrack,
            { backgroundColor: withOpacity(colors.textTertiary, 0.4) },
          ]}
        >
          <Animated.View
            style={[
              styles.compactProgressFill,
              { backgroundColor: colors.tint },
              animatedProgressStyle,
            ]}
          />
          {/* End indicator */}
          <View
            style={[
              styles.compactEndIndicator,
              { backgroundColor: withOpacity(colors.success, 0.6) },
            ]}
          />
        </View>
        {showTimeRemaining && duration > 0 && (
          <ThemedText
            type="label"
            style={[styles.compactTimeText, { color: colors.tint }]}
            skipDefaultColor
          >
            {formatTime(remainingTime)}
          </ThemedText>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Single row: Progress bar and time counter aligned */}
      <View style={styles.progressRow}>
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: withOpacity(colors.textTertiary, 0.3) },
            ]}
          >
            <Animated.View
              style={[styles.progressFill, { backgroundColor: colors.tint }, animatedProgressStyle]}
            />
            {/* End indicator - shows where the track ends */}
            <View
              style={[styles.endIndicator, { backgroundColor: withOpacity(colors.success, 0.7) }]}
            />
          </View>
        </View>

        {showTimeRemaining && duration > 0 && (
          <ThemedText
            type="label"
            style={[styles.timeText, { color: colors.tint }]}
            skipDefaultColor
          >
            {formatTime(remainingTime)} left
          </ThemedText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.XSMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    gap: LAYOUT.SPACING.SMALL,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  progressContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  endIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 3,
    height: '100%',
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.SMALL,
    borderBottomRightRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  compactProgressTrack: {
    flex: 1,
    height: 2,
    borderRadius: LAYOUT.BORDER_RADIUS.XSMALL,
    overflow: 'hidden',
    position: 'relative',
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.XSMALL,
  },
  compactEndIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 2,
    height: '100%',
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.XSMALL,
    borderBottomRightRadius: LAYOUT.BORDER_RADIUS.XSMALL,
  },
  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    letterSpacing: 0.2,
    opacity: 0.85,
    minWidth: 60,
    textAlign: 'right',
  },
  compactTimeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    letterSpacing: 0.2,
    opacity: 0.8,
    minWidth: 32,
    textAlign: 'right',
  },
});
