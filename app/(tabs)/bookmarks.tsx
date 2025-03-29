import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readingListService } from '@/services/readingList';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { SignInRequired } from '@/components/SignInRequired';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import EmptyState from '@/components/EmptyState';
import { AUDIO_STATES } from '@/hooks/useAudioPlayer';
import PageHeader from '@/components/PageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseCard from '@/components/BaseCard';
import { RefreshControl } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Content area
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: 0,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
  },
  cardContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  textContent: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  iconContainer: {
    paddingTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardProgressContainer: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  cardProgressBar: {
    height: '100%',
  },
  // Bottom action bar
  bottomControlsContainer: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  controlsCard: {
    padding: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  controlsLabelContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  shuffleButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  activeCard: {
    borderLeftWidth: 3,
  },
  activeIcon: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  inactiveIcon: {
    opacity: LAYOUT.OPACITY.DISABLED / 1.5,
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  fullWidthButton: {
    width: '100%',
  },
  flexOne: {
    flex: 1,
  },
  mediumOpacity: {
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  listContentWithHeader: {
    paddingTop: 0,
  },
});

// Define a constant for item height calculation
// Card content + margins + borders
const ITEM_HEIGHT = 80; // Adjust based on your actual card height with padding and margins

// Memory-optimized component for reading list items
const ReadingListItem = React.memo(
  ({
    item,
    audioState,
    isShuffleMode,
    shuffledList,
    readingList,
    currentTrackIndex,
    playbackProgress,
  }: {
    item: any;
    audioState: string;
    isShuffleMode: boolean;
    shuffledList: any[];
    readingList: any[];
    currentTrackIndex: number;
    playbackProgress: number;
  }) => {
    const colors = useColors();

    const isItemPlaying =
      audioState === AUDIO_STATES.PLAYING &&
      ((isShuffleMode && shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
        (!isShuffleMode && readingList[currentTrackIndex]?.article_id === item.article_id));

    const isItemPaused =
      audioState === AUDIO_STATES.PAUSED &&
      ((isShuffleMode && shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
        (!isShuffleMode && readingList[currentTrackIndex]?.article_id === item.article_id));

    const isActive = isItemPlaying || isItemPaused;

    return (
      <View style={styles.cardContainer}>
        <BaseCard
          onPress={() => router.push(`/article/${item.article_id}`)}
          style={[styles.card, isActive && { ...styles.activeCard, borderColor: colors.tint }]}
          shadowSize="small"
        >
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText
                type="bodyBold"
                style={[styles.titleText, isActive && { color: colors.tint }]}
              >
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
                    width: `${(isItemPlaying || isItemPaused ? playbackProgress : 0) * 100}%`,
                  },
                ]}
              />
            </View>
          )}
        </BaseCard>
      </View>
    );
  }
);

