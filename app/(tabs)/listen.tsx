import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import BottomControls from '@/components/BottomControls';
import EmptyState from '@/components/EmptyState';
import NowPlayingCard from '@/components/NowPlayingCard';
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
import { mediumFeedback, lightFeedback } from '@/utils/haptics';

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
const ListenListItem = memo(
  ({
    item,
    isActive,
    dueWordCount = 0,
    onPress,
  }: {
    item: ReadingListItem;
    isActive: boolean;
    dueWordCount?: number;
    onPress: (id: number) => void;
  }) => {
    const colors = useColors();

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
          color={dueWordCount > 0 ? colors.warning : colors.textTertiary}
          name="sync-outline"
          size={11}
        />
        <ThemedText
          skipDefaultColor
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
        >
          {dueWordCount}
        </ThemedText>
      </View>
    );

    return (
      <ArticleCard
        active={isActive}
        author={item.articles?.author?.name || 'Author'}
        leftMeta={leftMetaContent}
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
            · {getDaysAgo(item.added_at)}
          </ThemedText>
        }
        onPress={() => onPress(item.article_id)}
      />
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if active state or due word count changes
    return (
      prevProps.isActive === nextProps.isActive && prevProps.dueWordCount === nextProps.dueWordCount
    );
  }
);

ListenListItem.displayName = 'ListenListItem';

export type ListenSortOption = 'alphabetical' | 'dueWords' | 'recent';

// Create dynamic sort options with loading state
const createListenSortOptions = (
  isDueWordsLoading: boolean,
  isDueWordsDataAvailable: boolean
): SortOption<ListenSortOption>[] => {
  const baseOptions: SortOption<ListenSortOption>[] = [
    { key: 'recent', label: 'Latest' },
    { key: 'alphabetical', label: 'Title' },
  ];

  // Add due words option at the beginning when data is available or loading
  if (isDueWordsDataAvailable) {
    baseOptions.unshift({ key: 'dueWords', label: 'Words Due' });
  } else if (isDueWordsLoading) {
    baseOptions.unshift({ key: 'dueWords', label: 'Words Due' });
  }

  return baseOptions;
};

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

  // Get due words data for sorting
  const { dueWordRootIds, isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 0);

  // Check if due words data is available for sorting
  const isDueWordsDataAvailable = useMemo(() => {
    return !isDueWordsLoading && dueWordRootIds?.size > 0;
  }, [isDueWordsLoading, dueWordRootIds?.size]);

  // Determine the best default sort based on available data
  const getDefaultSort = useCallback((): ListenSortOption => {
    // Prioritize words due if data is available, otherwise fall back to latest
    return isDueWordsDataAvailable ? 'dueWords' : 'recent';
  }, [isDueWordsDataAvailable]);

  // Sorting state - default to words due when available, otherwise latest
  const [currentSort, setCurrentSort] = useState<ListenSortOption>(() => getDefaultSort());
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // --- Get State & Stable Actions from useEnhancedAudioPlayer ---
  const enhancedAudioPlayer = useEnhancedAudioPlayer();
  const { progress, duration, metadata, audioState, currentTrackIndex, actions } =
    enhancedAudioPlayer;

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

  // Use the current sort directly - let user control it completely
  const stableSort = currentSort;

  // Track if we should use due words sorting (requires both due words data and article details)
  const shouldUseDueWordsSort = useMemo(() => {
    return stableSort === 'dueWords' && isDueWordsDataAvailable && articleDetailsMap.size > 0;
  }, [stableSort, isDueWordsDataAvailable, articleDetailsMap.size]);

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
      // Include data that affects item rendering and re-render triggers
      currentTrackIndex,
      metadataValues,
      dueWordRootIdsSize: dueWordRootIds?.size || 0,
      articleDetailsMapSize: articleDetailsMap.size,
      isDueWordsLoading,
      audioState, // Include audioState to trigger re-renders when playback starts/stops
      progress, // Include progress to trigger re-renders when audio progresses
      duration, // Include duration to trigger re-renders when duration changes
    }),
    [
      currentTrackIndex,
      metadataValues,
      dueWordRootIds?.size,
      articleDetailsMap.size,
      isDueWordsLoading,
      audioState,
      progress,
      duration,
    ]
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
      prefetchArticle(articleId);
      router.push(`/article/${articleId}`);
    },
    [prefetchArticle]
  );

  // Memoized sort options to prevent unnecessary re-renders
  const sortOptions = useMemo(
    () => createListenSortOptions(isDueWordsLoading, isDueWordsDataAvailable),
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
        <ThemedText style={{ marginTop: LAYOUT.SPACING.MEDIUM }}>Loading saved texts</ThemedText>
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
                description="Save articles to listen later"
                icon="headset-outline"
                iconSize={72}
                submessage="Bookmark any article, then return here to play with hands-free controls"
                title="No Saved Texts"
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
            // Get pre-calculated due word count - much faster than calculating in render
            const dueWordCount = dueWordsCountMap.get(item.article_id) || 0;
            const isActive =
              audioState !== AUDIO_STATES.IDLE && metadata.articleId === item.article_id;

            return (
              <ListenListItem
                dueWordCount={dueWordCount}
                isActive={isActive}
                item={item}
                onPress={handleArticlePress}
              />
            );
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
        isPlaying={!isStartingPlayback && audioState === AUDIO_STATES.PLAYING}
        isTimerActive={sleepTimer.state.isActive}
        isVisible={shouldShowPlayer}
        progress={isStartingPlayback ? 0 : progress}
        showTimerButton={true}
        timerAccessibilityLabel="Sleep timer"
        onPress={() => {
          if (currentArticle) {
            router.push(`/article/${currentArticle.id}`);
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
