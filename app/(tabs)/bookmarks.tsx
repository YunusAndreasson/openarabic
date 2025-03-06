import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, FlatList, View, Platform, AppState, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readingListService } from '@/services/reading_list';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { Audio } from 'expo-av';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { LoadingScreen } from '../../components/Loader';
import { Ionicons } from '@expo/vector-icons';
import { CompactThemedCard } from '@/components/CompactThemedCard';
import Animated, { FadeIn } from 'react-native-reanimated';

// ====== AUDIO PLAYER CONSTANTS ======
const AUDIO_STATES = {
  IDLE: 'idle', // Not playing anything
  LOADING: 'loading', // Loading audio
  PLAYING: 'playing', // Playing audio
  PAUSED: 'paused', // Audio loaded but paused
  ERROR: 'error', // Error occurred
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  // Content area
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.MEDIUM * 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  emptyStateTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  emptyStateMessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  // List item styling
  itemContainer: {
    marginBottom: 0,
    position: 'relative', // Important for proper progress indicator positioning
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.SMALL * 0.8,
    paddingBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemContentContainer: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  itemTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY / 2,
    lineHeight: (LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1) * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  itemAuthor: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1, // Ensure progress indicator appears above other elements
  },
  progressIndicator: {
    height: 2, // Slightly thicker for better visibility
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '0%',
  },
  // Bottom action bar - similar to vocabulary screen
  bottomControlsContainer: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    backgroundColor: 'transparent',
  },
  controlsCard: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    padding: LAYOUT.SPACING.MEDIUM,
    backgroundColor: 'transparent',
  },
  controlsTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
  },
  shuffleButton: {
    borderWidth: 1,
  },
});

