import { Ionicons } from '@expo/vector-icons';
import type { FlashListProps } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import React, { memo, useCallback, useMemo, type ReactElement } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken,
  ViewabilityConfig,
} from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import ParallaxHeader from '@/components/article/ParallaxHeader';
import { RelatedArticlesSection } from '@/components/article/RelatedArticlesSection';
// Removed PlayButton import
import { SCROLL_EVENT_THROTTLE, SENTENCE_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
// Removed unused useIsDarkMode import
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { calculateHeaderHeight } from '@/utils/gradientUtils';

// Animated version of FlashList for UI-thread scroll handling
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<any>
);

// Inline utility functions since they're only used in this component
const createViewabilityConfig = () => ({
  itemVisiblePercentThreshold: 50, // Consider item visible when 50% is visible
  minimumViewTime: 100, // Minimum time item must be visible before triggering
});

const createContentContainerStyle = (bottomInset: number, topPadding: number) => ({
  paddingTop: topPadding,
  paddingBottom: bottomInset + 48, // Safe area + comfortable reading space
});

const createListContainerStyle = (backgroundColor: string) => ({
  flex: 1,
  backgroundColor,
  position: 'relative' as const,
});

// Removed fixed overrideItemLayout to allow accurate measurement

const createFlashListConfig = <T,>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize,
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  overrideItemLayout,
  drawDistance,
  scrollEventThrottle = 16,
  showsVerticalScrollIndicator = false,
  removeClippedSubviews = true,
  alwaysBounceVertical = true,
  bounces = true,
  overScrollMode = 'always',
  extraData,
  initialScrollIndex = 0,
}: {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  estimatedItemSize: number;
  contentContainerStyle?: FlashListProps<T>['contentContainerStyle'];
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
  viewabilityConfig?: ViewabilityConfig;
  overrideItemLayout?: (layout: { span?: number; size?: number }) => void;
  drawDistance?: number;
  scrollEventThrottle?: number;
  showsVerticalScrollIndicator?: boolean;
  removeClippedSubviews?: boolean;
  alwaysBounceVertical?: boolean;
  bounces?: boolean;
  overScrollMode?: 'auto' | 'always' | 'never';
  extraData?: unknown;
  initialScrollIndex?: number;
}) => ({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize,
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  overrideItemLayout,
  drawDistance,
  scrollEventThrottle,
  showsVerticalScrollIndicator,
  removeClippedSubviews,
  alwaysBounceVertical,
  bounces,
  overScrollMode,
  extraData,
  initialScrollIndex,
});

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

// Removed unused ArticleTitleProps

// Removed unused ArticleTitle component to simplify file

