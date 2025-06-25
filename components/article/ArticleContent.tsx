import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { Fragment, memo, useCallback, useMemo, type ReactElement } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewToken } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import ParallaxHeader from '@/components/article/ParallaxHeader';
import { SentenceScrubber } from '@/components/article/SentenceScrubber';
import { SCROLL_EVENT_THROTTLE, SENTENCE_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
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
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  actionButton: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minWidth: LAYOUT.TOUCH_TARGET.LARGE,
    minHeight: LAYOUT.TOUCH_TARGET.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
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
});

interface ArticleTitleProps {
  title: string;
  author: { id: number; name: string };
  // Reading list (playlist/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => void;
  // Bookmark functionality
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

const ArticleTitle = memo<ArticleTitleProps>(
  ({ title, author, isInReadingList, onToggleReadingList, isBookmarked, onToggleBookmark }) => {
    const colors = useColors();

    // Memoize dynamic styles for better performance
    const titleStyle = useMemo(
      () => ({
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
        color: colors.headingText,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
        textAlign: 'left' as const,
      }),
      [colors.headingText]
    );

    const authorStyle = useMemo(
      () => ({
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
        color: colors.authorText,
        textAlign: 'left' as const,
      }),
      [colors.authorText]
    );

    return (
      <>
        <View style={styles.titleContainer}>
          <ThemedText type="heading1" style={[styles.titleText, titleStyle]}>
            {title}
          </ThemedText>

          <View style={styles.actionButtonsContainer}>
            {/* Listening list button (headphone icon) */}
            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.elevation1,
                },
              ]}
              onPress={onToggleReadingList}
              android_ripple={{
                color: colors.tint,
                radius: LAYOUT.SPACING.LARGE,
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isInReadingList ? 'Remove from listening list' : 'Add to listening list'
              }
              accessibilityHint="Toggle article in audio listening playlist"
            >
              <Ionicons
                name={isInReadingList ? 'headset' : 'headset-outline'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={isInReadingList ? colors.tint : colors.secondaryText}
              />
            </Pressable>

            {/* Bookmark button */}
            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.elevation1,
                },
              ]}
              onPress={onToggleBookmark}
              android_ripple={{
                color: colors.tint,
                radius: LAYOUT.SPACING.LARGE,
              }}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              accessibilityHint="Toggle article bookmark for reading later"
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={isBookmarked ? colors.tint : colors.secondaryText}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.authorContainer}>
          <ThemedText type="caption" style={authorStyle}>
            {STRINGS.BY} {author.name}
          </ThemedText>
        </View>
      </>
    );
  }
);
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
  // Reading list (playlist/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => void;
  // Bookmark functionality
  isBookmarked: boolean;
  onToggleBookmark: () => void;
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
    onToggleReadingList,
    isBookmarked,
    onToggleBookmark,
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
          <ArticleTitle
            title={article.title}
            author={article.author}
            isInReadingList={isInReadingList}
            onToggleReadingList={onToggleReadingList}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
          />
          <ArticleSummary summary={String(article.summary)} />
        </Fragment>
      ),
      [article, colors, isInReadingList, onToggleReadingList, isBookmarked, onToggleBookmark]
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
      prevProps.onToggleReadingList === nextProps.onToggleReadingList &&
      prevProps.isBookmarked === nextProps.isBookmarked &&
      prevProps.onToggleBookmark === nextProps.onToggleBookmark
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
