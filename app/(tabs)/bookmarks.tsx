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
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SortingControls from '@/components/SortingControls';
import SleepTimer from '@/components/SleepTimer';
import type { SortOption, SortDirection } from '@/components/SortingControls';
import { LAYOUT } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { AUDIO_STATES } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useSleepTimer } from '@/hooks/useSleepTimer';
import { articlesService } from '@/services/articles';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';
import BottomControls from '@/components/BottomControls';

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
  headerControls: {
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  sleepTimerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
    width: 36,
  },
});

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
    const hasDueWords = dueWordCount > 0;
    const isPlaying = isActive && audioState === AUDIO_STATES.PLAYING;

    // Helper function to get level name
    const getLevelName = (level: number): string => {
      switch (level) {
        case 1:
          return 'Beginner';
        case 2:
          return 'Elementary';
        case 3:
          return 'Intermediate';
        case 4:
          return 'Advanced';
        case 5:
          return 'Expert';
        default:
          return `Level ${level}`;
      }
    };

    // Helper function to capitalize first letter
    const capitalizeFirstLetter = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Create left meta content with due words indicator
    const leftMetaContent = hasDueWords ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.buttonOverlay,
          paddingHorizontal: LAYOUT.SPACING.XSMALL + 1,
          paddingVertical: LAYOUT.SPACING.MICRO + 1,
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          borderWidth: 0.5,
          borderColor: colors.warning + '30',
          marginRight: 8,
          shadowColor: colors.warning,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1,
          elevation: 1,
        }}
      >
        <Ionicons name="sync-outline" size={11} color={colors.warning} />
        <ThemedText
          type="label"
          style={{
            color: colors.warning,
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
            marginLeft: LAYOUT.SPACING.XTINY,
            fontWeight: '700',
            letterSpacing: 0.2,
          }}
          skipDefaultColor
        >
          {dueWordCount}
        </ThemedText>
      </View>
    ) : null;

    return (
      <ArticleCard
        title={item.articles?.title || 'Untitled'}
        author={item.articles?.author?.name || 'Unknown Author'}
        leftMeta={leftMetaContent}
        meta={
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: LAYOUT.SPACING.XSMALL,
            }}
          >
            {/* Dot separator before level (if level exists) */}
            {item.articles?.difficulty_level && (
              <ThemedText
                type="caption"
                style={{
                  color: colors.textTertiary,
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                  marginRight: LAYOUT.SPACING.XTINY,
                  opacity: 0.6, // Subtle dot
                }}
                skipDefaultColor
              >
                •
              </ThemedText>
            )}

            {/* Level indicator */}
            {item.articles?.difficulty_level && (
              <View
                style={{
                  backgroundColor: colors.elevation1,
                  paddingHorizontal: LAYOUT.SPACING.XSMALL,
                  paddingVertical: LAYOUT.SPACING.MICRO,
                  borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
                  borderWidth: 0.5,
                  borderColor: colors.borderOverlay,
                }}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: colors.textTertiary,
                    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                    fontWeight: '600',
                    letterSpacing: 0.3,
                  }}
                  skipDefaultColor
                >
                  {getLevelName(item.articles.difficulty_level)}
                </ThemedText>
              </View>
            )}

            {/* Dot separator between level and category */}
            {item.articles?.difficulty_level && item.articles?.category?.name && (
              <ThemedText
                type="caption"
                style={{
                  color: colors.textTertiary,
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                  marginHorizontal: LAYOUT.SPACING.XTINY,
                  opacity: 0.6, // Subtle dot
                }}
                skipDefaultColor
              >
                •
              </ThemedText>
            )}

            {/* Category */}
            {item.articles?.category?.name && (
              <View
                style={{
                  backgroundColor: colors.elevation1,
                  paddingHorizontal: LAYOUT.SPACING.XSMALL,
                  paddingVertical: LAYOUT.SPACING.MICRO,
                  borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
                  borderWidth: 0.5,
                  borderColor: colors.borderOverlay,
                }}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: colors.textTertiary,
                    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                    fontWeight: '500',
                    letterSpacing: 0.2,
                  }}
                  skipDefaultColor
                >
                  {capitalizeFirstLetter(item.articles.category.name)}
                </ThemedText>
              </View>
            )}
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

export type BookmarkSortOption = 'dueWords' | 'difficulty' | 'readingTime' | 'author' | 'category';

