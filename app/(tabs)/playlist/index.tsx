import { ListSeparator, LoadingState } from '@/components/common';
import { useFocusEffect } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SavedEmptyState, PlaylistItemCard } from '@/components/playlist';
import { useToast } from '@/components/providers';
import { TIMING_CONFIG } from '@/constants/animation';
import { PinnedActionButton } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePlaylistScreen, usePlaylistUI } from '@/hooks/playlist';
import { usePlaylistHeaderActions } from '@/hooks/playlist/usePlaylistHeaderActions';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useAppSelector } from '@/store/hooks';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { AudioLanguage, ToastType } from '@/types/enums';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadata } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  bilingualCaption: {
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
});

// Surfaces the bilingual-audio payoff in the main flow (otherwise it's only
// described in Account settings and the FAQ)
const BilingualCaption = memo(() => (
  <ThemedText type="caption" colorName="secondaryText" style={styles.bilingualCaption}>
    {STRINGS.PLAYLIST_BILINGUAL_CAPTION}
  </ThemedText>
));
BilingualCaption.displayName = 'BilingualCaption';

// Use responsive height calculation instead of hardcoded value
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.AUDIO_ITEM;

// FlashList recycles row views. Reanimated entering layout animations can be
// interrupted while a recycled view is being rebound, leaving the native view
// at an in-between opacity. A CSS keyframe returns to the explicit base opacity
// after the animation, so every row deterministically settles fully visible.
const ROW_FADE_IN_STYLE = {
  opacity: 1,
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${TIMING_CONFIG.MEDIUM.duration}ms`,
  animationFillMode: 'backwards' as const,
} as ReanimatedCSSAnimationStyle;

// Memoized separator component for both DraggableFlatList and FlashList
const ItemSeparator = memo(() => <ListSeparator height={LAYOUT.SPACING.SMALL} />);
ItemSeparator.displayName = 'ItemSeparator';

// Memoized key extractor to prevent inline function creation
const keyExtractor = (item: BookmarkItem) => `${item.article_id}`;

// Memoized list item with optimized comparison
const PlaylistListItem = memo(
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
    onDelete: (id: ArticleId) => void;
    onArticlePress: (articleId: ArticleId, title: string) => void;
    drag?: () => void;
    _isBeingDragged?: boolean;
  }) => {
    // Memoize event handlers to prevent inline function creation
    const handleDelete = useCallback(() => {
      onDelete(item.article_id as ArticleId);
    }, [onDelete, item.article_id]);

    const handlePress = useCallback(() => {
      if (!editMode) {
        onArticlePress(item.article_id as ArticleId, item.articles.title);
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
      <Animated.View
        style={ROW_FADE_IN_STYLE}
        exiting={FadeOut.duration(TIMING_CONFIG.FAST.duration)}
      >
        <PlaylistItemCard
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
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // Optimized comparison: only check props that actually change
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    return prevProps.item.article_id === nextProps.item.article_id;
  },
);

PlaylistListItem.displayName = 'PlaylistListItem';

export default function PlaylistScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const { editMode, reset } = useEditMode('playlist');
  const { showToast } = useToast();

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
    shouldShowInitialLoading,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  } = usePlaylistScreen();

  const { canShowEmpty, handleDragEnd } = usePlaylistUI({
    sortedReadingList,
    editMode,
  });

  // Check if there are articles for UI state
  const hasArticles = sortedReadingList.length > 0;

  // Play All action (reuses existing hook logic)
  const { handlePlayAll, isLoading: isPlayAllLoading } = usePlaylistHeaderActions();
  const { currentArticle } = useGlobalAudioState();
  const isMiniPlayerVisible = Boolean(currentArticle);

  // "Plays English first, then Arabic" — only when bilingual audio is active
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);
  const showBilingualCaption = hasArticles && audioPreference === AudioLanguage.ENGLISH_ARABIC;

  useEffect(() => {
    if (enhancedTracksError) {
      showToast(STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS, 4000, ToastType.ERROR);
    }
  }, [enhancedTracksError, showToast]);

  const shouldShowEmpty = !hasArticles && canShowEmpty && !isReadingListLoading;

  const listContainerStyle = useMemo(
    () => ({
      ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
      // 12px first-content lead-in under the header — same rhythm as Explore/Practice
      paddingTop: LAYOUT.SPACING.MEDIUM,
      // Room for the pinned play-all button so the last row never hides behind it
      paddingBottom: LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XLARGE + insets.bottom,
    }),
    [insets.bottom],
  );

  // Create the article press handler - plays audio in miniplayer
  const handleArticlePress = useCallback(
    (articleId: ArticleId, _title: string) => {
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
        <PlaylistListItem
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

  // keyExtractor is a module-level constant, already stable.
  const memoizedKeyExtractor = keyExtractor;

  if (shouldShowInitialLoading) {
    return (
      <ThemedView useSafeArea={false} style={styles.container}>
        <LoadingState />
      </ThemedView>
    );
  }

  if (shouldShowEmpty) {
    return (
      <ThemedView useSafeArea={false} style={styles.container}>
        <SavedEmptyState />
      </ThemedView>
    );
  }

  const showPlayAll = hasArticles && !shouldShowEmpty && !isMiniPlayerVisible;

  return (
    <>
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
          // `automatic` is required for the iOS large-title collapse-on-scroll
          // animation that the parent Stack.Screen opts into.
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={true}
          // The list is the route's primary scrollable — must fill the screen
          // for UIKit to collapse the large title (per RN-Stack docs).
          containerStyle={styles.container}
          contentContainerStyle={listContainerStyle}
          ItemSeparatorComponent={ItemSeparator}
          removeClippedSubviews
          initialNumToRender={6}
          windowSize={7}
        />
      ) : (
        <FlashList<BookmarkItem>
          data={sortedReadingList}
          drawDistance={ITEM_HEIGHT * 3}
          keyExtractor={memoizedKeyExtractor}
          scrollEventThrottle={64}
          // iOS best practice: Allow natural bounce behavior for tactile feedback
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
          // `automatic` is required for the iOS large-title collapse-on-scroll
          // animation that the parent Stack.Screen opts into.
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={true}
          contentContainerStyle={listContainerStyle}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={showBilingualCaption ? <BilingualCaption /> : null}
          renderItem={renderItem}
          maintainVisibleContentPosition={{}} // Prevent scroll jumps when items change (enabled by default)
        />
      )}
      {showPlayAll && (
        <PinnedActionButton
          title={STRINGS.PLAY_ALL}
          onPress={handlePlayAll}
          loading={isPlayAllLoading}
        />
      )}
    </>
  );
}
