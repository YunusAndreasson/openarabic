import { FlashList } from '@shopify/flash-list';
import { useMemo, useCallback, useState, memo, type JSX, type ReactElement, Fragment } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import ParallaxHeader from '@/components/article/ParallaxHeader';
import { useToast } from '@/components/providers/ToastProvider';
import { AUDIO_STATES } from '@/constants/audio';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
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
import { selectionFeedback } from '@/utils/haptics';

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
    ...LAYOUT.ELEVATION.SMALL,
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

const AudioControlsButton = memo<Omit<AudioControlsButtonProps, 'article'>>(
  ({ articleId, isInReadingList, isLoading, onToggleReadingList }) => {
    const { showToast } = useToast();
    const audioPlayer = useAudioPlayer();
    const { audioState } = audioPlayer;
    const [isPlayNowLoading, setIsPlayNowLoading] = useState(false);

    const isCurrentlyPlaying = audioState === AUDIO_STATES.PLAYING;

    // Combined loading state for optimal UX - instant local feedback + ongoing audio feedback
    const isPlayButtonLoading = isPlayNowLoading || audioState === AUDIO_STATES.LOADING;

    const handlePlayToggle = useCallback(async () => {
      if (isCurrentlyPlaying) {
        // Stop playback
        selectionFeedback();
        await audioPlayer.actions.stopPlayback();
        return;
      }

      // Start playback (audio_url is always present)
      try {
        setIsPlayNowLoading(true);
        selectionFeedback();

        // Record start time for minimum loading duration
        const loadingStartTime = Date.now();
        const MIN_LOADING_DURATION = 300; // 300ms minimum

        // Generate enhanced audio track for this article
        const track = await enhancedAudioService.generateEnhancedAudioTrack(articleId);

        if (!track) {
          showToast(STRINGS.FAILED_TO_PREPARE_AUDIO, 3000, 'error');
          // Ensure minimum loading time even for errors
          const elapsed = Date.now() - loadingStartTime;
          const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);
          setTimeout(() => setIsPlayNowLoading(false), remainingTime);
          return;
        }

        // Start playback with single track - let audio loading state provide feedback
        const success = await audioPlayer.actions.startEnhancedPlayback([track], 0);

        if (!success) {
          showToast(STRINGS.FAILED_TO_START_PLAYBACK, 3000, 'error');
        }

        // Ensure minimum loading duration before clearing loading state
        const elapsed = Date.now() - loadingStartTime;
        const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);

        setTimeout(() => {
          setIsPlayNowLoading(false);
        }, remainingTime);
      } catch (error) {
        handleError(error as Error, { showToast: false });
        showToast(STRINGS.FAILED_TO_START_PLAYBACK, 3000, 'error');
        // Ensure minimum loading time even for errors
        setTimeout(() => setIsPlayNowLoading(false), 300);
      }
    }, [isCurrentlyPlaying, audioPlayer.actions, articleId, showToast]);

    const handleListenLater = useCallback(() => {
      selectionFeedback();
      onToggleReadingList(articleId, isInReadingList);

      // Show toast message
      if (isInReadingList) {
        showToast(STRINGS.REMOVED_FROM_LISTENING_LIST, 3000, 'success');
      } else {
        showToast(STRINGS.ADDED_TO_LISTENING_LIST, 3000, 'success');
      }
    }, [articleId, isInReadingList, onToggleReadingList, showToast]);

    return (
      <View style={styles.audioControlsContainer}>
        {/* Play/Stop Button */}
        <ThemedButton
          variant="filled"
          title={isCurrentlyPlaying ? STRINGS.STOP : STRINGS.PLAY_NOW}
          size="medium"
          loading={isPlayButtonLoading}
          disabled={isPlayButtonLoading}
          onPress={handlePlayToggle}
          style={styles.playNowButton}
          testID="play-now-button"
        />

        {/* Listen Later Button */}
        <ThemedButton
          variant={isInReadingList ? 'outlined' : 'outlined'}
          title={isInReadingList ? STRINGS.REMOVE : STRINGS.LISTEN_LATER}
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

const ArticleSummary = memo<ArticleSummaryProps>(({ summary }) => {
  const colors = useColors();

  return (
    <View style={styles.summaryContainer}>
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.elevation1, // Use elevation1 for card surface hierarchy
            borderColor: colors.border,
          },
        ]}
      >
        <ThemedText type="label" variant="secondary" style={styles.summaryLabel}>
          {STRINGS.SUMMARY}
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
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  colors: ThemeColors;
}

const SENTENCE_ITEM_HEIGHT = 70;
const getItemType = () => 'sentence';

export const ArticleContent = ({
  id,
  article,
  sortedSentences,
  renderSentenceItem,
  handleScroll,
  colors,
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
      <Fragment>
        <ParallaxHeader article={article} colors={colors} />
        <ArticleSummary summary={String(article.summary)} />
        {user && (
          <AudioControlsButton
            articleId={articleId}
            isInReadingList={isInReadingList}
            isLoading={isLoadingReadingList}
            onToggleReadingList={handleToggleReadingList}
          />
        )}
      </Fragment>
    ),
    [
      article,
      colors,
      user,
      articleId,
      isInReadingList,
      isLoadingReadingList,
      handleToggleReadingList,
    ]
  );

  const getItemTypeCallback = useCallback(getItemType, []);

  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }) => {
      layout.size = SENTENCE_ITEM_HEIGHT;
    },
    []
  );

  return (
    <View style={styles.flexOne}>
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
            getItemType={getItemTypeCallback} // Add item type for better optimization
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
            overrideItemLayout={overrideItemLayout}
            onScroll={handleAnimatedScroll}
          />
        </View>
      ) : null}
    </View>
  );
};

ArticleContent.displayName = 'ArticleContent';
