import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import React, { memo, useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

export interface MiniPlayerProps {
  /** Current article being played */
  article: {
    id: number;
    title: string;
    author: string;
    image_url: string;
  };
  /** Audio playback state */
  isPlaying: boolean;
  /** Sleep timer active state */
  isTimerActive: boolean;
  /** Audio progress information */
  position: number;
  duration: number;
  /** Playback controls */
  onPlayPause: () => void;
  onTimerPress: () => void;
  onExpandPress: () => void;
  /** Optional tap to expand entire mini-player */
  onMiniPlayerPress?: () => void;
}

// Layout constants using proper LAYOUT system from layout.ts
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER; // 72px (48 + 24) - responsive to base unit
const ARTWORK_SIZE = LAYOUT.CARD.IMAGE.MINI_PLAYER; // 40px (48 - 8) - responsive to base unit
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT; // 4px - responsive to base unit
const BUTTON_SIZE = LAYOUT.BUTTON.HEIGHT.MEDIUM; // 44px - responsive to touch targets

// Simplified animation constants
const ANIMATION_CONFIG = {
  entering: 350,
  exiting: 200,
} as const;

const MiniPlayerComponent = ({
  article,
  isPlaying,
  isTimerActive,
  position,
  duration,
  onPlayPause,
  onTimerPress,
  onExpandPress,
  onMiniPlayerPress,
}: MiniPlayerProps): JSX.Element => {
  const colors = useColors();

  // Simplified mini-player press handler without animations
  const handleMiniPlayerPress = useCallback(() => {
    selectionFeedback();

    if (onMiniPlayerPress) {
      onMiniPlayerPress();
    } else {
      onExpandPress();
    }
  }, [onMiniPlayerPress, onExpandPress]);

  // Handle play/pause with haptic feedback
  const handlePlayPause = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation(); // Prevent card tap
      selectionFeedback();
      onPlayPause();
    },
    [onPlayPause]
  );

  // Calculate progress percentage with safety checks
  const progressPercentage = React.useMemo(() => {
    if (!duration || duration <= 0 || !isFinite(duration)) return 0;
    if (!position || position < 0 || !isFinite(position)) return 0;
    const progress = Math.min(100, (position / duration) * 100);
    return isFinite(progress) ? progress : 0;
  }, [position, duration]);

  // Format time display with safety checks
  const timeDisplay = React.useMemo(() => {
    const formatTime = (seconds: number) => {
      if (!isFinite(seconds) || seconds < 0) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!duration || !isFinite(duration)) return '';
    return `${formatTime(position)} / ${formatTime(duration)}`;
  }, [position, duration]);

  return (
    <Animated.View
      entering={FadeInUp.duration(ANIMATION_CONFIG.entering)}
      exiting={FadeOutDown.duration(ANIMATION_CONFIG.exiting)}
      style={[styles.container, { bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY }]}
    >
      <Pressable
        onPress={handleMiniPlayerPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.elevation2,
            borderColor: colors.border,
            ...LAYOUT.ELEVATION.MEDIUM,
          },
        ]}
      >
        {/* Main Content Row */}
        <View style={styles.contentRow}>
          {/* Artwork */}
          <View style={styles.artworkContainer}>
            <EnhancedImage source={article.image_url} style={styles.artwork} cachePolicy="disk" />
          </View>

          {/* Text Content and Time Display Column */}
          <View style={styles.textColumn}>
            {/* Text Content */}
            <View style={styles.textContent}>
              <ThemedText
                colorName="headingText"
                style={styles.title}
                type="heading3"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {article.title}
              </ThemedText>

              <View style={styles.metaRow}>
                <ThemedText
                  colorName="secondaryText"
                  style={styles.artist}
                  type="caption"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {article.author}
                </ThemedText>
              </View>
            </View>

            {/* Time display - aligned with text content left margin */}
            {timeDisplay && (
              <ThemedText colorName="secondaryText" style={styles.timeDisplay} type="caption">
                {timeDisplay}
              </ThemedText>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {/* Timer button - always visible with state indication */}
            <Pressable
              onPress={event => {
                event.stopPropagation();
                selectionFeedback();
                onTimerPress();
              }}
              style={[
                styles.timerButton,
                {
                  backgroundColor: isTimerActive ? colors.warning : colors.elevation3, // Subtle background when inactive
                },
              ]}
            >
              <Ionicons
                name="timer"
                size={14} // Increased from 12px back to 14px for better visibility
                color={isTimerActive ? colors.background : colors.secondaryText}
              />
            </Pressable>

            {/* Play/Pause button */}
            <Pressable
              onPress={handlePlayPause}
              style={[styles.playButton, { backgroundColor: colors.tint }]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={colors.background}
                style={!isPlaying && styles.playIconOffset}
              />
            </Pressable>
          </View>
        </View>

        {/* Progress Bar - at bottom like Apple Music */}
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progressPercentage}
            height={PROGRESS_HEIGHT}
            style={styles.progressBar}
            fillColor={colors.tint}
            backgroundColor={colors.elevation3}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SCREEN_EDGE_PADDING,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.OVERLAY, // Proper z-index from layout system
  },

  card: {
    height: MINI_PLAYER_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MINI_PLAYER_HEIGHT - PROGRESS_HEIGHT,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },

  artworkContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },

  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
  },

  textColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: LAYOUT.SPACING.SMALL,
  },

  textContent: {
    justifyContent: 'center',
    minWidth: 0,
  },

  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.HALF_TINY,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.HALF_TINY,
  },

  artist: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL + LAYOUT.SPACING.HALF_TINY,
  },

  timeDisplay: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.HIGH,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + LAYOUT.SPACING.HALF_TINY,
    // Use monospace font to prevent jumping when numbers change
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    // Align with text content - no right alignment needed since it's in column
    textAlign: 'left',
    // Small top margin to separate from author
    marginTop: LAYOUT.SPACING.HALF_TINY,
  },

  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.SMALL,
  },

  timerButton: {
    // Larger size for better usability
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE, // Back to 28px (was 24px)
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE,
    borderRadius: LAYOUT.BUTTON.ICON_SIZE.XLARGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Add subtle elevation when inactive for better visual hierarchy
    ...LAYOUT.ELEVATION.SUBTLE,
  },

  playButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.ELEVATION.SUBTLE,
  },

  playIconOffset: {
    marginLeft: LAYOUT.SPACING.HALF_TINY,
  },

  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PROGRESS_HEIGHT,
  },

  progressBar: {
    borderRadius: 0,
  },
});

// Optimized memo comparison - only check essential props
const MiniPlayer = memo(MiniPlayerComponent, (prevProps, nextProps) => {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isTimerActive === nextProps.isTimerActive &&
    Math.floor(prevProps.position) === Math.floor(nextProps.position) && // Only check seconds, not milliseconds
    prevProps.duration === nextProps.duration
  );
});

MiniPlayer.displayName = 'MiniPlayer';

export default MiniPlayer;
