import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';
import { selectionFeedback } from '@/utils/haptics';

export default function NowPlayingModal() {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const audioPlayer = useAudioPlayer();
  const { position, metadata, audioState } = audioPlayer;

  const articleId = useMemo(() => {
    if (!metadata.articleId) return undefined;
    const parsed = parseInt(metadata.articleId, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [metadata.articleId]);

  const { article, sortedSentences, sentenceWordsMap } = useArticleData(articleId, user?.id);

  const { currentSentence, sentenceProgress } = useCurrentSentence({
    position,
    sentences: sortedSentences,
    sentenceWordsMap,
  });

  // Debug logging
  useEffect(() => {
    console.log('🎵 Now Playing Modal Debug:', {
      articleId,
      hasArticle: !!article,
      articleTitle: article?.title,
      position,
      audioState,
      sentencesCount: sortedSentences.length,
      sentenceWordsMapSize: sentenceWordsMap.size,
      currentSentence: currentSentence
        ? {
            id: currentSentence.id,
            english: currentSentence.english.substring(0, 50) + '...',
            arabic: currentSentence.arabic.substring(0, 20) + '...',
          }
        : null,
    });
  }, [
    articleId,
    article,
    position,
    audioState,
    sortedSentences.length,
    sentenceWordsMap.size,
    currentSentence,
  ]);

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

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(gradientProgress.value, [0, 1], [0, 45]);

    const scale = interpolate(gradientProgress.value, [0, 0.5, 1], [1, 1.05, 1]);

    return {
      transform: [{ rotate: `${rotation}deg` }, { scale }],
    };
  });

  const sentenceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sentenceOpacity.value,
  }));

  const handleClose = useCallback(() => {
    selectionFeedback();
    router.back();
  }, []);

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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <ThemedText type="body" style={styles.closeText}>
              {STRINGS.CLOSE}
            </ThemedText>
          </TouchableOpacity>
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
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <ThemedText type="body" style={styles.closeText}>
            {STRINGS.CLOSE}
          </ThemedText>
        </TouchableOpacity>

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
            <ThemedText type="heading1" style={styles.englishText} numberOfLines={4}>
              {currentSentence.english}
            </ThemedText>

            <View style={styles.arabicContainer}>
              <ThemedText
                type="body"
                variant="secondary"
                style={styles.arabicText}
                numberOfLines={3}
              >
                {currentSentence.arabic}
              </ThemedText>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.sentenceContainer, sentenceAnimatedStyle]}>
            <ThemedText type="heading1" style={styles.englishText} numberOfLines={4}>
              {STRINGS.LOADING}
            </ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.arabicText}>
              Position: {position.toFixed(1)}s
            </ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.arabicText}>
              Sentences: {sortedSentences.length} | Audio: {audioState}
            </ThemedText>
          </Animated.View>
        )}
      </View>

      {/* Bottom Safe Area */}
      <View style={{ height: insets.bottom }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: 10,
  },

  closeButton: {
    padding: LAYOUT.SPACING.SMALL,
  },

  closeText: {
    color: 'white',
    fontWeight: '600',
  },

  headerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: LAYOUT.SPACING.LARGE,
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

  arabicContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },

  arabicText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
