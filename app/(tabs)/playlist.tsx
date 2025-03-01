import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, View, Animated, Platform, AppState } from 'react-native';
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
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + 100,
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
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    backgroundColor: 'transparent',
  },
  controlsCard: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  controlsContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
    height: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
  button: {
    flex: 1,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 16,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  bar: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },
  listSeparator: {
    height: LAYOUT.SPACING.SMALL,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: 64,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
  },
  articleTextContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  articleTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  articleAuthor: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  listItemContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});

const AudioWave = React.memo(({ color }: { color: string }) => {
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.4)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;
  const animationsRef = useRef<Animated.CompositeAnimation>();

  const animations = useMemo(() => [anim1, anim2, anim3], [anim1, anim2, anim3]);

  useEffect(() => {
    const animationSequence = animations.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 200),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.4,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        ),
      ])
    );

    animationsRef.current = Animated.parallel(animationSequence);
    animationsRef.current.start();

    return () => {
      if (animationsRef.current) {
        animationsRef.current.stop();
        animationsRef.current = undefined;
      }
    };
  }, [animations]);

  return (
    <View style={styles.waveContainer}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
});

const ArticleCard = React.memo(
  ({
    title,
    author,
    isPlaying,
    onPress,
  }: {
    title: string;
    author: string;
    isPlaying?: boolean;
    onPress: () => void;
  }) => {
    const colors = useColors();

    return (
      <CompactThemedCard
        onPress={onPress}
        style={
          isPlaying
            ? {
                borderColor: colors.tint,
                borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
                transform: [{ scale: 1.01 }],
                ...LAYOUT.SHADOW.LARGE,
              }
            : undefined
        }
      >
        <View style={styles.articleCard}>
          <View style={styles.articleTextContainer}>
            <ThemedText
              numberOfLines={1}
              style={[styles.articleTitle, isPlaying && { color: colors.tint, fontWeight: '600' }]}
            >
              {title}
            </ThemedText>
            <ThemedText
              style={[styles.articleAuthor, { color: colors.authorText }]}
              skipDefaultColor
              numberOfLines={1}
            >
              {author}
            </ThemedText>
          </View>
          {isPlaying ? (
            <AudioWave color={colors.tint} />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text}
              style={{ opacity: 0.3 }}
            />
          )}
        </View>
      </CompactThemedCard>
    );
  }
);

