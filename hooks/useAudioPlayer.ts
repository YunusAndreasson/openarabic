import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';

import { handleError } from '@/utils/errorHandling';

// Debug tag for filtering logs
const DEBUG_TAG = '[AudioPlayerDebug]';

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
    console.log(`${DEBUG_TAG} Cleaning up audio resources`);
    // Clear any timers
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Unload sound if it exists
    if (soundRef.current) {
      try {
        console.log(`${DEBUG_TAG} Stopping sound during cleanup`);
        await soundRef.current.stopAsync().catch(error => {
          console.error(`${DEBUG_TAG} Error stopping sound:`, error);
          handleError(error instanceof Error ? error : String(error), {
            analyticsEventName: 'Audio_Stop_Error',
            sentrySeverity: 'warning',
          });
        });
        console.log(`${DEBUG_TAG} Unloading sound during cleanup`);
        await soundRef.current.unloadAsync().catch(error => {
          console.error(`${DEBUG_TAG} Error unloading sound:`, error);
          handleError(error instanceof Error ? error : String(error), {
            analyticsEventName: 'Audio_Unload_Error',
            sentrySeverity: 'warning',
          });
        });
      } catch (error) {
        console.error(`${DEBUG_TAG} Critical error during sound cleanup:`, error);
        handleError(error instanceof Error ? error : String(error), {
          analyticsEventName: 'Audio_Cleanup_Error',
          sentrySeverity: 'error',
        });
      } finally {
        console.log(`${DEBUG_TAG} Sound cleanup complete, setting ref to null`);
        soundRef.current = null;
      }
    }
  }, []);

  // Initialize audio session
  const initAudioSession = useCallback(async () => {
    console.log(`${DEBUG_TAG} Initializing audio session on ${Platform.OS}`);
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
    console.log(`${DEBUG_TAG} Audio session initialized successfully`);
    return true;
  }, []);

  // Start tracking progress
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    console.log(`${DEBUG_TAG} Starting progress tracking interval`);
    const intervalId = setInterval(async () => {
      if (!soundRef.current) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          console.log(`${DEBUG_TAG} Stopped progress tracking - no sound ref`);
        }
        return;
      }

      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setProgress(status.positionMillis);
          setDuration(status.durationMillis || 0);

          // Detailed logging only every 2 seconds to avoid spam
          if (
            Math.floor(status.positionMillis / 2000) !==
            Math.floor((status.positionMillis - 500) / 2000)
          ) {
            console.log(
              `${DEBUG_TAG} Playback progress: ${status.positionMillis}/${status.durationMillis}ms`,
              `(${Math.round((status.positionMillis / (status.durationMillis || 1)) * 100)}%),`,
              `Playing: ${status.isPlaying}`
            );
          }
        }
      } catch (error) {
        console.error(`${DEBUG_TAG} Error checking sound status:`, error);
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
          console.error(`${DEBUG_TAG} Playback error:`, status.error);
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
        console.log(`${DEBUG_TAG} Audio state changed: ${audioState} -> ${newState}`);
        setAudioState(newState);
      }

      // Update progress and duration
      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);

      // Log key status changes
      if (status.didJustFinish) {
        console.log(
          `${DEBUG_TAG} Audio playback finished naturally, duration: ${status.durationMillis}ms`
        );
      }

      if (status.isBuffering) {
        console.log(`${DEBUG_TAG} Audio is buffering`);
      }

      // Handle track completion
      if (status.didJustFinish && !status.isLooping) {
        if (!playlistMode) {
          // Single track mode - just stop
          console.log(`${DEBUG_TAG} Single track completed, resetting state`);
          setAudioState(AUDIO_STATES.IDLE);
          setProgress(0);
        } else {
          // In playlist mode, proceed to next track
          console.log(`${DEBUG_TAG} Track completed in playlist mode, moving to next`);
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
        console.error(`${DEBUG_TAG} Invalid audio URL provided`);
        setAudioState(AUDIO_STATES.ERROR);
        return false;
      }

      try {
        console.log(`${DEBUG_TAG} Loading audio: ${audioUrl}`);
        setAudioState(AUDIO_STATES.LOADING);
        lastActionTimeRef.current = Date.now();

        // Clean up any existing audio first
        await cleanupAudio().catch(e => {
          console.error(`${DEBUG_TAG} Error during audio cleanup:`, e);
        });

        // Initialize audio session first to ensure proper configuration
        await initAudioSession();

        // Create and load the sound with notification configuration for Android
        console.log(`${DEBUG_TAG} Creating sound object`);
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
        console.log(`${DEBUG_TAG} Sound loaded successfully, duration: ${duration}ms`);

        // Make sure we're in playing state
        console.log(`${DEBUG_TAG} Ensuring audio is playing...`);
        // Force playback to start (needed because the shouldPlay flag isn't always respected)
        await sound.playAsync();

        // Explicitly track playback state
        setAudioState(AUDIO_STATES.PLAYING);
        console.log(`${DEBUG_TAG} Audio playback confirmed starting`);
        startProgressTracking();

        // For short audio, ensure it completes before potential cleanup
        if (duration && duration < 1500) {
          console.log(`${DEBUG_TAG} Short audio detected (${duration}ms), ensuring it completes`);

          // Calculate a safe duration to wait - at least 1500ms to ensure it plays
          const safeWaitTime = Math.max(duration + 500, 1500);

          // Create a flag to track if playback was interrupted
          let playbackInterrupted = false;

          // Set up an interrupt listener
          const listener = () => {
            playbackInterrupted = true;
          };

          // Subscribe to the audio object updates
          if (soundRef.current) {
            sound.setOnPlaybackStatusUpdate(status => {
              if (status.isLoaded && status.didJustFinish) {
                playbackInterrupted = true;
                console.log(`${DEBUG_TAG} Audio playback completed naturally`);
              }
            });

            // Wait for audio to complete
            await new Promise(resolve => setTimeout(resolve, safeWaitTime));

            if (!playbackInterrupted) {
              console.log(`${DEBUG_TAG} Audio playback wait time completed (${safeWaitTime}ms)`);
            }

            // Clean up subscription if needed
            try {
              sound.setOnPlaybackStatusUpdate(null);
            } catch (e) {
              // Ignore errors on cleanup
            }
          }
        }

        return true;
      } catch (error) {
        console.error(
          `${DEBUG_TAG} Critical error loading audio:`,
          error instanceof Error ? error.message : String(error)
        );
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
    console.log(`${DEBUG_TAG} Setting up audio session and app state listener`);
    // Set up audio session initially
    initAudioSession();

    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log(`${DEBUG_TAG} App state changed: ${appStateRef.current} -> ${nextAppState}`);

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log(`${DEBUG_TAG} App returned to foreground, reinitializing audio`);

        // Ensure audio session is properly configured
        initAudioSession();

        // If we were playing audio before going to background, check if it's still playing
        if (audioState === AUDIO_STATES.PLAYING && soundRef.current) {
          console.log(`${DEBUG_TAG} Checking if background audio is still playing`);
          soundRef.current
            .getStatusAsync()
            .then(status => {
              console.log(
                `${DEBUG_TAG} Background audio status:`,
                status.isLoaded
                  ? `Playing: ${status.isPlaying}, Position: ${status.positionMillis}/${status.durationMillis}ms`
                  : 'Not loaded'
              );

              if (status.isLoaded && !status.isPlaying) {
                // If audio was playing but stopped when app went to background, restart it
                console.log(`${DEBUG_TAG} Restarting audio that stopped in background`);
                soundRef.current?.playAsync().catch(error => {
                  console.error(`${DEBUG_TAG} Error restarting background audio:`, error);
                  handleError(error instanceof Error ? error : String(error));
                });
              }
            })
            .catch(error => {
              console.error(`${DEBUG_TAG} Error checking background audio status:`, error);
              handleError(error instanceof Error ? error : String(error));
            });
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        console.log(`${DEBUG_TAG} App going to background, ensuring audio can continue`);
        // Make sure audio session is configured for background playback
        initAudioSession();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      console.log(`${DEBUG_TAG} Cleaning up app state listener and audio resources`);
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
