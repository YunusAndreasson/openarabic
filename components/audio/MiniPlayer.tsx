import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { ProgressBar } from '@common/ProgressBar';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';
import { generateImageUrl } from '@/utils/imageUtils';
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
}

// Layout constants using proper LAYOUT system from layout.ts
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER; // 96px
const ARTWORK_SIZE = LAYOUT.CARD.IMAGE.MINI_PLAYER; // 56px
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT; // 4px

export const MiniPlayer = memo<MiniPlayerProps>(
  ({ article, isPlaying, isTimerActive, position, duration, onPlayPause, onTimerPress }) => {
    const colors = useColors();

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

    // Simplified mini-player press handler without animations
    const handleMiniPlayerPress = useCallback(() => {
      selectionFeedback();
    }, []);

    // Handle play/pause with haptic feedback
    const handlePlayPause = useCallback(
      (event: GestureResponderEvent) => {
        event.stopPropagation(); // Prevent card tap
        selectionFeedback();
        onPlayPause();
      },
      [onPlayPause]
    );

    // Calculate progress percentage
    const progressPercentage = useMemo(() => safePercent(position, duration), [position, duration]);

    // Format time display with current position and total duration
    const timeDisplay = useMemo(() => {
      const currentTime = formatSecondsToClock(position);
      const totalTime = formatSecondsToClock(duration);
      return `${currentTime} / ${totalTime}`;
    }, [position, duration]);

    return (
      <Animated.View
        entering={FadeInUp.duration(350)}
        exiting={FadeOutDown.duration(200)}
        style={containerStyle}
      >
        <Pressable
          onPress={handleMiniPlayerPress}
          android_ripple={{ color: colors.navigationRipple }}
          style={cardStyle}
        >
          {/* Subtle inner hairline at top for grab affordance */}
          <View style={hairlineStyle} pointerEvents="none" />
          {/* Main Content Row */}
          <View style={styles.contentRow}>
            {/* Artwork */}
            <View style={styles.artworkContainer}>
              <EnhancedImage
                source={generateImageUrl(article.image_url)}
                style={artworkStyle}
                contentFit="cover"
                priority="high"
                transition={0}
                recyclingKey={generateImageUrl(article.image_url)}
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
                    {article.author || 'Unknown Author'}
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
                android_ripple={{ color: colors.navigationRipple }}
                style={playButtonStyle}
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
  }
);

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

  timeDisplay: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.HIGH,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + LAYOUT.SPACING.HALF_TINY,
    // Use monospace font to prevent jumping when numbers change
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    // Align with text content - no right alignment needed since it's in column
    textAlign: 'left',
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
