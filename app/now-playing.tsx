import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioProgressIndicator from '@/components/AudioProgressIndicator';
import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useCurrentSentence } from '@/hooks/audio/useCurrentSentence';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

// Modal drag indicator component positioned over background image
const ModalDragIndicator = ({ colors }: { colors: ReturnType<typeof useColors> }) => {
  return (
    <View style={styles.modalDragIndicator}>
      <View
        style={[
          styles.dragIndicatorBar,
          {
            backgroundColor: withOpacity(colors.white, 0.7), // Use theme-aware white with opacity
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
  const isDarkMode = !colors['surface'];

  // Get router params for article ID fallback and audio state
  const params = useLocalSearchParams<{
    articleId?: string;
    position?: string;
    duration?: string;
    audioState?: string;
  }>();

  // Audio player
  const audioPlayer = useSimpleAudioPlayer();

  // Track progress with our own timer when audio is playing
  const [simulatedPosition, setSimulatedPosition] = useState<number>(0);

  useEffect(() => {
    const isPlaying = audioPlayer.audioState === 'playing' || params.audioState === 'playing';

    if (isPlaying) {
      const startPosition = params.position
        ? parseFloat(params.position) / 1000
        : audioPlayer.position || 0;

      setSimulatedPosition(startPosition);

      const interval = setInterval(() => {
        setSimulatedPosition(prev => prev + 0.1);
      }, 100);

      return () => clearInterval(interval);
    }

    return () => {};
  }, [audioPlayer.audioState, params.audioState, params.position, audioPlayer.position]);

  // Simplified data calculations - audio is guaranteed to be available
  const position =
    simulatedPosition > 0
      ? simulatedPosition
      : audioPlayer.position || (params.position ? parseFloat(params.position) / 1000 : 0);

  const duration =
    audioPlayer.duration || (params.duration ? parseFloat(params.duration) / 1000 : 0);

  const articleId = audioPlayer.metadata.articleId
    ? parseInt(audioPlayer.metadata.articleId, 10)
    : params.articleId
    ? parseInt(params.articleId, 10)
    : 0;

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

  // Enhanced gradient system using design colors
  const gradientColors = useMemo(() => {
    const baseColor = isDarkMode ? colors.background : colors.elevation1;
    return [
      withOpacity(baseColor, 0.75),
      withOpacity(baseColor, 0.85),
      withOpacity(baseColor, 0.95),
    ] as const;
  }, [colors.background, colors.elevation1, isDarkMode]);

  // Semantic overlay colors following design system
  const overlayColors = useMemo(
    () => ({
      controlBackground: withOpacity(colors.white, 0.28), // Using opacity.selection for interactive elements
      progressBackground: withOpacity(colors.white, 0.15), // Using opacity.border for tracks
      dragIndicator: withOpacity(colors.white, 0.68), // Using opacity.backdrop for visibility
      timerActive: withOpacity(colors.warning, 0.92), // Using opacity.modal for strong states
    }),
    [colors.white, colors.warning]
  );

  // Calculate sentence progress for display
  const sentenceProgressText =
    sortedSentences.length > 0
      ? `Sentence ${Math.max(0, currentSentenceIndex) + 1} of ${sortedSentences.length}`
      : '';

  // Determine if we're actually loading (more reliable)
  const isActuallyLoading = useMemo(() => {
    const hasValidAudio = duration > 0 || position > 0 || audioPlayer.audioState === 'playing';
    const hasValidMetadata = !!audioPlayer.metadata.articleId;
    return audioPlayer.isLoading && !hasValidAudio && !hasValidMetadata;
  }, [
    audioPlayer.isLoading,
    duration,
    position,
    audioPlayer.audioState,
    audioPlayer.metadata.articleId,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <EnhancedImage
          source={String(article?.image_url || '')}
          style={styles.backgroundImage}
          contentFit="cover"
        />

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
      <ModalDragIndicator colors={colors} />

      {/* Header with Title and Author */}
      <View style={[styles.header, { paddingTop: insets.top + LAYOUT.SPACING.MEDIUM }]}>
        <View style={styles.headerInfo}>
          <ThemedText
            type="heading3"
            style={[styles.title, { color: colors.white }]}
            numberOfLines={2}
          >
            {isActuallyLoading ? 'Preparing audio...' : article?.title || 'Loading article...'}
          </ThemedText>
          <ThemedText
            type="body"
            variant="secondary"
            style={[styles.author, { color: withOpacity(colors.white, 0.85) }]}
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
            style={[styles.progressText, { color: withOpacity(colors.white, 0.75) }]}
          >
            {sentenceProgressText}
          </ThemedText>
        )}

        <Animated.View style={[styles.sentenceContainer, sentenceAnimation.animatedStyle]}>
          <ThemedText type="body" style={[styles.englishText, { color: colors.white }]}>
            {isActuallyLoading
              ? 'Preparing audio...'
              : currentSentence?.english || 'Listening to audio...'}
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
              progressFillColor={colors.white}
              useWhiteText={true}
            />
          </View>
        </View>
      </View>
    </View>
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
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY,
  },

  author: {
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY,
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.MICRO,
  },

  progressText: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY,
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
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.TINY,
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
