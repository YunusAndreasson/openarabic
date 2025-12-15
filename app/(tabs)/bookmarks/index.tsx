import { ListSeparator } from '@/components/common';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';

import { ThemedView } from '@/components/ThemedView';
import { BottomControls, SavedEmptyState } from '@/components/bookmarks';
import { ListenListItemCard } from '@/components/bookmarks';
import { useToast } from '@/components/providers';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useBookmarksScreen, useListenUI } from '@/hooks/bookmarks';
import { useColors } from '@/hooks/theme';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useStableBoolean } from '@/hooks/ui/useStableBoolean';
import type { BookmarkItem } from '@/types/bookmark.types';
import { AudioAction, ToastType } from '@/types/enums';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadata } from '@/utils/stringUtils';
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
  }: {
    item: BookmarkItem;
    editMode: boolean;
    onDelete: (id: number) => void;
    onArticlePress: (articleId: number, title: string) => void;
    drag?: () => void;
    _isBeingDragged?: boolean;
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

    const authorCategoryText = getArticleMetadata(item.articles);

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
        imageUrl={generateStorageUrl('images', item.articles.image_url)}
        articleId={item.article_id}
        dragHandleProps={dragHandleProps}
      />
    );
  },
  (prevProps, nextProps) => {
    // Optimized comparison: only check props that actually change
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    return prevProps.item.article_id === nextProps.item.article_id;
  },
);

ListenListItem.displayName = 'ListenListItem';

export default function ListenScreen(): JSX.Element {
  const { editMode, reset } = useEditMode('listen');
  const { showToast } = useToast();
  const colors = useColors();

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
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  } = useBookmarksScreen();

  const { canShowEmpty, handleDragEnd } = useListenUI({
    sortedReadingList,
    editMode,
  });

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

  // Show bottom controls only when has articles
  const showBottomControls = stableHasArticles;

  // Bottom controls positioned above tab bar
  const bottomControlsStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      bottom: LAYOUT.FLOATING_CONTROLS.BOTTOM_POSITION,
      left: 0,
      right: 0,
      overflow: 'visible' as const,
      zIndex: 2, // Above the gradient
    }),
    [],
  );

  // Solid overlay below button to cover gap to tab bar
  const bottomOverlayStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      height: LAYOUT.FLOATING_CONTROLS.BOTTOM_POSITION, // Just cover the gap (4px)
      pointerEvents: 'none' as const,
      zIndex: 1, // Behind the button controls
      backgroundColor: colors.elevation0,
    }),
    [colors.elevation0],
  );

  // Memoize shared components to prevent recreation
  const EmptyStateComponent = useMemo(
    () => (shouldShowEmpty ? <SavedEmptyState /> : null),
    [shouldShowEmpty],
  );

  // Create the article press handler - plays audio in miniplayer
  const handleArticlePress = useCallback(
    (articleId: number, _title: string) => {
      handleArticlePlay(articleId);
    },
    [handleArticlePlay],
  );

  // Optimized render function - unified for both list types
  const renderItem = useCallback(
    (params: { item: BookmarkItem; index?: number } | RenderItemParams<BookmarkItem>) => {
      const { item } = params;

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
        />
      );
    },
    [editMode, handleDelete, handleArticlePress],
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
      {showBottomControls && <View style={bottomOverlayStyle} />}

      {/* Bottom controls - shows Play All when has articles */}
      {showBottomControls && (
        <View style={bottomControlsStyle}>
          <BottomControls
            primaryDisabled={isPlayAllLoading}
            primaryLoading={isPlayAllLoading}
            primaryLabel={AudioAction.PLAY_ALL}
            onPrimaryPress={handlePlayAllStable}
          />
        </View>
      )}
    </ThemedView>
  );
}
