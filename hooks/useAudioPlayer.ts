import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AppState } from 'react-native';

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

export function useAudioPlayer() {
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
        await soundRef.current.stopAsync().catch(e => console.warn('Error stopping audio:', e));
        await soundRef.current.unloadAsync().catch(e => console.warn('Error unloading audio:', e));
      } catch (error) {
        console.error('Audio cleanup error:', error);
      } finally {
        soundRef.current = null;
      }
    }
  }, []);

  // Initialize audio session
  const initAudioSession = useCallback(async () => {
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
  }, []);

  // Start tracking progress
  const startProgressTracking = useCallback(() => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Set up a new interval to update progress
    progressIntervalRef.current = setInterval(async () => {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            setProgress(status.positionMillis);
            setDuration(status.durationMillis || 0);
          }
        } catch (error) {
          // Error getting status
        }
      }
    }, 1000);
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
