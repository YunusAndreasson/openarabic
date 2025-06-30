import { Ionicons } from '@expo/vector-icons';
import { Portal } from '@gorhom/portal';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
import SleepTimer from '@/components/listen/SleepTimer';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useCurrentSentence } from '@/hooks/audio/useCurrentSentence';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { selectionFeedback } from '@/utils/haptics';

// Modal drag indicator component positioned over background image
const ModalDragIndicator = () => {
  return (
    <View style={styles.modalDragIndicator}>
      <View
        style={[
          styles.dragIndicatorBar,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.7)', // White with transparency for better visibility on images
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

  // State for sleep timer modal
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  // Get router params for article ID fallback and audio state
  const params = useLocalSearchParams<{
    articleId?: string;
    position?: string;
    duration?: string;
    audioState?: string;
  }>();

  // Audio player and sleep timer
  const audioPlayer = useSimpleAudioPlayer();
  const sleepTimer = useSleepTimer(() => {
    audioPlayer.stop();
  });

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

  // Audio-reactive gradient animation
  const gradientProgress = useSharedValue(0);
  const sentenceOpacity = useSharedValue(0);

  // Update gradient animation based on sentence progress
  useEffect(() => {
    gradientProgress.value = withTiming(sentenceProgress, {
      duration: TIMING_CONFIG.GENTLE.duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [sentenceProgress]);

  // Fade in/out sentence text
  useEffect(() => {
    sentenceOpacity.value = withTiming(currentSentence ? 1 : 0.3, {
      duration: TIMING_CONFIG.GENTLE.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [currentSentence]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(gradientProgress.value, [0, 0.5, 1], [1, 1.02, 1]);
    return { transform: [{ scale }] };
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

  const handleStop = async () => {
    selectionFeedback();
    await audioPlayer.stop();
    router.dismiss();
  };

  const handleTimerPress = () => {
    selectionFeedback();
    setShowSleepTimer(true);
  };

  const handleSleepTimerSet = (minutes: number) => {
    sleepTimer.actions.startTimer(minutes);
  };

  const handleSleepTimerCancel = () => {
    sleepTimer.actions.cancelTimer();
  };

  // Calculate sentence progress for display
  const sentenceProgressText =
    sortedSentences.length > 0
      ? `Sentence ${Math.max(0, currentSentenceIndex) + 1} of ${sortedSentences.length}`
      : '';

  // Stop audio when modal is dismissed (component unmounts)
  useEffect(() => {
    return () => {
      audioPlayer.stop();
    };
  }, []);

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
        <Animated.View style={[styles.gradientContainer, gradientAnimatedStyle]}>
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
          <ThemedText type="heading3" style={styles.title} numberOfLines={2}>
            {article?.title || 'Loading...'}
          </ThemedText>
          <ThemedText type="body" variant="secondary" style={styles.author}>
            {article?.author?.name || ''}
          </ThemedText>
        </View>
      </View>

      {/* Current Sentence Display with Progress */}
      <View style={styles.sentenceSection}>
        {sentenceProgressText && (
          <ThemedText type="caption" style={styles.progressText}>
            {sentenceProgressText}
          </ThemedText>
        )}

        <Animated.View style={[styles.sentenceContainer, sentenceAnimatedStyle]}>
          <ThemedText type="body" style={styles.englishText}>
            {currentSentence?.english || 'Playing audio...'}
          </ThemedText>
        </Animated.View>
      </View>

      {/* Audio Controls and Progress at Bottom */}
      <View
        style={[styles.bottomControlsContainer, { bottom: bottomPosition }]}
        // No ThemedView here to avoid background color
      >
        <View style={styles.bottomControls}>
          {/* Audio Progress */}
          <View style={styles.progressSection}>
            <AudioProgressIndicator
              position={position}
              duration={duration}
              progressPercentage={progressPercentage}
              progressBarHeight={LAYOUT.SPACING.TINY}
              progressBackgroundColor="rgba(255,255,255,0.3)"
              progressFillColor="white"
              useWhiteText={true}
            />
          </View>

          {/* Control Buttons */}
          <View style={styles.controlButtons}>
            {/* Timer Button */}
            <TouchableOpacity
              activeOpacity={LAYOUT.OPACITY.HOVER}
              style={[
                styles.controlButton,
                styles.timerButton,
                sleepTimer.state.isActive && styles.timerButtonActive,
              ]}
              onPress={handleTimerPress}
            >
              <Ionicons
                color={sleepTimer.state.isActive ? colors.background : 'white'}
                name={sleepTimer.state.isActive ? 'timer' : 'timer-outline'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              />
            </TouchableOpacity>

            {/* Stop Button */}
            <TouchableOpacity
              activeOpacity={LAYOUT.OPACITY.HOVER}
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStop}
            >
              <Ionicons color="white" name="stop" size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sleep Timer Modal */}
      <Portal hostName="root">
        <SleepTimer
          isActive={sleepTimer.state.isActive}
          isVisible={showSleepTimer}
          remainingTime={sleepTimer.state.remainingTime}
          onClose={() => setShowSleepTimer(false)}
          onTimerCancel={handleSleepTimerCancel}
          onTimerSet={handleSleepTimerSet}
        />
      </Portal>
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
    color: 'white',
    textAlign: 'center',
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY,
  },

  author: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.MICRO,
  },

  progressText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textShadowColor: 'rgba(0,0,0,0.3)',
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
    color: 'white',
    textAlign: 'center',
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE, // Smaller text size
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4, // Appropriate line height for smaller text
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.TINY,
  },

  bottomControlsContainer: {
    position: 'absolute',
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    // bottom position now handled dynamically
  },

  bottomControls: {
    // Remove box styling: no background, no border radius, just spacing
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  progressSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.LARGE,
  },

  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BUTTON.HEIGHT.LARGE / 2,
  },

  stopButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },

  timerButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },

  timerButtonActive: {
    backgroundColor: 'rgba(255,193,7,0.9)', // Warning color with transparency
  },

  modalDragIndicator: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL, // Position from top edge
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY, // Ensure it's above the background content
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.TINY,
  },

  dragIndicatorBar: {
    width: LAYOUT.SPACING.XXXLARGE, // 48px for better visibility
    height: LAYOUT.SPACING.TINY, // 4px height
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
});
