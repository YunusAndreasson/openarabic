/* eslint-disable react-hooks/exhaustive-deps */
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import BaseCard from '@/components/BaseCard';
import EmptyState from '@/components/EmptyState';
import { LoadingScreen } from '@/components/Loader';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { AUDIO_STATES } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';

// Format time in MM:SS format
const formatTime = (milliseconds: number): string => {
  if (!milliseconds || isNaN(milliseconds)) return '00:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

type ReadingListItem = Tables<'reading_list'> & {
  articles: Article & {
    author: {
      id: number;
      name: string;
    };
  };
};

const styles = StyleSheet.create({
  actionButtonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  bottomControlsContainer: {
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    position: 'absolute',
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  container: {
    flex: 1,
  },
  controlsCard: {
    padding: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  controlsLabelContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  emptyStateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  flexOne: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  shuffleButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
});

// Define a constant for item height calculation
// Card content + margins + borders
const ITEM_HEIGHT = 80; // Adjust based on your actual card height with padding and margins

// Memory-optimized component for reading list items
const BookmarkListItem = memo(
  ({
    item,
    progress,
    duration,
    isActive,
  }: {
    item: ReadingListItem;
    progress: number;
    duration: number;
    isActive: boolean;
  }) => {
    const colors = useColors();
    const playbackProgress = duration > 0 ? progress / duration : 0;
    // Calculate remaining time in milliseconds
    const remainingTime = Math.max(0, duration - progress);
    const shouldShowTime = isActive && duration > 0;

    return (
      <ArticleCard
        title={item.articles?.title || 'Untitled'}
        author={item.articles?.author?.name || 'Unknown Author'}
        meta={
          shouldShowTime ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <Ionicons name="time-outline" size={14} color={colors.tint} />
              <ThemedText
                type="label"
                style={{ color: colors.tint, marginLeft: 4 }}
                skipDefaultColor
              >
                {formatTime(remainingTime)}
              </ThemedText>
            </View>
          ) : null
        }
        onPress={() => router.push(`/article/${item.article_id}`)}
        active={isActive}
      >
        {isActive ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 4,
              backgroundColor: colors.transparent,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                backgroundColor: colors.tint,
                width: `${playbackProgress * 100}%`,
                height: '100%',
              }}
            />
          </View>
        ) : null}
      </ArticleCard>
    );
  },
  (prevProps, nextProps) => {
    const shouldUpdate =
      prevProps.isActive !== nextProps.isActive ||
      (nextProps.isActive &&
        (prevProps.progress !== nextProps.progress || prevProps.duration !== nextProps.duration));

    return !shouldUpdate;
  }
);

BookmarkListItem.displayName = 'BookmarkListItem';

// Bottom Action Buttons component
const BottomControls = memo(
  ({
    onPlayAll,
    onShuffle,
    isPlaying,
    isShuffleMode,
  }: {
    onPlayAll: () => void;
    onShuffle: () => void;
    isPlaying: boolean;
    isShuffleMode: boolean;
  }) => {
    const colors = useColors();

    return (
      <View style={[styles.bottomControlsContainer, { backgroundColor: colors.transparent }]}>
        <BaseCard style={styles.controlsCard} shadowSize="medium" includePressAnimation={false}>
          <View style={styles.controlsLabelContainer}>
            <ThemedText type="caption" variant="secondary">
              AUDIO CONTROLS
            </ThemedText>
          </View>
          <View style={styles.actionButtonsRow}>
            <View style={styles.buttonContainer}>
              <ThemedButton
                title={isPlaying && !isShuffleMode ? 'Stop' : 'Play All'}
                onPress={onPlayAll}
                variant="filled"
                style={styles.fullWidthButton}
                accessibilityLabel={
                  isPlaying && !isShuffleMode ? 'Stop playback' : 'Play all bookmarked articles'
                }
              />
            </View>
            <View style={styles.buttonContainer}>
              <ThemedButton
                title={isPlaying && isShuffleMode ? 'Stop' : 'Shuffle'}
                onPress={onShuffle}
                variant="outlined"
                style={[styles.shuffleButton, styles.fullWidthButton, { borderColor: colors.tint }]}
                accessibilityLabel={
                  isPlaying && isShuffleMode
                    ? 'Stop shuffle playback'
                    : 'Play bookmarked articles in random order'
                }
              />
            </View>
          </View>
        </BaseCard>
      </View>
    );
  }
);

BottomControls.displayName = 'BottomControls';

