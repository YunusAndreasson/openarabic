import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomControls from '@/components/BottomControls';
import EmptyState from '@/components/EmptyState';
import SortingControls from '@/components/SortingControls';
import type { SortOption, SortDirection } from '@/components/SortingControls';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArticleCard } from '@/components/home/ArticleCard';
import NowPlayingCard from '@/components/listen/NowPlayingCard';
import SleepTimer from '@/components/listen/SleepTimer';
import { LAYOUT } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { AUDIO_STATES } from '@/hooks/audio/useAudioPlayer';
import { useEnhancedAudioPlayer } from '@/hooks/audio/useEnhancedAudioPlayer';
import { useSleepTimer } from '@/hooks/audio/useSleepTimer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
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
});

// Helper functions moved outside component to avoid recreation on every render
const getDaysAgo = (addedAt: string): string => {
  const addedDate = new Date(addedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - addedDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

// Define a constant for item height calculation
const ITEM_HEIGHT = 120;

// Memory-optimized component for reading list items
const ListenListItem = memo(
  ({
    item,
    isActive,
    onPress,
  }: {
    item: ReadingListItem;
    isActive: boolean;
    onPress: (id: number) => void;
  }) => {
    const colors = useColors();

    return (
      <ArticleCard
        active={isActive}
        author={item.articles?.author?.name || 'Author'}
        title={item.articles?.title || 'Untitled'}
        meta={
          <ThemedText
            skipDefaultColor
            type="caption"
            style={{
              color: colors.textTertiary,
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
              fontWeight: '500',
            }}
          >
            {getDaysAgo(item.added_at)}
          </ThemedText>
        }
        onPress={() => onPress(item.article_id)}
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if active state changes
    return prevProps.isActive === nextProps.isActive;
  }
);

ListenListItem.displayName = 'ListenListItem';

export type ListenSortOption = 'recent' | 'alphabetical';

// Simplified sort options for playlist UX
const createListenSortOptions = (): SortOption<ListenSortOption>[] => [
  { key: 'recent', label: 'Recently Saved' },
  { key: 'alphabetical', label: 'Title A-Z' },
];

export default function ListenScreen(): JSX.Element {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { prefetchArticle } = useAppPreloader();
  const flashListRef = useRef<FlashList<ReadingListItem>>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- State Hooks ---
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();
  // playbackMode: 'none' | 'all'
  const [playbackMode, setPlaybackMode] = useState<'all' | 'none'>('none');

  // Add state to track when we're starting playback (to show player immediately)
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);

  // Sleep timer state
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  // Delay showing empty state to prevent flash
  const [canShowEmpty, setCanShowEmpty] = useState(false);

  // Wait 300ms before allowing empty state to show
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanShowEmpty(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Simplified sorting state - default to recent (playlist standard)
  const [currentSort, setCurrentSort] = useState<ListenSortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // --- Get State & Stable Actions from useEnhancedAudioPlayer ---
  const enhancedAudioPlayer = useEnhancedAudioPlayer();
  const { progress, duration, metadata, audioState, actions } = enhancedAudioPlayer;

  // Clear starting playback state once audio actually starts
  useEffect(() => {
    if (isStartingPlayback && audioState !== AUDIO_STATES.IDLE) {
      setIsStartingPlayback(false);
    }
  }, [isStartingPlayback, audioState]);

  // Sleep timer functionality
  const sleepTimer = useSleepTimer(() => {
    // Stop playback when timer completes
    actions.stopPlayback();
    setPlaybackMode('none');
  });

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

  // Deduplicate reading list first
  const dedupedReadingList = useMemo(() => {
    if (!readingList?.length) return [];

    const seen = new Set();
    return readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });
  }, [readingList]);

  // Simplified sorting - just recent vs alphabetical
  const sortedReadingList = useMemo(() => {
    if (!dedupedReadingList.length) return [];

    // For "recent" sort, use the natural database order (already sorted by added_at desc)
    if (currentSort === 'recent') {
      return sortDirection === 'desc' ? dedupedReadingList : [...dedupedReadingList].reverse();
    }

    // For alphabetical sort
    if (currentSort === 'alphabetical') {
      const sortedList = [...dedupedReadingList];
      return sortedList.sort((a, b) => {
        const result = (a.articles?.title || '').localeCompare(b.articles?.title || '');
        return sortDirection === 'desc' ? -result : result;
      });
    }

    // Fallback to recent sort
    return sortDirection === 'desc' ? dedupedReadingList : [...dedupedReadingList].reverse();
  }, [dedupedReadingList, currentSort, sortDirection]);

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
    staleTime: 5 * 60 * 1000, // Align with readingList staleTime
    gcTime: 10 * 60 * 1000, // Align with readingList gcTime
    placeholderData: [], // Added for consistency
  });
  const { data: enhancedTracks = [], isLoading: isEnhancedTracksLoading } = enhancedTracksQuery;

  // Sort the enhanced tracks to match the article sort order
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

  // --- Derived State & Memos (using direct state values) ---
  const metadataValues = useMemo(
    () => ({
      articleId: metadata.articleId,
      articleTitle: metadata.articleTitle,
    }),
    [metadata.articleId, metadata.articleTitle]
  );

  // Simplified extraData for FlashList - removed complex due words calculations
  const flashListExtraData = useMemo(
    () => ({
      // Include data that affects item rendering and re-render triggers
      metadataValues,
      audioState, // Include audioState to trigger re-renders when playback starts/stops
    }),
    [metadataValues, audioState]
  );
  // --- End Derived State & Memos ---

  // Since data is preloaded at app level, we can rely on it being available
  // Only show loading screen for initial uncached load (fallback only)
  const shouldShowInitialLoading = useMemo(() => {
    // Only show loading if we truly don't have any data and are actively loading
    return (
      !isDataCached &&
      isReadingListLoading &&
      !isReadingListFetching &&
      sortedReadingList.length === 0
    );
  }, [isDataCached, isReadingListLoading, isReadingListFetching, sortedReadingList.length]);

  // Legacy loading state for backwards compatibility with existing loading hook
  const shouldBeLoading = useMemo(
    () => (!isDataCached && isReadingListLoading) || isEnhancedTracksLoading,
    [isDataCached, isReadingListLoading, isEnhancedTracksLoading]
  );

  // Simplified effect that only runs when the shouldBeLoading calculation changes
  useEffect(() => {
    // No-op if loading state already matches
    if (shouldBeLoading === isLoadingState) return;

    // Update loading state and manage cleanup
    if (shouldBeLoading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [shouldBeLoading, isLoadingState, startLoading, stopLoading]);

  // Screen Focus Refresh Hook
  useScreenFocusRefresh(
    queryClient,
    'listen',
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

  // Handle sorting
  const handleSortChange = useCallback((sort: string, direction: SortDirection) => {
    setCurrentSort(sort as ListenSortOption);
    setSortDirection(direction);
  }, []);

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

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleArticlePress = useCallback(
    (articleId: number) => {
      const article = sortedReadingList.find(item => item.article_id === articleId)?.articles;
      if (article) {
        prefetchArticle(articleId);
        router.push(
          `/(tabs)/read/article/${articleId}?headerTitle=${encodeURIComponent(article.title)}`
        );
      }
    },
    [prefetchArticle, sortedReadingList]
  );

  // Memoized sort options - simplified to just two options
  const sortOptions = useMemo(() => createListenSortOptions(), []);

  // Get current article for now playing card
  const currentArticle = useMemo(() => {
    // If starting playback, use the first article from sorted list
    if (isStartingPlayback && sortedReadingList.length > 0) {
      return sortedReadingList[0]?.articles || null;
    }

    if (!metadata.articleId || !sortedReadingList.length) return null;
    const currentItem = sortedReadingList.find(item => item.article_id === metadata.articleId);
    return currentItem?.articles || null;
  }, [isStartingPlayback, sortedReadingList, metadata.articleId]);

  // Check if we have any texts to show controls for
  const hasArticles = sortedReadingList.length > 0;

  // Check if player should be visible (either starting or actually playing)
  const shouldShowPlayer = useMemo(() => {
    return (
      (isStartingPlayback && !!currentArticle) ||
      (audioState !== AUDIO_STATES.IDLE && !!currentArticle)
    );
  }, [isStartingPlayback, audioState, currentArticle]);

  // Since data is preloaded, only show empty state when we definitively have no articles
  // and we've waited long enough to prevent flashing
  const shouldShowEmpty = !hasArticles && canShowEmpty;

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
      accessibilityLabel="Listen screen"
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView includeBottomInset={false} style={styles.flexOne} useSafeArea={false}>
        <FlashList
          ref={flashListRef}
          data={sortedReadingList}
          drawDistance={ITEM_HEIGHT * 5}
          estimatedItemSize={ITEM_HEIGHT}
          extraData={flashListExtraData}
          keyExtractor={item => `${item.article_id}`}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: hasArticles
              ? insets.bottom +
                LAYOUT.BOTTOM_BAR.HEIGHT +
                LAYOUT.SPACING.TINY +
                (shouldShowPlayer ? 120 + LAYOUT.SPACING.TINY : LAYOUT.BUTTON.HEIGHT.LARGE)
              : insets.bottom + LAYOUT.SPACING.TINY,
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          }}
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
          ListHeaderComponent={
            hasArticles ? (
              <View>
                <SortingControls
                  currentSort={currentSort}
                  options={sortOptions}
                  sortDirection={sortDirection}
                  style={{ marginTop: LAYOUT.SPACING.SMALL }}
                  onSortChange={handleSortChange}
                />
              </View>
            ) : null
          }
          overrideItemLayout={layout => {
            layout.size = ITEM_HEIGHT;
          }}
          refreshControl={
            <RefreshControl
              colors={[colors.tint]}
              progressBackgroundColor={colors.background}
              progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
              refreshing={isRefreshing}
              tintColor={colors.tint}
              onRefresh={handleRefresh}
            />
          }
          renderItem={({ item }) => {
            const isActive =
              audioState !== AUDIO_STATES.IDLE && metadata.articleId === item.article_id;

            return <ListenListItem isActive={isActive} item={item} onPress={handleArticlePress} />;
          }}
        />
      </ThemedView>

      {/* Only show bottom controls when there are texts to play but no active player */}
      {hasArticles && !shouldShowPlayer && !isStartingPlayback && (
        <BottomControls
          isTimerActive={sleepTimer.state.isActive}
          primaryDisabled={false}
          primaryDisablePressAnimation={true}
          primaryLabel={isCurrentlyPlaying && playbackMode === 'all' ? 'Stop' : 'Play All'}
          primaryVariant="filled"
          showTimerButton={isCurrentlyPlaying}
          timerAccessibilityLabel="Sleep timer"
          primaryAccessibilityLabel={
            isCurrentlyPlaying && playbackMode === 'all' ? 'Stop playback' : 'Play all texts'
          }
          onPrimaryPress={handlePlayAll}
          onTimerPress={() => {
            mediumFeedback();
            setShowSleepTimer(true);
          }}
        />
      )}

      {/* Now Playing Card - shows when audio is playing with integrated controls */}
      <NowPlayingCard
        article={currentArticle}
        duration={isStartingPlayback ? 0 : duration}
        isTimerActive={sleepTimer.state.isActive}
        isVisible={shouldShowPlayer}
        progress={isStartingPlayback ? 0 : progress}
        showTimerButton={true}
        timerAccessibilityLabel="Sleep timer"
        onPress={() => {
          if (currentArticle) {
            router.push(
              `/(tabs)/read/article/${currentArticle.id}?headerTitle=${encodeURIComponent(currentArticle.title)}`
            );
          }
        }}
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
