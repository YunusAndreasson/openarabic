import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
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
import { useScreenFocusRefresh } from '@/hooks';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCustomOrder, removeFromCustomOrder } from '@/store/listenSlice';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback, lightFeedback } from '@/utils/haptics';

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

    return (
      <ArticleCard
        active={isActive}
        author={item.articles?.author?.name || 'Author'}
        title={item.articles?.title || 'Untitled'}
        editMode={editMode}
        isBeingDragged={_isBeingDragged}
        onPress={() => onPress(item.article_id)}
        onDelete={() => onDelete(item.article_id)}
        // Hide play buttons when NowPlayingCard is visible to avoid control conflicts
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { prefetchArticle } = useAppPreloader();
  const dispatch = useAppDispatch();

  const editMode = useAppSelector(state => state.listen.editMode);
  const customOrder = useAppSelector(state => state.listen.customOrder);

  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');

  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [canShowEmpty, setCanShowEmpty] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanShowEmpty(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const enhancedAudioPlayer = useAudioPlayer();
  const { duration, position, metadata, audioState, actions } = enhancedAudioPlayer;

  useEffect(() => {
    if (isStartingPlayback && audioState !== AUDIO_STATES.IDLE) {
      setIsStartingPlayback(false);
    }
  }, [isStartingPlayback, audioState]);

  const sleepTimer = useSleepTimer(() => {
    actions.stopPlayback();
    setPlaybackMode('none');
  });

  const readingListQuery = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return readingListService.getReadingList(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    placeholderData: [],
  });
  const {
    data: readingList = [],
    isLoading: isReadingListLoading,
    isFetching: isReadingListFetching,
  } = readingListQuery;

  const dedupedReadingList = useMemo(() => {
    if (!readingList?.length) return [];

    const seen = new Set();
    return readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });
  }, [readingList]);

  const sortedReadingList = useMemo(() => {
    if (!dedupedReadingList.length) return [];

    // If we have a custom order and items in it, use that order
    if (customOrder.length > 0) {
      const customOrderMap = new Map(customOrder.map((id, index) => [id, index]));
      return [...dedupedReadingList].sort((a, b) => {
        const posA = customOrderMap.get(a.article_id) ?? 999;
        const posB = customOrderMap.get(b.article_id) ?? 999;

        // If both have custom positions, sort by custom order
        if (posA !== 999 && posB !== 999) {
          return posA - posB;
        }

        // If only one has custom position, prioritize it
        if (posA !== 999) return -1;
        if (posB !== 999) return 1;

        // For items not in custom order, sort by recent first
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      });
    }

    // Default: Sort by added_at (most recent first)
    return [...dedupedReadingList].sort((a, b) => {
      const dateA = new Date(a.added_at).getTime();
      const dateB = new Date(b.added_at).getTime();
      return dateB - dateA; // Most recent first
    });
  }, [dedupedReadingList, customOrder]);

  // Check if data is already in cache
  const isDataCached = useMemo(() => {
    return !!(user?.id && queryClient.getQueryData(['readingList', user.id]));
  }, [user?.id, queryClient]);

  // Get enhanced tracks query (keep as is)
  const enhancedTracksQuery = useQuery({
    queryKey: ['enhancedAudioTracks', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return enhancedAudioService.getReadingListEnhancedTracks(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
  const { data: enhancedTracks = [] } = enhancedTracksQuery;

  const sortedEnhancedTracks = useMemo(() => {
    if (!enhancedTracks.length || !sortedReadingList.length) return enhancedTracks;

    // Create a map of article_id to position in sortedReadingList
    const articlePositionMap = new Map(
      sortedReadingList.map((item, index) => [item.article_id, index])
    );

    // Sort enhanced tracks based on the article position
    return [...enhancedTracks].sort((a, b) => {
      const posA = a.articleId ? (articlePositionMap.get(a.articleId) ?? 999) : 999;
      const posB = b.articleId ? (articlePositionMap.get(b.articleId) ?? 999) : 999;
      return posA - posB;
    });
  }, [enhancedTracks, sortedReadingList]);

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

  const shouldShowInitialLoading = useMemo(() => {
    return (
      !isDataCached &&
      isReadingListLoading &&
      !isReadingListFetching &&
      sortedReadingList.length === 0
    );
  }, [isDataCached, isReadingListLoading, isReadingListFetching, sortedReadingList.length]);

  useScreenFocusRefresh(queryClient, 'listen', user?.id, 1000 * 60 * 5, true, true);

  // Focus Effect - uses stable actions.stopPlayback
  const focusEffectCallback = useCallback(() => {
    if (!user?.id) return;

    // Invalidate both reading list and enhanced tracks queries
    queryClient.invalidateQueries({
      queryKey: ['readingList', user.id],
    });
    queryClient.invalidateQueries({
      queryKey: ['enhancedAudioTracks', user.id],
    });

    // Don't automatically stop playback on focus loss - let user control when to stop
    // This prevents interrupting playback when navigating to articles or other screens
    return () => {
      // No automatic cleanup - user can control playback with stop button
    };
  }, [user?.id, queryClient]);
  useFocusEffect(focusEffectCallback);

  const isCurrentlyPlaying = audioState === AUDIO_STATES.PLAYING;

  const handlePlayAll = useCallback(async () => {
    // Prevent multiple presses during transition
    if (isStartingPlayback) return;

    if (isCurrentlyPlaying && playbackMode === 'all') {
      await actions.stopPlayback();
      setPlaybackMode('none');
      setIsStartingPlayback(false);
    } else if (sortedEnhancedTracks.length) {
      try {
        // Set starting state immediately for instant UI feedback
        setIsStartingPlayback(true);
        setPlaybackMode('all');
        await actions.startEnhancedPlayback(sortedEnhancedTracks, 0);

        // Audio playback started - NowPlayingCard will appear automatically
      } catch (error) {
        // Reset state on error
        setIsStartingPlayback(false);
        setPlaybackMode('none');
        handleError(error as Error);
      }
    }
  }, [
    isStartingPlayback,
    isCurrentlyPlaying,
    playbackMode,
    sortedEnhancedTracks,
    actions.startEnhancedPlayback,
    actions.stopPlayback,
  ]);

  // Handle sleep timer
  const handleSleepTimerSet = useCallback(
    (minutes: number) => {
      sleepTimer.actions.startTimer(minutes);
    },
    [sleepTimer.actions]
  );

  const handleSleepTimerCancel = useCallback(() => {
    sleepTimer.actions.cancelTimer();
  }, [sleepTimer.actions]);

  // Handle article deletion
  const handleDelete = useCallback(
    async (articleId: number) => {
      if (!user?.id) return;

      try {
        mediumFeedback();

        // Remove from reading list
        await readingListService.removeFromReadingList(user.id, articleId);

        // Remove from custom order
        dispatch(removeFromCustomOrder(articleId));

        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({
          queryKey: ['readingList', user.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['enhancedAudioTracks', user.id],
        });
      } catch (error) {
        handleError(error as Error);
      }
    },
    [user?.id, dispatch, queryClient]
  );

  // Handle individual article play
  const handleArticlePlay = useCallback(
    async (articleId: number) => {
      // Prevent multiple presses during transition
      if (isStartingPlayback) return;

      // If this article is already playing, pause it
      if (isCurrentlyPlaying && parseInt(metadata.articleId || '0', 10) === articleId) {
        await actions.stopPlayback();
        setPlaybackMode('none');
        setIsStartingPlayback(false);
        return;
      }

      // Find the article in the sorted list to get the correct index
      const articleIndex = sortedEnhancedTracks.findIndex(track => track.articleId === articleId);

      if (articleIndex !== -1 && sortedEnhancedTracks.length) {
        try {
          // Set starting state immediately for instant UI feedback
          setIsStartingPlayback(true);
          setPlaybackMode('all');
          await actions.startEnhancedPlayback(sortedEnhancedTracks, articleIndex);

          // Audio playback started - NowPlayingCard will appear automatically
        } catch (error) {
          // Reset state on error
          setIsStartingPlayback(false);
          setPlaybackMode('none');
          handleError(error as Error);
        }
      }
    },
    [
      isStartingPlayback,
      isCurrentlyPlaying,
      metadata.articleId,
      sortedEnhancedTracks,
      actions.startEnhancedPlayback,
      actions.stopPlayback,
    ]
  );

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    ({ data }: { data: ReadingListItem[] }) => {
      lightFeedback();

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

  // Check if player should be visible (either starting or actually playing)
  const shouldShowPlayer = useMemo(() => {
    return (
      (isStartingPlayback && !!currentArticle) ||
      (audioState === AUDIO_STATES.PLAYING && !!currentArticle)
    );
  }, [isStartingPlayback, audioState, currentArticle]);

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

      {/* Now Playing Card - shows when audio is playing with integrated controls */}
      <NowPlayingCard
        article={currentArticle}
        duration={isStartingPlayback ? 0 : duration * 1000}
        isTimerActive={sleepTimer.state.isActive}
        isVisible={shouldShowPlayer}
        progress={isStartingPlayback ? 0 : position * 1000}
        showTimerButton={true}
        onPress={handleNowPlayingPress}
        onStop={() => {
          lightFeedback();
          if (isStartingPlayback) {
            // If still starting, allow canceling
            setIsStartingPlayback(false);
          }
          actions.stopPlayback();
          setPlaybackMode('none');
        }}
        onTimerPress={() => {
          mediumFeedback();
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