// Define sort options for bookmarks
const bookmarkSortOptions: SortOption<BookmarkSortOption>[] = [
  { key: 'dueWords', label: 'Review Words' },
  { key: 'difficulty', label: 'Level' },
  { key: 'category', label: 'Category' },
];

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

  // Sorting state
  const [currentSort, setCurrentSort] = useState<BookmarkSortOption>('dueWords');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sleep timer state
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  // Get due words data for sorting
  const { dueWordRootIds } = useArticlesByDueWords(user?.id, 0);

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

  // Query to fetch complete article data for articles in the reading list
  const articlesWithSentencesQuery = useQuery({
    queryKey: ['articles-with-sentences', user?.id, readingList],
    queryFn: async () => {
      if (!user?.id || !readingList.length || !dueWordRootIds?.size)
        return new Map<number, Article>();

      // Get article IDs from reading list
      const articleIds = readingList.map(item => item.article_id);

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
    enabled: !!user?.id && !!readingList.length && (dueWordRootIds?.size ?? 0) > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: articleDetailsMap = new Map<number, Article>() } = articlesWithSentencesQuery;

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

  // Helper function to estimate reading time
  const estimateReadingTime = useCallback((article: Article): number => {
    if (article.article_sentences?.length) {
      return Math.max(1, Math.ceil(article.article_sentences.length / 10));
    }
    if (article.summary) {
      const wordCount = article.summary.split(/\s+/).length;
      const estimatedSentences = Math.ceil(wordCount / 15);
      return Math.max(1, Math.ceil(estimatedSentences / 10));
    }
    return 2; // Default fallback
  }, []);

  // Sorting function
  const sortReadingList = useCallback(
    (
      list: ReadingListItem[],
      sortBy: BookmarkSortOption,
      direction: SortDirection,
      dueWordRootIds: Set<number> | undefined,
      articleDetailsMap: Map<number, Article>
    ): ReadingListItem[] => {
      const sortedList = [...list];

      switch (sortBy) {
        case 'dueWords':
          if (dueWordRootIds && dueWordRootIds.size > 0 && articleDetailsMap.size > 0) {
            return sortedList.sort((a, b) => {
              const aDueWords = countDueWords(a.article_id, dueWordRootIds);
              const bDueWords = countDueWords(b.article_id, dueWordRootIds);
              const result = bDueWords - aDueWords;
              return direction === 'desc' ? result : -result;
            });
          }
          // Fall through to return original list if conditions not met
          return sortedList;
        case 'difficulty':
          return sortedList.sort((a, b) => {
            const result =
              (a.articles?.difficulty_level || 0) - (b.articles?.difficulty_level || 0);
            return direction === 'desc' ? -result : result;
          });
        case 'readingTime':
          return sortedList.sort((a, b) => {
            const aTime = a.articles ? estimateReadingTime(a.articles) : 0;
            const bTime = b.articles ? estimateReadingTime(b.articles) : 0;
            const result = aTime - bTime;
            return direction === 'desc' ? -result : result;
          });
        case 'author':
          return sortedList.sort((a, b) => {
            const result = (a.articles?.author?.name || '').localeCompare(
              b.articles?.author?.name || ''
            );
            return direction === 'desc' ? -result : result;
          });
        case 'category':
          return sortedList.sort((a, b) => {
            const result = (a.articles?.category?.name || '').localeCompare(
              b.articles?.category?.name || ''
            );
            return direction === 'desc' ? -result : result;
          });
      }

      return sortedList;
    },
    [countDueWords, estimateReadingTime]
  );

  // Deduplicate and sort reading list
  const sortedReadingList = useMemo(() => {
    if (!readingList?.length) return [];

    // First deduplicate the list
    const seen = new Set();
    const dedupedList = readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });

    // Then sort by selected option
    return sortReadingList(
      dedupedList,
      currentSort,
      sortDirection,
      dueWordRootIds,
      articleDetailsMap
    );
  }, [readingList, currentSort, sortDirection, dueWordRootIds, articleDetailsMap, sortReadingList]);

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
      currentTrackIndex,
      progress,
      metadataValues,
    }),
    [currentTrackIndex, progress, metadataValues]
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
            // Calculate due word count for this article
            const dueWordCount =
              dueWordRootIds?.size > 0 && articleDetailsMap.size > 0
                ? countDueWords(item.article_id, dueWordRootIds)
                : 0;

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
            <View style={styles.headerControls}>
              <SortingControls
                currentSort={currentSort}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                options={bookmarkSortOptions}
              />
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
