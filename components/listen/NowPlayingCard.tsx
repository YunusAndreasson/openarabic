import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useNowPlayingCard } from '@/hooks/listen/useNowPlayingCard';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { Article } from '@/types/articles.types';
import { withOpacity } from '@/utils/colorUtils';

const CARD_HEIGHT = 120;
const IMAGE_SIZE = 80;

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
  const isDarkMode = useIsDarkMode();

  const {
    cardAnimatedStyle,
    backgroundImageStyle,
    buttonAnimatedStyle,
    handleStopPressIn,
    handleStopPressOut,
    handleStopPress,
    dynamicStyles,
    timeCalculations,
  } = useNowPlayingCard({
    isVisible,
    article,
    progress,
    duration,
    onStop,
    isTimerActive,
  });

  if (!isVisible) return null;

  // Show loading state if visible but no article data yet
  if (!article) {
    return (
      <Animated.View style={[styles.container, dynamicStyles.container, cardAnimatedStyle]}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <View style={[styles.articleImage, { backgroundColor: colors.elevation2 }]} />
          </View>
          <View style={styles.textContent}>
            <View style={styles.primaryInfo}>
              <ThemedText numberOfLines={1} style={styles.title} type="body">
                Loading...
              </ThemedText>
              <ThemedText
                numberOfLines={1}
                style={styles.author}
                type="caption"
                variant="secondary"
              >
                Preparing audio
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, dynamicStyles.container, cardAnimatedStyle]}>
      {/* Background Image with Blur and Overlay */}
      <View style={styles.backgroundContainer}>
        <Animated.View style={[styles.backgroundImage, backgroundImageStyle]}>
          <EnhancedImage
            contentFit="cover"
            placeholder={article.placeholder}
            source={article.image_url || ''}
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
      <TouchableOpacity activeOpacity={0.8} style={styles.content} onPress={onPress}>
        {/* Article Image */}
        <View style={styles.imageContainer}>
          <EnhancedImage
            contentFit="cover"
            placeholder={article.placeholder}
            source={article.image_url || ''}
            style={styles.articleImage}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          {/* Primary Info */}
          <View style={styles.primaryInfo}>
            <ThemedText numberOfLines={1} style={styles.title} type="body">
              {article.title}
            </ThemedText>

            <ThemedText numberOfLines={1} style={styles.author} type="caption" variant="secondary">
              {article.author?.name || 'Author'}
            </ThemedText>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <ThemedText style={styles.timeText} type="caption" variant="secondary">
                {timeCalculations.currentTime}
              </ThemedText>
              <ThemedText style={styles.timeText} type="caption" variant="secondary">
                {timeCalculations.totalTime}
              </ThemedText>
            </View>

            <ProgressBar
              animationTriggered={timeCalculations.progressPercentage > 0}
              backgroundColor={isDarkMode ? colors.elevation3 : colors.progressBackground}
              fillColor={colors.tint}
              height={3}
              progress={timeCalculations.progressPercentage}
              style={styles.progressBar}
            />
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Stop Button */}
          <Animated.View
            style={buttonAnimatedStyle}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPressIn={handleStopPressIn}
              onPressOut={handleStopPressOut}
              style={[styles.stopButton, dynamicStyles.stopButton]}
              onPress={handleStopPress}
            >
              <Ionicons color={colors.background} name="stop" size={24} />
            </TouchableOpacity>
          </Animated.View>

          {/* Timer Button */}
          {showTimerButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.timerButton, dynamicStyles.timerButton]}
              onPress={onTimerPress}
            >
              <Ionicons
                color={isTimerActive ? colors.warning : colors.text}
                name={isTimerActive ? 'timer' : 'timer-outline'}
                size={20}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
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
    opacity: 0.9,
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
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
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
    padding: LAYOUT.SPACING.MEDIUM,
  },

  controls: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },

  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  imageContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: IMAGE_SIZE,
    marginRight: LAYOUT.SPACING.MEDIUM,
    overflow: 'hidden',
    width: IMAGE_SIZE,
  },

  primaryInfo: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  progressBar: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: 3,
  },

  progressInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressSection: {
    gap: LAYOUT.SPACING.TINY,
  },

  stopButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BUTTON.HEIGHT.LARGE / 2,
    height: LAYOUT.BUTTON.HEIGHT.LARGE,
    justifyContent: 'center',
    width: LAYOUT.BUTTON.HEIGHT.LARGE,
  },

  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },

  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.9,
  },

  timerButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