export default function BookmarksScreen(): JSX.Element {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flashListRef = useRef<FlashList<ReadingListItem>>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- State Hooks ---
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  // --- End State Hooks ---

  // --- Get State & Stable Actions from useEnhancedAudioPlayer ---
  const enhancedAudioPlayer = useEnhancedAudioPlayer();
  const { progress, duration, metadata, audioState, currentTrackIndex, actions } =
    enhancedAudioPlayer;

  // --- TanStack Query Hooks ---
  const readingListQuery = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return readingListService.getReadingList(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - increased from 1 minute for better caching
    gcTime: 10 * 60 * 1000, // 10 minutes - increased for better memory management
    retry: 2, // Reduced from 3 to fail faster on real errors
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Reduced max delay
    placeholderData: [], // Ensure we always have an array, even if empty
  });
  const {
    data: readingList = [],
    isLoading: isReadingListLoading,
    isFetching: isReadingListFetching,
  } = readingListQuery;

  // Check if data is already in cache
  const isDataCached = useMemo(() => {
    return !!(user?.id && queryClient.getQueryData(['readingList', user.id]));
  }, [user?.id, queryClient]);

  // Determine if we have a definitive empty state
  const hasNoBookmarks = useMemo(() => {
    // Only show empty state when we have definitive data
    if (isReadingListLoading || (isReadingListFetching && !isDataCached)) return false;
    return !readingList || readingList.length === 0;
  }, [isReadingListLoading, isReadingListFetching, isDataCached, readingList]);

  // Replace the import and usage of useScreenAnimation with a simple style
  const fadeInStyle = { opacity: 1 };

  const enhancedTracksQuery = useQuery({
    queryKey: ['enhancedAudioTracks', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return enhancedAudioService.getReadingListEnhancedTracks(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Align with readingList staleTime
    gcTime: 10 * 60 * 1000, // Align with readingList gcTime
    placeholderData: [], // Added for consistency
  });
  const { data: enhancedTracks = [], isLoading: isEnhancedTracksLoading } = enhancedTracksQuery;

  // --- Derived State & Memos (using direct state values) ---
  const metadataValues = useMemo(
    () => ({
      articleId: metadata.articleId,
      articleTitle: metadata.articleTitle,
    }),
    [metadata.articleId, metadata.articleTitle]
  );

  const flashListExtraData = useMemo(
    () => ({
      currentTrackIndex,
      progress,
      metadataValues,
    }),
    [currentTrackIndex, progress, metadataValues]
  );
  // --- End Derived State & Memos ---

  // --- Effects ---
  // Loading State Synchronization Effect
  useEffect(() => {
    const shouldBeLoading =
      (!isDataCached && isReadingListLoading) || // Only show loading for uncached initial load
      isEnhancedTracksLoading;

    if (shouldBeLoading === isLoadingState) return;

    if (shouldBeLoading) {
      startLoading();
    } else {
      stopLoading();
    }

    return () => {
      if (isLoadingState) {
        stopLoading();
      }
    };
  }, [
    isDataCached,
    isReadingListLoading,
    isEnhancedTracksLoading,
    isLoadingState,
    startLoading,
    stopLoading,
  ]);

  // Screen Focus Refresh Hook
  useScreenFocusRefresh(
    queryClient,
    'bookmarks',
    user?.id,
    1000 * 60 * 5, // 5 minutes
    true,
    true // Force refetch on focus
  );

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

    return () => {
      actions.stopPlayback();
    };
  }, [user?.id, queryClient, actions.stopPlayback]);
  useFocusEffect(focusEffectCallback);

  // --- Event Handlers (use stable actions) ---
  const isCurrentlyPlaying = audioState !== AUDIO_STATES.IDLE;

  const handlePlayAll = useCallback(() => {
    if (isCurrentlyPlaying) {
      actions.stopPlayback();
      setIsShuffleMode(false);
    } else if (enhancedTracks.length) {
      try {
        actions.startEnhancedPlayback(enhancedTracks, 0);
        setIsShuffleMode(false);
      } catch (error) {
        handleError(error as Error);
      }
    } else {
      handleError('No tracks available for playback');
    }
  }, [isCurrentlyPlaying, enhancedTracks, actions.startEnhancedPlayback, actions.stopPlayback]);

  const handleShuffle = useCallback(() => {
    if (isCurrentlyPlaying) {
      actions.stopPlayback();
      setIsShuffleMode(false);
    } else if (enhancedTracks.length) {
      actions.startEnhancedShufflePlayback(enhancedTracks);
      setIsShuffleMode(true);
    }
  }, [
    isCurrentlyPlaying,
    enhancedTracks,
    actions.startEnhancedShufflePlayback,
    actions.stopPlayback,
  ]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!user?.id || isRefreshing) return;

    mediumFeedback();
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['readingList', user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['enhancedAudioTracks', user.id],
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, queryClient, isRefreshing]);

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // Show loading screen only during initial uncached load
  if (!isDataCached && isReadingListLoading && !isReadingListFetching) {
    return <LoadingScreen />;
  }

  // Show empty state with animation
  if (hasNoBookmarks) {
    return (
      <Animated.View style={[styles.flexOne, fadeInStyle]}>
        <ThemedView
          style={styles.container}
          includeBottomInset={false}
          safeAreaEdges={['left', 'right']}
        >
          <ThemedView style={styles.emptyStateContainer}>
            <EmptyState
              title="Save for Later"
              description="Bookmark articles to listen and read anytime"
              colors={colors}
              icon="book-outline"
            />
          </ThemedView>
        </ThemedView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.flexOne, fadeInStyle]}>
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <ThemedView useSafeArea={false} includeBottomInset={false} style={styles.flexOne}>
          <FlashList
            ref={flashListRef}
            data={readingList}
            extraData={flashListExtraData}
            keyExtractor={item => `${item.article_id}`}
            renderItem={({ item }) => (
              <BookmarkListItem
                item={item}
                progress={progress}
                duration={duration}
                isActive={
                  audioState === AUDIO_STATES.PLAYING && metadata.articleId === item.article_id
                }
              />
            )}
            estimatedItemSize={ITEM_HEIGHT}
            contentContainerStyle={{
              paddingTop: headerHeight,
              paddingBottom:
                LAYOUT.CONTENT_SPACING.BOTTOM +
                LAYOUT.BOTTOM_BAR.HEIGHT +
                insets.bottom +
                LAYOUT.SPACING.SMALL,
              paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={null}
            drawDistance={ITEM_HEIGHT * 5}
            overrideItemLayout={layout => {
              layout.size = ITEM_HEIGHT;
            }}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.tint]}
                tintColor={colors.tint}
                progressBackgroundColor={colors.background}
                progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
              />
            }
          />
        </ThemedView>

        <BottomControls
          onPlayAll={handlePlayAll}
          onShuffle={handleShuffle}
          isPlaying={isCurrentlyPlaying}
          isShuffleMode={isShuffleMode}
        />
      </ThemedView>
    </Animated.View>
  );
}
