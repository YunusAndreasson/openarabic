import type { FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, type ReactElement } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken,
} from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { FloatingActionButtons } from '@/components/article/FloatingActionButtons';
import { ParallaxHeader } from '@/components/article/ParallaxHeader';
import { RelatedArticlesSection } from '@/components/article/RelatedArticlesSection';
import {
  SCROLL_EVENT_THROTTLE,
  SENTENCE_DRAW_DISTANCE_MULTIPLIER,
  TIMING_CONFIG,
} from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { calculateHeaderHeight } from '@/utils/gradientUtils';

// Animated version of FlashList for UI-thread scroll handling
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<any>
);

// Comfortable reading space constant
const COMFORTABLE_READING_SPACE = MIN_TOUCH_TARGET.MEDIUM;

// Static styles for better performance
const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  titleContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginTop: -LAYOUT.SPACING.XXXLARGE,
    paddingBottom: LAYOUT.SPACING.TINY,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  titleText: {
    width: '100%', // Full width for title without button interference
  },
  leftAlign: {
    textAlign: 'left',
  },
  authorContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  summaryContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  summaryText: {
    textAlign: 'left',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL * LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  playIconOffset: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
  authorText: {
    textAlign: 'left',
  },
});

// Static constants for better performance
const SENTENCE_ITEM_HEIGHT = LAYOUT.SENTENCE_ITEM.HEIGHT;
const SCROLL_THROTTLE = SCROLL_EVENT_THROTTLE;
const DRAW_DISTANCE_MULTIPLIER = SENTENCE_DRAW_DISTANCE_MULTIPLIER;

// Static key extractor for better performance
const sentenceKeyExtractor = (item: Tables<'article_sentences'>) => item.id.toString();

interface ArticleContentProps {
  id: string;
  article: Article;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  colors: ThemeColors;
  scrollViewRef: React.RefObject<FlashListRef<Tables<'article_sentences'>>>;
  // Reading list (bookmarks/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  // Audio playback functionality
  hasAudio?: boolean;
  isPlaying?: boolean;
  onPlayPress?: () => void;
  currentHighlightedWord?: SentenceWord | null;
  // Language preference functionality
  showEnglish: boolean;
  onToggleLanguage: () => void;
  isLanguageOverridden: boolean;
  // Close functionality
  onClose: () => void;
}

