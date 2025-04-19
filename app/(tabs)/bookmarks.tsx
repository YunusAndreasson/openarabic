/* eslint-disable react-hooks/exhaustive-deps */
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import EmptyState from '@/components/EmptyState';
import { LoadingScreen } from '@/components/Loader';
import PageHeader from '@/components/PageHeader';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { AUDIO_STATES } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';

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
  activeCard: {
    borderLeftWidth: 3,
    elevation: 6,
    shadowOpacity: LAYOUT.OPACITY.MEDIUM,
    shadowRadius: 8,
  },
  activeIcon: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  authorText: {
    flex: 1,
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
  card: {
    overflow: 'hidden',
  },
  cardContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  cardContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  cardProgressBar: {
    height: '100%',
  },
  cardProgressContainer: {
    bottom: 0,
    height: 4,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%',
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
  flexOne: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  inactiveIcon: {
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  listContentWithHeader: {
    paddingTop: 0,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shuffleButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  studyWordsPill: {
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: 2,
  },
  studyWordsPillText: {
    fontSize: 10,
    lineHeight: 14,
  },
  textContent: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
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
    studyWordsCount,
    isLoading,
  }: {
    item: ReadingListItem;
    progress: number;
    duration: number;
    isActive: boolean;
    studyWordsCount: number;
    isLoading: boolean;
  }) => {
    const colors = useColors();
    const playbackProgress = duration > 0 ? progress / duration : 0;
    const activeCardStyle = isActive
      ? {
          ...styles.activeCard,
          borderColor: colors.tint,
          borderLeftWidth: 3,
        }
      : undefined;
    const activeTitleStyle = isActive ? { color: colors.tint } : undefined;
    const showPill = studyWordsCount > 0 || isLoading;

    return (
      <View style={styles.cardContainer}>
        <BaseCard
          onPress={() => router.push(`/article/${item.article_id}`)}
          style={[styles.card, activeCardStyle]}
          shadowSize="small"
        >
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText type="bodyBold" style={[styles.titleText, activeTitleStyle]}>
                {item.articles?.title || 'Untitled'}
              </ThemedText>
              <View style={styles.metaRow}>
                <ThemedText
                  type="label"
                  numberOfLines={1}
                  style={[styles.authorText, { color: colors.authorText }]}
                  skipDefaultColor
                >
                  {item.articles?.author?.name || 'Unknown Author'}
                </ThemedText>
                {showPill ? (
                  <View
                    style={[
                      styles.studyWordsPill,
                      { borderColor: colors.tint, backgroundColor: colors.transparent },
                    ]}
                  >
                    <ThemedText
                      type="label"
                      style={[styles.studyWordsPillText, { color: colors.tint }]}
                      skipDefaultColor
                    >
                      {isLoading
                        ? '...'
                        : `${studyWordsCount} ${studyWordsCount === 1 ? 'word' : 'words'}`}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.iconContainer}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isActive ? colors.tint : colors.text}
                style={isActive ? styles.activeIcon : styles.inactiveIcon}
              />
            </View>
          </View>

          {isActive ? (
            <View style={[styles.cardProgressContainer, { backgroundColor: colors.transparent }]}>
              <View
                style={[
                  styles.cardProgressBar,
                  {
                    backgroundColor: colors.tint,
                    width: `${playbackProgress * 100}%`,
                  },
                ]}
              />
            </View>
          ) : null}
        </BaseCard>
      </View>
    );
  },
  (prevProps, nextProps) => {
    const shouldUpdate =
      prevProps.isActive !== nextProps.isActive ||
      prevProps.studyWordsCount !== nextProps.studyWordsCount ||
      prevProps.isLoading !== nextProps.isLoading ||
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
            <ThemedText type="overline" variant="secondary">
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

  // --- State Hooks ---
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  const [tracksForWordCounts, setTracksForWordCounts] = useState<EnhancedAudioTrack[]>([]);
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
    staleTime: 60000,
    gcTime: 300000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
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

  // Check if data is ready to display
  const isDataReady = useMemo(() => {
    if (!user?.id) return false;
    if (isReadingListLoading) return false;
    if (isReadingListFetching && !isDataCached) return false;
    return true;
  }, [user?.id, isReadingListLoading, isReadingListFetching, isDataCached]);

  // Add screen animation hook
  const { fadeInStyle } = useScreenAnimation(isDataReady, isLoadingState);

  const studyWordsQuery = useQuery({
    queryKey: ['studyWordsCounts', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(user.id);
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });
  const { isLoading: isStudyWordsLoading } = studyWordsQuery;

  const enhancedTracksQuery = useQuery({
    queryKey: ['enhancedAudioTracks', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return enhancedAudioService.getReadingListEnhancedTracks(user.id);
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
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
      currentTrackIndex, // Direct state value
      progress, // Direct state value
      metadataValues, // Derived from metadata
      tracksForWordCounts, // Local state for calculating word counts
      isStudyWordsLoading,
    }),
    [currentTrackIndex, progress, metadataValues, tracksForWordCounts, isStudyWordsLoading]
  );
  // --- End Derived State & Memos ---

  // --- Effects ---
  // Loading State Synchronization Effect
  useEffect(() => {
    const shouldBeLoading =
      isReadingListLoading || isReadingListFetching || isEnhancedTracksLoading; // Simplified logic based on primary queries

    if (shouldBeLoading === isLoadingState) {
      return;
    }

    // Debounce the state update slightly
    const timeoutId = setTimeout(() => {
      if (shouldBeLoading) {
        startLoading();
      } else {
        stopLoading();
      }
    }, 50); // Reduced debounce slightly

    return () => clearTimeout(timeoutId);
    // Dependencies MUST accurately reflect what's used to calculate shouldBeLoading and what triggers updates
  }, [
    isReadingListLoading,
    isReadingListFetching,
    isEnhancedTracksLoading,
    isLoadingState,
    startLoading,
    stopLoading,
  ]);

  // Initialize study word counts when enhanced tracks are loaded
  useEffect(() => {
    if (!isEnhancedTracksLoading && enhancedTracks.length > 0) {
      // Store enhanced tracks for word count calculations without affecting audio state
      setTracksForWordCounts(enhancedTracks);
    }
  }, [isEnhancedTracksLoading, enhancedTracks]);

  // Screen Focus Refresh Hook
  useScreenFocusRefresh(
    queryClient,
    'bookmarks',
    user?.id,
    1000 * 60 * 5, // 5 minutes
    true,
    false
  ); // Stabilized

  // Focus Effect - uses stable actions.stopPlayback
  const focusEffectCallback = useCallback(() => {
    if (!user?.id) return;

    const existingData = queryClient.getQueryData(['readingList', user.id]);
    if (!existingData || isReadingListLoading) {
      queryClient.prefetchQuery({
        queryKey: ['readingList', user.id],
        queryFn: () => readingListService.getReadingList(user.id),
        staleTime: 60000,
        gcTime: 300000,
        retry: 3,
      });
    }

    return () => {
      actions.stopPlayback(); // Use stable action
    };
  }, [user?.id, queryClient, isReadingListLoading, actions.stopPlayback]); // Use stable action
  useFocusEffect(focusEffectCallback);

  // --- Event Handlers (use stable actions) ---
  const isCurrentlyPlaying = audioState !== AUDIO_STATES.IDLE;

  const getArticleStudyWordsCount = useCallback(
    (articleId: number): number => {
      if (tracksForWordCounts.length > 0) {
        return Math.floor(
          tracksForWordCounts.filter(
            track =>
              track.articleId === articleId &&
              (track.type === 'study_word_english' || track.type === 'study_word_arabic')
          ).length / 2
        );
      }
      return actions.getStudyWordsCount(articleId);
    },
    [actions.getStudyWordsCount, tracksForWordCounts]
  );

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

  const insets = useSafeAreaInsets();

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
          <ThemedView
            useSafeArea={false}
            includeBottomInset={false}
            style={styles.flexOne}
            contentContainerStyle={[
              styles.listContentWithHeader,
              { paddingTop: getHeaderHeight(insets) },
            ]}
          >
            <EmptyState
              title="No Bookmarks Found"
              description="Bookmark articles to listen to them later or save them for reference."
              iconType="name"
              icon="book"
              colors={colors}
            />
          </ThemedView>
          <PageHeader title="Bookmarks" />
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
                isActive={actions.isActiveArticle(item.article_id)}
                studyWordsCount={getArticleStudyWordsCount(item.article_id)}
                isLoading={isStudyWordsLoading}
              />
            )}
            estimatedItemSize={ITEM_HEIGHT}
            contentContainerStyle={{
              paddingTop: getHeaderHeight(insets),
              paddingBottom:
                LAYOUT.CONTENT_SPACING.BOTTOM +
                LAYOUT.BOTTOM_BAR.HEIGHT +
                insets.bottom +
                LAYOUT.SPACING.SMALL,
              paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={null}
            ListFooterComponent={() => (
              <View
                style={{
                  paddingHorizontal: LAYOUT.SPACING.MEDIUM,
                  paddingBottom: LAYOUT.SPACING.MEDIUM,
                }}
              >
                <ThemedText
                  type="label"
                  style={{ fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, color: colors.textTertiary }}
                  skipDefaultColor
                >
                  Word count shows saved study words that will be played during article listening
                </ThemedText>
              </View>
            )}
            drawDistance={ITEM_HEIGHT * 10}
            overrideItemLayout={layout => {
              layout.size = ITEM_HEIGHT;
            }}
          />
        </ThemedView>

        <BottomControls
          onPlayAll={handlePlayAll}
          onShuffle={handleShuffle}
          isPlaying={isCurrentlyPlaying}
          isShuffleMode={isShuffleMode}
        />
        <PageHeader title="Bookmarks" />
      </ThemedView>
    </Animated.View>
  );
}
