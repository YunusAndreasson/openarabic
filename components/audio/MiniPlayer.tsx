import { BaseCard, ProgressBar } from '@/components/common';
import { memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableStateCallbackType,
} from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/primitives/ThemedText';
import { EnhancedImage, IconButton } from '@/components/ui';
import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, TEXT_STYLES } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useIsTabBarHidden } from '@/hooks/ui/useTabBarAutoHide';
import { updateMiniPlayerHeight } from '@/hooks/audio/useMiniPlayerHeight';
import { mixColors } from '@/utils/colorUtils';
import { formatSecondsToClock, safePercent } from '@/utils/dateTimeUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { formatArticleMetadata } from '@/utils/stringUtils';

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
  /**
   * Where the card is mounted — drives the bottom offset and the surface.
   * Defaults to `root`.
   */
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
  /** True while the track is playing or still loading — the primary control reads Pause. */
  isPlaying: boolean;
  /** Pause the track in place, or resume it. */
  onTogglePause: () => void;
  /** Stop and clear the queue. Offered while paused, in the sleep timer's place. */
  onStop: () => void;
  onTimerPress: () => void;
  /**
   * Open the playing article. Absent when that article's reader is the screen
   * this player sits on, so the body is not a button that leads back to itself.
   */
  onOpenArticle?: () => void;
}

// Layout constants
const MINI_PLAYER_HEIGHT = LAYOUT.CARD.HEIGHT.MINI_PLAYER;
const PROGRESS_HEIGHT = LAYOUT.PROGRESS_BAR.HEIGHT;

// How much tint goes into the quiet control fill.
const QUIET_CONTROL_TINT = 0.12;

function handleMiniPlayerLayout(event: LayoutChangeEvent): void {
  updateMiniPlayerHeight(event.nativeEvent.layout.height);
}

