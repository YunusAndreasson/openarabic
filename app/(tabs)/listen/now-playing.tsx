// Placeholder to keep route valid after removing app/NowPlaying.tsx
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioProgressIndicator from '@listen/AudioProgressIndicator';

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
import type { Article } from '@/types/articles.types';
import type { ReadingListItem } from '@/types/readingList.types';
import { withOpacity } from '@/utils/colorUtils';
import { createAudioOverlayColors, createAudioOverlayGradient } from '@/utils/gradientUtils';

const ModalDragIndicator = () => {
  const colors = useColors();
  return (
    <View style={styles.modalDragIndicator}>
      <View
        style={[
          styles.dragIndicatorBar,
          {
            backgroundColor: withOpacity(colors.white, 0.7),
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
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{
    articleId?: string;
    position?: string;
    duration?: string;
    audioState?: string;
  }>();

  const audioPlayer = useSimpleAudioPlayer();

  const position = useMemo(() => {
    if (params.position) {
      return parseFloat(params.position) / 1000;
    }
    return audioPlayer.currentTime || 0;
  }, [audioPlayer.currentTime, params.position]);

  const duration = useMemo(() => {
    if (params.duration) {
      return parseFloat(params.duration) / 1000;
    }
    return audioPlayer.duration || 0;
  }, [audioPlayer.duration, params.duration]);

  const articleId = audioPlayer.currentTrack?.articleId
    ? parseInt(audioPlayer.currentTrack.articleId.toString(), 10)
    : params.articleId
    ? parseInt(params.articleId, 10)
    : undefined;

  const { article, sortedSentences, sentenceWordsMap } = useArticleData(articleId, user?.id);
  const cachedArticle = useMemo(() => {
    if (!articleId) return null;
    return queryClient.getQueryData<Article>(['article', articleId]) ?? null;
  }, [queryClient, articleId]);

  const readingListArticle = useMemo(() => {
    if (!user?.id || !articleId) return null;
    const rl = queryClient.getQueryData<ReadingListItem[]>(['readingList', user.id]);
    const match = rl?.find(item => item.article_id === articleId);
    return match?.articles ?? null;
  }, [queryClient, user?.id, articleId]);

  const backgroundImageUrl = useMemo(() => {
    return String(article?.image_url || cachedArticle?.image_url || readingListArticle?.image_url);
  }, [article?.image_url, cachedArticle?.image_url, readingListArticle?.image_url]);

  const fallbackTitle = useMemo(() => {
    return (
      article?.title || cachedArticle?.title || audioPlayer.currentTrack?.title || STRINGS.LOADING
    );
  }, [article?.title, cachedArticle?.title, audioPlayer.currentTrack?.title]);

  const fallbackAuthor = useMemo(() => {
    return article?.author?.name || cachedArticle?.author?.name || readingListArticle?.author?.name;
  }, [article?.author?.name, cachedArticle?.author?.name, readingListArticle?.author?.name]);

  const { currentSentence, currentSentenceIndex, sentenceProgress } = useCurrentSentence({
    position,
    sentences: sortedSentences,
    sentenceWordsMap,
  });

  const bottomPosition = useMemo(() => {
    return Math.max(insets.bottom + LAYOUT.SPACING.SMALL, LAYOUT.SPACING.LARGE);
  }, [insets.bottom]);

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

  useEffect(() => {
    const scaleValue = sentenceProgress === 0 ? 1 : 1 + sentenceProgress * 0.02;
    gradientAnimation.setValue(scaleValue);
  }, [sentenceProgress, gradientAnimation]);

  useEffect(() => {
    if (currentSentence) {
      sentenceAnimation.fadeIn();
    } else {
      sentenceAnimation.setOpacity(0.3);
    }
  }, [currentSentence, sentenceAnimation]);

  const progressPercentage = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const gradientColors = useMemo(() => {
    return createAudioOverlayGradient(colors.shadow);
  }, [colors.shadow]);

  const overlayColors = useMemo(() => {
    return createAudioOverlayColors(colors);
  }, [colors]);

  const sentenceProgressText =
    sortedSentences.length > 0
      ? `Sentence ${Math.max(0, currentSentenceIndex) + 1} of ${sortedSentences.length}`
      : '';

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

  const headerStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top + LAYOUT.SPACING.MEDIUM }],
    [insets.top]
  );

  const bottomControlsStyle = useMemo(
    () => [styles.bottomControlsContainer, { bottom: bottomPosition }],
    [bottomPosition]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <EnhancedImage
          source={backgroundImageUrl}
          style={styles.backgroundImage}
          contentFit="cover"
          priority="high"
        />
        <Animated.View style={[styles.gradientContainer, gradientAnimation.animatedStyle]}>
          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>

      <ModalDragIndicator />

      <View style={headerStyle}>
        <View style={styles.headerInfo}>
          <ThemedText
            type="heading3"
            style={[
              styles.title,
              { color: overlayColors.textPrimary, textShadowColor: colors.textShadowDark },
            ]}
            numberOfLines={2}
          >
            {isActuallyLoading ? STRINGS.PREPARING_AUDIO : fallbackTitle}
          </ThemedText>
          <ThemedText
            type="body"
            variant="secondary"
            style={[
              styles.author,
              { color: overlayColors.textSecondary, textShadowColor: colors.textShadowDark },
            ]}
          >
            {fallbackAuthor}
          </ThemedText>
        </View>
      </View>

      <View style={styles.sentenceSection}>
        {sentenceProgressText && (
          <ThemedText
            type="caption"
            style={[
              styles.progressText,
              { color: overlayColors.textTertiary, textShadowColor: colors.textShadowDark },
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

      <View style={bottomControlsStyle}>
        <View style={styles.bottomControls}>
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
  container: { flex: 1 },
  backgroundContainer: { ...StyleSheet.absoluteFillObject },
  backgroundImage: { width: '100%', height: '100%' },
  gradientContainer: { ...StyleSheet.absoluteFillObject },
  gradient: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  headerInfo: { alignItems: 'center', maxWidth: '90%' },
  title: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.TINY, // ~4
  },
  author: {
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY,
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY, // ~2
  },
  progressText: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY, // ~2
  },
  sentenceSection: {
    paddingTop: LAYOUT.SPACING.XXXLARGE * 2,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING * 1.5,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  sentenceContainer: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  englishText: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.TINY, // ~4
  },
  bottomControlsContainer: {
    position: 'absolute',
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
  },
  bottomControls: { paddingHorizontal: 0, paddingVertical: 0 },
  progressSection: { marginBottom: LAYOUT.SPACING.MEDIUM },
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
