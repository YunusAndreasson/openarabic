import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { JSX } from 'react';
import React, { memo, useCallback } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { selectionFeedback } from '@/utils/haptics';

export interface MiniPlayerProps {
  /** Current article being played */
  article: {
    id: number;
    title: string;
    author: string;
    image_url: string;
  };
  /** Queue position information */
  queuePosition: {
    current: number;
    total: number;
  };
  /** Audio playback state */
  isPlaying: boolean;
  /** Sleep timer active state */
  isTimerActive: boolean;
  /** Playback controls */
  onPlayPause: () => void;
  onTimerPress: () => void;
  onExpandPress: () => void;
  /** Optional tap to expand entire mini-player */
  onMiniPlayerPress?: () => void;
}

// Extract static constants to prevent recreation
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const ANIMATION_DURATION = 300;
const EXIT_ANIMATION_DURATION = 200;

const MiniPlayerComponent = ({
  article,
  queuePosition,
  isPlaying,
  isTimerActive,
  onPlayPause,
  onTimerPress,
  onExpandPress,
  onMiniPlayerPress,
}: MiniPlayerProps): JSX.Element => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Memoized gradient colors with proper opacity
  const gradientColors = React.useMemo(
    () =>
      [
        withOpacity(colors.background, 0.75),
        withOpacity(colors.background, 0.65),
        withOpacity(colors.background, 0.75),
      ] as const,
    [colors.background]
  );

  // Memoized control button background colors
  const controlButtonBg = React.useMemo(() => withOpacity(colors.card, 0.8), [colors.card]);
  const timerActiveBg = React.useMemo(() => withOpacity(colors.warning, 0.9), [colors.warning]);

  // Optimized haptic feedback handlers using runOnJS
  const handlePlayPause = useCallback(() => {
    'worklet';
    runOnJS(selectionFeedback)();
    runOnJS(onPlayPause)();
  }, [onPlayPause]);

  const handleTimerPress = useCallback(() => {
    'worklet';
    runOnJS(selectionFeedback)();
    runOnJS(onTimerPress)();
  }, [onTimerPress]);

  const handleExpandPress = useCallback(() => {
    'worklet';
    runOnJS(selectionFeedback)();
    runOnJS(onExpandPress)();
  }, [onExpandPress]);

  const handleMiniPlayerPress = useCallback(() => {
    'worklet';
    if (onMiniPlayerPress) {
      runOnJS(selectionFeedback)();
      runOnJS(onMiniPlayerPress)();
    }
  }, [onMiniPlayerPress]);

  // Memoized dynamic styles
  const dynamicStyles = React.useMemo(
    () => ({
      container: {
        bottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT - LAYOUT.SPACING.SMALL,
      },
      card: {
        borderWidth: 1,
        borderColor: withOpacity(colors.border, 0.6),
      },
    }),
    [insets.bottom, colors.border]
  );

  return (
    <Animated.View
      entering={FadeInUp.duration(ANIMATION_DURATION)}
      exiting={FadeOutDown.duration(EXIT_ANIMATION_DURATION)}
      style={[styles.container, dynamicStyles.container]}
    >
      <BaseCard
        shadowSize="large"
        style={[styles.card, dynamicStyles.card]}
        onPress={handleMiniPlayerPress}
      >
        <ImageBackground
          source={{ uri: article.image_url }}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <LinearGradient
            colors={gradientColors}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.gradientOverlay}
          >
            <View style={styles.cardContent}>
              {/* Text Content - maximum space with 2-line title */}
              <View style={styles.textContainer}>
                <ThemedText
                  colorName="headingText"
                  style={styles.titleText}
                  type="heading3"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {article.title}
                </ThemedText>
                <View style={styles.metaRow}>
                  <ThemedText
                    colorName="authorText"
                    style={styles.authorText}
                    type="label"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {article.author} • {queuePosition.current}/{queuePosition.total}
                  </ThemedText>
                </View>
              </View>

              {/* Compact Controls */}
              <View style={styles.controls}>
                <Pressable
                  style={[styles.controlButton, { backgroundColor: controlButtonBg }]}
                  onPress={handlePlayPause}
                  hitSlop={HIT_SLOP}
                >
                  <Ionicons name={isPlaying ? 'stop' : 'play'} size={18} color={colors.text} />
                </Pressable>

                <Pressable
                  style={[
                    styles.controlButton,
                    { backgroundColor: isTimerActive ? timerActiveBg : controlButtonBg },
                  ]}
                  onPress={handleTimerPress}
                  hitSlop={HIT_SLOP}
                >
                  <Ionicons
                    name="timer-outline"
                    size={18}
                    color={isTimerActive ? colors.background : colors.text}
                  />
                </Pressable>

                <Pressable
                  style={[styles.controlButton, { backgroundColor: controlButtonBg }]}
                  onPress={handleExpandPress}
                  hitSlop={HIT_SLOP}
                >
                  <Ionicons name="chevron-up" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </BaseCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SCREEN_EDGE_PADDING,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.OVERLAY, // Use proper z-index from design system
  },

  card: {
    height: LAYOUT.CARD.HEIGHT.MINI_PLAYER + LAYOUT.SPACING.MEDIUM, // Taller for 2-line title
    overflow: 'hidden',
  },

  backgroundImage: {
    width: '100%',
    height: '100%',
  },

  backgroundImageStyle: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },

  gradientOverlay: {
    flex: 1,
  },

  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
    height: LAYOUT.CARD.HEIGHT.MINI_PLAYER + LAYOUT.SPACING.MEDIUM,
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Critical for text truncation
  },

  titleText: {
    marginBottom: LAYOUT.SPACING.HALF_TINY,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.1, // Tighter line height for 2 lines
  },

  authorText: {
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
    flex: 1, // Take available space
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.HALF_TINY, // Tighter spacing
    marginLeft: LAYOUT.SPACING.TINY, // Less margin
  },

  controlButton: {
    width: MIN_TOUCH_TARGET.SMALL, // Smaller buttons
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Add to layout constants for consistency
declare module '@/constants/layout' {
  interface LayoutCardHeight {
    MINI_PLAYER: number;
  }

  interface LayoutCardImage {
    MINI_PLAYER: number;
  }
}

// Optimized memo comparison
const MiniPlayer = memo(MiniPlayerComponent, (prevProps, nextProps) => {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.queuePosition.current === nextProps.queuePosition.current &&
    prevProps.queuePosition.total === nextProps.queuePosition.total &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isTimerActive === nextProps.isTimerActive
  );
});

MiniPlayer.displayName = 'MiniPlayer';

export default MiniPlayer;
