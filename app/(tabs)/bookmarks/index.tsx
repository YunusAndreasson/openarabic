import { EmptyState } from '@common/EmptyState';
import { ListSeparator } from '@common/ListSeparator';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';

import { ThemedView } from '@/components/ThemedView';
import { BottomControls } from '@/components/bookmarks/BottomControls';
import { ListenListItemCard } from '@/components/bookmarks/ListenListItemCard';
import { useToast } from '@/components/providers/ToastProvider';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { articleQueries } from '@/constants/queries';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useBookmarksScreen, useListenUI } from '@/hooks/bookmarks';
import { useColors } from '@/hooks/theme';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useStableBoolean } from '@/hooks/ui/useStableBoolean';
import type { Article } from '@/types/articles.types';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { AudioAction, ToastType } from '@/types/enums';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { generateImageUrl } from '@/utils/imageUtils';
import { formatAuthorCategory } from '@/utils/stringUtils';
// v2 handles layout automatically - no overrideFixedHeight needed

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  flexOne: {
    flex: 1,
  },
});

// Use responsive height calculation instead of hardcoded value
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.AUDIO_ITEM;

// Memoized separator component for both DraggableFlatList and FlashList
const ItemSeparator = memo(() => <ListSeparator height={LAYOUT.SPACING.SMALL} />);

// Memoized key extractor to prevent inline function creation
const keyExtractor = (item: BookmarkItem) => `${item.article_id}`;

// Memoized list item with optimized comparison
const ListenListItem = memo(
  ({
    item,
    editMode,
    onDelete,
    onArticlePress,
    drag,
    _isBeingDragged,
    progressPercentage,
  }: {
    item: BookmarkItem;
    editMode: boolean;
    onDelete: (id: number) => void;
    onArticlePress: (articleId: number, title: string) => void;
    drag?: () => void;
    _isBeingDragged?: boolean;
    progressPercentage?: number;
  }) => {
    // Memoize event handlers to prevent inline function creation
    const handleDelete = useCallback(() => {
      onDelete(item.article_id);
    }, [onDelete, item.article_id]);

    const handlePress = useCallback(() => {
      if (!editMode) {
        onArticlePress(item.article_id, item.articles.title);
      }
    }, [editMode, onArticlePress, item.article_id, item.articles.title]);

    // Memoize drag handle props to prevent object recreation
    const dragHandleProps = useMemo(() => {
      if (!drag) return undefined;
      return {
        onLongPress: drag,
        delayLongPress: TIMING_CONFIG.FAST.duration,
      };
    }, [drag]);

    const authorCategoryText = formatAuthorCategory(
      item.articles.author.name,
      item.articles.category.name,
    );

    return (
      <ListenListItemCard
        title={item.articles.title}
        secondaryText={authorCategoryText}
        editMode={editMode}
        isBeingDragged={_isBeingDragged}
        onDelete={handleDelete}
        // Entire card triggers article navigation when not in edit mode
        onPress={!editMode ? handlePress : undefined}
        // Add article image for bookmarks-style appearance
        imageUrl={generateImageUrl(item.articles.image_url)}
        articleId={item.article_id}
        dragHandleProps={dragHandleProps}
        progressPercentage={progressPercentage}
      />
    );
  },
  (prevProps, nextProps) => {
    // Optimized comparison: only check props that actually change
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    if (prevProps.progressPercentage !== nextProps.progressPercentage) return false;
    return prevProps.item.article_id === nextProps.item.article_id;
  },
);

ListenListItem.displayName = 'ListenListItem';