ReadingListItem.displayName = 'ReadingListItem';

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
  const flashListRef = useRef<FlashList<any>>(null);

  // Use the new loading state hook with optimized defaults
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

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

  // Simple audio state management
  const [audioState, setAudioState] = useState(AUDIO_STATES.IDLE);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [shuffledList, setShuffledList] = useState<any[]>([]);
  const [playlistMode, setPlaylistMode] = useState(false); // Track if we're playing a list or single item

  // Simple refs for audio instance, timers, and state tracking
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastActionTimeRef = useRef(Date.now());

  // Clean up all audio resources
  const cleanupAudio = useCallback(async () => {
    // Clear any timers
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Unload sound if it exists
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      } catch (error) {
        // Error during cleanup
      }
    }
  }, []);

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

  // Handle component focus and cleanup - MUST BE BEFORE ANY CONDITIONAL RETURNS
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
            console.error('Failed to refresh reading list:', error);
          });
        }
      }

      return () => {
        // Clean up audio when screen is unfocused
        cleanupAudio();
      };
    }, [user?.id, queryClient, isDataLoading, cleanupAudio])
  );

  // Get active playlist based on mode
  const activePlaylist = useMemo(() => {
    return isShuffleMode ? shuffledList : readingList || [];
  }, [isShuffleMode, shuffledList, readingList]);

  // Check if something is currently playing
  const isCurrentlyPlaying = useMemo(() => {
    return audioState !== AUDIO_STATES.IDLE;
  }, [audioState]);

  // Initialize audio session
  const initAudioSession = async () => {
    try {
      // Set audio mode once at the beginning
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      // Failed to set audio mode
    }
  };

  // Load and play audio with the specified URL
  const loadAndPlayAudio = async (audioUrl: string) => {
    if (!audioUrl) {
      setAudioState(AUDIO_STATES.ERROR);
      return false;
    }

    try {
      setAudioState(AUDIO_STATES.LOADING);
      lastActionTimeRef.current = Date.now();

      // Clean up any existing audio first
      await cleanupAudio();

      // Create the new sound object
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;

      // Add a small delay before playing to ensure the audio system is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Start playback
      await sound.playAsync();
      setAudioState(AUDIO_STATES.PLAYING);

      // Start tracking progress
      startProgressTracking();

      return true;
    } catch (error) {
      setAudioState(AUDIO_STATES.ERROR);
      return false;
    }
  };

  // Handle playback status updates
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setAudioState(AUDIO_STATES.ERROR);
      }
      return;
    }

    // Update progress if playing
    if (status.isPlaying && status.durationMillis) {
      const progress = status.positionMillis / status.durationMillis;
      setPlaybackProgress(progress || 0);
    }

    // Handle playback completion
    if (status.didJustFinish) {
      if (status.isLooping) {
        return;
      }

      // Update state based on playback mode
      if (audioState === AUDIO_STATES.PLAYING) {
        setAudioState(AUDIO_STATES.PAUSED);
      }

      // Handle completion based on mode
      if (!playlistMode) {
        // Single track mode - just stop
        stopPlayback();
      } else {
        // In playlist mode, proceed to next track
        playNextTrack();
      }
    }
  };

  // Start tracking playback progress
  const startProgressTracking = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Set up progress tracking interval
    progressIntervalRef.current = setInterval(async () => {
      if (soundRef.current && audioState === AUDIO_STATES.PLAYING) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            const progress = status.positionMillis / status.durationMillis;
            setPlaybackProgress(progress);
          }
        } catch (error) {
          // Error getting status
        }
      }
    }, 1000); // Update every second
  };

  // Toggle track playback

  // Start playback of all tracks in order
  const startPlayback = async () => {
    // Check if we have a playlist
    if (!readingList || readingList.length === 0) {
      return;
    }

    // Start from the beginning
    setCurrentTrackIndex(0);
    setIsShuffleMode(false);

    // Set to playlist mode
    setPlaylistMode(true);
  };

  // Stop all playback
  const stopPlayback = async () => {
    // Stop and clean up
    await cleanupAudio();

    // Reset state
    setAudioState(AUDIO_STATES.IDLE);
    setCurrentTrackIndex(-1);
    setPlaybackProgress(0);
    setPlaylistMode(false);
  };

  // Start shuffle playback
  const startShufflePlayback = async () => {
    // Check if we have a playlist
    if (!readingList || readingList.length === 0) {
      return;
    }

    // Create shuffled playlist
    const shuffled = [...readingList].sort(() => Math.random() - 0.5);

    // Make sure the first item has a valid audio URL
    if (!shuffled[0]?.articles?.audio_url) {
      const validIndex = shuffled.findIndex(item => !!item?.articles?.audio_url);
      if (validIndex > 0) {
        // Swap with first item
        [shuffled[0], shuffled[validIndex]] = [shuffled[validIndex], shuffled[0]];
      }
    }

    // Update state
    setShuffledList(shuffled);
    setCurrentTrackIndex(0);
    setIsShuffleMode(true);

    // Set to playlist mode
    setPlaylistMode(true);
  };

  // Play next track in playlist
  const playNextTrack = async () => {
    // If not in playlist mode or at the end of playlist, stop playback
    if (!playlistMode || currentTrackIndex < 0 || currentTrackIndex >= activePlaylist.length - 1) {
      await stopPlayback();
      return;
    }

    // Move to next track
    setCurrentTrackIndex(prev => prev + 1);
  };

  // Play previous track in playlist

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Pause when app goes to background
      if (nextAppState !== 'active' && audioState === AUDIO_STATES.PLAYING && soundRef.current) {
        soundRef.current.pauseAsync().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [audioState]);

  // Initialize audio session when component mounts
  useEffect(() => {
    initAudioSession();

    // Set mounted flag
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Load and play track when currentTrackIndex or activePlaylist changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && activePlaylist && currentTrackIndex < activePlaylist.length) {
      const track = activePlaylist[currentTrackIndex];
      if (track?.articles?.audio_url) {
        loadAndPlayAudio(track.articles.audio_url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex, activePlaylist]);

  const insets = useSafeAreaInsets();

  // Require sign in
  if (!user) {
    return (
      <SignInRequired
        headerTitle="Bookmarks"
        colors={colors}
        message="Sign in to manage your bookmarked articles"
        benefitTitle="Benefits of Bookmarks"
        benefitDescription="Save articles for later and listen to audio versions on the go."
      />
    );
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
              icon="book"
              onAction={() => router.push('/(tabs)')}
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
            keyExtractor={item => `${item.article_id}`}
            renderItem={({ item }) => (
              <ReadingListItem
                item={item}
                audioState={audioState}
                isShuffleMode={isShuffleMode}
                shuffledList={shuffledList}
                readingList={readingList}
                currentTrackIndex={currentTrackIndex}
                playbackProgress={playbackProgress}
              />
            )}
            estimatedItemSize={ITEM_HEIGHT}
            contentContainerStyle={{
              paddingTop: Math.max(
                insets.top + LAYOUT.SPACING.XXLARGE + LAYOUT.SPACING.XLARGE,
                LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XXLARGE + LAYOUT.SPACING.MEDIUM
              ),
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

        <View style={[styles.cardProgressContainer, { backgroundColor: colors.transparent }]} />
        <View style={[styles.bottomControlsContainer, { backgroundColor: colors.transparent }]} />

        <BottomControls
          onPlayAll={isCurrentlyPlaying ? stopPlayback : startPlayback}
          onShuffle={isCurrentlyPlaying ? stopPlayback : startShufflePlayback}
          isPlaying={isCurrentlyPlaying}
          isShuffleMode={isShuffleMode}
        />
        <PageHeader title="Bookmarks" />
      </ThemedView>
    </Animated.View>
  );
}
