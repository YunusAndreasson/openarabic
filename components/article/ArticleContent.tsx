import { FlashList } from '@shopify/flash-list';
import React, { Fragment, memo, useCallback, useMemo, type ReactElement } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewToken } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import ParallaxHeader from '@/components/article/ParallaxHeader';
import { SentenceScrubber } from '@/components/article/SentenceScrubber';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { SENTENCE_DRAW_DISTANCE_MULTIPLIER, SCROLL_EVENT_THROTTLE } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ThemeColors } from '@/types/ui/theme.types';

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
  titleContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    marginTop: -LAYOUT.SPACING.XXXLARGE,
    paddingBottom: LAYOUT.SPACING.TINY,
    zIndex: 10,
  },
  authorContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  summaryContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.XLARGE,
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
  audioControlsContainer: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  listenNowButton: {
    flex: 1,
  },
  listenLaterButton: {
    flex: 1,
  },
});

// Note: Audio controls functionality is preserved in the audio player hooks
// and can be re-enabled by adding UI components when needed

interface ArticleTitleProps {
  title: string;
  author: { id: number; name: string };
}

const ArticleTitle = memo<ArticleTitleProps>(({ title, author }) => {
  const colors = useColors();

  return (
    <>
      <View style={styles.titleContainer}>
        <ThemedText
          type="heading1"
          style={{
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
            fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
            color: colors.headingText,
            lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
            textAlign: 'left',
          }}
        >
          {title}
        </ThemedText>
      </View>

      <View style={styles.authorContainer}>
        <ThemedText
          type="caption"
          style={{
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
            fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
            color: colors.authorText,
            textAlign: 'left',
          }}
        >
          {STRINGS.BY} {author.name}
        </ThemedText>
      </View>
    </>
  );
});
ArticleTitle.displayName = 'ArticleTitle';

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
  handleViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  colors: ThemeColors;
  currentSentenceIndex: number;
  totalSentences: number;
  onSentenceChange: (sentenceIndex: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  scrollViewRef: React.RefObject<FlashList<Tables<'article_sentences'>>>;
  // Audio control props
  isInReadingList: boolean;
  isLoadingReadingList: boolean;
  onPlayNow: () => void;
  onToggleReadingList: () => void;
  isPlayingAudio: boolean;
  isLoadingAudio: boolean;
  playButtonText: string;
}

// Extract constants outside component for better performance
const SENTENCE_ITEM_HEIGHT = LAYOUT.SENTENCE_ITEM.HEIGHT;
const SCROLL_THROTTLE = SCROLL_EVENT_THROTTLE;
const DRAW_DISTANCE_MULTIPLIER = SENTENCE_DRAW_DISTANCE_MULTIPLIER;

const getItemType = () => 'sentence';

// Optimize main component with memo and custom comparison
export const ArticleContent = memo<ArticleContentProps>(
  ({
    id,
    article,
    sortedSentences,
    renderSentenceItem,
    handleScroll,
    handleViewableItemsChanged,
    colors,
    currentSentenceIndex,
    totalSentences,
    onSentenceChange,
    onScrubStart,
    onScrubEnd,
    scrollViewRef,
    isInReadingList,
    isLoadingReadingList,
    onPlayNow,
    onToggleReadingList,
    isPlayingAudio,
    isLoadingAudio,
    playButtonText,
  }) => {
    const insets = useSafeAreaInsets();

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
          <ArticleTitle title={article.title} author={article.author} />
          <ArticleSummary summary={String(article.summary)} />
          <View style={styles.audioControlsContainer}>
            <ThemedButton
              title={playButtonText}
              onPress={onPlayNow}
              loading={isLoadingAudio}
              style={styles.listenNowButton}
              variant={isPlayingAudio ? 'outlined' : 'filled'}
            />
            <ThemedButton
              title={isInReadingList ? STRINGS.REMOVE : STRINGS.LISTEN_LATER}
              onPress={onToggleReadingList}
              loading={isLoadingReadingList}
              style={styles.listenLaterButton}
              variant="outlined"
            />
          </View>
        </Fragment>
      ),
      [
        article,
        colors,
        isInReadingList,
        isLoadingReadingList,
        onPlayNow,
        onToggleReadingList,
        isPlayingAudio,
        isLoadingAudio,
        playButtonText,
      ]
    );

    const getItemTypeCallback = useCallback(getItemType, []);

    const overrideItemLayout = useCallback((layout: { span?: number; size?: number }) => {
      layout.size = SENTENCE_ITEM_HEIGHT;
    }, []);

    return (
      <View style={styles.flexOne}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View
            style={[styles.listContainer, styles.content, { backgroundColor: colors.background }]}
          >
            <FlashList
              ref={scrollViewRef}
              key={`article-${id}`}
              alwaysBounceVertical={false}
              bounces={true}
              data={sortedSentences}
              drawDistance={SENTENCE_ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER}
              estimatedFirstItemOffset={0}
              estimatedItemSize={SENTENCE_ITEM_HEIGHT}
              extraData={''}
              getItemType={getItemTypeCallback} // Add item type for better optimization
              initialScrollIndex={0}
              keyExtractor={item => item.id.toString()}
              ListHeaderComponent={headerComponent}
              overScrollMode="auto" // Allow controlled overscroll for parallax
              persistentScrollbar={false} // Remove native scrollbar - using custom scrubber
              removeClippedSubviews={true} // Improve performance
              renderItem={renderSentenceItem}
              scrollEventThrottle={SCROLL_THROTTLE}
              showsVerticalScrollIndicator={false} // Hide native scroll indicator
              contentContainerStyle={{
                paddingTop: 0, // Remove padding since ParallaxHeader handles its own layout
                // Slight bottom padding adjustment for better closure
                paddingBottom:
                  LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.MEDIUM,
              }}
              overrideItemLayout={overrideItemLayout}
              onScroll={handleAnimatedScroll}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 50, // Consider item visible when 50% is visible
                minimumViewTime: 100, // Minimum time item must be visible before triggering
              }}
            />

            {/* Custom sentence scrubber */}
            <SentenceScrubber
              currentSentence={currentSentenceIndex}
              totalSentences={totalSentences}
              onSentenceChange={onSentenceChange}
              onScrubStart={onScrubStart}
              onScrubEnd={onScrubEnd}
            />
          </View>
        ) : null}
      </View>
    );
  },
  // Custom comparison function for performance-critical props
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.article === nextProps.article &&
      prevProps.sortedSentences === nextProps.sortedSentences &&
      prevProps.renderSentenceItem === nextProps.renderSentenceItem &&
      prevProps.handleScroll === nextProps.handleScroll &&
      prevProps.handleViewableItemsChanged === nextProps.handleViewableItemsChanged &&
      prevProps.colors === nextProps.colors &&
      prevProps.currentSentenceIndex === nextProps.currentSentenceIndex &&
      prevProps.totalSentences === nextProps.totalSentences &&
      prevProps.isInReadingList === nextProps.isInReadingList &&
      prevProps.isLoadingReadingList === nextProps.isLoadingReadingList &&
      prevProps.onPlayNow === nextProps.onPlayNow &&
      prevProps.onToggleReadingList === nextProps.onToggleReadingList &&
      prevProps.isPlayingAudio === nextProps.isPlayingAudio &&
      prevProps.isLoadingAudio === nextProps.isLoadingAudio &&
      prevProps.playButtonText === nextProps.playButtonText
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