export default function ListenScreen(): JSX.Element {
  const { editMode, reset } = useEditMode('listen');
  const { showToast } = useToast();
  const { prefetchArticle } = useAppPreloader();
  const colors = useColors();

  // Fetch all articles (same query as library) and extract beginner articles
  const { data: allArticles = [] } = useQuery(articleQueries.all());

  // Get 3 beginner articles for empty state recommendations
  const recommendedArticles = useMemo(() => {
    const beginnerArticles = getBeginnerArticles(allArticles);
    return beginnerArticles.slice(0, 3);
  }, [allArticles]);

  // Reset edit mode when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Reset edit mode when navigating away from the screen
        if (editMode) {
          reset();
        }
      };
    }, [editMode, reset]),
  );

  // Simplified destructuring - only get what we actually use
  const {
    sortedReadingList,
    isReadingListLoading,
    handlePlayAll,
    handleDelete,
    enhancedTracksError,
  } = useBookmarksScreen();

  const { canShowEmpty, handleDragEnd } = useListenUI({
    sortedReadingList,
    editMode,
  });

  // Fetch reading progress for bookmarked articles
  const articleIds = useMemo(
    () => sortedReadingList.map(item => item.article_id),
    [sortedReadingList],
  );
  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  // STABILIZATION: Add local loading state for PLAY ALL button
  const [isPlayAllLoading, setIsPlayAllLoading] = useState(false);
  const playAllTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // STABILIZATION: Debounced button state to prevent flickering
  const hasArticles = sortedReadingList.length > 0;
  const stableHasArticles = useStableBoolean(hasArticles, 100);

  useEffect(() => {
    if (enhancedTracksError) {
      showToast(STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS, 4000, ToastType.ERROR);
    }
  }, [enhancedTracksError, showToast]);

  // STABILIZATION: handled by useStableBoolean

  // STABILIZATION: Enhanced handlePlayAll with loading state and debouncing
  const handlePlayAllStable = useCallback(async () => {
    // Prevent multiple rapid presses
    if (isPlayAllLoading) return;

    // Clear existing timeout
    if (playAllTimeoutRef.current) {
      clearTimeout(playAllTimeoutRef.current);
    }

    try {
      setIsPlayAllLoading(true);
      await handlePlayAll();
    } finally {
      // Add minimum loading time to prevent flickering
      playAllTimeoutRef.current = setTimeout(() => {
        setIsPlayAllLoading(false);
      }, 500);
    }
  }, [handlePlayAll, isPlayAllLoading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (playAllTimeoutRef.current) {
        clearTimeout(playAllTimeoutRef.current);
      }
    };
  }, []);

  const shouldShowEmpty = !stableHasArticles && canShowEmpty && !isReadingListLoading;

  const listContainerStyle = useMemo(
    () => ({
      ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
      // No paddingTop needed - content should be directly under header
      // Account for BottomControls height + tab bar when controls are visible
      paddingBottom: stableHasArticles
        ? LAYOUT.SCREEN_PADDING.bottomWithControls
        : LAYOUT.SPACING.MEDIUM,
      // Enable vertical centering when empty
      ...(shouldShowEmpty ? { flexGrow: 1 } : {}),
    }),
    [stableHasArticles, shouldShowEmpty],
  );

  // Bottom controls positioned above tab bar
  const bottomControlsStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      bottom: LAYOUT.FLOATING_CONTROLS.BOTTOM_POSITION,
      left: 0,
      right: 0,
      overflow: 'visible' as const,
      // STABILIZATION: Use stable hasArticles state and prevent rapid opacity changes
      opacity: stableHasArticles ? 1 : 0,
      pointerEvents: stableHasArticles ? ('auto' as const) : ('none' as const),
      zIndex: 2, // Above the gradient
    }),
    [stableHasArticles],
  );

  // Solid overlay below button to cover gap to tab bar
  const bottomOverlayStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      height: LAYOUT.FLOATING_CONTROLS.BOTTOM_POSITION, // Just cover the gap (4px)
      opacity: stableHasArticles ? 1 : 0,
      pointerEvents: 'none' as const,
      zIndex: 1, // Behind the button controls
      backgroundColor: colors.elevation0,
    }),
    [stableHasArticles, colors.elevation0],
  );

  // Handle article press from recommendations
  const handleRecommendedArticlePress = useCallback(
    (article: Article) => {
      // Prefetch article data after navigation animation completes
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(getArticleRoute(article.id as ArticleId, article.title));
    },
    [prefetchArticle],
  );

  // Memoize shared components to prevent recreation
  const EmptyStateComponent = useMemo(
    () =>
      shouldShowEmpty ? (
        <EmptyState
          title={STRINGS.BOOKMARKS_EMPTY_TITLE}
          description={STRINGS.BOOKMARKS_EMPTY_DESCRIPTION}
          recommendedArticles={recommendedArticles}
          onArticlePress={handleRecommendedArticlePress}
        />
      ) : null,
    [shouldShowEmpty, recommendedArticles, handleRecommendedArticlePress],
  );

  // Create the article press handler
  const handleArticlePress = useCallback(
    (articleId: number, title: string) => {
      // Prefetch article data after navigation animation completes
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(articleId);
      });
      router.push(getArticleRoute(articleId as ArticleId, title));
    },
    [prefetchArticle],
  );

  // Optimized render function - unified for both list types
  const renderItem = useCallback(
    (params: { item: BookmarkItem; index?: number } | RenderItemParams<BookmarkItem>) => {
      const { item } = params;
      const progress = progressMap?.get?.(item.article_id);
      const progressPercentage = progress?.progress_percentage ?? 0;

      // Extract drag props if available (only in DraggableFlatList)
      const drag = 'drag' in params ? params.drag : undefined;
      const isDragging = 'isActive' in params ? params.isActive : false;

      return (
        <ListenListItem
          editMode={editMode}
          item={item}
          onDelete={handleDelete}
          onArticlePress={handleArticlePress}
          drag={drag}
          _isBeingDragged={isDragging}
          progressPercentage={progressPercentage}
        />
      );
    },
    [editMode, handleDelete, handleArticlePress, progressMap],
  );

  // Memoize the key extractor to prevent inline function creation
  const memoizedKeyExtractor = useCallback(keyExtractor, []);

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView includeBottomInset={false} style={styles.flexOne} useSafeArea={false}>
        {editMode ? (
          <DraggableFlatList<BookmarkItem>
            data={sortedReadingList}
            keyExtractor={memoizedKeyExtractor}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            // iOS best practice: Allow natural bounce behavior for tactile feedback
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyStateComponent}
            removeClippedSubviews
            initialNumToRender={6}
            windowSize={7}
          />
        ) : (
          <FlashList<BookmarkItem>
            data={sortedReadingList}
            drawDistance={ITEM_HEIGHT * 3}
            keyExtractor={memoizedKeyExtractor}
            removeClippedSubviews={true}
            scrollEventThrottle={64}
            // iOS best practice: Allow natural bounce behavior for tactile feedback
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyStateComponent}
            ListHeaderComponent={null}
            renderItem={renderItem}
            maintainVisibleContentPosition={{}} // Prevent scroll jumps when items change (enabled by default)
          />
        )}
      </ThemedView>

      {/* Solid overlay below button */}
      <View style={bottomOverlayStyle} />

      {/* STABILIZATION: Bottom controls with stable state and loading indicator */}
      <View style={bottomControlsStyle}>
        <BottomControls
          primaryDisabled={isPlayAllLoading}
          primaryLoading={isPlayAllLoading}
          primaryLabel={AudioAction.PLAY_ALL}
          onPrimaryPress={handlePlayAllStable}
        />
      </View>
    </ThemedView>
  );
}
