import type { FlashListProps, FlashListRef } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, type ComponentType, type ReactElement, type RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewToken } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { FloatingActionButtons } from '@/components/article/FloatingActionButtons';
import { ParallaxHeader } from '@/components/article/ParallaxHeader';
import { RelatedArticlesSection } from '@/components/article/RelatedArticlesSection';
import { SCROLL_EVENT_THROTTLE, TIMING_CONFIG } from '@/constants/animation';
import {
  LAYOUT,
  LETTER_SPACING,
  LINE_HEIGHT_MULTIPLIERS,
  MIN_TOUCH_TARGET,
  TEXT_STYLES,
} from '@/constants/layout';
import { useArticleScrollHandler } from '@/hooks/articles/useArticleScrollHandler';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { calculateHeaderHeight } from '@/utils/gradientUtils';
import { STRINGS } from '@/constants/strings';
import { getArticleMetadata } from '@/utils/stringUtils';

// Animated version of FlashList for UI-thread scroll handling
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as ComponentType<FlashListProps<Tables<'article_sentences'>>>,
);

// Mount fade-in — CSS @keyframes, module-level so no per-render allocation
const MOUNT_FADE_IN_STYLE = {
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${TIMING_CONFIG.FAST.duration}ms`,
  animationFillMode: 'forwards' as const,
} as ReanimatedCSSAnimationStyle;

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
    marginTop: -LAYOUT.SPACING.XLARGE, // Reduced overlap for less aggressive positioning
    paddingBottom: LAYOUT.SPACING.SMALL, // Increased from TINY for better spacing
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  titleText: {
    width: '100%', // Full width for title without button interference
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE, // Larger title (34px)
    letterSpacing: -0.5, // Tighter tracking for refined modern look
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE * 1.15, // Better multi-line spacing
    // textShadowColor applied inline via colors.textShadow for theme consistency
    textShadowOffset: LAYOUT.TEXT_SHADOW.offset,
    textShadowRadius: LAYOUT.TEXT_SHADOW.radius,
  },
  leftAlign: {
    textAlign: 'left',
  },
  authorContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  summaryContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE, // Increased breathing room
    marginTop: LAYOUT.SPACING.SMALL, // Added margin for separation
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  summaryText: {
    textAlign: 'left',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: LETTER_SPACING.WIDE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL, // Increased from TIGHT for better breathing
  },
  authorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    letterSpacing: TEXT_STYLES.AUTHOR_BYLINE.letterSpacing,
  },
  bookText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: TEXT_STYLES.AUTHOR_BYLINE.letterSpacing,
    marginTop: LAYOUT.SPACING.TINY,
    fontStyle: 'italic',
  },
});

// Static constants for better performance
const SCROLL_THROTTLE = SCROLL_EVENT_THROTTLE;

// Static key extractor for better performance
const sentenceKeyExtractor = (item: Tables<'article_sentences'>) => item.id.toString();

interface ArticleContentProps {
  article: Article;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({
    item,
    index,
  }: {
    item: Tables<'article_sentences'>;
    index: number;
  }) => ReactElement | null;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  handleScrollEnd: () => void;
  colors: ThemeColors;
  scrollViewRef: RefObject<FlashListRef<Tables<'article_sentences'>>>;
  // Reading list (bookmarks/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  // Close functionality
  onClose: () => void;
  // FlashList ready callback for scroll-to-position
  onFlashListLoad: () => void;
}

const ArticleContentInternal = function ArticleContent({
  article,
  sortedSentences,
  renderSentenceItem,
  handleScroll,
  handleViewableItemsChanged,
  handleScrollEnd,
  colors,
  scrollViewRef,
  isInReadingList,
  onToggleReadingList,
  onClose,
  onFlashListLoad,
}: ArticleContentProps) {
  const insets = useSafeAreaInsets();

  // React Compiler auto-memoizes
  const headerHeight = calculateHeaderHeight(insets.top);

  // High-performance scroll handler - runs on UI thread (no cross-thread calls)
  const { scrollY, onScrollAnimated } = useArticleScrollHandler();


  // Tooltip closure handler - only triggers when scroll begins, not during continuous scrolling
  // This prevents blocking scroll performance while still closing tooltip on user interaction
  const handleScrollBegin = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Call parent's handler for tooltip closure (minimal performance impact)
      handleScroll(event);
    },
    [handleScroll],
  );

  // Reserve right-side space so text never sits under floating action buttons
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

  const dividerStyle = {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    opacity: LAYOUT.OPACITY.MEDIUM,
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  } as const;

  // Get formatted metadata (author · category · reading time)
  const metadataText = getArticleMetadata(article);

  // Render title/author below the hero image but above content
  // React Compiler auto-memoizes
  const headerComponent = (
    <View>
      <View style={titleContainerStyle}>
        <ThemedText
          type="heading1"
          colorName="headingText"
          style={[styles.titleText, styles.leftAlign, { textShadowColor: colors.shadow }]}
        >
          {article.title}
        </ThemedText>
      </View>

      {/* Metadata line - author, category, and reading time */}
      <View style={authorContainerStyle}>
        <ThemedText type="body" colorName="authorText" style={styles.authorText}>
          {metadataText}
        </ThemedText>
        {article.book && (
          <ThemedText type="label" weight="normal" colorName="authorText" style={styles.bookText}>
            {STRINGS.SOURCE_BOOK.replace('{book}', article.book)}
          </ThemedText>
        )}
      </View>

      {/* Summary section - positioned between author and content for natural reading flow */}
      {article.summary && (
        <View style={styles.summaryContainer}>
          <ThemedText
            type="caption"
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
  const footerComponent = (
    <RelatedArticlesSection
      article={article}
      articlesData={articlesData}
    />
  );

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
    itemVisiblePercentThreshold: 15, // Only count items near top (15% visible)
    minimumViewTime: 0, // Immediate updates for accurate scrubber tracking
    waitForInteraction: false, // Update during scroll for real-time sync
  };

  return (
    <View style={styles.content}>
      <Animated.View style={[styles.flexOne, MOUNT_FADE_IN_STYLE]}>
        {sortedSentences.length > 0 ? (
          <View style={listContainerStyle}>
            {/* Sticky Parallax Header behind content - using Skia gradients for Android stability */}
            <ParallaxHeader article={article} colors={colors} scrollY={scrollY} />
            <AnimatedFlashList
              /**
               * TypeScript limitation with Reanimated's createAnimatedComponent:
               * When FlashList is wrapped with Animated.createAnimatedComponent, the ref type
               * becomes AnimatedRef<FlashListRef> instead of FlashListRef. However, at runtime,
               * the ref works correctly and exposes all FlashList methods (scrollToOffset, etc.).
               *
               * This is a known issue: https://github.com/software-mansion/react-native-reanimated/issues/4995
               * The workaround is to use @ts-expect-error since the runtime behavior is correct.
               *
               * Alternative solutions considered but rejected:
               * - Using 'any' type for ref: Loses all type safety
               * - Separate ref types: Requires maintaining two ref definitions
               * - Not using Animated component: Loses UI-thread scroll performance
               */
              // @ts-expect-error - AnimatedFlashList ref type incompatible with FlashListRef (runtime behavior is correct)
              ref={scrollViewRef}
              data={sortedSentences}
              renderItem={renderSentenceItem}
              keyExtractor={sentenceKeyExtractor}
              contentContainerStyle={contentContainerStyle}
              ListHeaderComponent={headerComponent}
              ListFooterComponent={footerComponent}
              onScroll={
                onScrollAnimated as unknown as (
                  event: NativeSyntheticEvent<NativeScrollEvent>,
                ) => void
              }
              onScrollBeginDrag={handleScrollBegin}
              onViewableItemsChanged={handleViewableItemsChanged}
              onMomentumScrollEnd={handleScrollEnd}
              viewabilityConfig={viewabilityConfig}
              scrollEventThrottle={SCROLL_THROTTLE}
              showsVerticalScrollIndicator={true}
              removeClippedSubviews={true}
              alwaysBounceVertical={true}
              bounces={true}
              overScrollMode="always"
              extraData={{
                themeMode: colors.text, // Track theme changes via stable color value
              }}
              onLoad={onFlashListLoad}
            />
          </View>
        ) : null}
      </Animated.View>

      {/* Floating action buttons - completely outside Animated.View to avoid gesture conflicts */}
      {sortedSentences.length > 0 && (
        <FloatingActionButtons
          isInReadingList={isInReadingList}
          onToggleReadingList={onToggleReadingList}
          onClose={onClose}
        />
      )}
    </View>
  );
};

ArticleContentInternal.displayName = 'ArticleContent';

export const ArticleContent = memo(ArticleContentInternal);
