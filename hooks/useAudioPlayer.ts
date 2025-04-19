import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

import { handleError } from '@/utils/errorHandling';

// Audio player states
export const AUDIO_STATES = {
  IDLE: 'idle', // Not playing anything
  LOADING: 'loading', // Loading audio
  PLAYING: 'playing', // Playing audio
  PAUSED: 'paused', // Audio loaded but paused
  ERROR: 'error', // Error occurred
};

export type AudioTrack = {
  id: number;
  audioUrl: string;
  title: string;
  // Add other track properties as needed
};

interface AudioPlayerResult {
  audioState: string;
  currentTrackIndex: number;
  progress: number;
  duration: number;
  playlistMode: boolean;
  loadAndPlayAudio: (audioUrl: string) => Promise<boolean>;
  togglePlayPause: () => Promise<void>;
  playTrack: (tracks: AudioTrack[], index: number) => Promise<boolean>;
  startPlayback: (tracks: AudioTrack[], startIndex?: number) => Promise<boolean>;
  stopPlayback: () => Promise<void>;
  startShufflePlayback: (tracks: AudioTrack[]) => Promise<boolean>;
  playNextTrack: () => Promise<boolean>;
  playPreviousTrack: () => Promise<boolean>;
  seekToPosition: (position: number) => Promise<boolean>;
}

