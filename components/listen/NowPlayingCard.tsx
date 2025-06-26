import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioProgressIndicator from '@/components/AudioProgressIndicator';
import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { NOW_PLAYING_CARD_HEIGHT } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useNowPlayingCard } from '@/hooks/listen/useNowPlayingCard';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { withOpacity } from '@/utils/colorUtils';

const CARD_HEIGHT = NOW_PLAYING_CARD_HEIGHT;
const IMAGE_SIZE = LAYOUT.CARD.HEIGHT.LIST_ITEM * 0.8; // 64px - proportional to list item height

interface NowPlayingCardProps {
  /** Whether the card should be visible */
  isVisible: boolean;
  /** Current article being played */
  article: Partial<Article> | null;
  /** Progress of current playback in milliseconds */
  progress: number;
  /** Duration of current track in milliseconds */
  duration: number;
  /** Callback when card is tapped */
  onPress?: () => void;
  /** Callback when stop is tapped */
  onStop?: () => void;
  /** Timer functionality */
  showTimerButton?: boolean;
  onTimerPress?: () => void;
  isTimerActive?: boolean;
}

const NowPlayingCard = ({
  isVisible,
  article,
  progress,
  duration,
  onPress,
  onStop,
  showTimerButton = false,
  onTimerPress,
  isTimerActive = false,
}: NowPlayingCardProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    cardAnimatedStyle,
    backgroundImageStyle,
    buttonAnimatedStyle,
    handleStopPressIn,
    handleStopPressOut,
    handleStopPress,
    dynamicStyles,
  } = useNowPlayingCard({
    isVisible,
    onStop,
    isTimerActive,
  });

  // Create dynamic container style with safe area insets
  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        bottom:
          LAYOUT.BOTTOM_BAR.HEIGHT +
          LAYOUT.SPACING.MEDIUM +
          Math.max(insets.bottom, LAYOUT.SPACING.SMALL),
      },
      dynamicStyles.container,
      cardAnimatedStyle,
    ],
    [insets.bottom, dynamicStyles.container, cardAnimatedStyle]
  );

  if (!isVisible) return null;

  // Show loading state if visible but no article data yet
  if (!article) {
    return (
      <Animated.View style={containerStyle}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <View style={[styles.articleImage, { backgroundColor: colors.elevation2 }]} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText numberOfLines={1} style={styles.title} type="body">
              {STRINGS.LOADING}
            </ThemedText>
            <ThemedText numberOfLines={1} style={styles.author} type="caption" variant="secondary">
              {STRINGS.PREPARING_AUDIO}
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={containerStyle}>
      {/* Background Image with Blur and Overlay */}
      <View style={styles.backgroundContainer}>
        <Animated.View style={[styles.backgroundImage, backgroundImageStyle]}>
          <EnhancedImage
            contentFit="cover"
            source={String(article.image_url)}
            style={styles.backgroundImageInner}
          />
        </Animated.View>

        {/* Gradient Overlay for Better Text Contrast */}
        <LinearGradient
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradientOverlay}
          colors={[withOpacity(colors.background, 0.95), withOpacity(colors.background, 0.7)]}
        />
      </View>

      {/* Main Content */}
      <View style={styles.mainContainer}>
        {/* Expand Indicator - Centered at top */}
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HOVER}
          style={styles.expandIndicator}
          onPress={onPress}
        >
          <Ionicons color={colors.text} name="chevron-up" size={LAYOUT.BUTTON.ICON_SIZE.SMALL} />
        </TouchableOpacity>

        {/* Content Row */}
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HOVER}
          style={styles.content}
          onPress={onPress}
        >
          {/* Article Image */}
          <View style={styles.imageContainer}>
            <EnhancedImage
              contentFit="cover"
              source={String(article.image_url)}
              style={styles.articleImage}
            />
          </View>

          {/* Text and Progress Container */}
          <View style={styles.textContainer}>
            {/* Title and Author */}
            <View style={styles.textContent}>
              <ThemedText numberOfLines={1} style={styles.title} type="body">
                {article.title}
              </ThemedText>
              <ThemedText
                numberOfLines={1}
                style={styles.author}
                type="caption"
                variant="secondary"
              >
                {String(article.author?.name ?? '')}
              </ThemedText>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <AudioProgressIndicator
                position={(progress || 0) / 1000}
                duration={(duration || 0) / 1000}
                progressPercentage={
                  duration > 0 ? Math.max(0, Math.min(100, ((progress || 0) / duration) * 100)) : 0
                }
                progressBarHeight={2}
                style={styles.progressBar}
              />
            </View>
          </View>

          {/* Right Side Controls */}
          <View style={styles.rightControls}>
            {/* Stop Button */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                activeOpacity={LAYOUT.OPACITY.HOVER}
                onPressIn={handleStopPressIn}
                onPressOut={handleStopPressOut}
                style={[styles.stopButton, dynamicStyles.stopButton]}
                onPress={handleStopPress}
                testID="stop-playback-button"
              >
                <Ionicons
                  color={colors.background}
                  name="stop"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Timer Button */}
            {showTimerButton && (
              <TouchableOpacity
                activeOpacity={LAYOUT.OPACITY.HOVER}
                style={[styles.timerButton, dynamicStyles.timerButton]}
                onPress={onTimerPress}
              >
                <Ionicons
                  color={isTimerActive ? colors.warning : colors.text}
                  name={isTimerActive ? 'timer' : 'timer-outline'}
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  articleImage: {
    height: '100%',
    width: '100%',
  },

  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: 0.8,
    marginTop: 2,
  },

  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },

  backgroundImageInner: {
    height: '100%',
    width: '100%',
  },

  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    height: CARD_HEIGHT,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    overflow: 'hidden',
    position: 'absolute',
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },

  content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: LAYOUT.CARD.PADDING.MEDIUM,
    paddingVertical: LAYOUT.CARD.PADDING.SMALL,
    gap: LAYOUT.SPACING.MEDIUM,
  },

  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  imageContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: IMAGE_SIZE,
    overflow: 'hidden',
    width: IMAGE_SIZE,
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  textContent: {
    marginBottom: LAYOUT.SPACING.MICRO,
  },

  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NARROW,
  },

  stopButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BUTTON.HEIGHT.MEDIUM / 2,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    justifyContent: 'center',
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },

  timerButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BUTTON.HEIGHT.SMALL / 2,
    height: LAYOUT.BUTTON.HEIGHT.SMALL,
    justifyContent: 'center',
    width: LAYOUT.BUTTON.HEIGHT.SMALL,
  },

  progressContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  },

  progressBar: {
    height: 2,
  },

  mainContainer: {
    flex: 1,
    paddingTop: LAYOUT.SPACING.TINY,
    paddingBottom: LAYOUT.SPACING.TINY,
  },

  expandIndicator: {
    alignItems: 'center',
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
    width: '100%',
  },

  rightControls: {
    alignItems: 'center',
    flexDirection: 'column',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
  },
});

NowPlayingCard.displayName = 'NowPlayingCard';

// Memoized comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: NowPlayingCardProps, nextProps: NowPlayingCardProps): boolean => {
  // Critical props that always require re-render
  if (
    prevProps.isVisible !== nextProps.isVisible ||
    prevProps.article?.id !== nextProps.article?.id ||
    prevProps.isTimerActive !== nextProps.isTimerActive
  ) {
    return false;
  }

  // For progress and duration, only update if difference is significant (> 1%)
  const progressDiff = Math.abs((prevProps.progress ?? 0) - (nextProps.progress ?? 0));
  const durationDiff = Math.abs((prevProps.duration ?? 0) - (nextProps.duration ?? 0));

  if (progressDiff > (nextProps.progress ?? 0) * 0.01 || durationDiff > 1000) {
    return false;
  }

  // All other props are the same, skip re-render
  return true;
};

// Optimized export with custom memo comparison
export default memo(NowPlayingCard, arePropsEqual);
