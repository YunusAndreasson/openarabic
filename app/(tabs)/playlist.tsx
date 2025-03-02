import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Animated,
  Platform,
  AppState,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  ImageBackground,
} from 'react-native';
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CompactThemedCard } from '@/components/CompactThemedCard';

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
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.SMALL * 4,
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
    marginBottom: LAYOUT.SPACING.TINY,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.SMALL - 4,
  },
  itemContentContainer: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  itemTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY / 2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  itemAuthor: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
  },
  progressIndicator: {
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: '100%',
    marginVertical: LAYOUT.SPACING.TINY,
    overflow: 'hidden',
    borderRadius: 1,
  },
  progressBar: {
    height: '100%',
    width: '0%',
    borderRadius: 1,
  },
  // Bottom action bar - similar to vocabulary screen
  bottomControlsContainer: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
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

// Playlist Item Component - simplified
const PlaylistItem = React.memo(
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

    const borderColor = isActive
      ? `rgba(${parseInt(colors.tint.slice(1, 3), 16)}, ${parseInt(colors.tint.slice(3, 5), 16)}, ${parseInt(colors.tint.slice(5, 7), 16)}, 0.8)`
      : colors.cardBorder;

    return (
      <View style={styles.itemContainer}>
        <CompactThemedCard
          onPress={() => router.push(`/article/${articleId}`)}
          style={isActive ? { borderColor: borderColor, borderWidth: 1.5 } : null}
        >
          <View>
            <View style={styles.cardContent}>
              <View style={styles.itemContentContainer}>
                <ThemedText
                  numberOfLines={2}
                  style={[styles.itemTitle, isActive && { color: colors.tint }]}
                >
                  {title}
                </ThemedText>
                <ThemedText
                  style={[styles.itemAuthor, { color: colors.authorText }]}
                  skipDefaultColor
                  numberOfLines={1}
                >
                  {author}
                </ThemedText>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text}
                style={{ opacity: 0.3 }}
              />
            </View>

            {/* Always render the progress indicator container for consistent sizing */}
            <View style={styles.progressIndicator}>
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
        </CompactThemedCard>
      </View>
    );
  }
);

// Bottom Action Buttons - similar to vocabulary screen's review button
const BottomControls = React.memo(
  ({ onPlayAll, onShuffle }: { onPlayAll: () => void; onShuffle: () => void }) => {
    const colors = useColors();

    return (
      <View style={styles.bottomControlsContainer}>
        <View style={styles.actionButtonsRow}>
          <ThemedButton
            title="Play All"
            icon="play-circle"
            onPress={onPlayAll}
            variant="filled"
            style={{ flex: 1 }}
          />
          <ThemedButton
            title="Shuffle"
            icon="shuffle"
            onPress={onShuffle}
            variant="outlined"
            style={[{ flex: 1 }, styles.shuffleButton, { borderColor: colors.tint }]}
          />
        </View>
      </View>
    );
  }
);