export function useAudioPlayer(): AudioPlayerResult {
  // State for the audio player
  const [audioState, setAudioState] = useState(AUDIO_STATES.IDLE);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs for audio player
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTimeRef = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);
  const currentPlaylistRef = useRef<AudioTrack[]>([]);

  // Forward declaration for functions that have circular dependencies
  const playNextTrackRef = useRef<() => Promise<boolean>>(async () => false);

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
        await soundRef.current.stopAsync().catch(error => {
          handleError(error instanceof Error ? error : String(error), {
            analyticsEventName: 'Audio_Stop_Error',
            sentrySeverity: 'warning',
          });
        });

        await soundRef.current.unloadAsync().catch(error => {
          handleError(error instanceof Error ? error : String(error), {
            analyticsEventName: 'Audio_Unload_Error',
            sentrySeverity: 'warning',
          });
        });
      } catch (error) {
        handleError(error instanceof Error ? error : String(error), {
          analyticsEventName: 'Audio_Cleanup_Error',
          sentrySeverity: 'error',
        });
      } finally {
        soundRef.current = null;
      }
    }
  }, []);

  // Initialize audio session
  const initAudioSession = useCallback(async () => {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });

    return true;
  }, []);

  // Start tracking progress
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const intervalId = setInterval(async () => {
      if (!soundRef.current) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        return;
      }

      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setProgress(status.positionMillis);
          setDuration(status.durationMillis || 0);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Ignore status check errors - they will be handled by the status update callback
      }
    }, 500);

    progressIntervalRef.current = intervalId;
  }, []);

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          setAudioState(AUDIO_STATES.ERROR);
        }
        return;
      }

      // Log state transitions
      let newState = '';
      if (status.isPlaying) {
        newState = AUDIO_STATES.PLAYING;
      } else if (status.isBuffering) {
        newState = AUDIO_STATES.LOADING;
      } else {
        newState = AUDIO_STATES.PAUSED;
      }

      if (newState !== audioState) {
        setAudioState(newState);
      }

      // Update progress and duration
      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);

      // Handle track completion
      if (status.didJustFinish && !status.isLooping) {
        if (!playlistMode) {
          // Single track mode - just stop
          setAudioState(AUDIO_STATES.IDLE);
          setProgress(0);
        } else {
          // In playlist mode, proceed to next track
          playNextTrackRef.current();
        }
      }
    },
    [playlistMode, audioState]
  );

  // Load and play audio with the specified URL
  const loadAndPlayAudio = useCallback(
    async (audioUrl: string) => {
      if (!audioUrl) {
        setAudioState(AUDIO_STATES.ERROR);
        return false;
      }

      try {
        setAudioState(AUDIO_STATES.LOADING);
        lastActionTimeRef.current = Date.now();

        // Clean up any existing audio first
        await cleanupAudio().catch(e => {
          handleError(e instanceof Error ? e : String(e));
        });

        // Initialize audio session first to ensure proper configuration
        await initAudioSession();

        // Create and load the sound with notification configuration for Android
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 500,
            positionMillis: 0,
            // Android notification configuration
            androidImplementation: 'MediaPlayer',
            ...(Platform.OS === 'android'
              ? {
                  androidAudioSessionId: Math.round(Math.random() * 10000),
                }
              : {}),
          },
          onPlaybackStatusUpdate
        );

        soundRef.current = sound;

        // Get initial status to log duration
        const initialStatus = await sound.getStatusAsync();
        const duration = initialStatus.isLoaded ? initialStatus.durationMillis : 0;

        // Force playback to start (needed because the shouldPlay flag isn't always respected)
        await sound.playAsync();

        // Explicitly track playback state
        setAudioState(AUDIO_STATES.PLAYING);

        startProgressTracking();

        // For short audio, ensure it completes before potential cleanup
        if (duration && duration < 1500) {
          // Calculate a safe duration to wait - at least 1500ms to ensure it plays
          const safeWaitTime = Math.max(duration + 500, 1500);

          if (soundRef.current) {
            // Wait for audio to complete
            await new Promise(resolve => setTimeout(resolve, safeWaitTime));

            // Clean up subscription if needed
            try {
              sound.setOnPlaybackStatusUpdate(null);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
              // Ignore errors on cleanup
            }
          }
        }

        return true;
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        setAudioState(AUDIO_STATES.ERROR);
        await cleanupAudio().catch(() => {});
        return false;
      }
    },
    [cleanupAudio, onPlaybackStatusUpdate, startProgressTracking, initAudioSession]
  );

  // Toggle play/pause for a track
  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      if (audioState === AUDIO_STATES.PLAYING) {
        await soundRef.current.pauseAsync();
        setAudioState(AUDIO_STATES.PAUSED);
      } else if (audioState === AUDIO_STATES.PAUSED) {
        await soundRef.current.playAsync();
        setAudioState(AUDIO_STATES.PLAYING);
      }
    } catch (error) {
      handleError(error instanceof Error ? error : String(error));
      setAudioState(AUDIO_STATES.ERROR);
    }
  }, [audioState]);

  // Play a specific track from a playlist
  const playTrack = useCallback(
    async (tracks: AudioTrack[], index: number) => {
      if (index < 0 || index >= tracks.length) return false;

      const track = tracks[index];
      if (!track) return false;

      setCurrentTrackIndex(index);
      return await loadAndPlayAudio(track.audioUrl);
    },
    [loadAndPlayAudio]
  );

  // Start playback of a playlist
  const startPlayback = useCallback(
    async (tracks: AudioTrack[], startIndex = 0) => {
      if (!tracks || tracks.length === 0) return false;

      // Set to playlist mode
      setPlaylistMode(true);
      currentPlaylistRef.current = tracks;
      return await playTrack(tracks, startIndex);
    },
    [playTrack]
  );

  // Stop playback
  const stopPlayback = useCallback(async () => {
    await cleanupAudio();
    setAudioState(AUDIO_STATES.IDLE);
    setCurrentTrackIndex(-1);
    setPlaylistMode(false);
    setProgress(0);
    setDuration(0);
    currentPlaylistRef.current = [];
  }, [cleanupAudio]);

  // Start shuffle playback
  const startShufflePlayback = useCallback(
    async (tracks: AudioTrack[]) => {
      if (!tracks || tracks.length === 0) return false;

      // Create array of indices
      const indices: number[] = [];
      for (let i = 0; i < tracks.length; i++) {
        indices.push(i);
      }

      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = indices[i] as number;
        indices[i] = indices[j] as number;
        indices[j] = temp;
      }

      setPlaylistMode(true);
      currentPlaylistRef.current = tracks;
      return await playTrack(tracks, indices[0] as number);
    },
    [playTrack]
  );

  // Play next track in playlist
  const playNextTrack = useCallback(async () => {
    const tracks = currentPlaylistRef.current;
    if (
      !tracks ||
      !playlistMode ||
      currentTrackIndex < 0 ||
      currentTrackIndex >= tracks.length - 1
    ) {
      await stopPlayback();
      return false;
    }

    return await playTrack(tracks, currentTrackIndex + 1);
  }, [playlistMode, currentTrackIndex, playTrack, stopPlayback]);

  // Play previous track in playlist
  const playPreviousTrack = useCallback(async () => {
    const tracks = currentPlaylistRef.current;
    if (!tracks || !playlistMode || currentTrackIndex <= 0) {
      // If at beginning of playlist, restart current track
      if (soundRef.current && currentTrackIndex === 0) {
        await soundRef.current.setPositionAsync(0);
        return true;
      }
      return false;
    }

    return await playTrack(tracks, currentTrackIndex - 1);
  }, [playlistMode, currentTrackIndex, playTrack]);

  // Seek to position
  const seekToPosition = useCallback(async (position: number) => {
    if (!soundRef.current) return false;

    try {
      await soundRef.current.setPositionAsync(position);
      setProgress(position);
      return true;
    } catch (error) {
      handleError(error instanceof Error ? error : String(error));
      return false;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    // Set up audio session initially
    initAudioSession();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // Ensure audio session is properly configured
        initAudioSession();

        // If we were playing audio before going to background, check if it's still playing
        if (audioState === AUDIO_STATES.PLAYING && soundRef.current) {
          soundRef.current
            .getStatusAsync()
            .then(status => {
              if (status.isLoaded && !status.isPlaying) {
                // If audio was playing but stopped when app went to background, restart it

                soundRef.current?.playAsync().catch(error => {
                  handleError(error instanceof Error ? error : String(error));
                });
              }
            })
            .catch(error => {
              handleError(error instanceof Error ? error : String(error));
            });
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background

        // Make sure audio session is configured for background playback
        initAudioSession();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
      cleanupAudio();
    };
  }, [initAudioSession, cleanupAudio, audioState]);

  // Update the ref with the latest implementation
  useEffect(() => {
    playNextTrackRef.current = playNextTrack;
  }, [playNextTrack]);

  return {
    audioState,
    currentTrackIndex,
    progress,
    duration,
    playlistMode,
    loadAndPlayAudio,
    togglePlayPause,
    playTrack,
    startPlayback,
    stopPlayback,
    startShufflePlayback,
    playNextTrack,
    playPreviousTrack,
    seekToPosition,
  };
}
