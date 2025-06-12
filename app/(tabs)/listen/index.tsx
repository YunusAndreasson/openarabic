import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomControls from '@/components/BottomControls';
import EmptyState from '@/components/EmptyState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArticleCard } from '@/components/home/ArticleCard';
import NowPlayingCard from '@/components/listen/NowPlayingCard';
import SleepTimer from '@/components/listen/SleepTimer';
import { AUDIO_STATES } from '@/constants/audio';
import { LAYOUT } from '@/constants/layout';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useListenScreen } from '@/hooks/listen';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCustomOrder } from '@/store/listenSlice';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import { selectionFeedback } from '@/utils/haptics';

type ReadingListItem = Tables<'reading_list'> & {
  articles: Article & {
    author: {
      id: number;
      name: string;
    };
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  noAudioContainer: {
    alignItems: 'center',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
    right: LAYOUT.SCREEN_EDGE_PADDING,
  },
  noAudioText: {
    textAlign: 'center',
  },
  footerNote: {
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  footerNoteText: {
    textAlign: 'center',
    opacity: 0.3,
  },
});

// Define a constant for item height calculation
const ITEM_HEIGHT = 120;

// Memory-optimized component for reading list items
const ListenListItem = memo(
  ({
    item,
    isActive,
    editMode,
    onPress,
    onDelete,
    onPlayPress,
    drag,
    _isBeingDragged,
    showPlayerCard,
  }: {
    item: ReadingListItem;
    isActive: boolean;
    editMode: boolean;
    onPress: (id: number) => void;
    onDelete: (id: number) => void;
    onPlayPress: (id: number) => void;
    drag?: () => void;
    _isBeingDragged?: boolean;
    showPlayerCard: boolean;
  }) => {
    // Check if this article has audio available
    const hasAudio = !!item.articles?.audio_url;

    // Determine if card should play on tap
    const shouldPlayOnTap = hasAudio && !showPlayerCard && !editMode;

    return (
      <ArticleCard
        active={isActive}
        author={item.articles?.author?.name || 'Author'}
        title={item.articles?.title || 'Untitled'}
        editMode={editMode}
        isBeingDragged={_isBeingDragged}
        onPress={
          shouldPlayOnTap ? () => onPlayPress(item.article_id) : () => onPress(item.article_id)
        }
        onLongPress={() => onPress(item.article_id)}
        onDelete={() => onDelete(item.article_id)}
        // Keep play button visible for visual clarity
        onPlayPress={hasAudio && !showPlayerCard ? () => onPlayPress(item.article_id) : undefined}
        isPlaying={false} // Never show as playing - NowPlayingCard handles playback state
        dragHandleProps={{
          onLongPress: drag,
          delayLongPress: 100,
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Optimize: Check most likely to change first, and use early return pattern
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps.isActive !== nextProps.isActive) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    if (prevProps.showPlayerCard !== nextProps.showPlayerCard) return false;
    // Check if audio availability changed
    if (!!prevProps.item.articles?.audio_url !== !!nextProps.item.articles?.audio_url) return false;
    // Item ID should rarely change, so check last
    return prevProps.item.article_id === nextProps.item.article_id;
  }
);

ListenListItem.displayName = 'ListenListItem';

export default function ListenScreen(): JSX.Element {
  const colors = useColors();
  const { prefetchArticle } = useAppPreloader();
  const dispatch = useAppDispatch();

  const editMode = useAppSelector(state => state.listen.editMode);

  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [canShowEmpty, setCanShowEmpty] = useState(false);

  const {
    sortedReadingList,
    sortedEnhancedTracks,
    shouldShowInitialLoading,
    isStartingPlayback,
    setIsStartingPlayback,
    duration,
    position,
    metadata,
    audioState,
    actions,
    isReadingListLoading,
    isReadingListFetching,
    sleepTimer,
    handleSleepTimerSet,
    handleSleepTimerCancel,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
  } = useListenScreen();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanShowEmpty(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const metadataValues = useMemo(
    () => ({
      articleId: metadata.articleId,
      articleTitle: metadata.articleTitle,
    }),
    [metadata.articleId, metadata.articleTitle]
  );

  const flashListExtraData = useMemo(
    () => ({
      metadataValues,
      audioState,
      editMode,
    }),
    [metadataValues, audioState, editMode]
  );



  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    ({ data }: { data: ReadingListItem[] }) => {
      selectionFeedback();

      // Extract the new order of article IDs
      const newOrder = data.map(item => item.article_id);

      // Update custom order in Redux
      dispatch(setCustomOrder(newOrder));
    },
    [dispatch]
  );

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleArticlePress = useCallback(
    (articleId: number) => {
      if (editMode) return; // Disable navigation in edit mode

      const article = sortedReadingList.find(item => item.article_id === articleId)?.articles;
      if (article) {
        prefetchArticle(articleId);
        router.push(
          `/(tabs)/read/article/${articleId}?headerTitle=${encodeURIComponent(article.title)}`
        );
      }
    },
    [prefetchArticle, sortedReadingList, editMode, router]
  );

  // Get current article for now playing card
  const currentArticle = useMemo(() => {
    // If starting playback, use the first article from sorted list
    if (isStartingPlayback && sortedReadingList.length > 0) {
      return sortedReadingList[0]?.articles || null;
    }

    if (!metadata.articleId || !sortedReadingList.length) return null;

    // Convert metadata.articleId (string) to number for comparison
    const articleIdNumber = parseInt(metadata.articleId, 10);
    if (isNaN(articleIdNumber)) return null;

    const currentItem = sortedReadingList.find(item => item.article_id === articleIdNumber);
    return currentItem?.articles || null;
  }, [isStartingPlayback, sortedReadingList, metadata.articleId]);

  const handleNowPlayingPress = useCallback(() => {
    if (currentArticle) {
      router.push(
        `/(tabs)/read/article/${currentArticle.id}?headerTitle=${encodeURIComponent(currentArticle.title)}`
      );
    }
  }, [currentArticle, router]);

  // Check if we have any texts to show controls for
  const hasArticles = sortedReadingList.length > 0;

  // Check if we have any articles with audio available
  const hasAudioArticles = sortedEnhancedTracks.length > 0;

  // Check if player should be visible (only when actually playing, not during startup)
  const shouldShowPlayer = useMemo(() => {
    return audioState === AUDIO_STATES.PLAYING && !!currentArticle;
  }, [audioState, currentArticle]);

  // Since data is preloaded, only show empty state when we definitively have no articles
  // and we've waited long enough to prevent flashing
  const shouldShowEmpty =
    !hasArticles && canShowEmpty && !isReadingListLoading && !isReadingListFetching;

  // Render item for both FlashList and DraggableFlatList
  const renderItem = useCallback(
    (params: { item: ReadingListItem; index?: number } | RenderItemParams<ReadingListItem>) => {
      const { item } = params;
      const isActive =
        audioState === AUDIO_STATES.PLAYING &&
        !!metadata.articleId &&
        parseInt(metadata.articleId, 10) === item.article_id;

      if (editMode && 'drag' in params) {
        // DraggableFlatList render
        const { drag, isActive: isDragging } = params;
        return (
          <ListenListItem
            isActive={isActive}
            editMode={editMode}
            item={item}
            onPress={handleArticlePress}
            onDelete={handleDelete}
            onPlayPress={handleArticlePlay}
            drag={drag}
            _isBeingDragged={isDragging}
            showPlayerCard={shouldShowPlayer}
          />
        );
      } else {
        // FlashList render
        return (
          <ListenListItem
            isActive={isActive}
            editMode={editMode}
            item={item}
            onPress={handleArticlePress}
            onDelete={handleDelete}
            onPlayPress={handleArticlePlay}
            showPlayerCard={shouldShowPlayer}
          />
        );
      }
    },
    [
      audioState,
      metadata.articleId,
      editMode,
      shouldShowPlayer,
      handleArticlePress,
      handleDelete,
      handleArticlePlay,
    ]
  );

  // Show loading screen only during initial uncached load
  if (shouldShowInitialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.tint} size="large" />
        <ThemedText style={{ marginTop: LAYOUT.SPACING.MEDIUM }}>Loading your playlist</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView includeBottomInset={false} style={styles.flexOne} useSafeArea={false}>
        {editMode ? (
          // Use DraggableFlatList in edit mode
          <DraggableFlatList
            data={sortedReadingList}
            keyExtractor={item => `${item.article_id}`}
            renderItem={renderItem as any}
            onDragEnd={handleDragEnd}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: headerHeight + LAYOUT.SPACING.MEDIUM,
              paddingBottom: hasArticles
                ? insets.bottom +
                  LAYOUT.BOTTOM_BAR.HEIGHT +
                  LAYOUT.SPACING.TINY +
                  (shouldShowPlayer ? 120 + LAYOUT.SPACING.TINY : LAYOUT.SPACING.TINY)
                : insets.bottom + LAYOUT.SPACING.TINY,
              paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            }}
            ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
            ListEmptyComponent={
              shouldShowEmpty ? (
                <EmptyState
                  colors={colors}
                  description="Your listening playlist is empty"
                  icon="headset-outline"
                  iconSize={72}
                  submessage="Bookmark articles from the Read tab to build your playlist"
                  title="No Articles Saved"
                  containerStyle={{
                    paddingTop: LAYOUT.SPACING.XLARGE,
                    paddingBottom: LAYOUT.SPACING.LARGE,
                  }}
                />
              ) : null
            }
            ListFooterComponent={
              hasArticles ? (
                <View style={styles.footerNote}>
                  <ThemedText style={styles.footerNoteText} type="caption" variant="secondary">
                    Long press to open article for reading
                  </ThemedText>
                </View>
              ) : null
            }
          />
        ) : (
          // Use FlashList in normal mode
          <FlashList
            data={sortedReadingList}
            drawDistance={ITEM_HEIGHT * 5}
            estimatedItemSize={ITEM_HEIGHT}
            extraData={flashListExtraData}
            keyExtractor={item => `${item.article_id}`}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: headerHeight + LAYOUT.SPACING.MEDIUM,
              paddingBottom: hasArticles
                ? insets.bottom +
                  LAYOUT.BOTTOM_BAR.HEIGHT +
                  LAYOUT.SPACING.TINY +
                  (shouldShowPlayer ? 120 + LAYOUT.SPACING.TINY : LAYOUT.SPACING.TINY)
                : insets.bottom + LAYOUT.SPACING.TINY,
              paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            }}
            ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
            ListEmptyComponent={
              shouldShowEmpty ? (
                <EmptyState
                  colors={colors}
                  description="Your listening playlist is empty"
                  icon="headset-outline"
                  iconSize={72}
                  submessage="Bookmark articles from the Read tab to build your playlist"
                  title="No Articles Saved"
                  containerStyle={{
                    paddingTop: LAYOUT.SPACING.XLARGE,
                    paddingBottom: LAYOUT.SPACING.LARGE,
                  }}
                />
              ) : null
            }
            ListHeaderComponent={null}
            ListFooterComponent={
              hasArticles ? (
                <View style={styles.footerNote}>
                  <ThemedText style={styles.footerNoteText} type="caption" variant="secondary">
                    Long press to open article for reading
                  </ThemedText>
                </View>
              ) : null
            }
            overrideItemLayout={layout => {
              layout.size = ITEM_HEIGHT;
            }}
            renderItem={renderItem as any}
          />
        )}
      </ThemedView>

      {/* Show helpful message when articles exist but none have audio */}
      {hasArticles && !hasAudioArticles && !shouldShowPlayer && (
        <View style={styles.noAudioContainer}>
          <ThemedText style={styles.noAudioText} type="body" variant="secondary">
            Articles are saved, but audio is not yet available
          </ThemedText>
        </View>
      )}

      {/* Only show bottom controls when there are texts with audio to play but no active player */}
      {hasArticles && hasAudioArticles && !shouldShowPlayer && !isStartingPlayback && (
        <BottomControls
          primaryDisabled={false}
          primaryDisablePressAnimation={true}
          primaryLabel="Play All"
          primaryVariant="filled"
          showTimerButton={false}
          primaryAccessibilityLabel="Play all texts"
          onPrimaryPress={handlePlayAll}
        />
      )}

      {/* Now Playing Card - shows when starting playback or playing */}
      <NowPlayingCard
        article={currentArticle}
        duration={isStartingPlayback ? 0 : duration * 1000}
        isTimerActive={sleepTimer.state.isActive}
        isVisible={shouldShowPlayer || (isStartingPlayback && !!currentArticle)}
        progress={isStartingPlayback ? 0 : position * 1000}
        showTimerButton={true}
        onPress={handleNowPlayingPress}
        onStop={() => {
          selectionFeedback();
          if (isStartingPlayback) {
            // If still starting, allow canceling
            setIsStartingPlayback(false);
          }
          actions.stopPlayback();
          setPlaybackMode('none');
        }}
        onTimerPress={() => {
          selectionFeedback();
          setShowSleepTimer(true);
        }}
      />

      {/* Sleep Timer Modal - only show when there are texts and timer is active/visible */}
      {hasArticles && (
        <SleepTimer
          isActive={sleepTimer.state.isActive}
          isVisible={showSleepTimer}
          remainingTime={sleepTimer.state.remainingTime}
          onClose={() => setShowSleepTimer(false)}
          onTimerCancel={handleSleepTimerCancel}
          onTimerSet={handleSleepTimerSet}
        />
      )}
    </ThemedView>
  );
}