// Floating action buttons component positioned over parallax header
const FloatingActionButtons = memo<{
  isInReadingList: boolean;
  onToggleReadingList: () => void;
  // Removed onPlayPress and isPlaying props
  onClose: () => void;
}>(({ isInReadingList, onToggleReadingList, onClose }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // No dark mode specific styling needed here

  const buttonStyle = useMemo(
    () => ({
      width: MIN_TOUCH_TARGET.MEDIUM,
      height: MIN_TOUCH_TARGET.MEDIUM,
      borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
      backgroundColor: colors.elevation1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...LAYOUT.ELEVATION.SUBTLE,
    }),
    [colors.elevation1]
  );

  const activeButtonStyle = useMemo(
    () => ({
      ...buttonStyle,
      backgroundColor: colors.elevation2,
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
            color: colors.navigationRipple,
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
            color: colors.navigationRipple,
            radius: MIN_TOUCH_TARGET.MEDIUM / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel={
            isInReadingList ? 'Remove from listening list' : 'Add to listening list'
          }
        >
          <Ionicons
            name="headset"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={isInReadingList ? colors.tint : colors.secondaryText}
          />
        </Pressable>

        {/* Removed Play/Pause button */}
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
  scrollViewRef: React.RefObject<FlashList<Tables<'article_sentences'>>>;
  // Reading list (playlist/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => void;
  // Removed audio playback functionality props
  // Close functionality
  onClose: () => void;
}

export const ArticleContent = memo<ArticleContentProps>(
  ({
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
    // Removed onPlayPress and isPlaying props
    onClose,
  }) => {
    const insets = useSafeAreaInsets();

    // Compute header height once per safe-area change
    const headerHeight = useMemo(() => calculateHeaderHeight(insets.top), [insets.top]);

    // Shared scroll value for parallax header
    const scrollY = useSharedValue(0);
    // Reduce cross-thread calls by emitting JS updates only when change is meaningful
    const lastEmittedY = useSharedValue(0);

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
        scrollY.value = y;
        // Emit to JS only if scrolled enough to matter to header/tooltip logic
        const dy = Math.abs(y - lastEmittedY.value);
        if (dy >= 8 || y === 0) {
          lastEmittedY.value = y;
          runOnJS(handleScrollJS)(y);
        }
      },
    });

    // Reserve right-side space so text never sits under floating action buttons
    // Updated to account for only one button now (playlist button)
    const rightOverlayPadding = useMemo(() => MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.LARGE, []);

    // Render title/author below the hero image but above content
    const headerComponent = useMemo(
      () => (
        <View>
          <View style={[styles.titleContainer, { paddingRight: rightOverlayPadding }]}>
            <ThemedText
              type="heading1"
              colorName="headingText"
              style={[styles.titleText, { textAlign: 'left' }]}
            >
              {article.title}
            </ThemedText>
          </View>

          <View style={[styles.authorContainer, { paddingRight: rightOverlayPadding }]}>
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
            <View style={[styles.summaryContainer, { paddingRight: rightOverlayPadding }]}>
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
        </View>
      ),
      [article.title, article.author, article.summary, rightOverlayPadding]
    );

    // Get articles from cache for recommendations (avoid re-querying here)
    const queryClient = useQueryClient();
    const articlesData = queryClient.getQueryData<Article[]>(['articles']) || [];

    // Memoized footer component with stable references
    const footerComponent = useMemo(
      () => <RelatedArticlesSection currentArticleId={article.id} articlesData={articlesData} />,
      [article.id, articlesData]
    );

    // Memoized content container style
    const contentContainerStyle = useMemo(
      () => createContentContainerStyle(insets.bottom, headerHeight),
      [insets.bottom, headerHeight]
    );

    // Memoized list container style
    const listContainerStyle = useMemo(
      () => createListContainerStyle(colors.background),
      [colors.background]
    );

    // Memoized viewability config
    const viewabilityConfig = useMemo(() => createViewabilityConfig(), []);

    // Memoize the key extractor to prevent inline function creation
    const keyExtractor = useCallback((item: Tables<'article_sentences'>) => item.id.toString(), []);

    // Create FlashList configuration
    const flashListConfig = useMemo(
      () =>
        createFlashListConfig({
          data: sortedSentences,
          renderItem: renderSentenceItem,
          keyExtractor,
          estimatedItemSize: SENTENCE_ITEM_HEIGHT,
          contentContainerStyle,
          ListHeaderComponent: headerComponent,
          ListFooterComponent: footerComponent,
          onScroll: onScrollAnimated as unknown as (
            event: NativeSyntheticEvent<NativeScrollEvent>
          ) => void,
          onViewableItemsChanged: handleViewableItemsChanged,
          viewabilityConfig,
          drawDistance: SENTENCE_ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER,
          scrollEventThrottle: SCROLL_THROTTLE,
          showsVerticalScrollIndicator: false,
          removeClippedSubviews: true,
          alwaysBounceVertical: true,
          bounces: true,
          overScrollMode: 'always',
          initialScrollIndex: 0,
        }),
      [
        sortedSentences,
        renderSentenceItem,
        keyExtractor,
        contentContainerStyle,
        headerComponent,
        footerComponent,
        onScrollAnimated,
        handleViewableItemsChanged,
        viewabilityConfig,
      ]
    );

    return (
      <View style={styles.flexOne}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View style={listContainerStyle}>
            {/* Sticky Parallax Header behind content */}
            <ParallaxHeader article={article} colors={colors} scrollY={scrollY} />
            <AnimatedFlashList
              ref={scrollViewRef as unknown as React.RefObject<any>}
              key={`article-${id}`}
              {...flashListConfig}
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
              // Removed onPlayPress and isPlaying props
              onClose={onClose}
            />
          </View>
        ) : null}
      </View>
    );
  },
  // Simplified memo comparison function - only check primitive values and stable references
  (prevProps, nextProps) => {
    // Check primitive values first for early return
    if (prevProps.id !== nextProps.id || prevProps.isInReadingList !== nextProps.isInReadingList) {
      return false;
    }

    // Check stable references
    if (
      prevProps.article.id !== nextProps.article.id ||
      prevProps.article.title !== nextProps.article.title ||
      prevProps.article.author.id !== nextProps.article.author.id ||
      prevProps.article.author.name !== nextProps.article.author.name ||
      prevProps.sortedSentences !== nextProps.sortedSentences ||
      prevProps.renderSentenceItem !== nextProps.renderSentenceItem ||
      prevProps.handleScroll !== nextProps.handleScroll ||
      prevProps.handleViewableItemsChanged !== nextProps.handleViewableItemsChanged ||
      prevProps.onToggleReadingList !== nextProps.onToggleReadingList ||
      prevProps.onClose !== nextProps.onClose
    ) {
      return false;
    }

    return true;
  }
);

ArticleContent.displayName = 'ArticleContent';
