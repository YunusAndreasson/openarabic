import { ProgressBar } from '@/components/common';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { EnhancedImage } from '@/components/ui/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { IconButton } from '@/components/ui';
import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
import { FONT_WEIGHTS, LAYOUT, TEXT_STYLES } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { withAlpha } from '@/utils/colorUtils';
import { formatSecondsToClock, safePercent } from '@/utils/dateTimeUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { formatAuthorCategory } from '@/utils/stringUtils';

export interface MiniPlayerProps {
  /** Current article being played */
  article: {
    id: number;
    title: string;
    author: string;
    category: string;
    image_url: string;
  };
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
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT; // 4px

// Static container style - positioned to cover tab bar and floating buttons
const CONTAINER_STYLE = [
  StyleSheet.create({
    container: {
      position: 'absolute' as const,
      left: LAYOUT.SCREEN_HORIZONTAL_PADDING,
      right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
      zIndex: LAYOUT.Z_INDEX.HEADER, // Below modals (3) but above cards (1)
    },
  }).container,
  { bottom: LAYOUT.BOTTOM_BAR.HEIGHT - LAYOUT.SPACING.LARGE - LAYOUT.SPACING.TINY }, // Sits lower to cover tab bar icons
];

// Custom comparison function for React.memo
// Only re-render when visual display actually changes
// This prevents excessive re-renders from high-frequency position updates (2x/second)
const MiniPlayerComparison = (prev: MiniPlayerProps, next: MiniPlayerProps): boolean => {
  // Re-render if different article
  if (prev.article.id !== next.article.id) return false;

  // Re-render if timer state changes
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
  isTimerActive,
  position,
  duration,
  queuePosition,
  onPlayPause,
  onTimerPress,
}: MiniPlayerProps) => {
  const colors = useColors();

  // Memoize image URL to prevent duplicate generation on every render
  const imageUrl = useMemo(
    () => generateStorageUrl('images', article.image_url),
    [article.image_url],
  );

  // Memoize dynamic styles for better performance - use elevation2 for prominence
  const cardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: colors.elevation2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: withAlpha(colors.border, 0.5),
        ...LAYOUT.ELEVATION.MEDIUM,
        shadowColor: colors.shadow,
      },
    ],
    [colors.elevation2, colors.border, colors.shadow],
  );

  // Memoize button colors - use subtle tinted background for visibility
  const timerButtonColor = useMemo(
    () => (isTimerActive ? colors.warning : withAlpha(colors.tint, 0.12)),
    [isTimerActive, colors.warning, colors.tint],
  );

  const timerIconColor = useMemo(
    () => (isTimerActive ? colors.white : colors.tint),
    [isTimerActive, colors.white, colors.tint],
  );

  // Stop button uses subtle tinted background for visibility
  const stopButtonColor = useMemo(() => withAlpha(colors.tint, 0.12), [colors.tint]);

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
      return `${queuePosition.current}/${queuePosition.total}`;
    }
    return null;
  }, [queuePosition]);

  return (
    <Animated.View
      entering={FadeInUp.delay(TIMING_CONSTANTS.TRANSITION_DELAY).duration(
        TIMING_CONFIG.GENTLE.duration,
      )}
      exiting={FadeOutDown.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={CONTAINER_STYLE}
    >
      <View style={cardStyle}>
        {/* Clean elevated card content */}
        <View style={styles.contentWrapper}>
          {/* Main Content Row */}
          <View style={styles.contentRow}>
            {/* Artwork Thumbnail */}
            <View style={styles.artworkContainer}>
              <EnhancedImage
                source={imageUrl}
                style={styles.artwork}
                transition={TIMING_CONSTANTS.TRANSITION_DELAY}
                recyclingKey={`miniplayer-${article.id}`}
              />
            </View>

            {/* Text Content Column */}
            <View style={styles.textColumn}>
              <ThemedText
                colorName="headingText"
                style={styles.title}
                type="heading3"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {article.title}
              </ThemedText>

              <ThemedText
                colorName="secondaryText"
                style={styles.artist}
                type="caption"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatAuthorCategory(article.author, article.category)}
              </ThemedText>

              {/* Time and queue position */}
              <View style={styles.timeAndQueueRow}>
                <ThemedText colorName="textTertiary" style={styles.timeDisplay} type="caption">
                  {timeDisplay}
                </ThemedText>
                {queueDisplay && (
                  <>
                    <ThemedText colorName="textTertiary" type="caption">
                      •
                    </ThemedText>
                    <ThemedText
                      colorName="textTertiary"
                      style={styles.queuePosition}
                      type="caption"
                    >
                      {queueDisplay}
                    </ThemedText>
                  </>
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
                iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                hapticType="light"
                flat
              />

              {/* Stop button - fully stops playback and clears player state */}
              <IconButton
                icon="stop"
                onPress={onPlayPause}
                backgroundColor={stopButtonColor}
                iconColor={colors.tint}
                iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                hapticType="light"
                flat
              />
            </View>
          </View>

          {/* Progress Bar - at bottom */}
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

  // Content wrapper for clean elevated card
  contentWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },

  contentRow: {
    flex: 1, // Fill available height for proper vertical centering
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL, // 8px - consistent with PlaylistItemCard
    paddingBottom: PROGRESS_HEIGHT, // Account for progress bar overlay
  },

  textColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },

  title: {
    // Typography handled by type="heading3" (17px LARGE)
    letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
    marginBottom: LAYOUT.SPACING.TINY,
  },

  artist: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL + LAYOUT.SPACING.HALF_TINY,
    marginBottom: LAYOUT.SPACING.TINY,
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
    // Use tabular numbers for consistent width (prevents jumping when time changes)
    fontVariant: ['tabular-nums'],
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
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
  },

  artworkContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM, // 12px - breathing room for title text
  },

  artwork: {
    width: LAYOUT.CARD.IMAGE.MINI_PLAYER_ARTWORK,
    height: LAYOUT.CARD.IMAGE.MINI_PLAYER_ARTWORK,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
});
