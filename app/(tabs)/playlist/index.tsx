import { ListSeparator } from '@/components/common';
import { ScreenStateHandler } from '@/components/common/ScreenStateHandler';
import { useFocusEffect } from 'expo-router';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import Animated, { FadeOut } from 'react-native-reanimated';

import { SavedEmptyState, PlaylistItemCard } from '@/components/playlist';
import { useToast } from '@/components/providers';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useMiniPlayerClearance } from '@/hooks/audio/useMiniPlayerClearance';
import { useNowPlayingArticleId } from '@/hooks/audio/useNowPlayingArticleId';
import { usePlaylistScreen, usePlaylistUI } from '@/hooks/playlist';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useTabBarAutoHide } from '@/hooks/ui/useTabBarAutoHide';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadata } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
});

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
    moveTrack,
    first,
    last,
    isNowPlaying,
  }: {
    item: BookmarkItem;
    editMode: boolean;
    onDelete: (id: ArticleId) => void;
    onArticlePress: (articleId: ArticleId, title: string) => void;
    moveTrack?: (articleId: number, offset: -1 | 1) => void;
    first: boolean;
    last: boolean;
    drag?: () => void;
    _isBeingDragged?: boolean;
    isNowPlaying: boolean;
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
        moveEarlier: !first && moveTrack ? () => moveTrack(item.article_id, -1) : undefined,
        moveLater: !last && moveTrack ? () => moveTrack(item.article_id, 1) : undefined,
        delayLongPress: TIMING_CONFIG.FAST.duration,
      };
    }, [drag, first, last, moveTrack, item.article_id]);

    const authorCategoryText = getArticleMetadata(item.articles);

    return (
      <Animated.View exiting={FadeOut.duration(TIMING_CONFIG.FAST.duration)}>
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
          isNowPlaying={isNowPlaying}
        />
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // Optimized comparison: only check props that actually change
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    if (prevProps.isNowPlaying !== nextProps.isNowPlaying) return false;
    // The handlers too. They are memoized upstream, so they only change when
    // what a tap does changes — the tracks or the audio language. Skipping
    // them kept each row on the closure it mounted with: after switching the
    // audio language, a row tap still played the old language's URLs.
    if (prevProps.onArticlePress !== nextProps.onArticlePress) return false;
    if (
      prevProps.drag !== nextProps.drag ||
      prevProps.moveTrack !== nextProps.moveTrack ||
      prevProps.first !== nextProps.first ||
      prevProps.last !== nextProps.last
    )
      return false;
    if (prevProps.onDelete !== nextProps.onDelete) return false;
    return prevProps.item.article_id === nextProps.item.article_id;
  },
);

PlaylistListItem.displayName = 'PlaylistListItem';

export default function PlaylistScreen(): JSX.Element {
  const miniPlayerClearance = useMiniPlayerClearance();
  const tabBarAutoHide = useTabBarAutoHide();
  const { editMode, reset } = useEditMode('playlist');
  const { showToast } = useToast();
  // A row tap plays that article, so the row of the article the player is on
  // says so — otherwise nothing in the list tells you which one you hear.
  const nowPlayingArticleId = useNowPlayingArticleId();

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
    readingListLoadFailed,
    retryReadingList,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  } = usePlaylistScreen();

  const { canShowEmpty, handleDragEnd, moveTrack } = usePlaylistUI({
    sortedReadingList,
    editMode,
  });

  // Check if there are articles for UI state
  const hasArticles = sortedReadingList.length > 0;

  useEffect(() => {
    if (enhancedTracksError) {
      showToast(STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS, 4000, ToastType.ERROR);
    }
  }, [enhancedTracksError, showToast]);

  const shouldShowEmpty =
    !hasArticles && canShowEmpty && !isReadingListLoading && !readingListLoadFailed;

  const listContainerStyle = useMemo(
    () => ({
      ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
      // 12px first-content lead-in under the header — same rhythm as Explore/Practice
      paddingTop: LAYOUT.SPACING.MEDIUM,
      // Room for the floating mini player so the last row never hides behind
      // it. Derived from the player's own geometry rather than a constant: a
      // hardcoded inset left the last rows stranded behind it the moment audio
      // started, with no way to scroll them clear.
      paddingBottom: miniPlayerClearance,
    }),
    [miniPlayerClearance],
  );

  // Create the article press handler - plays audio in miniplayer
  const handleArticlePress = useCallback(
    (articleId: ArticleId, _title: string) => {
      void handleArticlePlay(articleId);
    },
    [handleArticlePlay],
  );

  const handleDeletePress = useCallback(
    (articleId: ArticleId) => {
      void handleDelete(articleId);
    },
    [handleDelete],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<BookmarkItem>) => {
      return (
        <PlaylistListItem
          editMode={editMode}
          item={item}
          onDelete={handleDeletePress}
          onArticlePress={handleArticlePress}
          drag={editMode ? drag : undefined}
          moveTrack={editMode ? moveTrack : undefined}
          first={item === sortedReadingList[0]}
          last={item === sortedReadingList.at(-1)}
          _isBeingDragged={isActive}
          isNowPlaying={item.article_id === nowPlayingArticleId}
        />
      );
    },
    [
      editMode,
      handleDeletePress,
      handleArticlePress,
      nowPlayingArticleId,
      moveTrack,
      sortedReadingList,
    ],
  );

  return (
    <ScreenStateHandler
      isLoading={shouldShowInitialLoading}
      isError={readingListLoadFailed}
      errorMessage={STRINGS.FAILED_TO_LOAD_BOOKMARKS}
      onRetry={() => void retryReadingList()}
      isEmpty={shouldShowEmpty}
      empty={<SavedEmptyState />}
    >
      {/* Keep one scroll view mounted across Edit and Done, including at large text sizes. */}
      <DraggableFlatList<BookmarkItem>
        // NOT `{...tabBarAutoHide}`. DraggableFlatList renders its inner list as
        // `{...props}` and then sets its own `onScroll` / `scrollEventThrottle`
        // after it, so a spread handler is dropped on the floor — the code reads
        // as working and the tab bar simply never hides in edit mode. This is the
        // library's supported way in.
        onScrollOffsetChange={tabBarAutoHide.onScrollOffset}
        onContainerLayout={({ layout }) => tabBarAutoHide.onViewportHeightChange(layout.height)}
        data={sortedReadingList}
        // The now-playing row is not in `data`; this is what re-renders it.
        extraData={editMode ? undefined : nowPlayingArticleId}
        keyExtractor={keyExtractor}
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
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={6}
        windowSize={7}
      />
    </ScreenStateHandler>
  );
}