export default function PlaylistScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList<any>>(null);

  // Loading state management (similar to Vocabulary screen)
  const loadingStartTime = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const [forceUpdate, setForceUpdate] = useState(false);

  // Query for reading list
  const {
    data: readingList,
    isLoading: isDataLoading,
    isFetching,
    status,
  } = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => (user?.id ? readingListService.getReadingList(user.id) : []),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

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
    const isCurrentlyLoading = !!user && (isDataLoading || status === 'pending');

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
  }, [user, isDataLoading, status, forceUpdate]);

  // Clean up loading timeouts on focus change
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Clear any pending timeouts when screen loses focus
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = undefined;
        }
        // Reset loading state when unmounting
        loadingStartTime.current = null;
      };
    }, [])
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

      // Start playing
      await sound.playAsync();

      setAudioState(AUDIO_STATES.PLAYING);
      lastActionTimeRef.current = Date.now();

      // Start progress tracking
      startProgressTracking();

      return true;
    } catch (error) {
      setAudioState(AUDIO_STATES.ERROR);
      return false;
    }
  };

  // Update playback status
  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) {
      // Handle error
      if (status.error) {
        setAudioState(AUDIO_STATES.ERROR);
      }
      return;
    }

    // Update position and duration
    if (status.positionMillis !== undefined && status.durationMillis) {
      setPlaybackProgress(status.positionMillis / status.durationMillis);
    }

    // Handle playback state changes
    if (status.isPlaying) {
      setAudioState(AUDIO_STATES.PLAYING);
    } else if (status.isBuffering) {
      // Still consider it playing, just buffering
    } else {
      setAudioState(AUDIO_STATES.PAUSED);
    }

    // Handle playback finishing
    if (status.didJustFinish) {
      // If in single item mode, don't auto-advance
      if (!playlistMode) {
        // Just stop playback when finished
        stopPlayback();
      } else {
        // In playlist mode, proceed to next track
        playNextTrack();
      }
    }
  };

  // Track progress for UI updates
  const startProgressTracking = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Create new interval
    progressIntervalRef.current = setInterval(async () => {
      if (soundRef.current && audioState === AUDIO_STATES.PLAYING) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            setPlaybackProgress(status.positionMillis / status.durationMillis);
          }
        } catch (error) {
          // Error getting playback status
        }
      }
    }, 1000);
  };

  // Play/pause/resume the selected track
  const toggleTrack = async (index: number) => {
    // Prevent rapid button presses
    if (Date.now() - lastActionTimeRef.current < 500) {
      return;
    }

    lastActionTimeRef.current = Date.now();

    // If clicking on the currently playing track, toggle pause/play
    if (index === currentTrackIndex && audioState !== AUDIO_STATES.IDLE) {
      if (audioState === AUDIO_STATES.PLAYING) {
        // Pause the current track
        if (soundRef.current) {
          await soundRef.current.pauseAsync().catch(() => {});
          setAudioState(AUDIO_STATES.PAUSED);
        }
      } else if (audioState === AUDIO_STATES.PAUSED) {
        // Resume the current track
        if (soundRef.current) {
          await soundRef.current.playAsync().catch(() => {});
          setAudioState(AUDIO_STATES.PLAYING);
        }
      }
    } else {
      // Start playing a new track
      setCurrentTrackIndex(index);
      setIsShuffleMode(false);
      // Set to single item mode when directly tapping a track
      setPlaylistMode(false);
    }
  };

  // Start playback in normal sequence mode
  const startPlayback = async () => {
    // Prevent rapid button presses
    if (Date.now() - lastActionTimeRef.current < 1000) {
      return;
    }

    lastActionTimeRef.current = Date.now();

    // Check if we have a playlist
    if (!readingList || readingList.length === 0) {
      return;
    }

    setIsShuffleMode(false);
    setCurrentTrackIndex(0);
    // Set to playlist mode
    setPlaylistMode(true);
  };

  // Stop all playback
  const stopPlayback = async () => {
    // Prevent rapid button presses
    if (Date.now() - lastActionTimeRef.current < 1000) {
      return;
    }

    lastActionTimeRef.current = Date.now();

    await cleanupAudio();

    setAudioState(AUDIO_STATES.IDLE);
    setCurrentTrackIndex(-1);
    setPlaybackProgress(0);
    setPlaylistMode(false);
  };

  // Start playback in shuffle mode
  const startShufflePlayback = async () => {
    // Prevent rapid button presses
    if (Date.now() - lastActionTimeRef.current < 1000) {
      return;
    }

    lastActionTimeRef.current = Date.now();

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
        [shuffled[0], shuffled[validIndex]] = [shuffled[validIndex], shuffled[0]];
      }
    }

    setShuffledList(shuffled);
    setIsShuffleMode(true);
    setCurrentTrackIndex(0);
    // Set to playlist mode
    setPlaylistMode(true);
  };

  // Play the next track in the sequence
  const playNextTrack = async () => {
    // If not in playlist mode or at the end of playlist, stop playback
    if (!playlistMode || currentTrackIndex < 0 || currentTrackIndex >= activePlaylist.length - 1) {
      await stopPlayback();
      return;
    }

    // Move to next track
    setCurrentTrackIndex(prev => prev + 1);
  };

  // Play the previous track in the sequence
  const playPreviousTrack = async () => {
    if (currentTrackIndex <= 0) {
      // Beginning of playlist, restart current track
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0).catch(() => {});
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
      const audioUrl = track?.article?.audio_url;

      if (audioUrl) {
        // Load and play the audio
        loadAndPlayAudio(audioUrl);
      } else {
        // Try to skip to next track if this one has no audio
        playNextTrack();
      }
    }
  }, [currentTrackIndex, activePlaylist]);

  // Loading screen
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingScreen />
      </ThemedView>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
        </View>
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateTitle}>Sign In Required</ThemedText>
          <ThemedText style={styles.emptyStateMessage}>
            Please sign in to view and manage your saved articles
          </ThemedText>
          <ThemedButton
            title="Go to Profile"
            icon="person-circle"
            onPress={() => router.push('/(tabs)/profile' as any)}
          />
        </View>
      </ThemedView>
    );
  }

  // Empty playlist
  if (!readingList?.length) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
        </View>
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateTitle}>No saved articles yet</ThemedText>
          <ThemedText style={styles.emptyStateMessage}>
            Save articles to listen to them later or read them offline
          </ThemedText>
          <ThemedButton title="Browse Articles" icon="newspaper" onPress={() => router.push('/')} />
        </View>
      </ThemedView>
    );
  }

  // Normal display with playlist
  return (
    <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
      {/* Clean header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
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
            <PlaylistItem
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
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={10}
      />

      {/* Bottom Action Buttons - similar to vocabulary screen */}
      <BottomControls onPlayAll={startPlayback} onShuffle={startShufflePlayback} />
    </ThemedView>
  );
}
