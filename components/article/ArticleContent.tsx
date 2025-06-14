import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import React, { useMemo, useCallback } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import ParallaxHeader from '@/components/article/ParallaxHeader';
import { useToast } from '@/components/providers/ToastProvider';
import { AUDIO_STATES } from '@/constants/audio';
import { LAYOUT } from '@/constants/layout';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    height: '100%',
  },
  audioControlsContainer: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  playNowButton: {
    flex: 1,
  },
  listenLaterButton: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    marginTop: -LAYOUT.SPACING.XXLARGE * 1.5,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    zIndex: 10,
  },
  summaryCard: {
    elevation: 4, // LAYOUT.ELEVATION.SMALL equivalent
    shadowOpacity: 0.25, // LAYOUT.ELEVATION.SMALL equivalent
    shadowRadius: 6, // LAYOUT.ELEVATION.SMALL equivalent
    shadowOffset: { width: 0, height: 2 }, // LAYOUT.ELEVATION.SMALL equivalent
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
    borderWidth: 1,
    opacity: LAYOUT.OPACITY.HOVER,
  },
  summaryLabel: {
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.HOVER,
  },
  summaryText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.7,
  },
});

interface AudioControlsButtonProps {
  articleId: number;
  article: Article;
  isInReadingList: boolean;
  isLoading: boolean;
  onToggleReadingList: (articleId: number, isInReadingList: boolean) => void;
}

const AudioControlsButton = React.memo<AudioControlsButtonProps>(
  ({ articleId, article, isInReadingList, isLoading, onToggleReadingList }) => {
    const { showToast } = useToast();
    const audioPlayer = useAudioPlayer();
    const { audioState } = audioPlayer;
    const [isPlayNowLoading, setIsPlayNowLoading] = React.useState(false);

    const isCurrentlyPlaying = audioState === AUDIO_STATES.PLAYING;
    const hasAudio = useMemo(() => !!article.audio_url, [article.audio_url]);

    // Combined loading state for optimal UX - instant local feedback + ongoing audio feedback
    const isPlayButtonLoading = isPlayNowLoading || audioState === AUDIO_STATES.LOADING;

    const handlePlayToggle = useCallback(async () => {
      if (isCurrentlyPlaying) {
        // Stop playback
        lightFeedback();
        await audioPlayer.actions.stopPlayback();
        return;
      }

      // Start playback
      if (!hasAudio) {
        showToast('Audio not available for this article', 3000, 'error');
        return;
      }

      try {
        setIsPlayNowLoading(true);
        lightFeedback();

        // Generate enhanced audio track for this article
        const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);

        if (!track) {
          showToast('Failed to prepare audio', 3000, 'error');
          return;
        }

        // Start playback with single track - audio loading state will now provide feedback
        const success = await audioPlayer.actions.startEnhancedPlayback([track], 0);

        if (!success) {
          showToast('Failed to start playback', 3000, 'error');
        }
      } catch (error) {
        handleError(error as Error, { showToast: false });
        showToast('Failed to start playback', 3000, 'error');
      } finally {
        setIsPlayNowLoading(false);
      }
    }, [isCurrentlyPlaying, hasAudio, audioPlayer.actions, articleId, showToast]);

    const handleListenLater = useCallback(() => {
      lightFeedback();
      onToggleReadingList(articleId, isInReadingList);

      // Show toast message
      if (isInReadingList) {
        showToast('Removed from listening list', 3000, 'success');
      } else {
        showToast('Added to listening list', 3000, 'success');
      }
    }, [articleId, isInReadingList, onToggleReadingList, showToast]);

    return (
      <View style={styles.audioControlsContainer}>
        {/* Play/Stop Button */}
        <ThemedButton
          variant="filled"
          title={isCurrentlyPlaying ? 'STOP' : 'PLAY NOW'}
          size="medium"
          loading={isPlayButtonLoading}
          disabled={(!hasAudio && !isCurrentlyPlaying) || isPlayButtonLoading}
          onPress={handlePlayToggle}
          style={styles.playNowButton}
          testID="play-now-button"
        />

        {/* Listen Later Button */}
        <ThemedButton
          variant={isInReadingList ? 'outlined' : 'outlined'}
          title={isInReadingList ? 'REMOVE' : 'LISTEN LATER'}
          size="medium"
          loading={isLoading}
          disabled={isLoading}
          onPress={handleListenLater}
          style={styles.listenLaterButton}
          testID="listen-later-button"
        />
      </View>
    );
  }
);
AudioControlsButton.displayName = 'AudioControlsButton';

