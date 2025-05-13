import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';

import { handleError } from '@/utils/errorHandling';

/**
 * Audio player states
 */
export const AUDIO_STATES = {
  IDLE: 'idle', // Not playing anything
  LOADING: 'loading', // Loading audio
  PLAYING: 'playing', // Playing audio
  PAUSED: 'paused', // Audio loaded but paused
  ERROR: 'error', // Error occurred
} as const;

export type AudioState = (typeof AUDIO_STATES)[keyof typeof AUDIO_STATES];

/**
 * Audio track information
 */
export interface AudioTrack {
  id: number;
  audioUrl: string;
  title: string;
  duration?: number;
  artist?: string;
  artwork?: string;
}

/**
 * Audio player hook result
 */
export interface AudioPlayerResult {
  audioState: AudioState;
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

/**
 * Custom hook for audio playback functionality
 */
export function useAudioPlayer(): AudioPlayerResult {
  // State for the audio player
  const [audioState, setAudioState] = useState<AudioState>(AUDIO_STATES.IDLE);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs for audio player
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
          handleError(error instanceof Error ? error : new Error('Failed to stop audio'), {
            analyticsEventName: 'Audio_Stop_Error',
            sentrySeverity: 'warning',
          });
        });

        await soundRef.current.unloadAsync().catch(error => {
          handleError(error instanceof Error ? error : new Error('Failed to unload audio'), {
            analyticsEventName: 'Audio_Unload_Error',
            sentrySeverity: 'warning',
          });
        });
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to cleanup audio'), {
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
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
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
      } catch {
        // Ignore status check errors - they will be handled by the status update callback
      }
    }, 1000);

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
      const newState: AudioState = status.isPlaying
        ? AUDIO_STATES.PLAYING
        : status.isBuffering
          ? AUDIO_STATES.LOADING
          : AUDIO_STATES.PAUSED;

      if (newState !== audioState) {
        setAudioState(newState);
      }

      // Update progress and duration
      setProgress(status.positionMillis);
      // Ensure duration is set from either status or current playlist track
      const currentTrack = currentPlaylistRef.current[currentTrackIndex];
      const trackDuration = currentTrack?.duration;
      setDuration(status.durationMillis || trackDuration || 0);

      // Handle track completion
      if (status.didJustFinish && !status.isLooping) {
        if (!playlistMode) {
          // Single track mode - just stop
          setAudioState(AUDIO_STATES.IDLE);
          setProgress(0);
        } else {
          // In playlist mode, proceed to next track
          void playNextTrackRef.current();
        }
      }
    },
    [playlistMode, audioState, currentTrackIndex]
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
        await cleanupAudio().catch(error => {
          handleError(error instanceof Error ? error : new Error('Failed to cleanup audio'));
        });

        // Initialize audio session first to ensure proper configuration
        await initAudioSession();

        // Create and load the new sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );

        soundRef.current = sound;
        startProgressTracking();
        return true;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to load audio'), {
          analyticsEventName: 'Audio_Load_Error',
          sentrySeverity: 'error',
        });
        setAudioState(AUDIO_STATES.ERROR);
        return false;
      }
    },
    [cleanupAudio, initAudioSession, onPlaybackStatusUpdate, startProgressTracking]
  );

  // Toggle play/pause state
  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to toggle playback'), {
        analyticsEventName: 'Audio_Toggle_Error',
        sentrySeverity: 'warning',
      });
    }
  }, []);

  // Play a specific track from a playlist
  const playTrack = useCallback(
    async (tracks: AudioTrack[], index: number): Promise<boolean> => {
      if (index < 0 || index >= tracks.length) {
        return false;
      }

      try {
        const track = tracks[index];
        if (!track) {
          return false;
        }

        currentPlaylistRef.current = tracks;
        setCurrentTrackIndex(index);
        setPlaylistMode(true);

        return await loadAndPlayAudio(track.audioUrl);
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to play track'), {
          analyticsEventName: 'Audio_PlayTrack_Error',
          sentrySeverity: 'error',
        });
        return false;
      }
    },
    [loadAndPlayAudio]
  );

  // Start playback of a playlist
  const startPlayback = useCallback(
    async (tracks: AudioTrack[], startIndex = 0): Promise<boolean> => {
      if (!tracks.length) return false;

      try {
        return await playTrack(tracks, startIndex);
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to start playback'), {
          analyticsEventName: 'Audio_StartPlayback_Error',
          sentrySeverity: 'error',
        });
        return false;
      }
    },
    [playTrack]
  );

  // Stop playback and cleanup
  const stopPlayback = useCallback(async () => {
    try {
      await cleanupAudio();
      setAudioState(AUDIO_STATES.IDLE);
      setCurrentTrackIndex(-1);
      setPlaylistMode(false);
      setProgress(0);
      setDuration(0);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to stop playback'), {
        analyticsEventName: 'Audio_StopPlayback_Error',
        sentrySeverity: 'error',
      });
    }
  }, [cleanupAudio]);

  // Start shuffle playback
  const startShufflePlayback = useCallback(
    async (tracks: AudioTrack[]): Promise<boolean> => {
      if (!tracks.length) return false;

      try {
        const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5);
        return await startPlayback(shuffledTracks, 0);
      } catch (error) {
        handleError(
          error instanceof Error ? error : new Error('Failed to start shuffle playback'),
          {
            analyticsEventName: 'Audio_ShufflePlayback_Error',
            sentrySeverity: 'error',
          }
        );
        return false;
      }
    },
    [startPlayback]
  );

  // Play next track in playlist
  const playNextTrack = useCallback(async (): Promise<boolean> => {
    if (!playlistMode || !currentPlaylistRef.current.length) return false;

    try {
      const nextIndex = (currentTrackIndex + 1) % currentPlaylistRef.current.length;
      return await playTrack(currentPlaylistRef.current, nextIndex);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to play next track'), {
        analyticsEventName: 'Audio_NextTrack_Error',
        sentrySeverity: 'error',
      });
      return false;
    }
  }, [playlistMode, currentTrackIndex, playTrack]);

  // Play previous track in playlist
  const playPreviousTrack = useCallback(async (): Promise<boolean> => {
    if (!playlistMode || !currentPlaylistRef.current.length) return false;

    try {
      const prevIndex =
        currentTrackIndex > 0 ? currentTrackIndex - 1 : currentPlaylistRef.current.length - 1;
      return await playTrack(currentPlaylistRef.current, prevIndex);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to play previous track'), {
        analyticsEventName: 'Audio_PreviousTrack_Error',
        sentrySeverity: 'error',
      });
      return false;
    }
  }, [playlistMode, currentTrackIndex, playTrack]);

  // Seek to a specific position
  const seekToPosition = useCallback(async (position: number): Promise<boolean> => {
    if (!soundRef.current) return false;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return false;

      await soundRef.current.setPositionAsync(position);
      return true;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to seek to position'), {
        analyticsEventName: 'Audio_Seek_Error',
        sentrySeverity: 'warning',
      });
      return false;
    }
  }, []);

  // Set up playNextTrack ref
  useEffect(() => {
    playNextTrackRef.current = playNextTrack;
  }, [playNextTrack]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Don't stop playback when app goes to background
      // This allows audio to continue playing in the background
      // and automatically move to the next track
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void cleanupAudio();
    };
  }, [cleanupAudio]);

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
