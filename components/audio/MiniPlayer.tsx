import { ProgressBar } from '@/components/common';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnhancedImage } from '@/components/ui/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { IconButton } from '@/components/ui';
import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, TEXT_STYLES } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { withAlpha } from '@/utils/colorUtils';
import { formatSecondsToClock, safePercent } from '@/utils/dateTimeUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { formatAuthorCategory } from '@/utils/stringUtils';

const GLASS_AVAILABLE = isLiquidGlassAvailable();
const CardSurface = GLASS_AVAILABLE ? GlassView : View;

/**
 * Where the player card is mounted.
 *
 * - `root`  — the app-wide floating overlay, sits above the native tab bar.
 * - `screen` — mounted inside a screen presented as a native modal (the article
 *   reader). Such a screen lives in its own view controller above the root React
 *   view, so the root overlay can never draw on top of it, and it has no tab bar
 *   to clear.
 */
export type MiniPlayerPlacement = 'root' | 'screen';

export interface MiniPlayerProps {
  /** Where the card is mounted — drives the bottom offset. Defaults to `root`. */
  placement?: MiniPlayerPlacement;
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

// Layout constants
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER;
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT;

// Custom memo comparison — keeps the one optimization React Compiler can't do:
// skip re-renders for sub-second position changes (position updates 2x/sec but display shows seconds)
const MiniPlayerComparison = (prev: MiniPlayerProps, next: MiniPlayerProps): boolean => {
  if (prev.article.id !== next.article.id) return false;
  if (prev.placement !== next.placement) return false;
  if (prev.isTimerActive !== next.isTimerActive) return false;
  if (prev.duration !== next.duration) return false;
  if (Math.floor(prev.position) !== Math.floor(next.position)) return false;
  if (
    prev.queuePosition?.current !== next.queuePosition?.current ||
    prev.queuePosition?.total !== next.queuePosition?.total
  ) {
    return false;
  }
  return true;
};

const MiniPlayerComponent = ({
  placement = 'root',
  article,
  isTimerActive,
  position,
  duration,
  queuePosition,
  onPlayPause,
  onTimerPress,
}: MiniPlayerProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Float above the native tab bar. `insets.bottom` covers the home-indicator
  // area on iOS; `BOTTOM_BAR.HEIGHT` is the tab bar's own intrinsic height.
  // Inside a modal screen there is no tab bar, so only the inset is cleared.
  const containerBottom =
    placement === 'screen'
      ? insets.bottom + LAYOUT.SPACING.SMALL
      : insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY;

  // React Compiler auto-memoizes these derivations
  const imageUrl = generateStorageUrl('images', article.image_url);
  const progressPercentage = safePercent(position, duration);
  const timeDisplay = `${formatSecondsToClock(position)} / ${formatSecondsToClock(duration)}`;
  const queueDisplay =
    queuePosition && queuePosition.total > 1
      ? `${queuePosition.current}/${queuePosition.total}`
      : null;

  const timerButtonColor = isTimerActive ? colors.warning : withAlpha(colors.tint, 0.12);
  const timerIconColor = isTimerActive ? colors.white : colors.tint;
  const stopButtonColor = withAlpha(colors.tint, 0.12);

  const cardStyle = [
    styles.card,
    {
      // On iOS 26 the GlassView provides the surface; skip the opaque fill so
      // the liquid-glass effect shows the tab bar/content behind it.
      backgroundColor: GLASS_AVAILABLE ? 'transparent' : colors.elevation2,
      borderWidth: GLASS_AVAILABLE ? 0 : StyleSheet.hairlineWidth,
      borderColor: withAlpha(colors.border, 0.5),
      ...LAYOUT.ELEVATION.MEDIUM,
      shadowColor: colors.shadow,
    },
  ];

  const surfaceProps = GLASS_AVAILABLE ? { glassEffectStyle: 'regular' as const } : {};

  const inner = (
    <CardSurface style={cardStyle} {...surfaceProps}>
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
                <ThemedText colorName="textTertiary" style={styles.queuePosition} type="caption">
                  {queueDisplay}
                </ThemedText>
              </>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <IconButton
            icon="timer"
            onPress={onTimerPress}
            backgroundColor={timerButtonColor}
            iconColor={timerIconColor}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.LARGE}
            hapticType="light"
          />
          <IconButton
            icon="pause"
            onPress={onPlayPause}
            backgroundColor={stopButtonColor}
            iconColor={colors.tint}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.LARGE}
            hapticType="light"
          />
        </View>
      </View>

      {/* Progress Bar - at bottom */}
      <View style={styles.progressContainer} pointerEvents="none">
        <ProgressBar
          progress={progressPercentage}
          height={PROGRESS_HEIGHT}
          fillColor={colors.tint}
          backgroundColor={colors.border}
        />
      </View>
    </CardSurface>
  );

  return (
    <Animated.View
      entering={FadeInUp.delay(TIMING_CONSTANTS.TRANSITION_DELAY).duration(
        TIMING_CONFIG.GENTLE.duration,
      )}
      exiting={FadeOutDown.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={[styles.container, { bottom: containerBottom }]}
    >
      {inner}
    </Animated.View>
  );
};

export const MiniPlayer = memo<MiniPlayerProps>(MiniPlayerComponent, MiniPlayerComparison);

MiniPlayer.displayName = 'MiniPlayer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },

  card: {
    height: MINI_PLAYER_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },

  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingTop: PROGRESS_HEIGHT,
  },

  textColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },

  title: {
    letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
    marginBottom: LAYOUT.SPACING.TINY,
  },

  artist: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontFamily: FONTS.ENGLISH,
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
    top: 0,
    left: 0,
    right: 0,
    height: PROGRESS_HEIGHT,
  },

  artworkContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },

  artwork: {
    width: LAYOUT.CARD.IMAGE.MINI_PLAYER_ARTWORK,
    height: LAYOUT.CARD.IMAGE.MINI_PLAYER_ARTWORK,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});