// Playlist Item Component - redesigned as simple list item with just progress indicator
const BookmarkItem = React.memo(
  ({
    title,
    author,
    isPlaying,
    isPaused,
    progress,
    articleId,
  }: {
    title: string;
    author: string;
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
    articleId: number;
  }) => {
    const colors = useColors();
    const isActive = isPlaying || isPaused;

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => router.push(`/article/${articleId}`)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.listItem,
            {
              borderBottomColor: colors.cardBorder,
              backgroundColor: isActive ? `${colors.tint}08` : 'transparent',
            },
          ]}
        >
          <View style={styles.itemContentContainer}>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.itemTitle,
                isActive && {
                  color: colors.tint,
                  fontWeight: '600', // Slightly bolder when active
                },
              ]}
            >
              {title}
            </ThemedText>
            <ThemedText
              style={[
                styles.itemAuthor,
                isActive && { opacity: 0.8 }, // More visible when active
              ]}
              numberOfLines={1}
            >
              {author}
            </ThemedText>
          </View>

          {isActive ? (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.tint}
              style={{ opacity: LAYOUT.OPACITY.DIMMED }}
            />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.text}
              style={{ opacity: LAYOUT.OPACITY.DISABLED / 1.5 }}
            />
          )}
        </View>

        {/* Progress indicator at bottom of the item */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressIndicator,
              { backgroundColor: isActive ? colors.textOverlay : 'transparent' },
            ]}
          >
            {isActive && (
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: colors.tint,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
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
        <View
          style={[
            styles.controlsCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <ThemedText style={styles.controlsTitle}>PLAYBACK CONTROLS</ThemedText>
          <View style={styles.actionButtonsRow}>
            <ThemedButton
              title={isPlaying && !isShuffleMode ? 'Stop' : 'Play All'}
              icon={isPlaying && !isShuffleMode ? 'stop-circle' : 'play-circle'}
              onPress={onPlayAll}
              variant="filled"
              style={{ flex: 1 }}
            />
            <ThemedButton
              title={isPlaying && isShuffleMode ? 'Stop' : 'Shuffle'}
              icon={isPlaying && isShuffleMode ? 'stop-circle' : 'shuffle'}
              onPress={onShuffle}
              variant="outlined"
              style={[{ flex: 1 }, styles.shuffleButton, { borderColor: colors.tint }]}
            />
          </View>
        </View>
      </View>
    );
  }
);

export default function BookmarksScreen() {
  const colors = useColors();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList<any>>(null);

  // Loading state management (similar to Vocabulary screen)
  const loadingStartTime = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Query for reading list
  const {
    data: readingList,
    isLoading: isDataLoading,
    isFetching,
    status,
    refetch,
  } = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => (user?.id ? readingListService.getReadingList(user.id) : []),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  // Mark data as loaded when we get results
  useEffect(() => {
    if (readingList && readingList.length >= 0) {
      dataLoadedRef.current = true;
    }
  }, [readingList]);

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

  // Enhanced loading state detection with minimum duration (like Vocabulary screen)
  const isLoading = useMemo(() => {
    const isCurrentlyLoading = isAuthLoading || (!!user && (isDataLoading || status === 'pending'));

    // Start tracking loading time
    if (isCurrentlyLoading && loadingStartTime.current === null) {
      loadingStartTime.current = Date.now();
    }

    // If not actually loading anymore, check if minimum time elapsed
    if (!isCurrentlyLoading && loadingStartTime.current !== null) {
      const timeElapsed = Date.now() - loadingStartTime.current;

      // Ensure loading shows for at least 500ms to avoid flashes
      if (timeElapsed < 500) {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }

        // Set a timeout to update after minimum time
        loadingTimeoutRef.current = setTimeout(() => {
          loadingStartTime.current = null;
          isInitialMount.current = false;
          // Force a re-render to update the loading state
          setForceUpdate(prev => !prev);
        }, 500 - timeElapsed);

        // Haven't shown loader for 500ms yet, so keep showing
        return true;
      }

      // Reset timer and mark initial mount as done
      loadingStartTime.current = null;
      isInitialMount.current = false;
    }

    return isCurrentlyLoading;
  }, [isAuthLoading, user, isDataLoading, status, forceUpdate]);

  // Clean up loading timeouts on focus change and conditionally refetch data
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we have a user and this isn't the initial focus
      // Also check if data is stale before refetching
      if (user?.id && !isInitialMount.current) {
        // Check if data is stale before refetching
        const readingListQueryData = queryClient.getQueryState(['readingList', user?.id]);

        const isReadingListStale = readingListQueryData?.dataUpdatedAt
          ? Date.now() - readingListQueryData.dataUpdatedAt > 60000 // 1 minute
          : true;

        // Only refetch if data is stale
        if (isReadingListStale) {
          refetch();
        }
      }

      // Mark initial mount as completed after first render
      if (isInitialMount.current && user) {
        isInitialMount.current = false;
      }

      return () => {
        // Clear any pending timeouts when screen loses focus
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = undefined;
        }
        // Reset loading state when unmounting
        loadingStartTime.current = null;
      };
    }, [user, refetch, queryClient])
  );

  // Get active playlist based on mode
  const activePlaylist = useMemo(() => {
    return isShuffleMode ? shuffledList : readingList || [];
  }, [isShuffleMode, shuffledList, readingList]);

  // Get current track
  const currentTrack = useMemo(() => {
    if (currentTrackIndex < 0 || !activePlaylist || currentTrackIndex >= activePlaylist.length) {
      return null;
    }
    return activePlaylist[currentTrackIndex];
  }, [currentTrackIndex, activePlaylist]);

  // Get current audio URL
  const currentAudioUrl = useMemo(() => {
    return currentTrack?.article?.audio_url || null;
  }, [currentTrack]);

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
  const toggleTrack = async (index: number) => {
    // If this is the currently active track, toggle play/pause
    if (index === currentTrackIndex && audioState !== AUDIO_STATES.IDLE) {
      if (audioState === AUDIO_STATES.PLAYING) {
        // Pause current track
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setAudioState(AUDIO_STATES.PAUSED);
        }
      } else if (audioState === AUDIO_STATES.PAUSED) {
        // Resume current track
        if (soundRef.current) {
          await soundRef.current.playAsync();
          setAudioState(AUDIO_STATES.PLAYING);
        }
      }
      return;
    }

    // Otherwise, start playing the selected track
    setCurrentTrackIndex(index);
    setIsShuffleMode(false);
    setPlaylistMode(false);
  };

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
    if (!shuffled[0]?.article?.audio_url) {
      const validIndex = shuffled.findIndex(item => !!item?.article?.audio_url);
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
  const playPreviousTrack = async () => {
    // If at beginning of playlist, restart current track
    if (currentTrackIndex <= 0) {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
      }
      return;
    }

    // Move to previous track
    setCurrentTrackIndex(prev => prev - 1);
  };

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
      if (track?.article?.audio_url) {
        loadAndPlayAudio(track.article.audio_url);
      }
    }
  }, [currentTrackIndex, activePlaylist]);

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not signed in
  if (!user) {
    return (
      <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
        <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
          <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
            <ThemedText style={styles.headerTitle}>Bookmarks</ThemedText>
          </View>
          <View style={styles.emptyStateContainer}>
            <ThemedText style={styles.emptyStateTitle}>Sign In Required</ThemedText>
            <ThemedText style={styles.emptyStateMessage}>
              Please sign in to view and manage your bookmarks
            </ThemedText>
            <ThemedButton title="Sign In" icon="log-in" onPress={() => router.push('/account')} />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }

  // Empty reading list
  if (!readingList || readingList.length === 0) {
    return (
      <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
        <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
          <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
            <ThemedText style={styles.headerTitle}>Bookmarks</ThemedText>
          </View>
          <View style={styles.emptyStateContainer}>
            <ThemedText style={styles.emptyStateTitle}>Your Bookmarks List is Empty</ThemedText>
            <ThemedText style={styles.emptyStateMessage}>
              Save articles to your bookmarks to read them later
            </ThemedText>
            <ThemedButton
              title="Browse Articles"
              icon="book"
              onPress={() => router.push('/(tabs)/' as any)}
            />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }

  // Normal display with playlist
  return (
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
      <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
        {/* Clean header */}
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Bookmarks</ThemedText>
        </View>

        <FlatList
          ref={flatListRef}
          data={readingList}
          keyExtractor={item => `${item.article_id}`}
          renderItem={({ item, index }) => {
            // Determine if this item is currently playing
            const isItemPlaying =
              audioState === AUDIO_STATES.PLAYING &&
              ((isShuffleMode && shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
                (!isShuffleMode && readingList[currentTrackIndex]?.article_id === item.article_id));

            const isItemPaused =
              audioState === AUDIO_STATES.PAUSED &&
              ((isShuffleMode && shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
                (!isShuffleMode && readingList[currentTrackIndex]?.article_id === item.article_id));

            return (
              <BookmarkItem
                title={item.article.title}
                author={item.article.author.name}
                isPlaying={isItemPlaying}
                isPaused={isItemPaused}
                progress={isItemPlaying || isItemPaused ? playbackProgress : 0}
                articleId={item.article_id}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />

        {/* Bottom Action Buttons - similar to vocabulary screen */}
        <BottomControls
          onPlayAll={isCurrentlyPlaying ? stopPlayback : startPlayback}
          onShuffle={isCurrentlyPlaying ? stopPlayback : startShufflePlayback}
          isPlaying={isCurrentlyPlaying}
          isShuffleMode={isShuffleMode}
        />
      </ThemedView>
    </Animated.View>
  );
}