// Custom memo comparison — keeps the one optimization React Compiler can't do:
// skip re-renders for sub-second position changes (position updates 2x/sec but display shows seconds)
const MiniPlayerComparison = (prev: MiniPlayerProps, next: MiniPlayerProps): boolean => {
  if (prev.article.id !== next.article.id) return false;
  if (prev.article.title !== next.article.title) return false;
  if (prev.placement !== next.placement) return false;
  if (prev.isPlaying !== next.isPlaying) return false;
  if ((prev.onOpenArticle === undefined) !== (next.onOpenArticle === undefined)) return false;
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
  isPlaying,
  onTogglePause,
  onStop,
  onTimerPress,
  onOpenArticle,
}: MiniPlayerProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isTabBarHidden = useIsTabBarHidden();

  // Float above the native tab bar. `insets.bottom` covers the home-indicator
  // area on iOS; `BOTTOM_BAR.HEIGHT` is the tab bar's own intrinsic height.
  // Inside a modal screen there is no tab bar, so only the inset is cleared —
  // and neither is there one to clear while the tab bar is scrolled away, or
  // the player would hang over an empty strip where the bar used to be. This
  // overlay is mounted next to the navigator, not inside it, so nothing else
  // moves it.
  const hasTabBarBelow = placement !== 'screen' && !isTabBarHidden;
  const containerBottom = hasTabBarBelow
    ? insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY
    : insets.bottom + LAYOUT.SPACING.SMALL;

  // React Compiler auto-memoizes these derivations
  const imageUrl = generateStorageUrl('images', article.image_url);
  const progressPercentage = safePercent(position, duration);
  const timeDisplay = `${formatSecondsToClock(position)} / ${formatSecondsToClock(duration)}`;
  const queueDisplay =
    queuePosition && queuePosition.total > 1
      ? `${queuePosition.current}/${queuePosition.total}`
      : null;

  // A running timer is a setting that is on, not a warning: it fills with the
  // tint rather than the warning colour.
  //
  // The quiet fill is mixed into elevation2, the card surface these controls
  // sit on, rather than laid on as alpha. An alpha fill composites over
  // whatever happens to be behind it — over the near-black dark page a
  // low-alpha tint collapses to near-black — while the mix is the same colour
  // resolved up front, opaque, wherever the control ends up.
  const quietButtonColor = mixColors(colors.elevation2, colors.tint, QUIET_CONTROL_TINT);
  const timerButtonColor = isTimerActive ? colors.tint : quietButtonColor;
  const timerIconColor = isTimerActive ? colors.onTint : colors.tint;
  const containerStyle = useMemo(
    () => [styles.container, { bottom: containerBottom }],
    [containerBottom],
  );

  const nowPlaying = (
    <>
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
          {formatArticleMetadata(article.author, article.category)}
        </ThemedText>

        {/* Time and queue position */}
        <View style={styles.timeAndQueueRow}>
          <ThemedText colorName="textTertiary" style={styles.timeDisplay} type="caption">
            {timeDisplay}
          </ThemedText>
          {queueDisplay && (
            <View style={styles.queueInfo}>
              <ThemedText colorName="textTertiary" type="caption">
                •
              </ThemedText>
              <ThemedText colorName="textTertiary" style={styles.queuePosition} type="caption">
                {queueDisplay}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </>
  );

  const inner = (
    // The miniplayer must remain readable over arbitrary scrolling content.
    // Native liquid glass and its tint are intentionally not used here:
    // UIGlassEffect can still resolve nearly clear depending on what it
    // samples, so only a real opaque surface provides a contrast guarantee —
    // hence `elevation2` rather than the plain card fill, and a hairline border
    // to keep that guarantee in dark mode, where shadows are suppressed.
    <BaseCard testID="mini-player-surface" surface="elevation2" elevation="floating" bordered>
      {/* Main Content Row */}
      <View style={styles.contentRow}>
        {/* The artwork and text open the article. Only they do: making the
            whole card the button would fold the two controls into it for a
            screen reader. On the article's own reader there is nowhere to go,
            so it is plain content there. */}
        {onOpenArticle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={article.title}
            accessibilityHint={STRINGS.MINI_PLAYER_OPEN_ARTICLE_HINT}
            onPress={onOpenArticle}
            style={nowPlayingPressableStyle}
            testID="mini-player-open-article"
          >
            {nowPlaying}
          </Pressable>
        ) : (
          <View style={styles.nowPlaying}>{nowPlaying}</View>
        )}

        {/* Controls. The bottom slot is always the play/pause toggle. The top
            slot is the sleep timer while sound is playing, and Stop once it is
            paused — the moment a listener may want to put it away. */}
        <View style={styles.controlsContainer}>
          {isPlaying ? (
            <IconButton
              icon="timer"
              onPress={onTimerPress}
              backgroundColor={timerButtonColor}
              iconColor={timerIconColor}
              iconSize={LAYOUT.BUTTON.ICON_SIZE.LARGE}
              hapticType="light"
              accessibilityLabel={STRINGS.SLEEP_TIMER}
            />
          ) : (
            <IconButton
              icon="stop"
              onPress={onStop}
              backgroundColor={quietButtonColor}
              iconColor={colors.tint}
              iconSize={LAYOUT.BUTTON.ICON_SIZE.LARGE}
              hapticType="light"
              accessibilityLabel={STRINGS.ARTICLE_STOP_LISTENING_A11Y}
            />
          )}
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            onPress={onTogglePause}
            backgroundColor={quietButtonColor}
            iconColor={colors.tint}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.LARGE}
            hapticType="light"
            accessibilityLabel={
              isPlaying ? STRINGS.MINI_PLAYER_PAUSE_A11Y : STRINGS.MINI_PLAYER_RESUME_A11Y
            }
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
    </BaseCard>
  );

  return (
    <Animated.View
      entering={FadeInUp.delay(TIMING_CONSTANTS.TRANSITION_DELAY).duration(
        TIMING_CONFIG.GENTLE.duration,
      )}
      exiting={FadeOutDown.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={containerStyle}
      onLayout={handleMiniPlayerLayout}
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

  contentRow: {
    minHeight: MINI_PLAYER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },

  nowPlaying: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + LAYOUT.SPACING.HALF_TINY,
  },

  timeDisplay: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + LAYOUT.SPACING.HALF_TINY,
    fontVariant: ['tabular-nums'],
    textAlign: 'left',
  },

  timeAndQueueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    flexWrap: 'wrap',
  },

  queueInfo: {
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

const nowPlayingPressableStyle = ({ pressed }: PressableStateCallbackType) => [
  styles.nowPlaying,
  pressed && styles.pressed,
];
