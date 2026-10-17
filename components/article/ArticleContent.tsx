import type { FlashListProps, FlashListRef, ViewToken } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, type ComponentType, type ReactElement, type RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/primitives/ThemedText';
import { FloatingActionButtons } from '@/components/article/FloatingActionButtons';
import { HeaderScrim } from '@/components/article/HeaderScrim';
import { ParallaxHeader } from '@/components/article/ParallaxHeader';
import { RelatedArticlesSection } from '@/components/article/RelatedArticlesSection';
import { SCROLL_EVENT_THROTTLE, TIMING_CONFIG, fadeInStyle } from '@/constants/animation';
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
import type { ThemeColors } from '@/types/ui/theme.types';
import { calculateHeaderHeight } from '@/utils/gradientUtils';
import { STRINGS } from '@/constants/strings';
import { getArticleMetadata } from '@/utils/stringUtils';

// Animated version of FlashList for UI-thread scroll handling
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as ComponentType<FlashListProps<Tables<'article_sentences'>>>,
);

// Mount fade-in — CSS @keyframes, module-level so no per-render allocation
const MOUNT_FADE_IN_STYLE = fadeInStyle(TIMING_CONFIG.FAST.duration, 'forwards');

// Comfortable reading space constant
const COMFORTABLE_READING_SPACE = MIN_TOUCH_TARGET.MEDIUM;

// FlashList requires a referentially stable viewabilityConfig
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 15, // Only count items near top (15% visible)
  minimumViewTime: 0, // Immediate updates for accurate scrubber tracking
  waitForInteraction: false, // Update during scroll for real-time sync
};

/**
 * How much the title block overlaps the parallax hero gradient at the bottom.
 * Tuned so the title sits inside the gradient fade-out (not under the bright
 * image area), giving a magazine-style hero / title relationship.
 */
const TITLE_HERO_OVERLAP = LAYOUT.SPACING.XXXLARGE + LAYOUT.SPACING.SMALL; // 56

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
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    marginTop: -TITLE_HERO_OVERLAP,
    paddingBottom: LAYOUT.SPACING.SMALL,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  titleText: {
    width: '100%',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE, // 38
    letterSpacing: LETTER_SPACING.EXTRA_TIGHT, // -0.5
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.XXHUGE * LINE_HEIGHT_MULTIPLIERS.TIGHT), // 1.2 — multi-line spacing
    textShadowOffset: LAYOUT.TEXT_SHADOW.offset,
    textShadowRadius: LAYOUT.TEXT_SHADOW.radius,
  },
  leftAlign: {
    textAlign: 'left',
  },
  authorContainer: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingBottom: LAYOUT.SPACING.SMALL,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  summaryContainer: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingBottom: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.SMALL,
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
  handleViewableItemsChanged: (info: { viewableItems: ViewToken<unknown>[] }) => void;
  handleScrollEnd: () => void;
  colors: ThemeColors;
  scrollViewRef: RefObject<FlashListRef<Tables<'article_sentences'>>>;
  // Reading list (bookmarks/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  // In-article Listen control
  isListening: boolean;
  isListenLoading: boolean;
  onToggleListen: () => void;
  // Close functionality
  onClose: () => void;
  // FlashList ready callback for scroll-to-position
  onFlashListLoad: () => void;
  selectedRootIds: ReadonlySet<number>;
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
  isListening,
  isListenLoading,
  onToggleListen,
  onClose,
  onFlashListLoad,
  selectedRootIds,
}: ArticleContentProps) {
  const insets = useSafeAreaInsets();

  // React Compiler auto-memoizes
  const { width: windowWidth } = useWindowDimensions();
  const headerHeight = calculateHeaderHeight(insets.top, windowWidth);

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

  // Reserve right-side space so text never sits under the two floating action
  // buttons (Listen + playlist, TINY gap between them)
  // React Compiler auto-memoizes
  const rightOverlayPadding =
    2 * MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.TINY + LAYOUT.SPACING.LARGE;

  // React Compiler auto-memoizes — title needs extra right padding so it never sits
  // under the floating action buttons in the top-right corner.
  const titleContainerStyle = [styles.titleContainer, { paddingRight: rightOverlayPadding }];

  // React Compiler auto-memoizes
  const authorContainerStyle = [styles.authorContainer, { paddingRight: rightOverlayPadding }];

  // 1px solid divider at full border opacity — the previous hairline + 50% opacity
  // was effectively invisible in light mode and a smudge in dark mode.
  const dividerStyle = {
    height: LAYOUT.BORDER.WIDTH.NORMAL,
    backgroundColor: colors.border,
    marginHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
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
          <ThemedText type="caption" colorName="subtitleText" style={styles.summaryText}>
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
  const footerComponent = <RelatedArticlesSection article={article} articlesData={articlesData} />;

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
              onScroll={onScrollAnimated}
              onScrollBeginDrag={handleScrollBegin}
              onViewableItemsChanged={handleViewableItemsChanged}
              onMomentumScrollEnd={handleScrollEnd}
              viewabilityConfig={VIEWABILITY_CONFIG}
              scrollEventThrottle={SCROLL_THROTTLE}
              showsVerticalScrollIndicator={true}
              alwaysBounceVertical={true}
              bounces={true}
              overScrollMode="always"
              extraData={selectedRootIds}
              onLoad={onFlashListLoad}
            />
          </View>
        ) : null}
      </Animated.View>

      {/* Persistent backdrop for the status bar + button row — ParallaxHeader's
          own gradient fades to opacity 0 once content scrolls past the hero
          (by design), so without this, body text scrolls directly under the
          status bar and buttons with no scrim for the rest of the article. */}
      {sortedSentences.length > 0 && (
        <HeaderScrim colors={colors} scrollY={scrollY} headerHeight={headerHeight} />
      )}

      {/* Floating action buttons - completely outside Animated.View to avoid gesture conflicts */}
      {sortedSentences.length > 0 && (
        <FloatingActionButtons
          isInReadingList={isInReadingList}
          onToggleReadingList={onToggleReadingList}
          isListening={isListening}
          isListenLoading={isListenLoading}
          onToggleListen={onToggleListen}
          onClose={onClose}
        />
      )}
    </View>
  );
};

ArticleContentInternal.displayName = 'ArticleContent';

export const ArticleContent = memo(ArticleContentInternal);
