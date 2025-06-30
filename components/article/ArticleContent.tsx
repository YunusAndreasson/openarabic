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
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
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
  },
  titleText: {
    width: '100%', // Full width for title without button interference
  },
  authorContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING, // Match summary box alignment
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM, // Space between buttons
  },
  actionButton: {
    flex: 1, // Equal width buttons for perfect balance
    flexDirection: 'row', // Horizontal layout for icon + text
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET.MEDIUM, // Ensure good touch target
  },
  modalDragIndicator: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL, // Position from top of parallax header
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10, // Ensure it's above the image content
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  dragIndicatorBar: {
    width: LAYOUT.SPACING.XXXLARGE, // 48px for better visibility
    height: LAYOUT.SPACING.TINY, // 4px height
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
  actionButtonIcon: {
    marginRight: LAYOUT.SPACING.TINY, // Small gap between icon and text
  },
  actionButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});

interface ArticleTitleProps {
  title: string;
  author: { id: number; name: string };
  // Action button props
  isInReadingList: boolean;
  onToggleReadingList: () => void;
  // Audio playback functionality
  onPlayPress: () => void;
  isPlaying: boolean;
}

const ArticleTitle = memo<ArticleTitleProps>(
  ({ title, author, isInReadingList, onToggleReadingList, onPlayPress, isPlaying }) => {
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
        {/* Title gets full width without button interference */}
        <View style={styles.titleContainer}>
          <ThemedText type="heading1" style={[styles.titleText, titleStyle]}>
            {title}
          </ThemedText>
        </View>

        {/* Author information */}
        <View style={styles.authorContainer}>
          <ThemedText type="caption" style={authorStyle}>
            {STRINGS.BY} {author.name}
          </ThemedText>
        </View>

        {/* Action buttons below author */}
        <View style={styles.actionButtonsContainer}>
          {/* Listening list action */}
          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: isInReadingList ? colors.tintBackground : colors.elevation1,
                borderColor: isInReadingList ? colors.tint : colors.border,
              },
            ]}
            onPress={onToggleReadingList}
            android_ripple={{
              color: colors.tint,
              radius: LAYOUT.SPACING.XLARGE,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isInReadingList ? 'Remove from listening list' : 'Add to listening list'
            }
            accessibilityHint="Toggle article in audio listening playlist"
          >
            <Ionicons
              name={isInReadingList ? 'headset' : 'headset-outline'}
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              color={isInReadingList ? colors.tint : colors.secondaryText}
              style={styles.actionButtonIcon}
            />
            <ThemedText
              type="caption"
              style={[
                styles.actionButtonText,
                {
                  color: isInReadingList ? colors.tint : colors.secondaryText,
                  fontWeight: isInReadingList
                    ? TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD
                    : TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
                },
              ]}
            >
              {isInReadingList ? 'In Playlist' : 'Add to Playlist'}
            </ThemedText>
          </Pressable>

          {/* Audio playback action */}
          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: isPlaying ? colors.tintBackground : colors.elevation1,
                borderColor: isPlaying ? colors.tint : colors.border,
              },
            ]}
            onPress={onPlayPress}
            android_ripple={{
              color: colors.tint,
              radius: LAYOUT.SPACING.XLARGE,
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Stop audio playback' : 'Start audio playback'}
            accessibilityHint="Toggle article audio playback"
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              color={isPlaying ? colors.tint : colors.secondaryText}
              style={styles.actionButtonIcon}
            />
            <ThemedText
              type="caption"
              style={[
                styles.actionButtonText,
                {
                  color: isPlaying ? colors.tint : colors.secondaryText,
                  fontWeight: isPlaying
                    ? TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD
                    : TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
                },
              ]}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </ThemedText>
          </Pressable>
        </View>
      </>
    );
  }
);
ArticleTitle.displayName = 'ArticleTitle';

// Modal drag indicator component positioned over parallax header
const ModalDragIndicator = memo(() => {
  const colors = useColors();

  return (
    <View style={styles.modalDragIndicator}>
      <View
        style={[
          styles.dragIndicatorBar,
          {
            backgroundColor: colors.modalIndicator,
            opacity: LAYOUT.OPACITY.SUBTLE, // More transparent for elegant overlay
          },
        ]}
      />
    </View>
  );
});
ModalDragIndicator.displayName = 'ModalDragIndicator';

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
  // Audio playback functionality
  onPlayPress: () => void;
  isPlaying: boolean;
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
    onPlayPress,
    isPlaying,
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
            onPlayPress={onPlayPress}
            isPlaying={isPlaying}
          />
        </Fragment>
      ),
      [article, colors, isInReadingList, onToggleReadingList, onPlayPress, isPlaying]
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

            {/* Modal drag indicator positioned over parallax header */}
            <ModalDragIndicator />

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
      prevProps.onPlayPress === nextProps.onPlayPress &&
      prevProps.isPlaying === nextProps.isPlaying
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
