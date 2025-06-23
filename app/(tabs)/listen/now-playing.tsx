import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioProgressIndicator from '@/components/AudioProgressIndicator';
import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useCurrentSentence } from '@/hooks/audio/useCurrentSentence';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

export default function NowPlayingModal() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDarkMode = !colors['surface'];

  // Get router params for article ID fallback and audio state
  const params = useLocalSearchParams<{
    articleId?: string;
    playingArticleId?: string;
    position?: string;
    duration?: string;
    audioState?: string;
  }>();

  // Use audio data from params (from currently playing audio) or fallback to useAudioPlayer
  const audioPlayerData = useAudioPlayer();

  // Track progress with our own timer when audio is playing
  const [simulatedPosition, setSimulatedPosition] = useState<number>(0);

  useEffect(() => {
    // Use either live audio player state OR navigation params to determine if playing
    const isPlaying = audioPlayerData.audioState === 'playing' || params.audioState === 'playing';

    if (isPlaying) {
      // Get starting position from params if available
      const startPosition = params.position
        ? parseFloat(params.position) / 1000 // Convert ms to seconds
        : audioPlayerData.position || 0;

      // Set initial position
      setSimulatedPosition(startPosition);

      const interval = setInterval(() => {
        setSimulatedPosition(prev => prev + 0.1); // Add 100ms (0.1 seconds) each tick
      }, 100); // Update every 100ms

      return () => clearInterval(interval);
    }

    // Return empty cleanup function when not playing
    return () => {};
  }, [audioPlayerData.audioState, params.audioState]); // Check both audio states

  const position = useMemo(() => {
    // Use simulated position when available and positive
    if (simulatedPosition > 0) {
      return simulatedPosition;
    }
    // Fallback to audio player data
    if (audioPlayerData.position !== undefined) {
      return audioPlayerData.position;
    }
    // Fallback to params (passed from currently playing audio)
    if (params.position) {
      const parsed = parseFloat(params.position) / 1000; // Convert back to seconds
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }, [simulatedPosition, audioPlayerData.position, params.position]);

  const duration = useMemo(() => {
    // Fallback to audio player data
    if (audioPlayerData.duration !== undefined && audioPlayerData.duration > 0) {
      return audioPlayerData.duration;
    }
    // Fallback to params (passed from currently playing audio)
    if (params.duration) {
      const parsed = parseFloat(params.duration) / 1000; // Convert back to seconds
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }, [params.duration, audioPlayerData.duration]);

  const metadata = audioPlayerData.metadata;

  const articleId = useMemo(() => {
    // First try to get from audio player metadata (currently playing)
    if (metadata.articleId) {
      const parsed = parseInt(metadata.articleId, 10);
      if (!isNaN(parsed)) return parsed;
    }

    // Fallback to router params (when modal opened from UI)
    if (params.articleId) {
      const parsed = parseInt(params.articleId, 10);
      if (!isNaN(parsed)) return parsed;
    }

    return undefined;
  }, [metadata.articleId, params.articleId]);

  const { article, sortedSentences, sentenceWordsMap } = useArticleData(articleId, user?.id);

  const { currentSentence, sentenceProgress } = useCurrentSentence({
    position,
    sentences: sortedSentences,
    sentenceWordsMap,
  });

  // Audio-reactive gradient animation
  const gradientProgress = useSharedValue(0);
  const sentenceOpacity = useSharedValue(0);

  // Update gradient animation based on sentence progress
  useEffect(() => {
    gradientProgress.value = withTiming(sentenceProgress, {
      duration: TIMING_CONFIG.GENTLE.duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [sentenceProgress, gradientProgress]);

  // Fade in/out sentence text
  useEffect(() => {
    if (currentSentence) {
      sentenceOpacity.value = withTiming(1, {
        duration: TIMING_CONFIG.GENTLE.duration,
        easing: Easing.out(Easing.quad),
      });
    } else {
      sentenceOpacity.value = withTiming(0.3, {
        duration: TIMING_CONFIG.GENTLE.duration,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [currentSentence, sentenceOpacity]);

  // Calculate progress percentage for the progress bar
  const progressPercentage = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    const progress = Math.max(0, Math.min(100, ((position || 0) / duration) * 100));
    return progress;
  }, [position, duration]);

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    // Remove rotation to fix tilted overlay, keep subtle scale animation
    const scale = interpolate(gradientProgress.value, [0, 0.5, 1], [1, 1.02, 1]);

    return {
      transform: [{ scale }],
    };
  });

  const sentenceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sentenceOpacity.value,
  }));

  const gradientColors = useMemo(() => {
    const baseColor = isDarkMode ? colors.background : colors.elevation1;
    return [
      withOpacity(baseColor, 0.75),
      withOpacity(baseColor, 0.85),
      withOpacity(baseColor, 0.95),
    ] as const;
  }, [colors.background, colors.elevation1, isDarkMode]);

  // Show error only if no article at all - allow missing current sentence
  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={[styles.header, { paddingTop: insets.top + LAYOUT.SPACING.MEDIUM }]}>
          <View style={styles.modalHandle} />
        </View>
        <View style={styles.centerContent}>
          <ThemedText type="body" variant="secondary">
            {STRINGS.LOADING}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <EnhancedImage
          source={String(article.image_url)}
          style={styles.backgroundImage}
          contentFit="cover"
        />

        {/* Audio-Reactive Gradient Overlay */}
        <Animated.View style={[styles.gradientContainer, gradientAnimatedStyle]}>
          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>

      {/* Header with Title and Author */}
      <View style={[styles.header, { paddingTop: insets.top + LAYOUT.SPACING.MEDIUM }]}>
        {/* Modal Handle */}
        <View style={styles.modalHandle} />

        <View style={styles.headerInfo}>
          <ThemedText type="heading3" style={styles.title} numberOfLines={2}>
            {article.title}
          </ThemedText>
          <ThemedText type="body" variant="secondary" style={styles.author}>
            {article.author?.name}
          </ThemedText>
        </View>
      </View>

      {/* Current Sentence Display */}
      <View style={styles.centerContent}>
        {currentSentence ? (
          <Animated.View style={[styles.sentenceContainer, sentenceAnimatedStyle]}>
            <ThemedText type="heading1" style={styles.englishText}>
              {currentSentence.english}
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.sentenceContainer, sentenceAnimatedStyle]}>
            <ThemedText type="heading1" style={styles.englishText}>
              {sortedSentences.length > 0
                ? STRINGS.LOADING
                : 'Start playing an article to see synchronized text'}
            </ThemedText>
          </Animated.View>
        )}
      </View>

      {/* Audio Progress at Bottom - positioned absolutely */}
      <View
        style={[
          styles.bottomProgress,
          { bottom: insets.bottom + LAYOUT.SPACING.XXXLARGE + LAYOUT.SPACING.MEDIUM },
        ]}
      >
        <AudioProgressIndicator
          position={position || 0}
          duration={duration || 0}
          progressPercentage={progressPercentage}
          progressBarHeight={4}
          progressBackgroundColor="rgba(255,255,255,0.3)"
          progressFillColor="white"
          useWhiteText={true}
        />
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
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: 10,
  },

  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  headerInfo: {
    alignItems: 'center',
    width: '100%',
  },

  title: {
    color: 'white',
    textAlign: 'right',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  author: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
    marginTop: LAYOUT.SPACING.TINY,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING * 1.5,
  },

  sentenceContainer: {
    alignItems: 'center',
    maxWidth: '100%',
  },

  englishText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bottomProgress: {
    position: 'absolute',
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    height: 70, // Proper height for progress section
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent dark background
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});