export function ArticleContent({
  id,
  article,
  sortedSentences,
  renderSentenceItem,
  handleScroll,
  handleViewableItemsChanged,
  colors,
  scrollViewRef,
  isInReadingList,
  onToggleReadingList,
  hasAudio = false,
  isPlaying = false,
  onPlayPress,
  currentHighlightedWord = null,
  showEnglish,
  onToggleLanguage,
  isLanguageOverridden,
  onClose,
}: ArticleContentProps) {
    const insets = useSafeAreaInsets();

    // React Compiler auto-memoizes
    const headerHeight = calculateHeaderHeight(insets.top);

    // Shared scroll value for parallax header
    const scrollY = useSharedValue(0);
    // Reduce cross-thread calls by emitting JS updates only when change is meaningful
    const lastEmittedY = useSharedValue(0);

    // Optimized fade-in animation for snappy article appearance
    const { animatedStyle, startAnimation } = useOpacityAnimation({
      initialOpacity: 0,
      duration: TIMING_CONFIG.FAST.duration, // 150ms for snappier feel
    });

    // Trigger animation when content becomes available
    React.useEffect(() => {
      if (sortedSentences && sortedSentences.length > 0) {
        startAnimation();
      }
    }, [sortedSentences, startAnimation]);

    // Forward JS scroll needs from UI thread
    const handleScrollJS = useCallback(
      (y: number) => {
        const evt = {
          nativeEvent: { contentOffset: { y } },
        } as NativeSyntheticEvent<NativeScrollEvent>;
        handleScroll(evt);
      },
      [handleScroll]
    );

    // UI-thread scroll handler for smoothness
    const onScrollAnimated = useAnimatedScrollHandler({
      onScroll: event => {
        const y = event.contentOffset.y;
        scrollY.set(y);
        // Emit to JS only if scrolled enough to matter to header/tooltip logic
        const dy = Math.abs(y - lastEmittedY.get());
        if (dy >= 8 || y === 0) {
          lastEmittedY.set(y);
          runOnJS(handleScrollJS)(y);
        }
      },
    });

    // Reserve right-side space so text never sits under floating action buttons
    // Updated to account for only one button now (bookmarks button)
    // React Compiler auto-memoizes
    const rightOverlayPadding = MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.LARGE;

    // React Compiler auto-memoizes
    const titleContainerStyle = [
      styles.titleContainer,
      {
        paddingRight: rightOverlayPadding,
        marginTop: -(LAYOUT.SPACING.XXXLARGE + LAYOUT.SPACING.SMALL),
      },
    ];

    // React Compiler auto-memoizes
    const authorContainerStyle = [styles.authorContainer, { paddingRight: rightOverlayPadding }];

    // React Compiler auto-memoizes
    const summaryContainerStyle = [styles.summaryContainer, { paddingRight: rightOverlayPadding }];

    const dividerStyle = {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      opacity: 0.4,
      marginHorizontal: LAYOUT.SPACING.MEDIUM,
      marginBottom: LAYOUT.SPACING.MEDIUM,
    } as const;

    // Render title/author below the hero image but above content
    // React Compiler auto-memoizes
    const headerComponent = (
      <View>
        <View style={titleContainerStyle}>
          <ThemedText
            type="heading1"
            colorName="headingText"
            style={[styles.titleText, styles.leftAlign]}
          >
            {article.title}
          </ThemedText>
        </View>

        <View style={authorContainerStyle}>
          <ThemedText
            type="body"
            weight="medium"
            colorName="authorText"
            style={styles.authorText}
          >
            {article.author.name}
            {' \u00B7 '}
            {article.category.name
              ? article.category.name.charAt(0).toUpperCase() + article.category.name.slice(1)
              : ''}
          </ThemedText>
        </View>

        {/* Summary section - positioned between author and content for natural reading flow */}
        {article.summary && (
          <View style={summaryContainerStyle}>
            <ThemedText
              type="body"
              weight="normal"
              colorName="subtitleText"
              style={styles.summaryText}
            >
              {article.summary}
            </ThemedText>
          </View>
        )}
        <View style={dividerStyle} />
      </View>
    );

    // Get articles from cache for recommendations (avoid re-querying here)
    const queryClient = useQueryClient();
    const articlesData = queryClient.getQueryData<Article[]>(['articles']) || [];

    // React Compiler auto-memoizes
    const footerComponent = <RelatedArticlesSection currentArticleId={article.id} articlesData={articlesData} />;

    // React Compiler auto-memoizes
    const contentContainerStyle = {
      paddingTop: headerHeight,
      paddingBottom: insets.bottom + COMFORTABLE_READING_SPACE,
    };

    // React Compiler auto-memoizes
    const listContainerStyle = {
      flex: 1,
      backgroundColor: colors.background,
      position: 'relative' as const,
    };

    // React Compiler auto-memoizes
    const viewabilityConfig = {
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    };

    return (
      <Animated.View style={[styles.flexOne, animatedStyle]}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View style={listContainerStyle}>
            {/* Sticky Parallax Header behind content */}
            <ParallaxHeader article={article} colors={colors} scrollY={scrollY} />
            <AnimatedFlashList
              ref={scrollViewRef as unknown as React.RefObject<any>}
              key={`article-${id}`}
              data={sortedSentences}
              renderItem={renderSentenceItem}
              keyExtractor={sentenceKeyExtractor}
              contentContainerStyle={contentContainerStyle}
              ListHeaderComponent={headerComponent}
              ListFooterComponent={footerComponent}
              onScroll={
                onScrollAnimated as unknown as (
                  event: NativeSyntheticEvent<NativeScrollEvent>
                ) => void
              }
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              drawDistance={SENTENCE_ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER}
              scrollEventThrottle={SCROLL_THROTTLE}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              alwaysBounceVertical={true}
              bounces={true}
              overScrollMode="always"
              extraData={{ currentHighlightedWord }}
              maxItemsInRecyclePool={30} // Control memory usage for sentence items
              onScrollToIndexFailed={({ index }: { index: number }) => {
                // Fallback: estimate offset using fixed item height and account for header
                const estimatedOffset = Math.max(
                  0,
                  (index - 1) * SENTENCE_ITEM_HEIGHT + headerHeight
                );
                try {
                  scrollViewRef.current?.scrollToOffset({
                    offset: estimatedOffset,
                    animated: true,
                  });
                } catch {
                  // noop
                }
              }}
            />

            {/* Floating action buttons */}
            <FloatingActionButtons
              isInReadingList={isInReadingList}
              onToggleReadingList={onToggleReadingList}
              hasAudio={hasAudio}
              isPlaying={isPlaying}
              onPlayPress={onPlayPress}
              showEnglish={showEnglish}
              onToggleLanguage={onToggleLanguage}
              isLanguageOverridden={isLanguageOverridden}
              onClose={onClose}
            />
          </View>
        ) : null}
      </Animated.View>
    );
}

ArticleContent.displayName = 'ArticleContent';
