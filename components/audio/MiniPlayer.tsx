import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { JSX } from 'react';
import React, { memo, useCallback } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioProgressIndicator from '@/components/AudioProgressIndicator';
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

// Extract static constants to prevent recreation
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const ANIMATION_DURATION = 300;
const EXIT_ANIMATION_DURATION = 200;

// Enhanced button sizes following Fitts' Law
const BUTTON_SIZES = {
  STOP: MIN_TOUCH_TARGET.MEDIUM, // 44px - larger primary action
  SECONDARY: MIN_TOUCH_TARGET.SMALL, // 32px - smaller secondary actions
} as const;

const MiniPlayerComponent = ({
  article,
  queuePosition,
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

  // Enhanced button colors following design system
  const buttonColors = React.useMemo(
    () => ({
      // Stop button uses tint color for primary action emphasis
      stop: {
        background: colors.tint,
        icon: colors.background, // High contrast white text on tint background
      },
      // Secondary buttons use elevated card background
      secondary: {
        background: colors.elevation2, // Elevated above card surface
        icon: colors.text,
      },
      // Timer active state uses warning color
      timerActive: {
        background: colors.warning,
        icon: colors.background, // High contrast white text on warning background
      },
    }),
    [colors]
  );

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

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <AudioProgressIndicator
                    position={position}
                    duration={duration}
                    progressPercentage={
                      duration > 0 ? Math.min(100, (position / duration) * 100) : 0
                    }
                    progressBarHeight={LAYOUT.SPACING.HALF_TINY} // 2px - thinner for mini-player
                    progressBackgroundColor={withOpacity(colors.elevation3, 0.3)}
                    progressFillColor={colors.tint}
                    textColor={colors.captionText}
                    style={styles.progressIndicator}
                  />
                </View>
              </View>

              {/* Enhanced Horizontal Controls Layout */}
              <View style={styles.controlsContainer}>
                {/* Primary Stop/Play Button - Left side, larger */}
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: buttonColors.stop.background }]}
                  onPress={handlePlayPause}
                  hitSlop={HIT_SLOP}
                >
                  <Ionicons
                    name={isPlaying ? 'stop' : 'play'}
                    size={20}
                    color={buttonColors.stop.icon}
                  />
                </Pressable>

                {/* Secondary Controls - Right side, stacked vertically */}
                <View style={styles.secondaryControlsStack}>
                  <Pressable
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: isTimerActive
                          ? buttonColors.timerActive.background
                          : buttonColors.secondary.background,
                      },
                    ]}
                    onPress={handleTimerPress}
                    hitSlop={HIT_SLOP}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={16}
                      color={
                        isTimerActive ? buttonColors.timerActive.icon : buttonColors.secondary.icon
                      }
                    />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.secondaryButton,
                      { backgroundColor: buttonColors.secondary.background },
                    ]}
                    onPress={handleExpandPress}
                    hitSlop={HIT_SLOP}
                  >
                    <Ionicons name="chevron-up" size={16} color={buttonColors.secondary.icon} />
                  </Pressable>
                </View>
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
    zIndex: 9999, // High enough to overlay modal screens
  },

  card: {
    height: LAYOUT.CARD.HEIGHT.MINI_PLAYER + LAYOUT.SPACING.LARGE, // Increased height: 72 + 16 = 88px (was 84px)
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
    height: LAYOUT.CARD.HEIGHT.MINI_PLAYER + LAYOUT.SPACING.LARGE, // Match card height
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Critical for text truncation
    marginRight: LAYOUT.SPACING.SMALL, // Breathing room from controls (8px)
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

  controlsContainer: {
    flexDirection: 'row', // Horizontal layout: stop left, secondary controls right
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.MEDIUM, // Balanced spacing between primary and secondary controls (12px)
  },

  primaryButton: {
    width: BUTTON_SIZES.STOP,
    height: BUTTON_SIZES.STOP,
    borderRadius: BUTTON_SIZES.STOP / 2, // Perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow for primary button depth
    ...LAYOUT.ELEVATION.SMALL,
  },

  secondaryControlsStack: {
    flexDirection: 'column', // Stack timer and expand vertically
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL, // Tight vertical spacing between secondary buttons (8px)
  },

  secondaryButton: {
    width: BUTTON_SIZES.SECONDARY,
    height: BUTTON_SIZES.SECONDARY,
    borderRadius: BUTTON_SIZES.SECONDARY / 2, // Perfect circle
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressContainer: {
    marginTop: LAYOUT.SPACING.HALF_TINY,
    height: LAYOUT.SPACING.HALF_TINY,
  },

  progressIndicator: {
    flex: 1,
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
    prevProps.isTimerActive === nextProps.isTimerActive &&
    prevProps.position === nextProps.position &&
    prevProps.duration === nextProps.duration
  );
});

MiniPlayer.displayName = 'MiniPlayer';

export default MiniPlayer;
