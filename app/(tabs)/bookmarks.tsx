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
import type { AudioTrack } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import type { EnhancedAudioTrack } from '@/services/enhancedAudioService';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

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
    shadowOpacity: 0.3,
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
    opacity: LAYOUT.OPACITY.DISABLED / 1.5,
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
    if (
      prevProps.isActive !== nextProps.isActive ||
      prevProps.studyWordsCount !== nextProps.studyWordsCount ||
      prevProps.isLoading !== nextProps.isLoading
    ) {
      return false;
    }
    return nextProps.isActive
      ? prevProps.progress === nextProps.progress && prevProps.duration === nextProps.duration
      : prevProps.item.article_id === nextProps.item.article_id;
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
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

  // Use the enhanced audio player
  const enhancedAudioPlayer = useEnhancedAudioPlayer();
  const {
    audioState,
    currentTrackIndex,
    progress,
    duration,
    playlistMode,
    stopPlayback,
    playNextTrack,
    metadata,
  } = enhancedAudioPlayer;

  const [isShuffleMode, setIsShuffleMode] = useState(false);

  // Query for reading list
  const {
    data: readingList = [],
    isLoading: isDataLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
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
    placeholderData: () => queryClient.getQueryData(['readingList', user?.id]) || [],
  });

  // Query for study words counts - We'll now get this from the enhancedAudioPlayer
  const { isLoading: isStudyWordsLoading } = useQuery({
    queryKey: ['studyWordsCounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      // We need to still fetch this for initial loading state
      // but will use the enhanced tracks for the actual counts
      return studyWordsFSRSService.getFSRSWords(user.id);
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Enhanced tracks for reading list
  const { data: enhancedTracks = [], isLoading: isEnhancedTracksLoading } = useQuery({
    queryKey: ['enhancedAudioTracks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return enhancedAudioService.getReadingListEnhancedTracks(user.id);
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Use the screen focus refresh hook
  useScreenFocusRefresh(
    queryClient,
    'readingList',
    user?.id,
    0, // No caching
    false, // Don't skip initial focus
    true // Force refresh on focus
  );

  // Check if data is ready to display
  const isDataReady = useMemo(() => {
    return !isDataLoading && !!readingList;
  }, [isDataLoading, readingList]);

  // Use improved screen animation with data-ready check
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoadingState
    // Using default values for remaining parameters
  );

  // Update loading state based on data loading
  useEffect(() => {
    if (isDataLoading || isFetching) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isDataLoading, isFetching, startLoading, stopLoading, isError, error, readingList]);

  // Add an extra effect to force refresh reading list data when auth state changes
  useEffect(() => {
    if (user?.id && !isDataLoading) {
      queryClient.invalidateQueries({ queryKey: ['readingList', user.id] });
    }
  }, [user?.id, queryClient, isDataLoading]);

  // Handle component focus and cleanup
  useFocusEffect(
    useCallback(() => {
      // Refresh reading list when screen is focused
      if (user?.id) {
        // First check if we already have data
        const existingData = queryClient.getQueryData(['readingList', user.id]);

        // If we need fresh data, trigger prefetch instead of invalidation
        if (!existingData || isDataLoading) {
          queryClient.prefetchQuery({
            queryKey: ['readingList', user.id],
            queryFn: () => readingListService.getReadingList(user.id),
            staleTime: 60000, // Match the query staleTime
            gcTime: 300000, // Match the query gcTime
            retry: 3,
          });
        } else {
          // Otherwise just invalidate to refresh in background
          queryClient.invalidateQueries({ queryKey: ['readingList', user.id] }).catch(error => {
            throw error;
          });
        }
      }

      return () => {
        // Stop playback when leaving the screen
        stopPlayback();
      };
    }, [user?.id, queryClient, isDataLoading, stopPlayback])
  );

  // Check if an item is the currently playing track
  const isActiveTrack = useCallback(
    (articleId: number): boolean => {
      // First check if we're playing at all
      if (audioState === AUDIO_STATES.IDLE) {
        return false;
      }

      // Check if article ID matches the one in metadata
      return metadata.articleId === articleId;
    },
    [audioState, metadata]
  );

  // Get study word count for an article
  const getArticleStudyWordsCount = useCallback(
    (articleId: number): number => {
      return enhancedAudioPlayer.getStudyWordsCount(articleId);
    },
    [enhancedAudioPlayer]
  );

  // Check if something is currently playing
  const isCurrentlyPlaying = audioState !== AUDIO_STATES.IDLE;

  // Add an effect to monitor track completion and handle next track
  useEffect(() => {
    // If we're not in playlist mode, don't do anything
    if (!playlistMode || audioState !== AUDIO_STATES.PLAYING) return;

    // If we're at the end of the track (progress close to duration)
    if (duration > 0 && progress > 0 && progress / duration > 0.99) {
      // Only track completion once
      if (!endOfTrackReachedRef.current) {
        endOfTrackReachedRef.current = true;
      }
    } else {
      // Reset flag when not at end of track
      endOfTrackReachedRef.current = false;
    }
  }, [progress, duration, playlistMode, currentTrackIndex, audioState]);

  // Add a separate effect for actual track transitions
  // This addresses a timing issue where the status update in the hook doesn't always trigger
  const endOfTrackReachedRef = useRef(false);
  useEffect(() => {
    // If track just changed to PAUSED and we were near the end, try to play next track
    if (audioState === AUDIO_STATES.PAUSED && endOfTrackReachedRef.current && playlistMode) {
      endOfTrackReachedRef.current = false;

      // Check if we have more tracks
      if (currentTrackIndex < enhancedTracks.length - 1) {
        // Small delay to allow state to settle
        setTimeout(() => {
          playNextTrack();
        }, 300);
      }
    }
  }, [audioState, playlistMode, currentTrackIndex, playNextTrack]);

  // Handle "Play All" button
  const handlePlayAll = useCallback(() => {
    if (isCurrentlyPlaying) {
      stopPlayback();
      setIsShuffleMode(false);
    } else {
      // Make sure we have valid enhanced tracks
      if (enhancedTracks.length === 0) return;

      // Start playback with the enhanced tracks
      enhancedAudioPlayer.startEnhancedPlayback(enhancedTracks, 0);
      setIsShuffleMode(false);
    }
  }, [isCurrentlyPlaying, enhancedTracks, enhancedAudioPlayer, stopPlayback]);

  // Handle "Shuffle" button
  const handleShuffle = useCallback(() => {
    if (isCurrentlyPlaying) {
      stopPlayback();
      setIsShuffleMode(false);
    } else {
      // Make sure we have valid audio tracks
      if (enhancedTracks.length === 0) return;

      enhancedAudioPlayer.startEnhancedShufflePlayback(enhancedTracks);
      setIsShuffleMode(true);
    }
  }, [isCurrentlyPlaying, enhancedTracks, enhancedAudioPlayer, stopPlayback]);

  const insets = useSafeAreaInsets();

  // Show loading screen during initial load
  if (isDataLoading || isEnhancedTracksLoading) {
    return <LoadingScreen />;
  }

  // Empty reading list
  if (readingList.length === 0) {
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
              actionText="Browse Articles"
              iconType="name"
              icon="book"
              onAction={() => router.push('/(tabs)')}
              colors={colors}
            />
          </ThemedView>
          <PageHeader title="Bookmarks" />
        </ThemedView>
      </Animated.View>
    );
  }

  // Normal display with playlist
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
            extraData={[currentTrackIndex, progress, metadata, enhancedTracks, isStudyWordsLoading]}
            keyExtractor={item => `${item.article_id}`}
            renderItem={({ item }) => (
              <BookmarkListItem
                item={item}
                progress={progress}
                duration={duration}
                isActive={isActiveTrack(item.article_id)}
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
                  style={{
                    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
                    color: colors.textTertiary,
                  }}
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
