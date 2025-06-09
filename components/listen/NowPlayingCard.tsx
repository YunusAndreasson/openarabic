import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
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

import { EnhancedImage } from '@/components/EnhancedImage';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { Article } from '@/types/articles.types';
import { withOpacity } from '@/utils/colorUtils';

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
  /** Current article being played */
  article: Article | null;
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
  const handleStopPress = useCallback(() => {
    // Run animation on UI thread for maximum smoothness
    runOnUI(() => {
      'worklet';
      // Immediate visual feedback - scale down and up
      buttonScale.value = withTiming(0.85, { duration: 100 }, () => {
        buttonScale.value = withSpring(1, BUTTON_SPRING_CONFIG);
      });
    })();

    // Call the actual handler
    onStop?.();
  }, [onStop, buttonScale]);

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
        ...LAYOUT.SHADOW.SMALL,
        backgroundColor: isDarkMode ? colors.elevation2 : colors.card,
        borderColor: isDarkMode ? colors.border : colors.cardBorder,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
      },
      stopButton: {
        ...LAYOUT.SHADOW.SUBTLE,
        backgroundColor: colors.tint,
        shadowColor: colors.tint,
      },
      timerButton: {
        backgroundColor: isTimerActive
          ? colors.warning + '20' // Transparent warning color when active
          : colors.buttonOverlay, // Better contrast when inactive
        borderColor: isTimerActive ? colors.warning : colors.border,
        borderWidth: 1,
      },
    }),
    [colors, isDarkMode, isTimerActive]
  );

  // Optimized time calculations with stable dependencies
  const timeCalculations = useMemo(() => {
    // Ensure progress and duration are valid numbers
    const safeProgress = progress && isFinite(progress) ? progress : 0;
    const safeDuration = duration && isFinite(duration) ? duration : 0;

    // Both progress and duration should be in milliseconds for consistency
    const currentSeconds = safeProgress / 1000;
    const totalSeconds = safeDuration / 1000;

    // Calculate progress percentage for the progress bar (0-100)
    const percentage = safeDuration > 0 ? (safeProgress / safeDuration) * 100 : 0;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    // Format time inline to avoid dependency issues with reanimated
    const formatTime = (seconds: number): string => {
      if (!seconds || !isFinite(seconds) || isNaN(seconds) || seconds < 0) {
        return '0:00';
      }
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
      currentTime: formatTime(currentSeconds),
      totalTime: formatTime(totalSeconds),
      progressPercentage: clampedPercentage,
    };
  }, [progress, duration]);

  if (!article) return null;

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
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              activeOpacity={0.8}
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
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
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
    marginBottom: LAYOUT.SPACING.SMALL,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: 48,
    justifyContent: 'center',
    width: 48,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: LAYOUT.SPACING.TINY,
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
  const progressDiff = Math.abs((prevProps.progress || 0) - (nextProps.progress || 0));
  const durationDiff = Math.abs((prevProps.duration || 0) - (nextProps.duration || 0));

  if (progressDiff > (nextProps.progress || 0) * 0.01 || durationDiff > 1000) {
    return false;
  }

  // All other props are the same, skip re-render
  return true;
};

// Optimized export with custom memo comparison
export default memo(NowPlayingCard, arePropsEqual);
