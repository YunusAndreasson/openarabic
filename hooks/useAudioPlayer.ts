import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';

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
  playNextTrack: (tracks?: AudioTrack[]) => Promise<boolean>;
  playPreviousTrack: (tracks?: AudioTrack[]) => Promise<boolean>;
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

  // Forward declaration for functions that have circular dependencies
  const playNextTrackRef = useRef<(tracks?: AudioTrack[]) => Promise<boolean>>(async () => false);

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
        await soundRef.current.stopAsync().catch(_e => {});
        await soundRef.current.unloadAsync().catch(_e => {});
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
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

      if (status.isPlaying) {
        setAudioState(AUDIO_STATES.PLAYING);
      } else if (status.isBuffering) {
        setAudioState(AUDIO_STATES.LOADING);
      } else {
        setAudioState(AUDIO_STATES.PAUSED);
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
    [playlistMode]
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
        await cleanupAudio().catch(_e => {});

        // Run audio setup and sound creation in parallel
        const [, { sound }] = await Promise.all([
          Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          }),
          Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false }, onPlaybackStatusUpdate),
        ]);

        soundRef.current = sound;

        // Start playback
        await sound.playAsync();

        setAudioState(AUDIO_STATES.PLAYING);
        startProgressTracking();

        return true;
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        setAudioState(AUDIO_STATES.ERROR);
        await cleanupAudio().catch(() => {});
        return false;
      }
    },
    [cleanupAudio, onPlaybackStatusUpdate, startProgressTracking]
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

      setCurrentTrackIndex(index);
      return await loadAndPlayAudio(tracks[index].audioUrl);
    },
    [loadAndPlayAudio]
  );

  // Start playback of a playlist
  const startPlayback = useCallback(
    async (tracks: AudioTrack[], startIndex = 0) => {
      if (!tracks || tracks.length === 0) return false;

      // Set to playlist mode
      setPlaylistMode(true);
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
  }, [cleanupAudio]);

  // Start shuffle playback
  const startShufflePlayback = useCallback(
    async (tracks: AudioTrack[]) => {
      if (!tracks || tracks.length === 0) return false;

      // Create shuffled playlist
      const shuffledIndices = [...Array(tracks.length).keys()];
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }

      // Set to playlist mode
      setPlaylistMode(true);
      return await playTrack(tracks, shuffledIndices[0]);
    },
    [playTrack]
  );

  // Play next track in playlist
  const playNextTrack = useCallback(
    async (tracks?: AudioTrack[]) => {
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
    },
    [playlistMode, currentTrackIndex, playTrack, stopPlayback]
  );

  // Play previous track in playlist
  const playPreviousTrack = useCallback(
    async (tracks?: AudioTrack[]) => {
      if (!tracks || !playlistMode || currentTrackIndex <= 0) {
        // If at beginning of playlist, restart current track
        if (soundRef.current && currentTrackIndex === 0) {
          await soundRef.current.setPositionAsync(0);
          return true;
        }
        return false;
      }

      return await playTrack(tracks, currentTrackIndex - 1);
    },
    [playlistMode, currentTrackIndex, playTrack]
  );

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
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        initAudioSession();
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        // Optionally pause audio here
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [initAudioSession]);

  // Initialize audio session on mount
  useEffect(() => {
    initAudioSession();

    return () => {
      cleanupAudio();
    };
  }, [initAudioSession, cleanupAudio]);

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
