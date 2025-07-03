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
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    marginTop: -LAYOUT.SPACING.XXXLARGE,
    paddingBottom: LAYOUT.SPACING.TINY,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  titleText: {
    width: '100%', // Full width for title without button interference
  },
  authorContainer: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  playIconOffset: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
});

interface ArticleTitleProps {
  title: string;
  author: { id: number; name: string };
}

const ArticleTitle = memo<ArticleTitleProps>(({ title, author }) => {
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
    </>
  );
});

ArticleTitle.displayName = 'ArticleTitle';

// Floating action buttons component positioned over parallax header
const FloatingActionButtons = memo<{
  isInReadingList: boolean;
  onToggleReadingList: () => void;
  onPlayPress: () => void;
  isPlaying: boolean;
  onClose: () => void;
}>(({ isInReadingList, onToggleReadingList, onPlayPress, isPlaying, onClose }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const buttonStyle = useMemo(
    () => ({
      width: MIN_TOUCH_TARGET.MEDIUM,
      height: MIN_TOUCH_TARGET.MEDIUM,
      borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
      backgroundColor: colors.elevation1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: 0.7, // More subtle/transparent
      ...LAYOUT.ELEVATION.SUBTLE,
    }),
    [colors.elevation1]
  );

  const activeButtonStyle = useMemo(
    () => ({
      ...buttonStyle,
      backgroundColor: colors.elevation2,
      opacity: 0.85,
    }),
    [buttonStyle, colors.elevation2]
  );

  // Memoize button positions with safe area insets
  const closeButtonStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: insets.top + LAYOUT.SPACING.SMALL,
      left: LAYOUT.SPACING.SMALL,
      zIndex: LAYOUT.Z_INDEX.OVERLAY,
    }),
    [insets.top]
  );

  const actionButtonsStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: insets.top + LAYOUT.SPACING.SMALL,
      right: LAYOUT.SPACING.SMALL,
      zIndex: LAYOUT.Z_INDEX.OVERLAY,
      flexDirection: 'row' as const,
      gap: LAYOUT.SPACING.SMALL,
    }),
    [insets.top]
  );

  return (
    <>
      {/* Close button - top left */}
      <View style={closeButtonStyle}>
        <Pressable
          style={buttonStyle}
          onPress={onClose}
          android_ripple={{
            color: colors.tint,
            radius: MIN_TOUCH_TARGET.MEDIUM / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel="Close article"
        >
          <Ionicons
            name="close"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={colors.secondaryText}
          />
        </Pressable>
      </View>

      {/* Action buttons - top right */}
      <View style={actionButtonsStyle}>
        {/* Playlist button */}
        <Pressable
          style={isInReadingList ? activeButtonStyle : buttonStyle}
          onPress={onToggleReadingList}
          android_ripple={{
            color: colors.tint,
            radius: MIN_TOUCH_TARGET.MEDIUM / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel={
            isInReadingList ? 'Remove from listening list' : 'Add to listening list'
          }
        >
          <Ionicons
            name={isInReadingList ? 'bookmark' : 'bookmark-outline'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={isInReadingList ? colors.tint : colors.secondaryText}
          />
        </Pressable>

        {/* Play button */}
        <Pressable
          style={isPlaying ? activeButtonStyle : buttonStyle}
          onPress={onPlayPress}
          android_ripple={{
            color: colors.tint,
            radius: MIN_TOUCH_TARGET.MEDIUM / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Stop audio playback' : 'Start audio playback'}
        >
          <Ionicons
            name={isPlaying ? 'stop' : 'play'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={isPlaying ? colors.tint : colors.secondaryText}
            style={!isPlaying && styles.playIconOffset}
          />
        </Pressable>
      </View>
    </>
  );
});

FloatingActionButtons.displayName = 'FloatingActionButtons';

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
  // Close functionality
  onClose: () => void;
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
    onClose,
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
        </Fragment>
      ),
      [article, colors]
    );

    const getItemTypeCallback = useCallback(getItemType, []);

    const overrideItemLayout = useCallback((layout: { span?: number; size?: number }) => {
      layout.size = SENTENCE_ITEM_HEIGHT;
    }, []);

    // Memoize content container style with proper bottom padding
    const contentContainerStyle = useMemo(
      () => ({
        paddingTop: 0, // Remove padding since ParallaxHeader handles its own layout
        paddingBottom: insets.bottom + LAYOUT.SPACING.XXXLARGE, // Safe area + comfortable reading space
      }),
      [insets.bottom]
    );

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
              contentContainerStyle={contentContainerStyle}
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

            {/* Floating action buttons */}
            <FloatingActionButtons
              isInReadingList={isInReadingList}
              onToggleReadingList={onToggleReadingList}
              onPlayPress={onPlayPress}
              isPlaying={isPlaying}
              onClose={onClose}
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
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.onClose === nextProps.onClose
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
