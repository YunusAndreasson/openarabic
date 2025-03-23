import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, View, AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readingListService } from '@/services/readingList';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { SignInRequired } from '@/components/SignInRequired';
import { Audio } from 'expo-av';
import { LAYOUT } from '@/constants/layout';
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

// Helper function to calculate header height
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Content area
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: 0,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.MEDIUM * 5,
  },
  // Card styling
  cardContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  textContent: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardProgressContainer: {
    height: 3,
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  cardProgressBar: {
    height: '100%',
  },
  // Bottom action bar - similar to vocabulary screen
  bottomControlsContainer: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    backgroundColor: 'transparent',
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
    borderWidth: 1,
  },
  playButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderBottomRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    backgroundColor: 'transparent',
  },
});

// Define a constant for item height calculation
// Card content + margins + borders
const ITEM_HEIGHT = 80; // Adjust based on your actual card height with padding and margins

// Memory-optimized component for reading list items
const ReadingListItem = React.memo(
  ({
    title,
    author,
    progress,
    isPlaying,
    isPaused,
    articleId,
  }: {
    title: string;
    author: string;
    progress: number;
    isPlaying: boolean;
    isPaused: boolean;
    articleId: number;
  }) => {
    const colors = useColors();
    const isActive = isPlaying || isPaused;

    return (
      <View style={styles.cardContainer}>
        <BaseCard
          onPress={() => router.push(`/article/${articleId}`)}
          style={[
            styles.card,
            isActive && {
              borderColor: colors.tint,
              borderLeftWidth: 3,
            },
          ]}
          shadowSize="small"
        >
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText
                type="bodyBold"
                numberOfLines={1}
                style={isActive ? { color: colors.tint } : undefined}
              >
                {title}
              </ThemedText>
              <ThemedText
                type="label"
                variant="secondary"
                numberOfLines={1}
                style={isActive ? { opacity: 0.8 } : undefined}
              >
                {author}
              </ThemedText>
            </View>
            <View style={styles.iconContainer}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isActive ? colors.tint : colors.text}
                style={{
                  opacity: isActive ? LAYOUT.OPACITY.DIMMED : LAYOUT.OPACITY.DISABLED / 1.5,
                }}
              />
            </View>
          </View>

          {/* Progress indicator at bottom of card */}
          {isActive && (
            <View style={styles.cardProgressContainer}>
              <View
                style={[
                  styles.cardProgressBar,
                  {
                    backgroundColor: colors.tint,
                    width: `${progress * 100}%`,
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
      <View style={styles.bottomControlsContainer}>
        <BaseCard style={styles.controlsCard} shadowSize="medium" includePressAnimation={false}>
          <View style={styles.controlsLabelContainer}>
            <ThemedText type="overline" variant="secondary">
              AUDIO CONTROLS
            </ThemedText>
          </View>
          <View style={styles.actionButtonsRow}>
            <View style={{ width: '48%' }}>
              <ThemedButton
                title={isPlaying && !isShuffleMode ? 'Stop' : 'Play All'}
                onPress={onPlayAll}
                variant="filled"
                style={{ width: '100%' }}
                accessibilityLabel={
                  isPlaying && !isShuffleMode ? 'Stop playback' : 'Play all bookmarked articles'
                }
              />
            </View>
            <View style={{ width: '48%' }}>
              <ThemedButton
                title={isPlaying && isShuffleMode ? 'Stop' : 'Shuffle'}
                onPress={onShuffle}
                variant="outlined"
                style={[styles.shuffleButton, { width: '100%', borderColor: colors.tint }]}
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

export default function BookmarksScreen() {
  const colors = useColors();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList<any>>(null);

  // Use the new loading state hook with optimized defaults
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

  // Query for reading list
  const {
    data: readingList,
    isLoading: isDataLoading,
    status,
    refetch,
  } = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => (user?.id ? readingListService.getReadingList(user.id) : []),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  // Use the screen focus refresh hook
  useScreenFocusRefresh(
    queryClient,
    'readingList',
    user?.id,
    60000 // 1 minute stale time
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
    if (isAuthLoading || (!!user && (isDataLoading || status === 'pending'))) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isAuthLoading, user, isDataLoading, status, startLoading, stopLoading]);

  // Get active playlist based on mode
  const activePlaylist = useMemo(() => {
    return isShuffleMode ? shuffledList : readingList || [];
  }, [isShuffleMode, shuffledList, readingList]);

  // Check if something is currently playing
  const isCurrentlyPlaying = useMemo(() => {
    return audioState !== AUDIO_STATES.IDLE;
  }, [audioState]);

  // Clean up all audio resources
  const cleanupAudio = async () => {
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
  };

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
  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) {
      if (status.error) {
        setAudioState(AUDIO_STATES.ERROR);
      }
      return;
    }

    // Update progress if playing
    if (status.isPlaying) {
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

  // Handle component focus and cleanup
  useFocusEffect(
    React.useCallback(() => {
      // Refresh reading list when screen is focused
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['readingList'] });
      }

      return () => {
        // Clean up audio when screen is unfocused
        cleanupAudio();
      };
    }, [user?.id, queryClient])
  );

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
  }, []);

  // Load and play track when currentTrackIndex or activePlaylist changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && activePlaylist && currentTrackIndex < activePlaylist.length) {
      const track = activePlaylist[currentTrackIndex];
      if (track?.articles?.audio_url) {
        loadAndPlayAudio(track.articles.audio_url);
      }
    }
  }, [currentTrackIndex, activePlaylist]);

  const insets = useSafeAreaInsets();

  // Use cached data to render a skeleton while loading instead of the full loading screen
  if (isLoadingState && !readingList) {
    return (
      <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
        <ThemedView
          style={styles.container}
          includeBottomInset={false}
          safeAreaEdges={['left', 'right']}
        >
          <PageHeader title="Bookmarks" />
        </ThemedView>
      </Animated.View>
    );
  }

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
  if (!readingList || readingList.length === 0) {
    return (
      <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
        <ThemedView
          style={styles.container}
          includeBottomInset={false}
          safeAreaEdges={['left', 'right']}
        >
          <ThemedView
            useSafeArea={false}
            includeBottomInset={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: getHeaderHeight(insets) }}
          >
            <EmptyState
              title="No Bookmarks Found"
              message="Bookmark articles to listen to them later or save them for reference."
              buttonTitle="Browse Articles"
              buttonIcon="book"
              onButtonPress={() => router.push('/(tabs)')}
            />
          </ThemedView>
          <PageHeader title="Bookmarks" />
        </ThemedView>
      </Animated.View>
    );
  }

  // Normal display with playlist
  return (
    <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <ThemedView useSafeArea={false} includeBottomInset={false} style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={readingList}
            keyExtractor={item => `${item.article_id}`}
            renderItem={({ item }) => {
              // Determine if this item is currently playing
              const isItemPlaying =
                audioState === AUDIO_STATES.PLAYING &&
                ((isShuffleMode &&
                  shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
                  (!isShuffleMode &&
                    readingList[currentTrackIndex]?.article_id === item.article_id));

              const isItemPaused =
                audioState === AUDIO_STATES.PAUSED &&
                ((isShuffleMode &&
                  shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
                  (!isShuffleMode &&
                    readingList[currentTrackIndex]?.article_id === item.article_id));

              return (
                <ReadingListItem
                  title={item.articles?.title || 'Untitled'}
                  author={item.articles?.author?.name || 'Unknown Author'}
                  progress={isItemPlaying || isItemPaused ? playbackProgress : 0}
                  isPlaying={isItemPlaying}
                  isPaused={isItemPaused}
                  articleId={item.article_id}
                />
              );
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingTop: getHeaderHeight(insets) }]}
            removeClippedSubviews={true}
            initialNumToRender={10}
            getItemLayout={(data, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
          />
        </ThemedView>

        {/* Bottom Action Buttons - similar to vocabulary screen */}
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
