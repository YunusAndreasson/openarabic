import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo, useCallback, memo, JSX } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { AUDIO_STATES } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { articlesService } from '@/services/articles';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';
import BottomControls from '@/components/BottomControls';
import { withOpacity } from '@/utils/colorUtils';

import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';
import type { SentenceWord } from '../../types/vocabulary.types';

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  sortingNote: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
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
    dueWordCount = 0,
    onPress,
  }: {
    item: ReadingListItem;
    progress: number;
    duration: number;
    isActive: boolean;
    dueWordCount?: number;
    onPress: (id: number) => void;
  }) => {
    const colors = useColors();
    const playbackProgress = duration > 0 ? progress / duration : 0;
    // Calculate remaining time in milliseconds
    const remainingTime = Math.max(0, duration - progress);
    const shouldShowTime = isActive && duration > 0;
    const hasDueWords = dueWordCount > 0;

    // Create left meta content with due words indicator
    const leftMetaContent = hasDueWords ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: withOpacity(colors.warning, 0.25),
          paddingHorizontal: LAYOUT.SPACING.XSMALL,
          paddingVertical: LAYOUT.SPACING.MICRO,
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
          borderColor: withOpacity(colors.warning, 0.4),
          marginRight: 8,
        }}
      >
        <Ionicons name="sync-outline" size={12} color={colors.warning} />
        <ThemedText
          type="label"
          style={{
            color: colors.warning,
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
            marginLeft: LAYOUT.SPACING.XTINY,
            fontWeight: '600',
          }}
          skipDefaultColor
        >
          {dueWordCount}
        </ThemedText>
      </View>
    ) : null;

    // Create meta content with time indicator
    const metaContent = shouldShowTime && (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="time-outline" size={14} color={colors.tint} />
        <ThemedText type="label" style={{ color: colors.tint, marginLeft: 4 }} skipDefaultColor>
          {formatTime(remainingTime)}
        </ThemedText>
      </View>
    );

    return (
      <ArticleCard
        title={item.articles?.title || 'Untitled'}
        author={item.articles?.author?.name || 'Unknown Author'}
        leftMeta={leftMetaContent}
        meta={metaContent}
        onPress={() => onPress(item.article_id)}
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
      prevProps.dueWordCount !== nextProps.dueWordCount ||
      (nextProps.isActive &&
        (prevProps.progress !== nextProps.progress || prevProps.duration !== nextProps.duration));

    return !shouldUpdate;
  }
);

BookmarkListItem.displayName = 'BookmarkListItem';

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

  // Get due words data for sorting
  const { dueWordRootIds } = useArticlesByDueWords(user?.id, 0);

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

  // Query to fetch complete article data for articles in the reading list
  const articlesWithSentencesQuery = useQuery({
    queryKey: ['articles-with-sentences', user?.id, readingList],
    queryFn: async () => {
      if (!user?.id || !readingList.length || !dueWordRootIds.size)
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
    enabled: !!user?.id && !!readingList.length && dueWordRootIds.size > 0,
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

  // Deduplicate and sort reading list by due words
  const sortedReadingList = useMemo(() => {
    if (!readingList?.length) return [];

    // First deduplicate the list
    const seen = new Set();
    const dedupedList = readingList.filter(item => {
      if (seen.has(item.article_id)) return false;
      seen.add(item.article_id);
      return true;
    });

    // Then sort by due words count (if we have due words)
    if (dueWordRootIds?.size > 0 && articleDetailsMap.size > 0) {
      return [...dedupedList].sort((a, b) => {
        const aDueWords = countDueWords(a.article_id, dueWordRootIds);
        const bDueWords = countDueWords(b.article_id, dueWordRootIds);
        return bDueWords - aDueWords; // Sort descending (most due words first)
      });
    }

    return dedupedList;
  }, [readingList, dueWordRootIds, articleDetailsMap, countDueWords]);

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
      const posA = articlePositionMap.get(a.articleId) ?? 999;
      const posB = articlePositionMap.get(b.articleId) ?? 999;
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
    } else {
      handleError('No tracks available for playback');
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
        <ThemedText style={{ marginTop: LAYOUT.SPACING.MEDIUM }}>Loading bookmarks...</ThemedText>
      </ThemedView>
    );
  }

  // Show empty state with animation
  if (hasNoBookmarks) {
    return (
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        accessibilityLabel="Bookmarks screen - empty state"
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
    );
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Bookmarks screen"
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
              />
            );
          }}
          estimatedItemSize={ITEM_HEIGHT}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom:
              insets.bottom +
              LAYOUT.CONTENT_SPACING.BOTTOM +
              LAYOUT.BOTTOM_BAR.HEIGHT +
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
        primaryLabel={isCurrentlyPlaying && playbackMode === 'all' ? 'Stop' : 'Play All'}
        onPrimaryPress={handlePlayAll}
        primaryVariant="filled"
        primaryDisabled={false}
        primaryAccessibilityLabel={
          isCurrentlyPlaying && playbackMode === 'all'
            ? 'Stop playback'
            : 'Play all bookmarked articles'
        }
        secondaryLabel={isCurrentlyPlaying && playbackMode === 'shuffle' ? 'Stop' : 'Shuffle'}
        onSecondaryPress={handleShuffle}
        secondaryVariant="outlined"
        secondaryDisabled={false}
        secondaryAccessibilityLabel={
          isCurrentlyPlaying && playbackMode === 'shuffle'
            ? 'Stop shuffle playback'
            : 'Play bookmarked articles in random order'
        }
      />
    </ThemedView>
  );
}
