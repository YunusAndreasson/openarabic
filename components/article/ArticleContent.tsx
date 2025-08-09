import { Ionicons } from '@expo/vector-icons';
import type { FlashListProps } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import React, { Fragment, memo, useCallback, useMemo, type ReactElement } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken,
  ViewabilityConfig,
} from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import ParallaxHeader from '@/components/article/ParallaxHeader';
import { RelatedArticlesSection } from '@/components/article/RelatedArticlesSection';
import { SentenceScrubber } from '@/components/article/SentenceScrubber';
import PlayButton from '@/components/listen/PlayButton';
import { SCROLL_EVENT_THROTTLE, SENTENCE_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Inline utility functions since they're only used in this component
const createViewabilityConfig = () => ({
  itemVisiblePercentThreshold: 50, // Consider item visible when 50% is visible
  minimumViewTime: 100, // Minimum time item must be visible before triggering
});

const createContentContainerStyle = (bottomInset: number) => ({
  paddingTop: 0,
  paddingBottom: bottomInset + 48, // Safe area + comfortable reading space
});

const createListContainerStyle = (backgroundColor: string) => ({
  flex: 1,
  height: 100,
  backgroundColor,
});

const createOverrideItemLayout =
  (itemHeight: number) => (layout: { span?: number; size?: number }) => {
    layout.size = itemHeight;
  };

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
  alwaysBounceVertical = false,
  bounces = true,
  overScrollMode = 'never',
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
    height: '100%',
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
  },
  playIconOffset: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
});

// Static constants for better performance
const SENTENCE_ITEM_HEIGHT = LAYOUT.SENTENCE_ITEM.HEIGHT;
const SCROLL_THROTTLE = SCROLL_EVENT_THROTTLE;
const DRAW_DISTANCE_MULTIPLIER = SENTENCE_DRAW_DISTANCE_MULTIPLIER;

interface ArticleTitleProps {
  title: string;
  author: { id: number; name: string };
}

const ArticleTitle = memo<ArticleTitleProps>(({ title, author }) => {
  const colors = useColors();

  // Memoize dynamic styles for better performance
  // Use default heading1 typography without overriding size/line-height
  const titleStyle = useMemo(
    () => ({
      textAlign: 'left' as const,
    }),
    []
  );

  // Author style now relies on ThemedText tokens
  const authorStyle = useMemo(
    () => ({
      textAlign: 'left' as const,
    }),
    []
  );

  return (
    <>
      {/* Title gets full width without button interference */}
      <View style={styles.titleContainer}>
        <ThemedText type="heading1" colorName="headingText" style={[styles.titleText, titleStyle]}>
          {title}
        </ThemedText>
      </View>

      {/* Author information */}
      <View style={styles.authorContainer}>
        <ThemedText type="body" weight="medium" colorName="authorText" style={authorStyle}>
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
  const isDarkMode = useIsDarkMode();

  const buttonStyle = useMemo(
    () => ({
      width: MIN_TOUCH_TARGET.MEDIUM,
      height: MIN_TOUCH_TARGET.MEDIUM,
      borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
      backgroundColor: colors.elevation1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      // Reduce prominence in light mode where light colors are more visible
      opacity: isDarkMode ? 0.7 : 0.45, // More subtle in light mode, more visible in dark mode
      ...LAYOUT.ELEVATION.SUBTLE,
    }),
    [colors.elevation1, isDarkMode]
  );

  const activeButtonStyle = useMemo(
    () => ({
      ...buttonStyle,
      backgroundColor: colors.elevation2,
      // Slightly higher opacity for active state but still more subtle in light mode
      opacity: isDarkMode ? 0.85 : 0.6,
    }),
    [buttonStyle, colors.elevation2, isDarkMode]
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

        {/* Play/Pause button - unified with playlist and mini-player */}
        <View style={isPlaying ? activeButtonStyle : buttonStyle}>
          <PlayButton isPlaying={isPlaying} onPress={onPlayPress} />
        </View>
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

    // Optimized scroll handler with stable reference
    const handleAnimatedScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        handleScroll(event);
      },
      [handleScroll]
    );

    // Memoized header component with stable references
    const headerComponent = useMemo(
      () => (
        <Fragment>
          <ParallaxHeader article={article} colors={colors} />
          <ArticleTitle title={article.title} author={article.author} />
        </Fragment>
      ),
      [article.id, article.title, article.author.id, article.author.name, colors]
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
      () => createContentContainerStyle(insets.bottom),
      [insets.bottom]
    );

    // Memoized list container style
    const listContainerStyle = useMemo(
      () => createListContainerStyle(colors.background),
      [colors.background]
    );

    // Memoized viewability config
    const viewabilityConfig = useMemo(() => createViewabilityConfig(), []);

    // Static override layout callback
    const overrideItemLayout = useCallback(createOverrideItemLayout(SENTENCE_ITEM_HEIGHT), []);

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
          onScroll: handleAnimatedScroll,
          onViewableItemsChanged: handleViewableItemsChanged,
          viewabilityConfig,
          overrideItemLayout,
          drawDistance: SENTENCE_ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER,
          scrollEventThrottle: SCROLL_THROTTLE,
          showsVerticalScrollIndicator: false,
          removeClippedSubviews: true,
          alwaysBounceVertical: false,
          bounces: true,
          overScrollMode: 'auto',
          extraData: '',
          initialScrollIndex: 0,
        }),
      [
        sortedSentences,
        renderSentenceItem,
        keyExtractor,
        contentContainerStyle,
        headerComponent,
        footerComponent,
        handleAnimatedScroll,
        handleViewableItemsChanged,
        viewabilityConfig,
        overrideItemLayout,
      ]
    );

    return (
      <View style={styles.flexOne}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View style={listContainerStyle}>
            <FlashList ref={scrollViewRef} key={`article-${id}`} {...flashListConfig} />

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
  // Simplified memo comparison function - only check primitive values and stable references
  (prevProps, nextProps) => {
    // Check primitive values first for early return
    if (
      prevProps.id !== nextProps.id ||
      prevProps.currentSentenceIndex !== nextProps.currentSentenceIndex ||
      prevProps.totalSentences !== nextProps.totalSentences ||
      prevProps.isInReadingList !== nextProps.isInReadingList ||
      prevProps.isPlaying !== nextProps.isPlaying
    ) {
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
      prevProps.onPlayPress !== nextProps.onPlayPress ||
      prevProps.onClose !== nextProps.onClose
    ) {
      return false;
    }

    return true;
  }
);

ArticleContent.displayName = 'ArticleContent';
