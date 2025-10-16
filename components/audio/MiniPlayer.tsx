import { ProgressBar } from '@common/ProgressBar';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';


import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback } from '@/utils/haptics';
import { generateImageUrl } from '@/utils/imageUtils';
import { createAndroidRipple } from '@/utils/layoutUtils';
import { formatSecondsToClock, safePercent } from '@/utils/dateTimeUtils';

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
  /** Queue position information for playlists */
  queuePosition?: {
    current: number;
    total: number;
  };
  /** Playback controls */
  onPlayPause: () => void;
  onTimerPress: () => void;
}

// Layout constants using proper LAYOUT system from layout.ts
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER; // 96px
const ARTWORK_SIZE = LAYOUT.CARD.IMAGE.MINI_PLAYER; // 56px
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT; // 4px

// Custom comparison function for React.memo
// Only re-render when visual display actually changes
// This prevents excessive re-renders from high-frequency position updates (2x/second)
const MiniPlayerComparison = (prev: MiniPlayerProps, next: MiniPlayerProps): boolean => {
  // Re-render if different article
  if (prev.article.id !== next.article.id) return false;

  // Re-render if play/pause state changes
  if (prev.isPlaying !== next.isPlaying) return false;
  if (prev.isTimerActive !== next.isTimerActive) return false;

  // Re-render if duration changes (new track)
  if (prev.duration !== next.duration) return false;

  // Only re-render when display text changes (full seconds)
  // Position updates 2x/second but display only shows seconds
  const prevSeconds = Math.floor(prev.position);
  const nextSeconds = Math.floor(next.position);
  if (prevSeconds !== nextSeconds) return false;

  // Re-render if queue position changes
  if (
    prev.queuePosition?.current !== next.queuePosition?.current ||
    prev.queuePosition?.total !== next.queuePosition?.total
  ) {
    return false;
  }

  // Props are "equal enough" - skip re-render
  return true;
};

