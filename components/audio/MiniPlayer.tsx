import { ProgressBar } from '@common/ProgressBar';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { generateImageUrl } from '@/utils/imageUtils';
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
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER; // 112px (taller for 2-line title)
const ARTWORK_SIZE = LAYOUT.CARD.IMAGE.MINI_PLAYER; // 56px
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT; // 4px

// Static container style - positioned to cover tab bar and floating buttons
const CONTAINER_STYLE = [
  StyleSheet.create({
    container: {
      position: 'absolute' as const,
      left: LAYOUT.SCREEN_EDGE_PADDING,
      right: LAYOUT.SCREEN_EDGE_PADDING,
      zIndex: LAYOUT.Z_INDEX.OVERLAY,
    },
  }).container,
  { bottom: LAYOUT.BOTTOM_BAR.HEIGHT - LAYOUT.SPACING.MEDIUM }, // Covers tab bar + PLAY ALL button
];

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
  isPlaying: _isPlaying,
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
  const cardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: colors.elevation2,
        ...LAYOUT.ELEVATION.MEDIUM,
      },
    ],
    [colors.elevation2],
  );

  // Memoize button colors
  const timerButtonColor = useMemo(
    () => (isTimerActive ? colors.warning : colors.elevation3),
    [isTimerActive, colors.warning, colors.elevation3],
  );

  const timerIconColor = useMemo(
    () => (isTimerActive ? colors.background : colors.secondaryText),
    [isTimerActive, colors.background, colors.secondaryText],
  );

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
      entering={FadeInUp.delay(150).duration(TIMING_CONFIG.GENTLE.duration)}
      exiting={FadeOutDown.duration(200)}
      style={CONTAINER_STYLE}
    >
      <View style={cardStyle}>
        {/* Main Content Row */}
        <View style={styles.contentRow}>
          {/* Artwork */}
          <View style={styles.artworkContainer}>
            <EnhancedImage
              source={imageUrl}
              style={styles.artwork}
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
                numberOfLines={2}
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
            <IconButton
              icon="timer"
              onPress={onTimerPress}
              backgroundColor={timerButtonColor}
              iconColor={timerIconColor}
              iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              hapticType="none"
            />

            {/* Stop button - playback is only started via PLAY ALL */}
            <IconButton
              icon="stop"
              onPress={onPlayPause}
              backgroundColor={colors.tint}
              iconColor={colors.black}
              iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            />
          </View>
        </View>

        {/* Progress Bar - at bottom like Apple Music */}
        <View style={styles.progressContainer} pointerEvents="none">
          <ProgressBar
            progress={progressPercentage}
            height={PROGRESS_HEIGHT}
            style={styles.progressBar}
            fillColor={colors.tint}
            backgroundColor={colors.border}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// Export with custom comparison for optimal performance
export const MiniPlayer = memo<MiniPlayerProps>(MiniPlayerComponent, MiniPlayerComparison);

MiniPlayer.displayName = 'MiniPlayer';

const styles = StyleSheet.create({
  card: {
    height: MINI_PLAYER_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MINI_PLAYER_HEIGHT - PROGRESS_HEIGHT,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY, // Reduced from SMALL (8px) to TINY (4px)
  },

  artworkContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
    marginRight: LAYOUT.SPACING.TINY, // Reduced from SMALL (8px) to TINY (4px)
  },

  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
  },

  textColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    // No marginRight - maximizes horizontal space for text
  },

  textContent: {
    justifyContent: 'center',
    minWidth: 0,
  },

  title: {
    // Typography handled by type="heading3" (17px LARGE)
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
    marginBottom: 0, // Removed spacing below title
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // Removed spacing below meta row
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
    // Use Courier New (system monospace font available on both iOS and Android)
    // Prevents jumping when numbers change in time display
    fontFamily: 'Courier New',
    // Align with text content - no right alignment needed since it's in column
    textAlign: 'left',
  },

  timeAndQueueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },

  controlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
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
