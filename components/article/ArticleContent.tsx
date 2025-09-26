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
import {
  SCROLL_EVENT_THROTTLE,
  SENTENCE_DRAW_DISTANCE_MULTIPLIER,
  TIMING_CONFIG,
} from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { SentenceWord } from '@/types/vocabulary.types';
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

// Comfortable reading space constant
const COMFORTABLE_READING_SPACE = MIN_TOUCH_TARGET.MEDIUM;

const createContentContainerStyle = (bottomInset: number, topPadding: number) => ({
  paddingTop: topPadding,
  paddingBottom: bottomInset + COMFORTABLE_READING_SPACE, // Safe area + comfortable reading space
});

const createListContainerStyle = (backgroundColor: string) => ({
  flex: 1,
  backgroundColor,
  position: 'relative' as const,
});

const createFlashListConfig = <T,>({
  data,
  renderItem,
  keyExtractor,
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  drawDistance,
  scrollEventThrottle = 16,
  showsVerticalScrollIndicator = false,
  removeClippedSubviews = true,
  alwaysBounceVertical = true,
  bounces = true,
  overScrollMode = 'always',
  extraData,
  initialScrollIndex,
}: {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  contentContainerStyle?: FlashListProps<T>['contentContainerStyle'];
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
  viewabilityConfig?: ViewabilityConfig;
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
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
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

// Floating action buttons component positioned over parallax header
const FloatingActionButtons = memo<{
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  hasAudio?: boolean;
  isPlaying?: boolean;
  onPlayPress?: () => void;
  onClose: () => void;
}>(
  ({
    isInReadingList,
    onToggleReadingList,
    hasAudio = false,
    isPlaying = false,
    onPlayPress,
    onClose,
  }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [optimisticIsInReadingList, setOptimisticIsInReadingList] =
      React.useState(isInReadingList);
    // No dark mode specific styling needed here

    // Sync optimistic state with prop when it changes (from external updates)
    React.useEffect(() => {
      setOptimisticIsInReadingList(isInReadingList);
    }, [isInReadingList]);

    // Optimistic toggle handler
    const handleOptimisticToggle = React.useCallback(async () => {
      // Optimistic update - immediately show the new state
      const newState = !optimisticIsInReadingList;
      setOptimisticIsInReadingList(newState);

      try {
        await onToggleReadingList();
        // Success - the optimistic state should match the actual state now
      } catch {
        // Revert optimistic update on error
        setOptimisticIsInReadingList(optimisticIsInReadingList);
        // Error handling completed silently
      }
    }, [onToggleReadingList, optimisticIsInReadingList]);

    const buttonStyle = useMemo(
      () => ({
        width: MIN_TOUCH_TARGET.MEDIUM,
        height: MIN_TOUCH_TARGET.MEDIUM,
        borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
        backgroundColor: colors.elevation1,
        opacity: 0.65, // 2025 best practice: More subtle circular background
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
        opacity: 0.75, // 2025 best practice: Slightly more visible when active
      }),
      [buttonStyle, colors.elevation2]
    );

    // Memoize button positions with safe area insets
    const closeButtonStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.LARGE, // Increased from SMALL to LARGE for better spacing
        left: LAYOUT.SPACING.SMALL,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
      }),
      [insets.top]
    );

    const actionButtonsStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.LARGE, // Increased from SMALL to LARGE for better spacing
        right: LAYOUT.SPACING.SMALL,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
        flexDirection: 'row' as const,
        gap: LAYOUT.SPACING.TINY,
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
          {/* Play button - only show if article has audio */}
          {hasAudio && onPlayPress && (
            <Pressable
              style={isPlaying ? activeButtonStyle : buttonStyle}
              onPress={onPlayPress}
              android_ripple={{
                color: colors.navigationRipple,
                radius: MIN_TOUCH_TARGET.MEDIUM / 2,
              }}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={isPlaying ? colors.tint : colors.secondaryText}
              />
            </Pressable>
          )}

          {/* Playlist button */}
          <Pressable
            style={optimisticIsInReadingList ? activeButtonStyle : buttonStyle}
            onPress={handleOptimisticToggle}
            android_ripple={{
              color: colors.navigationRipple,
              radius: MIN_TOUCH_TARGET.MEDIUM / 2,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              optimisticIsInReadingList ? 'Remove from bookmarks' : 'Add to bookmarks'
            }
          >
            <Ionicons
              name="bookmark"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={optimisticIsInReadingList ? colors.tint : colors.secondaryText}
            />
          </Pressable>
        </View>
      </>
    );
  }
);

FloatingActionButtons.displayName = 'FloatingActionButtons';

interface ArticleContentProps {
  id: string;
  article: Article;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  colors: ThemeColors;
  scrollViewRef: React.RefObject<any>;
  // Reading list (bookmarks/listening) functionality
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  // Audio playback functionality
  hasAudio?: boolean;
  isPlaying?: boolean;
  onPlayPress?: () => void;
  currentHighlightedWord?: SentenceWord | null;
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
    hasAudio = false,
    isPlaying = false,
    onPlayPress,
    currentHighlightedWord = null,
    onClose,
  }) => {
    const insets = useSafeAreaInsets();

    // Compute header height once per safe-area change
    const headerHeight = useMemo(() => calculateHeaderHeight(insets.top), [insets.top]);

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
    // Updated to account for only one button now (bookmarks button)
    const rightOverlayPadding = useMemo(() => MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.LARGE, []);

    const titleContainerStyle = useMemo(
      () => [
        styles.titleContainer,
        {
          paddingRight: rightOverlayPadding,
          marginTop: -(LAYOUT.SPACING.XXXLARGE + LAYOUT.SPACING.SMALL),
        },
      ],
      [rightOverlayPadding]
    );

    const authorContainerStyle = useMemo(
      () => [styles.authorContainer, { paddingRight: rightOverlayPadding }],
      [rightOverlayPadding]
    );

    const summaryContainerStyle = useMemo(
      () => [styles.summaryContainer, { paddingRight: rightOverlayPadding }],
      [rightOverlayPadding]
    );

    const dividerStyle = {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      opacity: 0.4,
      marginHorizontal: LAYOUT.SPACING.MEDIUM,
      marginBottom: LAYOUT.SPACING.MEDIUM,
    } as const;

    // Render title/author below the hero image but above content
    const headerComponent = useMemo(
      () => (
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
      ),
      [article, titleContainerStyle, authorContainerStyle, summaryContainerStyle]
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

    // Create FlashList v2 configuration - no estimates needed
    const flashListConfig = useMemo(
      () =>
        createFlashListConfig({
          data: sortedSentences,
          renderItem: renderSentenceItem,
          keyExtractor,
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
          // v2 performance optimizations - maxItemsInRecyclePool is set directly on FlashList
          // Do not set an initialScrollIndex so FlashList starts at absolute top
          // Force re-render when highlight state changes
          extraData: {
            currentHighlightedWord,
          },
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
        currentHighlightedWord,
      ]
    );

    return (
      <Animated.View style={[styles.flexOne, animatedStyle]}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View style={listContainerStyle}>
            {/* Sticky Parallax Header behind content */}
            <ParallaxHeader article={article} colors={colors} scrollY={scrollY} />
            <AnimatedFlashList
              ref={scrollViewRef as unknown as React.RefObject<any>}
              key={`article-${id}`}
              {...flashListConfig}
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
              onClose={onClose}
            />
          </View>
        ) : null}
      </Animated.View>
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
