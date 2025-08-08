import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioProgressIndicator from '@/components/AudioProgressIndicator';
import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useCurrentSentence } from '@/hooks/audio/useCurrentSentence';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { createAudioOverlayColors, createAudioOverlayGradient } from '@/utils/gradientUtils';

// Modal drag indicator component positioned over background image
const ModalDragIndicator = () => {
  const colors = useColors();
  return (
    <View style={styles.modalDragIndicator}>
      <View
        style={[
          styles.dragIndicatorBar,
          {
            backgroundColor: withOpacity(colors.white, 0.7), // Use theme-aware white for visibility
          },
        ]}
      />
    </View>
  );
};

export default function NowPlayingModal() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Get router params for article ID fallback and audio state
  const params = useLocalSearchParams<{
    articleId?: string;
    position?: string;
    duration?: string;
    audioState?: string;
  }>();

  // Audio player
  const audioPlayer = useSimpleAudioPlayer();

  // Get current position from audio player or params
  const position = useMemo(() => {
    if (params.position) {
      return parseFloat(params.position) / 1000; // Convert ms to seconds
    }
    return audioPlayer.currentTime || 0;
  }, [audioPlayer.currentTime, params.position]);

  // Get duration from audio player or params
  const duration = useMemo(() => {
    if (params.duration) {
      return parseFloat(params.duration) / 1000; // Convert ms to seconds
    }
    return audioPlayer.duration || 0;
  }, [audioPlayer.duration, params.duration]);

  // Get article ID from audio player or params
  const articleId = audioPlayer.currentTrack?.articleId
    ? parseInt(audioPlayer.currentTrack.articleId.toString(), 10)
    : params.articleId
    ? parseInt(params.articleId, 10)
    : undefined;

  const { article, sortedSentences, sentenceWordsMap } = useArticleData(articleId, user?.id);

  const { currentSentence, currentSentenceIndex, sentenceProgress } = useCurrentSentence({
    position,
    sentences: sortedSentences,
    sentenceWordsMap,
  });

  // Calculate bottom position with safe area
  const bottomPosition = useMemo(() => {
    return Math.max(insets.bottom + LAYOUT.SPACING.SMALL, LAYOUT.SPACING.LARGE);
  }, [insets.bottom]);

  // Optimized animations using hooks
  const gradientAnimation = useTransformAnimation({
    type: 'scale',
    initialValue: 1,
    targetValue: 1.02,
    duration: TIMING_CONFIG.GENTLE.duration,
    useSpring: false,
  });

  const sentenceAnimation = useOpacityAnimation({
    initialOpacity: 0.3,
    duration: TIMING_CONFIG.GENTLE.duration,
    autoStart: false,
  });

  // Update gradient animation based on sentence progress
  useEffect(() => {
    // Interpolate sentence progress to scale animation
    const scaleValue = sentenceProgress === 0 ? 1 : 1 + sentenceProgress * 0.02;
    gradientAnimation.setValue(scaleValue);
  }, [sentenceProgress, gradientAnimation]);

  // Fade in/out sentence text
  useEffect(() => {
    if (currentSentence) {
      sentenceAnimation.fadeIn();
    } else {
      sentenceAnimation.setOpacity(0.3);
    }
  }, [currentSentence, sentenceAnimation]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  // Enhanced gradient system using proper dark overlay for text contrast
  const gradientColors = useMemo(() => {
    return createAudioOverlayGradient(colors.shadow);
  }, [colors.shadow]);

  // Semantic overlay colors following design system
  const overlayColors = useMemo(() => {
    return createAudioOverlayColors(colors);
  }, [colors]);

  // Calculate sentence progress for display
  const sentenceProgressText =
    sortedSentences.length > 0
      ? `Sentence ${Math.max(0, currentSentenceIndex) + 1} of ${sortedSentences.length}`
      : '';

  // Determine if we're actually loading (more reliable)
  const isActuallyLoading = useMemo(() => {
    const hasValidAudio = duration > 0 || position > 0 || audioPlayer.isPlaying;
    const hasValidMetadata = !!audioPlayer.currentTrack?.articleId;
    return audioPlayer.isLoading && !hasValidAudio && !hasValidMetadata;
  }, [
    audioPlayer.isLoading,
    duration,
    position,
    audioPlayer.isPlaying,
    audioPlayer.currentTrack?.articleId,
  ]);

  return (
    <ThemedView style={styles.container}>
      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <EnhancedImage source={String(article?.image_url || '')} style={styles.backgroundImage} />

        {/* Audio-Reactive Gradient Overlay */}
        <Animated.View style={[styles.gradientContainer, gradientAnimation.animatedStyle]}>
          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>

      {/* Modal drag indicator */}
      <ModalDragIndicator />

      {/* Header with Title and Author */}
      <View style={[styles.header, { paddingTop: insets.top + LAYOUT.SPACING.MEDIUM }]}>
        <View style={styles.headerInfo}>
          <ThemedText
            type="heading3"
            style={[
              styles.title,
              {
                color: overlayColors.textPrimary,
                textShadowColor: colors.textShadowDark,
              },
            ]}
            numberOfLines={2}
          >
            {isActuallyLoading ? STRINGS.PREPARING_AUDIO : article?.title || STRINGS.LOADING}
          </ThemedText>
          <ThemedText
            type="body"
            variant="secondary"
            style={[
              styles.author,
              {
                color: overlayColors.textSecondary,
                textShadowColor: colors.textShadowDark,
              },
            ]}
          >
            {article?.author?.name || ''}
          </ThemedText>
        </View>
      </View>

      {/* Current Sentence Display with Progress */}
      <View style={styles.sentenceSection}>
        {sentenceProgressText && (
          <ThemedText
            type="caption"
            style={[
              styles.progressText,
              {
                color: overlayColors.textTertiary,
                textShadowColor: colors.textShadowDark,
              },
            ]}
          >
            {sentenceProgressText}
          </ThemedText>
        )}

        <Animated.View style={[styles.sentenceContainer, sentenceAnimation.animatedStyle]}>
          <ThemedText
            type="body"
            style={[
              styles.englishText,
              { color: overlayColors.textPrimary, textShadowColor: colors.textShadowDark },
            ]}
          >
            {isActuallyLoading
              ? STRINGS.PREPARING_AUDIO
              : currentSentence?.english || STRINGS.LOADING}
          </ThemedText>
        </Animated.View>
      </View>

      {/* Audio Controls and Progress at Bottom */}
      <View style={[styles.bottomControlsContainer, { bottom: bottomPosition }]}>
        <View style={styles.bottomControls}>
          {/* Audio Progress */}
          <View style={styles.progressSection}>
            <AudioProgressIndicator
              position={position}
              duration={duration}
              progressPercentage={progressPercentage}
              progressBarHeight={LAYOUT.SPACING.TINY}
              progressBackgroundColor={overlayColors.progressBackground}
              progressFillColor={overlayColors.textPrimary}
              useWhiteText={true}
            />
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  backgroundImage: {
    width: '100%',
    height: '100%',
  },

  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  gradient: {
    flex: 1,
  },

  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },

  headerInfo: {
    alignItems: 'center',
    maxWidth: '90%',
  },

  title: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  author: {
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  progressText: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  sentenceSection: {
    paddingTop: LAYOUT.SPACING.XXXLARGE * 2, // Large gap below header
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING * 1.5,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  sentenceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  englishText: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bottomControlsContainer: {
    position: 'absolute',
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
  },

  bottomControls: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  progressSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  modalDragIndicator: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.TINY,
  },

  dragIndicatorBar: {
    width: LAYOUT.SPACING.XXXLARGE,
    height: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
});
