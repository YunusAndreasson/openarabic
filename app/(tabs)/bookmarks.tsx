import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo, useCallback, memo, JSX } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import { AudioProgressBar } from '@/components/AudioProgressBar';
import BottomControls from '@/components/BottomControls';
import SectionTitle from '@/components/SectionTitle';
import SleepTimer from '@/components/SleepTimer';
import SortingControls from '@/components/SortingControls';
import type { SortOption, SortDirection } from '@/components/SortingControls';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { AUDIO_STATES } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { useSleepTimer } from '@/hooks/useSleepTimer';
import { articlesService } from '@/services/articles';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';
import type { SentenceWord } from '../../types/vocabulary.types';

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

// Static styles to avoid recreation on every render
const itemStyles = StyleSheet.create({
  dueWordsContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5,
    elevation: 1,
    flexDirection: 'row',
    marginRight: 8,
    paddingHorizontal: LAYOUT.SPACING.XSMALL + 1,
    paddingVertical: LAYOUT.SPACING.MICRO + 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  metaContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: LAYOUT.SPACING.XSMALL,
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
// Card content + margins + borders + audio progress bar when active
const ITEM_HEIGHT = 120; // Increased from 80 to account for AudioProgressBar

// Memory-optimized component for reading list items
const BookmarkListItem = memo(
  ({
    item,
    progress,
    duration,
    isActive,
    dueWordCount = 0,
    onPress,
    audioState,
  }: {
    item: ReadingListItem;
    progress: number;
    duration: number;
    isActive: boolean;
    dueWordCount?: number;
    onPress: (id: number) => void;
    audioState: string;
  }) => {
    const colors = useColors();
    const isPlaying = isActive && audioState === AUDIO_STATES.PLAYING;

    // Memoize dynamic styles that depend on colors
    const dynamicStyles = useMemo(
      () => ({
        dueWordsContainer: {
          ...itemStyles.dueWordsContainer,
          backgroundColor: colors.buttonOverlay,
          borderColor: dueWordCount > 0 ? colors.warning + '30' : colors.borderOverlay,
          shadowColor: dueWordCount > 0 ? colors.warning : colors.border,
          minWidth: 42, // Fixed minimum width to accommodate double digits
        },
      }),
      [colors, dueWordCount]
    );

    // Always show due words indicator, but change color based on count
    const leftMetaContent = (
      <View style={dynamicStyles.dueWordsContainer}>
        <Ionicons
          name="sync-outline"
          size={11}
          color={dueWordCount > 0 ? colors.warning : colors.textTertiary}
        />
        <ThemedText
          type="label"
          style={{
            color: dueWordCount > 0 ? colors.warning : colors.textTertiary,
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
            marginLeft: LAYOUT.SPACING.XTINY,
            fontWeight: '700',
            letterSpacing: 0.2,
            minWidth: 14, // Fixed width to accommodate double digits
            textAlign: 'center',
          }}
          skipDefaultColor
        >
          {dueWordCount}
        </ThemedText>
      </View>
    );

    return (
      <ArticleCard
        title={item.articles?.title || 'Untitled'}
        author={item.articles?.author?.name || 'Unknown Author'}
        leftMeta={leftMetaContent}
        meta={
          <View style={itemStyles.metaContainer}>
            {/* Days ago */}
            <ThemedText
              type="caption"
              style={{
                color: colors.textTertiary,
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                fontWeight: '500',
              }}
              skipDefaultColor
            >
              {getDaysAgo(item.added_at)}
            </ThemedText>
          </View>
        }
        onPress={() => onPress(item.article_id)}
        active={isActive}
      >
        {isActive && duration > 0 && (
          <AudioProgressBar
            progress={progress}
            duration={duration}
            isPlaying={isPlaying}
            showTimeRemaining={true}
            compact={false}
          />
        )}
      </ArticleCard>
    );
  },
  (prevProps, nextProps) => {
    const shouldUpdate =
      prevProps.isActive !== nextProps.isActive ||
      prevProps.dueWordCount !== nextProps.dueWordCount ||
      prevProps.audioState !== nextProps.audioState ||
      (nextProps.isActive &&
        (prevProps.progress !== nextProps.progress || prevProps.duration !== nextProps.duration));

    return !shouldUpdate;
  }
);

BookmarkListItem.displayName = 'BookmarkListItem';

export type BookmarkSortOption = 'dueWords' | 'alphabetical' | 'recent';

// Create dynamic sort options with loading state
const createBookmarkSortOptions = (
  isDueWordsLoading: boolean,
  isDueWordsDataAvailable: boolean
): SortOption<BookmarkSortOption>[] => {
  const baseOptions: SortOption<BookmarkSortOption>[] = [
    { key: 'alphabetical', label: 'A-Z' },
    { key: 'recent', label: 'Recently Added' },
  ];

  // Add due words option at the beginning when data is available or loading
  if (isDueWordsDataAvailable) {
    baseOptions.unshift({ key: 'dueWords', label: 'Review Words' });
  } else if (isDueWordsLoading) {
    baseOptions.unshift({ key: 'dueWords', label: 'Review Words...' });
  }

  return baseOptions;
};

export default function BookmarksScreen(): JSX.Element {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { prefetchArticle } = useAppPreloader();
  const flashListRef = useRef<FlashList<ReadingListItem>>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- State Hooks ---
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();
  // playbackMode: 'none' | 'all' | 'shuffle'
  const [playbackMode, setPlaybackMode] = useState<'none' | 'all' | 'shuffle'>('none');

  // Sorting state - default to the natural database sort (most recently added)
  const [currentSort, setCurrentSort] = useState<BookmarkSortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sleep timer state
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  // Get due words data for sorting
  const { dueWordRootIds, isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 0);

  // --- Get State & Stable Actions from useEnhancedAudioPlayer ---
  const enhancedAudioPlayer = useEnhancedAudioPlayer();
  const { progress, duration, metadata, audioState, currentTrackIndex, actions } =
    enhancedAudioPlayer;

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

  // Memoize article IDs to reduce query refetches
  const articleIds = useMemo(() => readingList.map(item => item.article_id), [readingList]);

  // Query to fetch complete article data for articles in the reading list
  const articlesWithSentencesQuery = useQuery({
    queryKey: ['articles-with-sentences', user?.id, articleIds],
    queryFn: async () => {
      if (!user?.id || !articleIds.length) return new Map<number, Article>();

      // Fetch complete article data with sentences and words
      const articlesWithSentences = await Promise.all(
        articleIds.map(id => articlesService.getArticleById(id))
      );

      // Create a map of article ID to detailed article data
      const articleMap = new Map<number, Article>();
      articlesWithSentences.forEach(article => {
        if (article) {
          articleMap.set(article.id, article);
        }
      });

      return articleMap;
    },
    enabled: !!user?.id && !!articleIds.length,
    staleTime: 5 * 60 * 1000,
  });

  const { data: articleDetailsMap = new Map<number, Article>() } = articlesWithSentencesQuery;

  // Check if due words data is available for sorting
  const isDueWordsDataAvailable = useMemo(() => {
    return !isDueWordsLoading && dueWordRootIds?.size > 0 && articleDetailsMap.size > 0;
  }, [isDueWordsLoading, dueWordRootIds?.size, articleDetailsMap.size]);

  // Use a stable sort that doesn't change during data loading
  const stableSort = useMemo(() => {
    // If user explicitly selected due words and data is available, use it
    if (currentSort === 'dueWords' && isDueWordsDataAvailable) {
      return 'dueWords';
    }
    // Otherwise use the current sort
    return currentSort;
  }, [currentSort, isDueWordsDataAvailable]);

  // Track if we should use due words sorting (simplified)
  const shouldUseDueWordsSort = stableSort === 'dueWords' && isDueWordsDataAvailable;

  // Helper function to count due words in an article - define before using it
  const countDueWords = useCallback(
    (articleId: number, dueWordRootIds: Set<number> | undefined): number => {
      // Get detailed article data from the map
      const article = articleDetailsMap.get(articleId);
      if (!article?.article_sentences?.length || !dueWordRootIds?.size) return 0;

      let count = 0;
      article.article_sentences.forEach((sentence: { sentence_words?: SentenceWord[] }) => {
        sentence.sentence_words?.forEach((word: SentenceWord) => {
          if (word.root_id && dueWordRootIds.has(word.root_id)) {
            count++;
          }
        });
      });

      return count;
    },
    [articleDetailsMap]
  );

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

  // Sort reading list with stable dependencies
  const sortedReadingList = useMemo(() => {
    if (!dedupedReadingList.length) return [];

    // For "recent" sort, use the natural database order (already sorted by added_at desc)
    // This is the most common case and should be super fast with no dependencies
    if (stableSort === 'recent') {
      return sortDirection === 'desc' ? dedupedReadingList : [...dedupedReadingList].reverse();
    }

    // For other sorts, apply client-side sorting only when needed
    const sortedList = [...dedupedReadingList];

    switch (stableSort) {
      case 'dueWords':
        // Only sort by due words if we have the necessary data
        if (shouldUseDueWordsSort && dueWordRootIds) {
          return sortedList.sort((a, b) => {
            const aDueWords = countDueWords(a.article_id, dueWordRootIds);
            const bDueWords = countDueWords(b.article_id, dueWordRootIds);
            const result = bDueWords - aDueWords;
            return sortDirection === 'desc' ? result : -result;
          });
        }
        // Fallback to recent sort if due words data isn't ready
        return sortDirection === 'desc' ? dedupedReadingList : [...dedupedReadingList].reverse();

      case 'alphabetical':
        return sortedList.sort((a, b) => {
          const result = (a.articles?.title || '').localeCompare(b.articles?.title || '');
          return sortDirection === 'desc' ? -result : result;
        });

      default:
        // Fallback to recent sort
        return sortDirection === 'desc' ? dedupedReadingList : [...dedupedReadingList].reverse();
    }
  }, [
    dedupedReadingList,
    stableSort,
    sortDirection,
    shouldUseDueWordsSort,
    countDueWords,
    dueWordRootIds,
  ]);

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

  const flashListExtraData = useMemo(
    () => ({
      // Only include data that affects ALL items, not just the active one
      currentTrackIndex,
      metadataValues,
      dueWordRootIdsSize: dueWordRootIds?.size || 0,
      articleDetailsMapSize: articleDetailsMap.size,
      isDueWordsLoading,
      audioState, // Include audioState to trigger re-renders when playback starts/stops
    }),
    [
      currentTrackIndex,
      metadataValues,
      dueWordRootIds?.size,
      articleDetailsMap.size,
      isDueWordsLoading,
      audioState,
    ]
  );
  // --- End Derived State & Memos ---

  // Memoize the loading state calculation to avoid unnecessary re-renders
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

  const handlePlayAll = useCallback(() => {
    if (isCurrentlyPlaying && playbackMode === 'all') {
      actions.stopPlayback();
      setPlaybackMode('none');
    } else if (sortedEnhancedTracks.length) {
      try {
        actions.startEnhancedPlayback(sortedEnhancedTracks, 0);
        setPlaybackMode('all');
      } catch (error) {
        handleError(error as Error);
      }
    }
  }, [
    isCurrentlyPlaying,
    playbackMode,
    sortedEnhancedTracks,
    actions.startEnhancedPlayback,
    actions.stopPlayback,
  ]);

  const handleShuffle = useCallback(() => {
    if (isCurrentlyPlaying && playbackMode === 'shuffle') {
      actions.stopPlayback();
      setPlaybackMode('none');
    } else if (sortedEnhancedTracks.length) {
      actions.startEnhancedShufflePlayback(sortedEnhancedTracks);
      setPlaybackMode('shuffle');
    }
  }, [
    isCurrentlyPlaying,
    playbackMode,
    sortedEnhancedTracks,
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

  // Handle sorting
  const handleSortChange = useCallback((sort: string, direction: SortDirection) => {
    setCurrentSort(sort as BookmarkSortOption);
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
      prefetchArticle(articleId);
      router.push(`/article/${articleId}`);
    },
    [prefetchArticle]
  );

  // Memoized sort options to prevent unnecessary re-renders
  const sortOptions = useMemo(
    () => createBookmarkSortOptions(isDueWordsLoading, isDueWordsDataAvailable),
    [isDueWordsLoading, isDueWordsDataAvailable]
  );

  // Pre-calculate due words counts for all articles to avoid expensive calculations in renderItem
  const dueWordsCountMap = useMemo(() => {
    const countMap = new Map<number, number>();

    if (!dueWordRootIds?.size || isDueWordsLoading) {
      return countMap;
    }

    // Only calculate for articles we have detailed data for
    for (const item of dedupedReadingList) {
      if (articleDetailsMap.has(item.article_id)) {
        const count = countDueWords(item.article_id, dueWordRootIds);
        countMap.set(item.article_id, count);
      }
    }

    return countMap;
  }, [dedupedReadingList, dueWordRootIds, isDueWordsLoading, articleDetailsMap, countDueWords]);

  // Show loading screen only during initial uncached load
  if (!isDataCached && isReadingListLoading && !isReadingListFetching) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: LAYOUT.SPACING.MEDIUM }}>
          Loading listening queue...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Listen screen"
    >
      <ThemedView useSafeArea={false} includeBottomInset={false} style={styles.flexOne}>
        <FlashList
          ref={flashListRef}
          data={sortedReadingList}
          extraData={flashListExtraData}
          keyExtractor={item => `${item.article_id}`}
          renderItem={({ item }) => {
            // Get pre-calculated due word count - much faster than calculating in render
            const dueWordCount = dueWordsCountMap.get(item.article_id) || 0;

            return (
              <BookmarkListItem
                item={item}
                progress={progress}
                duration={duration}
                isActive={
                  audioState === AUDIO_STATES.PLAYING && metadata.articleId === item.article_id
                }
                dueWordCount={dueWordCount}
                onPress={handleArticlePress}
                audioState={audioState}
              />
            );
          }}
          estimatedItemSize={ITEM_HEIGHT}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM, // Reduced since controls are closer
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <SectionTitle title="Sort" isFirstSection={true} />
              <SortingControls
                currentSort={currentSort}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                options={sortOptions}
              />
              <View>
                <SectionTitle title="Saved Articles" />
              </View>
            </View>
          }
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
        primaryLabel={isCurrentlyPlaying && playbackMode === 'all' ? 'Stop' : 'Play'}
        onPrimaryPress={handlePlayAll}
        primaryVariant="filled"
        primaryDisabled={false}
        primaryAccessibilityLabel={
          isCurrentlyPlaying && playbackMode === 'all' ? 'Stop playback' : 'Play all saved articles'
        }
        secondaryLabel={isCurrentlyPlaying && playbackMode === 'shuffle' ? 'Stop' : 'Shuffle'}
        onSecondaryPress={handleShuffle}
        secondaryVariant="outlined"
        secondaryDisabled={false}
        secondaryAccessibilityLabel={
          isCurrentlyPlaying && playbackMode === 'shuffle'
            ? 'Stop shuffle playback'
            : 'Play saved articles in random order'
        }
        showTimerButton={isCurrentlyPlaying}
        onTimerPress={() => {
          mediumFeedback();
          setShowSleepTimer(true);
        }}
        isTimerActive={sleepTimer.state.isActive}
        timerAccessibilityLabel="Open sleep timer"
      />

      {/* Sleep Timer Modal */}
      <SleepTimer
        isVisible={showSleepTimer}
        onClose={() => setShowSleepTimer(false)}
        onTimerSet={handleSleepTimerSet}
        onTimerCancel={handleSleepTimerCancel}
        remainingTime={sleepTimer.state.remainingTime}
        isActive={sleepTimer.state.isActive}
      />
    </ThemedView>
  );
}