interface ArticleSummaryProps {
  summary: string;
}

const ArticleSummary = React.memo<ArticleSummaryProps>(({ summary }) => {
  const colors = useColors();

  return (
    <View style={styles.summaryContainer}>
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.background, // Use main background for clean, prominent look
            borderColor: colors.border,
          },
        ]}
      >
        <ThemedText type="label" variant="secondary" style={styles.summaryLabel}>
          Summary
        </ThemedText>
        <ThemedText type="body" style={styles.summaryText}>
          {summary}
        </ThemedText>
      </View>
    </View>
  );
});

interface ArticleContentProps {
  id: string;
  article: Article;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => React.ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
}

const SENTENCE_ITEM_HEIGHT = 70;

export const ArticleContent = ({
  id,
  article,
  sortedSentences,
  renderSentenceItem,
  handleScroll,
  colors,
  isDarkMode,
}: ArticleContentProps): JSX.Element => {
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const articleId = parseInt(id ?? '', 10);

  // Get reading list data for the button
  const { isInReadingList, refetchReadingListStatus, isLoadingReadingList } = useArticleData(
    articleId,
    user?.id
  );

  const { handleToggleReadingList } = useArticleMutations(user?.id, refetchReadingListStatus);

  // Handle scroll events
  const handleAnimatedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll(event);
    },
    [handleScroll]
  );

  // Memoize the header component for better performance
  const headerComponent = useMemo(
    () => (
      <>
        <ParallaxHeader article={article} colors={colors} isDarkMode={!!isDarkMode} />
        {article.summary && <ArticleSummary summary={article.summary} />}
        {user && (
          <AudioControlsButton
            articleId={articleId}
            article={article}
            isInReadingList={isInReadingList}
            isLoading={isLoadingReadingList}
            onToggleReadingList={handleToggleReadingList}
          />
        )}
      </>
    ),
    [
      article,
      colors,
      isDarkMode,
      user,
      articleId,
      isInReadingList,
      isLoadingReadingList,
      handleToggleReadingList,
    ]
  );

  return (
    <Animated.View style={styles.flexOne}>
      {sortedSentences && sortedSentences.length > 0 ? (
        <View
          style={[styles.listContainer, styles.content, { backgroundColor: colors.background }]}
        >
          <FlashList
            key={`article-${id}`}
            alwaysBounceVertical={false} // Only bounce when content allows it
            bounces={true} // Re-enable bounce for parallax pull-down effect
            data={sortedSentences}
            drawDistance={SENTENCE_ITEM_HEIGHT * 12} // Increased for better performance
            estimatedFirstItemOffset={0}
            estimatedItemSize={SENTENCE_ITEM_HEIGHT}
            extraData={''}
            getItemType={() => 'sentence'} // Add item type for better optimization
            initialScrollIndex={0}
            keyExtractor={item => item.id.toString()}
            ListHeaderComponent={headerComponent}
            overScrollMode="auto" // Allow controlled overscroll for parallax
            persistentScrollbar={true}
            removeClippedSubviews={true} // Improve performance
            renderItem={renderSentenceItem}
            scrollEventThrottle={16} // Standard throttle for natural scrolling feel
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{
              paddingTop: 0, // Remove padding since ParallaxHeader handles its own layout
              // Slight bottom padding adjustment for better closure
              paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.MEDIUM,
            }}
            overrideItemLayout={(layout, _item: Tables<'article_sentences'>) => {
              layout.size = SENTENCE_ITEM_HEIGHT;
            }}
            onScroll={handleAnimatedScroll}
          />
        </View>
      ) : null}
    </Animated.View>
  );
};

ArticleContent.displayName = 'ArticleContent';
