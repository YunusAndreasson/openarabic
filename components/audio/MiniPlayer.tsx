import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ProgressBar } from '@common/ProgressBar';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';
import { formatSecondsToClock, safePercent } from '@/utils/time';

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
  /** Single handler to expand the now-playing modal */
  onExpand: () => void;
}

// Layout constants using proper LAYOUT system from layout.ts
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER; // 72px (48 + 24) - responsive to base unit
const ARTWORK_SIZE = LAYOUT.CARD.IMAGE.MINI_PLAYER; // 40px (48 - 8) - responsive to base unit
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT; // 4px - responsive to base unit

const MiniPlayerComponent = ({
  article,
  isPlaying,
  isTimerActive,
  position,
  duration,
  onPlayPause,
  onTimerPress,
  onExpand,
}: MiniPlayerProps): JSX.Element => {
  const colors = useColors();

  // Simplified mini-player press handler without animations
  const handleMiniPlayerPress = useCallback(() => {
    selectionFeedback();
    onExpand();
  }, [onExpand]);

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
  const progressPercentage = useMemo(() => safePercent(position, duration), [position, duration]);

  // Format time display with sensible defaults to prevent glitching
  const timeDisplay = useMemo(() => {
    // Always show time display to prevent layout shifts
    const safePosition = Number.isFinite(position) && position >= 0 ? position : 0;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

    // Show "0:00 / 0:00" when duration is not yet available
    if (safeDuration <= 0) {
      return `${formatSecondsToClock(safePosition)} / 0:00`;
    }

    return `${formatSecondsToClock(safePosition)} / ${formatSecondsToClock(safeDuration)}`;
  }, [position, duration]);

  return (
    <Animated.View
      entering={FadeInUp.duration(350)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.container, { bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY }]}
    >
      <Pressable
        onPress={handleMiniPlayerPress}
        android_ripple={{ color: colors.navigationRipple }}
        style={[
          styles.card,
          {
            backgroundColor: colors.elevation2,
            borderColor: colors.border,
            ...LAYOUT.ELEVATION.MEDIUM,
          },
        ]}
      >
        {/* Subtle inner hairline at top for grab affordance */}
        <View style={[styles.hairline, { backgroundColor: colors.border }]} pointerEvents="none" />
        {/* Main Content Row */}
        <View style={styles.contentRow}>
          {/* Artwork */}
          <View style={styles.artworkContainer}>
            <EnhancedImage
              source={article.image_url}
              style={[
                styles.artwork,
                {
                  borderWidth: LAYOUT.BORDER.WIDTH.THIN,
                  borderColor: colors.border,
                },
              ]}
              contentFit="cover"
              priority="high"
              transition={0}
              recyclingKey={article.image_url}
              cachePolicy="memory-disk"
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
                  {article.author}
                </ThemedText>
              </View>
            </View>

            {/* Time display - aligned with text content left margin */}
            <ThemedText colorName="secondaryText" style={styles.timeDisplay} type="caption">
              {timeDisplay}
            </ThemedText>
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
              android_ripple={{ color: colors.navigationRipple }}
              style={[
                styles.timerButton,
                {
                  backgroundColor: isTimerActive ? colors.warning : colors.elevation3,
                  borderWidth: isTimerActive ? 0 : LAYOUT.BORDER.WIDTH.THIN,
                  borderColor: isTimerActive ? colors.transparent : colors.border,
                },
              ]}
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
              android_ripple={{ color: colors.navigationRipple }}
              style={[styles.playButton, { backgroundColor: colors.tint }]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
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
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
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
