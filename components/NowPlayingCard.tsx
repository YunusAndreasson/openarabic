import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnUI,
  cancelAnimation,
} from 'react-native-reanimated';

import { EnhancedImage } from './EnhancedImage';
import { ThemedText } from './ThemedText';
import { ProgressBar } from './ProgressBar';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { Article } from '@/types/articles.types';

const CARD_HEIGHT = 120;
const IMAGE_SIZE = 80;

// Optimized animation configurations
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 1,
} as const;

const ENTRANCE_SCALE_CONFIG = {
  damping: 25,
  stiffness: 120,
} as const;

const BUTTON_SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
} as const;

const EXIT_SPRING_CONFIG = {
  damping: 25,
  stiffness: 150,
  mass: 0.8,
} as const;

interface NowPlayingCardProps {
  /** Whether the card should be visible */
  isVisible: boolean;
  /** Current audio state */
  audioState: string;
  /** Current article being played */
  article: Article | null;
  /** Progress of current playback (0-100) */
  progress: number;
  /** Duration of current track in seconds */
  duration: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Callback when card is tapped */
  onPress?: () => void;
  /** Callback when play/pause is tapped */
  onPlayPause?: () => void;
  /** Timer functionality */
  showTimerButton?: boolean;
  onTimerPress?: () => void;
  isTimerActive?: boolean;
  timerAccessibilityLabel?: string;
}