export default function PlaylistScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for reading list
  const {
    data: readingList,
    isLoading,
    isFetching,
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

  // Simple refs for audio instance, timers, and state tracking
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastActionTimeRef = useRef(Date.now());

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

  // Clean up all audio resources
  const cleanupAudio = async () => {
    // Clear any timers
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

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
        console.log('Error during cleanup:', error);
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
      console.error('Failed to set audio mode:', error);
    }
  };

  // Load and play audio with the specified URL
  const loadAndPlayAudio = async (audioUrl: string) => {
    if (!audioUrl) {
      console.error('No audio URL provided');
      setAudioState(AUDIO_STATES.ERROR);
      return false;
    }

    try {
      console.log(`Loading audio: ${audioUrl}`);
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

      console.log('Audio loaded successfully');

      // Add a small delay before playing to ensure the audio system is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Start playing
      console.log('Starting playback');
      await sound.playAsync();

      setAudioState(AUDIO_STATES.PLAYING);
      lastActionTimeRef.current = Date.now();

      // Start progress tracking
      startProgressTracking();

      console.log('Track is now playing');
      return true;
    } catch (error) {
      console.error('Error loading or playing audio:', error);
      setAudioState(AUDIO_STATES.ERROR);
      return false;
    }
  };

  // Update playback status
  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) {
      // Handle error
      if (status.error) {
        console.error(`Playback error: ${status.error}`);
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
      console.log('Audio is buffering...');
    } else {
      setAudioState(AUDIO_STATES.PAUSED);
    }

    // Handle playback finishing
    if (status.didJustFinish) {
      console.log('Playback finished, moving to next track');
      playNextTrack();
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
          console.log('Error getting playback status:', error);
        }
      }
    }, 1000);
  };

  // Play/stop logic
  const togglePlayback = async () => {
    if (audioState === AUDIO_STATES.PLAYING) {
      await stopPlayback();
    } else {
      await startPlayback();
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
      console.log('No items in playlist');
      return;
    }

    setIsShuffleMode(false);
    setCurrentTrackIndex(0);

    // The useEffect will handle loading and playing when currentTrackIndex changes
  };

  // Stop all playback
  const stopPlayback = async () => {
    // Prevent rapid button presses
    if (Date.now() - lastActionTimeRef.current < 1000) {
      return;
    }

    lastActionTimeRef.current = Date.now();

    console.log('Stopping playback');
    await cleanupAudio();

    setAudioState(AUDIO_STATES.IDLE);
    setCurrentTrackIndex(-1);
    setPlaybackProgress(0);
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
      console.log('No items in playlist');
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

    // The useEffect will handle loading and playing when currentTrackIndex changes
  };

  // Play the next track in the sequence
  const playNextTrack = async () => {
    if (currentTrackIndex < 0 || currentTrackIndex >= activePlaylist.length - 1) {
      // End of playlist, stop playback
      await stopPlayback();
      return;
    }

    // Move to next track
    setCurrentTrackIndex(prev => prev + 1);

    // The useEffect will handle loading and playing when currentTrackIndex changes
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
        soundRef.current.pauseAsync().catch(err => console.log('Error pausing:', err));
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
        console.log(`New track selected: ${track.article.title}`);

        // Load and play the audio
        loadAndPlayAudio(audioUrl);
      } else {
        console.error('Selected track has no audio URL');

        // Try to skip to next track if this one has no audio
        playNextTrack();
      }
    }
  }, [currentTrackIndex, activePlaylist]);

  // Loading screen
  if (isLoading || isFetching) {
    return (
      <ThemedView style={styles.container}>
        <LoadingScreen />
      </ThemedView>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <ThemedView style={styles.container}>
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
      <ThemedView style={styles.container}>
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
    <ThemedView style={styles.container}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
      </View>

      <FlatList
        data={readingList}
        keyExtractor={item => `${item.article_id}`}
        renderItem={({ item }) => {
          // Determine if this item is currently playing
          const isItemPlaying =
            audioState === AUDIO_STATES.PLAYING &&
            ((isShuffleMode && shuffledList[currentTrackIndex]?.article_id === item.article_id) ||
              (!isShuffleMode && readingList[currentTrackIndex]?.article_id === item.article_id));

          return (
            <View style={styles.listItemContainer}>
              <ArticleCard
                title={item.article.title}
                author={item.article.author.name}
                isPlaying={isItemPlaying}
                onPress={() => router.push(`/article/${item.article_id}`)}
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={10}
      />

      <Animated.View style={styles.controlsContainer}>
        <View
          style={[
            styles.controlsCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.controlsContent}>
            <View style={styles.buttonRow}>
              <ThemedButton
                variant="filled"
                title={audioState === AUDIO_STATES.PLAYING && !isShuffleMode ? 'Stop' : 'Play All'}
                icon={
                  audioState === AUDIO_STATES.PLAYING && !isShuffleMode
                    ? 'stop-circle'
                    : 'play-circle'
                }
                onPress={togglePlayback}
                style={styles.button}
              />
              <ThemedButton
                variant="filled"
                title={audioState === AUDIO_STATES.PLAYING && isShuffleMode ? 'Stop' : 'Shuffle'}
                icon={
                  audioState === AUDIO_STATES.PLAYING && isShuffleMode ? 'stop-circle' : 'shuffle'
                }
                onPress={startShufflePlayback}
                style={styles.button}
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </ThemedView>
  );
}
