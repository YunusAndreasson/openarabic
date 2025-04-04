import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readingListService } from '@/services/readingList';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { UnifiedSignInScreen } from '@/components/UnifiedSignInScreen';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import EmptyState from '@/components/EmptyState';
import { AUDIO_STATES, useAudioPlayer, AudioTrack } from '@/hooks/useAudioPlayer';
import PageHeader from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseCard from '@/components/BaseCard';
import { Article } from '../../types/articles.types';
import { Tables } from '../../types/database.types';

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
  mediumOpacity: {
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  shuffleButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
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
const BookmarkListItem = React.memo(
  ({
    item,
    progress,
    duration,
    isActive,
  }: {
    item: ReadingListItem;
    audioState: string;
    progress: number;
    duration: number;
    isActive: boolean;
  }) => {
    const colors = useColors();

    // Calculate progress percentage
    const playbackProgress = duration > 0 ? progress / duration : 0;

    // Prepare styles explicitly for clarity
    const activeCardStyle = isActive
      ? {
          ...styles.activeCard,
          borderColor: colors.tint,
          borderLeftWidth: 3, // Force border width
        }
      : undefined;

    const activeTitleStyle = isActive ? { color: colors.tint } : undefined;

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
              <ThemedText
                type="label"
                variant="secondary"
                numberOfLines={1}
                style={isActive ? styles.mediumOpacity : undefined}
              >
                {item.articles?.author?.name || 'Unknown Author'}
              </ThemedText>
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

          {isActive && (
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
          )}
        </BaseCard>
      </View>
    );
  },
  // Custom equality function to ensure re-rendering when audio state changes
  (prevProps, nextProps) => {
    // Always re-render if active state changes
    if (prevProps.isActive !== nextProps.isActive) return false;

    // If this item is active, re-render when audio state or progress changes
    if (nextProps.isActive) {
      return (
        prevProps.audioState === nextProps.audioState &&
        prevProps.progress === nextProps.progress &&
        prevProps.duration === nextProps.duration
      );
    }

    // Otherwise, only re-render if basic props change
    return prevProps.item.article_id === nextProps.item.article_id;
  }
);

BookmarkListItem.displayName = 'BookmarkListItem';

// Bottom Action Buttons component
const BottomControls = React.memo(
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

export default function BookmarksScreen() {
  const colors = useColors();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const flashListRef = useRef<FlashList<ReadingListItem>>(null);
  // Store the current playlist
  const currentPlaylistRef = useRef<AudioTrack[]>([]);

  // Use the new loading state hook with optimized defaults
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

  // Use the AudioPlayer hook
  const {
    audioState,
    currentTrackIndex,
    progress,
    duration,
    playlistMode,
    startPlayback,
    stopPlayback,
    startShufflePlayback,
    playNextTrack,
  } = useAudioPlayer();

  // Maintain shuffled mode state separately
  const [isShuffleMode, setIsShuffleMode] = useState(false);

  // Query for reading list
  const {
    data: readingList = [], // Default to empty array to avoid undefined
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
    enabled: !!user?.id && !isAuthLoading, // Only enable when auth is resolved and user exists
    staleTime: 60000, // Cache for 1 minute rather than no caching
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    placeholderData: () => queryClient.getQueryData(['readingList', user?.id]) || [],
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
    return !!user && !isDataLoading && !!readingList;
  }, [user, isDataLoading, readingList]);

  // Use improved screen animation with data-ready check
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoadingState
    // Using default values for remaining parameters
  );

  // Update loading state based on data loading
  useEffect(() => {
    if (isAuthLoading || isDataLoading || isFetching) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [
    isAuthLoading,
    isDataLoading,
    isFetching,
    startLoading,
    stopLoading,
    isError,
    error,
    readingList,
    user,
  ]);

  // Add an extra effect to force refresh reading list data when auth state changes
  useEffect(() => {
    if (user?.id && !isDataLoading) {
      queryClient.invalidateQueries({ queryKey: ['readingList', user.id] });
    }
  }, [user?.id, queryClient, isDataLoading]);

  // Handle component focus and cleanup
  useFocusEffect(
    React.useCallback(() => {
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

  // Convert reading list to audio tracks
  const readingListTracks = useMemo((): AudioTrack[] => {
    if (!readingList || readingList.length === 0) return [];

    return readingList
      .filter(item => !!item.articles?.audio_url)
      .map(item => ({
        id: item.article_id,
        audioUrl: item.articles.audio_url as string, // Cast to string since we filtered nulls
        title: item.articles.title || 'Untitled',
        // Add other needed properties
      }));
  }, [readingList]);

  // Check if an item is the currently playing track
  const isActiveTrack = useCallback(
    (articleId: number): boolean => {
      // First check if we're playing at all
      if (audioState === AUDIO_STATES.IDLE || currentTrackIndex < 0) {
        return false;
      }

      // Get the current track
      const currentTrack = readingListTracks[currentTrackIndex];
      if (!currentTrack) return false;

      // Compare IDs directly
      return currentTrack.id === articleId;
    },
    [audioState, currentTrackIndex, readingListTracks]
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
      if (currentTrackIndex < currentPlaylistRef.current.length - 1) {
        // Small delay to allow state to settle
        setTimeout(() => {
          playNextTrack(currentPlaylistRef.current);
        }, 300);
      }
    }
  }, [audioState, playlistMode, currentTrackIndex, playNextTrack]);

  // Handle "Play All" button
  const handlePlayAll = useCallback(() => {
    if (isCurrentlyPlaying) {
      stopPlayback();
      setIsShuffleMode(false);
      currentPlaylistRef.current = [];
    } else {
      // Make sure we have valid audio tracks
      const validTracks = readingListTracks.filter(track => !!track.audioUrl);

      if (validTracks.length === 0) return;

      // Store the current playlist
      currentPlaylistRef.current = validTracks;

      // Start playback with the valid tracks
      startPlayback(validTracks, 0); // Explicitly start at index 0
      setIsShuffleMode(false);
    }
  }, [isCurrentlyPlaying, readingListTracks, startPlayback, stopPlayback]);

  // Handle "Shuffle" button
  const handleShuffle = useCallback(() => {
    if (isCurrentlyPlaying) {
      stopPlayback();
      setIsShuffleMode(false);
      currentPlaylistRef.current = [];
    } else {
      // Make sure we have valid audio tracks
      const validTracks = readingListTracks.filter(track => !!track.audioUrl);

      if (validTracks.length === 0) return;

      // Store the current playlist (shuffled version will be created internally)
      currentPlaylistRef.current = validTracks;

      startShufflePlayback(validTracks);
      setIsShuffleMode(true);
    }
  }, [isCurrentlyPlaying, readingListTracks, startShufflePlayback, stopPlayback]);

  const insets = useSafeAreaInsets();

  // Require sign in
  if (!user) {
    return <UnifiedSignInScreen headerTitle="Bookmarks" colors={colors} />;
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
              icon={{ name: 'book', size: 48 }}
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
            extraData={[audioState, currentTrackIndex, progress]}
            keyExtractor={item => `${item.article_id}`}
            renderItem={({ item }) => (
              <BookmarkListItem
                item={item}
                audioState={audioState}
                progress={progress}
                duration={duration}
                isActive={isActiveTrack(item.article_id)}
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