const NowPlayingCard = ({
  isVisible,
  article,
  progress,
  duration,
  isPlaying,
  onPress,
  onPlayPause,
  showTimerButton = false,
  onTimerPress,
  isTimerActive = false,
  timerAccessibilityLabel,
}: NowPlayingCardProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Animation values - use stable initial values to prevent re-creation
  const translateY = useSharedValue(CARD_HEIGHT + 100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const buttonScale = useSharedValue(1);

  // Animate card visibility
  useEffect(() => {
    if (isVisible && article) {
      // Slide up with elegant spring animation
      translateY.value = withSpring(0, SPRING_CONFIG);

      // Fade in
      opacity.value = withTiming(1, { duration: 300 });

      // Scale up slightly for entrance
      scale.value = withSpring(1, ENTRANCE_SCALE_CONFIG);
    } else {
      // Enhanced reverse animation - more elegant exit
      // First slightly scale down for feedback
      scale.value = withTiming(0.92, { duration: 100 }, () => {
        // Then slide down with smooth spring
        translateY.value = withSpring(CARD_HEIGHT + 100, EXIT_SPRING_CONFIG);
      });

      // Fade out with slight delay for smoother transition
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible, article, translateY, opacity, scale]);

  // Optimized button press animation using runOnUI for better performance
  const handlePlayPausePress = useCallback(() => {
    // Run animation on UI thread for maximum smoothness
    runOnUI(() => {
      'worklet';
      // Immediate visual feedback - scale down and up
      buttonScale.value = withTiming(0.85, { duration: 100 }, () => {
        buttonScale.value = withSpring(1, BUTTON_SPRING_CONFIG);
      });
    })();

    // Call the actual handler
    onPlayPause?.();
  }, [onPlayPause, buttonScale]);

  // Cleanup animations on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(buttonScale);
    };
  }, [translateY, opacity, scale, buttonScale]);

  // Optimized animated styles using worklets for better performance
  const cardAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  }, []);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: buttonScale.value }],
    };
  }, []);

  const backgroundImageStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(opacity.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
    };
  }, []);

  // Memoized styles for performance - only recalculate when colors or theme changes
  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: isDarkMode ? colors.elevation2 : colors.card,
        borderColor: isDarkMode ? colors.border : colors.cardBorder,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 8,
      },
      playButton: {
        backgroundColor: colors.tint,
        shadowColor: colors.tint,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      },
      timerButton: {
        backgroundColor: isTimerActive
          ? isDarkMode
            ? colors.elevation3
            : colors.buttonOverlay
          : isDarkMode
            ? colors.elevation2
            : colors.card,
        borderColor: isTimerActive ? colors.warning : colors.border,
        borderWidth: 1,
      },
    }),
    [colors, isDarkMode, isTimerActive]
  );

  // Optimized format function - memoized outside component to prevent recreation
  const formatTime = useCallback((seconds: number): string => {
    // Handle invalid inputs efficiently
    if (!seconds || !isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Optimized time calculations with stable dependencies
  const timeCalculations = useMemo(() => {
    // progress is actually position in milliseconds, not percentage
    const safeProgress = progress && isFinite(progress) ? progress : 0;
    const safeDuration = duration && isFinite(duration) ? duration : 0;

    // Convert from milliseconds to seconds
    const currentSeconds = safeProgress / 1000;
    const totalSeconds = safeDuration / 1000;

    // Calculate progress percentage for the progress bar
    const percentage = safeDuration > 0 ? (safeProgress / safeDuration) * 100 : 0;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    return {
      currentTime: formatTime(currentSeconds),
      totalTime: formatTime(totalSeconds),
      progressPercentage: clampedPercentage,
    };
  }, [progress, duration, formatTime]);

  if (!article) return null;

  return (
    <Animated.View style={[styles.container, dynamicStyles.container, cardAnimatedStyle]}>
      {/* Background Image with Blur and Overlay */}
      <View style={styles.backgroundContainer}>
        <Animated.View style={[styles.backgroundImage, backgroundImageStyle]}>
          <EnhancedImage
            source={article.image_url || ''}
            style={styles.backgroundImageInner}
            placeholder={article.placeholder}
            contentFit="cover"
          />
        </Animated.View>

        {/* Gradient Overlay for Better Text Contrast */}
        <LinearGradient
          colors={[
            isDarkMode ? 'rgba(13, 18, 16, 0.95)' : 'rgba(249, 251, 249, 0.95)',
            isDarkMode ? 'rgba(13, 18, 16, 0.7)' : 'rgba(249, 251, 249, 0.7)',
          ]}
          style={styles.gradientOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Main Content */}
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.8}>
        {/* Article Image */}
        <View style={styles.imageContainer}>
          <EnhancedImage
            source={article.image_url || ''}
            style={styles.articleImage}
            placeholder={article.placeholder}
            contentFit="cover"
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          {/* Primary Info */}
          <View style={styles.primaryInfo}>
            <ThemedText type="body" numberOfLines={1} style={styles.title}>
              {article.title}
            </ThemedText>

            <ThemedText type="caption" variant="secondary" numberOfLines={1} style={styles.author}>
              {article.author?.name || 'Unknown Author'}
            </ThemedText>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <ThemedText type="caption" variant="secondary" style={styles.timeText}>
                {timeCalculations.currentTime}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.timeText}>
                {timeCalculations.totalTime}
              </ThemedText>
            </View>

            <ProgressBar
              progress={timeCalculations.progressPercentage}
              height={3}
              style={styles.progressBar}
              fillColor={colors.tint}
              backgroundColor={isDarkMode ? colors.elevation3 : colors.progressBackground}
              animationTriggered={isPlaying && timeCalculations.progressPercentage > 0}
            />
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Play/Stop Button - single main control */}
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.playButton, dynamicStyles.playButton]}
              onPress={handlePlayPausePress}
              activeOpacity={0.8}
            >
              <Ionicons name={isPlaying ? 'stop' : 'play'} size={24} color={colors.background} />
            </TouchableOpacity>
          </Animated.View>

          {/* Timer Button */}
          {showTimerButton && (
            <TouchableOpacity
              style={[styles.timerButton, dynamicStyles.timerButton]}
              onPress={onTimerPress}
              activeOpacity={0.8}
              accessibilityLabel={timerAccessibilityLabel}
            >
              <Ionicons
                name={isTimerActive ? 'timer' : 'timer-outline'}
                size={20}
                color={isTimerActive ? colors.warning : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    height: CARD_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },

  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },

  backgroundImageInner: {
    width: '100%',
    height: '100%',
  },

  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },

  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },

  articleImage: {
    width: '100%',
    height: '100%',
  },

  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },

  primaryInfo: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  title: {
    marginBottom: LAYOUT.SPACING.XTINY,
    letterSpacing: -0.2,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
  },

  author: {
    opacity: 0.9,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
  },

  progressSection: {
    gap: LAYOUT.SPACING.XTINY,
  },

  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.9,
  },

  progressBar: {
    height: 3,
    borderRadius: 2,
  },

  controls: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },

  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

NowPlayingCard.displayName = 'NowPlayingCard';

// Optimized export with custom memo comparison to prevent unnecessary re-renders
export default memo(NowPlayingCard, (prevProps, nextProps) => {
  // Critical props that always require re-render
  if (
    prevProps.isVisible !== nextProps.isVisible ||
    prevProps.isPlaying !== nextProps.isPlaying ||
    prevProps.article?.id !== nextProps.article?.id ||
    prevProps.isTimerActive !== nextProps.isTimerActive
  ) {
    return false;
  }

  // For progress and duration, only update if difference is significant (> 1%)
  const progressDiff = Math.abs((prevProps.progress || 0) - (nextProps.progress || 0));
  const durationDiff = Math.abs((prevProps.duration || 0) - (nextProps.duration || 0));

  if (progressDiff > (nextProps.progress || 0) * 0.01 || durationDiff > 1000) {
    return false;
  }

  // All other props are the same, skip re-render
  return true;
});