const MiniPlayerComponent = ({
  article,
  isPlaying,
  isTimerActive,
  position,
  duration,
  queuePosition,
  onPlayPause,
  onTimerPress,
}: MiniPlayerProps) => {
  const colors = useColors();

  // Memoize image URL to prevent duplicate generation on every render
  const imageUrl = useMemo(() => generateImageUrl(article.image_url), [article.image_url]);

  // Memoize dynamic styles for better performance
  const containerStyle = useMemo(
      () => [styles.container, { bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY }],
      []
    );

    const cardStyle = useMemo(
      () => [
        styles.card,
        {
          backgroundColor: colors.elevation2,
          borderColor: colors.border,
          ...LAYOUT.ELEVATION.MEDIUM,
        },
      ],
      [colors.elevation2, colors.border]
    );

    const hairlineStyle = useMemo(
      () => [styles.hairline, { backgroundColor: colors.border }],
      [colors.border]
    );

    const artworkStyle = useMemo(
      () => [
        styles.artwork,
        {
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
          borderColor: colors.border,
        },
      ],
      [colors.border]
    );

    const timerButtonStyle = useMemo(
      () => [
        styles.timerButton,
        {
          backgroundColor: isTimerActive ? colors.warning : colors.elevation3,
          borderWidth: isTimerActive ? 0 : LAYOUT.BORDER.WIDTH.THIN,
          borderColor: isTimerActive ? colors.transparent : colors.border,
        },
      ],
      [isTimerActive, colors.warning, colors.elevation3, colors.border, colors.transparent]
    );

    const playButtonStyle = useMemo(
      () => [styles.playButton, { backgroundColor: colors.tint }],
      [colors.tint]
    );

    // Handle play/pause with haptic feedback
    const handlePlayPause = useCallback(() => {
      lightFeedback();
      onPlayPause();
    }, [onPlayPause]);

    // Calculate progress percentage
    const progressPercentage = useMemo(() => safePercent(position, duration), [position, duration]);

    // Format time display with current position and total duration
    const timeDisplay = useMemo(() => {
      const currentTime = formatSecondsToClock(position);
      const totalTime = formatSecondsToClock(duration);
      return `${currentTime} / ${totalTime}`;
    }, [position, duration]);

    // Format queue position display
    const queueDisplay = useMemo(() => {
      if (queuePosition && queuePosition.total > 1) {
        return `${queuePosition.current} of ${queuePosition.total}`;
      }
      return null;
    }, [queuePosition]);

    return (
      <Animated.View
        entering={FadeInUp.duration(TIMING_CONFIG.GENTLE.duration)}
        exiting={FadeOutDown.duration(200)}
        style={containerStyle}
      >
        <View style={cardStyle}>
          {/* Subtle inner hairline at top for grab affordance */}
          <View style={hairlineStyle} pointerEvents="none" />
          {/* Main Content Row */}
          <View style={styles.contentRow}>
            {/* Artwork */}
            <View style={styles.artworkContainer}>
              <EnhancedImage
                source={imageUrl}
                style={artworkStyle}
                priority="high"
                transition={0}
                recyclingKey={imageUrl}
              />
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
                    {article.author || 'Unknown Author'}
                  </ThemedText>
                </View>
              </View>

              {/* Time display and queue position - aligned with text content left margin */}
              <View style={styles.timeAndQueueRow}>
                <ThemedText colorName="secondaryText" style={styles.timeDisplay} type="caption">
                  {timeDisplay}
                </ThemedText>
                {/* Queue position indicator - placed after duration */}
                {queueDisplay && (
                  <ThemedText colorName="tint" style={styles.queuePosition} type="caption">
                    {queueDisplay}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
              {/* Timer button - always visible with state indication */}
              <Pressable
                onPress={() => {
                  lightFeedback();
                  onTimerPress();
                }}
                android_ripple={createAndroidRipple(colors)}
                style={timerButtonStyle}
              >
                <Ionicons
                  name="timer"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={isTimerActive ? colors.background : colors.secondaryText}
                />
              </Pressable>

              {/* Play/Pause button */}
              <Pressable
                onPress={handlePlayPause}
                android_ripple={createAndroidRipple(colors)}
                style={playButtonStyle}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={colors.black}
                  style={!isPlaying && styles.playIconOffset}
                />
              </Pressable>
            </View>
          </View>

          {/* Progress Bar - at bottom like Apple Music */}
          <View style={styles.progressContainer} pointerEvents="none">
            <ProgressBar
              progress={progressPercentage}
              height={PROGRESS_HEIGHT}
              style={styles.progressBar}
              fillColor={colors.tint}
              backgroundColor={colors.elevation3}
            />
          </View>
        </View>
      </Animated.View>
    );
};

// Export with custom comparison for optimal performance
export const MiniPlayer = memo<MiniPlayerProps>(MiniPlayerComponent, MiniPlayerComparison);

MiniPlayer.displayName = 'MiniPlayer';

export default MiniPlayer;

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

  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LAYOUT.BORDER.WIDTH.THIN,
    backgroundColor: 'transparent', // Will be set dynamically
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MINI_PLAYER_HEIGHT - PROGRESS_HEIGHT,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },

  artworkContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
    marginRight: LAYOUT.SPACING.SMALL,
  },

  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
  },

  textColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: LAYOUT.SPACING.TINY,
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

  queuePosition: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.HIGH,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + LAYOUT.SPACING.HALF_TINY,
  },

  timeDisplay: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.HIGH,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + LAYOUT.SPACING.HALF_TINY,
    // Use monospace font to prevent jumping when numbers change
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    // Align with text content - no right alignment needed since it's in column
    textAlign: 'left',
  },

  timeAndQueueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.HALF_TINY,
    gap: LAYOUT.SPACING.SMALL,
  },

  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.SMALL,
    paddingRight: LAYOUT.SPACING.MEDIUM,
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
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    borderRadius: LAYOUT.BUTTON.HEIGHT.MEDIUM / 2,
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
