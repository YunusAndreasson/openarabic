import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from 'react';
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
  sourceContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  sourceLabel: {
    fontSize: 14,
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
    ...LAYOUT.SHADOW.SMALL,
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

export type ArticleContentRef = {
  scrollToSentence: (sentenceId: number) => void;
};

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

    const isCurrentlyPlaying = audioState !== AUDIO_STATES.IDLE;

    const handlePlayToggle = async () => {
      if (isCurrentlyPlaying) {
        // Stop playback
        lightFeedback();
        await audioPlayer.actions.stopPlayback();
        return;
      }

      // Start playback
      if (!article.audio_url) {
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

        // Start playback with single track
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
    };

    const handleListenLater = () => {
      lightFeedback();
      onToggleReadingList(articleId, isInReadingList);

      // Show toast message
      if (isInReadingList) {
        showToast('Removed from listening list', 3000, 'success');
      } else {
        showToast('Added to listening list', 3000, 'success');
      }
    };

    const hasAudio = !!article.audio_url;

    return (
      <View style={styles.audioControlsContainer}>
        {/* Play/Stop Button */}
        <ThemedButton
          variant="filled"
          title={isCurrentlyPlaying ? 'STOP' : 'PLAY NOW'}
          size="medium"
          loading={isPlayNowLoading}
          disabled={(!hasAudio && !isCurrentlyPlaying) || isPlayNowLoading}
          onPress={handlePlayToggle}
          style={styles.playNowButton}
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

export const ArticleContent = forwardRef<ArticleContentRef, ArticleContentProps>(
  (
    {
      id,
      article,
      sortedSentences,
      renderSentenceItem,
      handleScroll,
      colors,
      isDarkMode,
    }: ArticleContentProps,
    ref
  ): JSX.Element => {
    const insets = useSafeAreaInsets();
    const flashListRef = useRef<FlashList<Tables<'article_sentences'>>>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { scrollToSentence: scrollToSentenceParam } = useLocalSearchParams<{
      scrollToSentence?: string;
      highlightWord?: string;
      wordPosition?: string;
    }>();

    const { user } = useAuth();
    const articleId = parseInt(id, 10);

    // Get reading list data for the button
    const { isInReadingList, refetchReadingListStatus, isLoadingReadingList } = useArticleData(
      articleId,
      user?.id
    );

    const { handleToggleReadingList } = useArticleMutations(user?.id, refetchReadingListStatus);

    // Helper function to handle scroll events
    const handleAnimatedScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        handleScroll(event);
      },
      [handleScroll]
    );

    // Helper function to scroll to an index with consistent parameters
    const scrollToIndex = useCallback(
      (index: number) => {
        // Don't scroll if already scrolling to prevent conflicts
        if (isScrollingRef.current) return;

        isScrollingRef.current = true;

        // Reduce delay for more responsive scrolling
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (!flashListRef.current) {
            isScrollingRef.current = false;
            return;
          }

          try {
            // Use a more conservative offset since header height is now dynamic
            const viewOffset = 200 + LAYOUT.SPACING.SMALL; // Estimated dynamic header height

            flashListRef.current.scrollToIndex({
              index: index,
              animated: true,
              viewPosition: 0.05, // Position sentence very close to top for maximum visibility
              viewOffset: viewOffset,
            });
          } catch {
            // Enhanced fallback with better error handling
            if (sortedSentences && sortedSentences.length > 0) {
              const targetIndex = Math.min(index, sortedSentences.length - 1);
              const fallbackOffset = 200 + LAYOUT.SPACING.SMALL; // Estimated dynamic header height

              flashListRef.current?.scrollToItem({
                item: sortedSentences[targetIndex],
                animated: true,
                viewPosition: 0.05,
                viewOffset: fallbackOffset,
              });
            }
          }

          // Reset scrolling flag after animation completes
          if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
          }
          resetTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
          }, 300);
        }, 50); // Reduced delay for more responsive scrolling
      },
      [sortedSentences, insets.top]
    );

    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }
      };
    }, []);

    // Effect to scroll to the specified sentence when the component mounts
    useEffect(() => {
      if (scrollToSentenceParam && sortedSentences) {
        const sentenceIndex = sortedSentences.findIndex(
          s => s.id === parseInt(scrollToSentenceParam)
        );
        if (sentenceIndex !== -1) {
          scrollToIndex(sentenceIndex);
        }
      }
    }, [scrollToSentenceParam, sortedSentences]);

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

    // Expose the scrollToSentence method to the parent component
    useImperativeHandle(
      ref,
      () => ({
        scrollToSentence: (sentenceId: number) => {
          if (sortedSentences) {
            const sentenceIndex = sortedSentences.findIndex(s => s.id === sentenceId);
            if (sentenceIndex !== -1) {
              scrollToIndex(sentenceIndex);
            }
          }
        },
      }),
      [sortedSentences, scrollToIndex]
    );

    return (
      <Animated.View style={styles.flexOne}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View
            style={[styles.listContainer, styles.content, { backgroundColor: colors.background }]}
          >
            <FlashList
              key={`article-${id}`}
              ref={flashListRef}
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
                paddingBottom:
                  LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.MEDIUM,
              }}
              overrideItemLayout={layout => {
                layout.size = SENTENCE_ITEM_HEIGHT;
              }}
              onScroll={handleAnimatedScroll}
            />
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
