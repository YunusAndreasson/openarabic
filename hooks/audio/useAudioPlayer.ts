// Audio player hook using expo-audio for Expo SDK 53
import { useAudioPlayer as useExpoAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useState, useEffect, useCallback, useMemo } from 'react';

import type { EnhancedAudioTrack } from '../../types/audio.types';
import { handleError } from '../../utils/errorHandling';

// Audio states for compatibility
export const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

type AudioState = (typeof AUDIO_STATES)[keyof typeof AUDIO_STATES];

/**
 * Enhanced audio player interface
 */
export interface EnhancedPlayerAPI {
  // Legacy compatibility properties
  progress: number;
  metadata: {
    articleId?: string;
    articleTitle?: string;
  };
  audioState: AudioState;
  currentTrackIndex: number;
  actions: {
    stopPlayback: () => Promise<void>;
    playTrack: (track: EnhancedAudioTrack) => Promise<void>;
    playQueue: (tracks: EnhancedAudioTrack[], startIndex?: number) => Promise<void>;
    startEnhancedPlayback: (tracks: EnhancedAudioTrack[], startIndex?: number) => Promise<boolean>;
  };

  // State properties
  currentTrack: EnhancedAudioTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  playbackRate: number;
  volume: number;
  queue: EnhancedAudioTrack[];
  currentIndex: number;
  playbackHistory: EnhancedAudioTrack[];

  // Control methods
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;

  // Queue management
  loadTrack: (track: EnhancedAudioTrack) => Promise<void>;
  loadQueue: (tracks: EnhancedAudioTrack[], startIndex?: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  skipToTrack: (index: number) => Promise<void>;
  addToQueue: (track: EnhancedAudioTrack, position?: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // State flags
  canGoNext: boolean;
  canGoPrevious: boolean;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';

  // Utility methods
  reset: () => void;
  getTrackById: (id: string) => EnhancedAudioTrack | undefined;
}

/**
 * Hook for enhanced audio player using expo-audio
 */
export function useAudioPlayer(): EnhancedPlayerAPI {
  // Main state management
  const [currentTrack, setCurrentTrack] = useState<EnhancedAudioTrack | null>(null);
  const [queue, setQueue] = useState<EnhancedAudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playbackHistory, setPlaybackHistory] = useState<EnhancedAudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Create audio player with current track source - following expo-audio docs pattern exactly
  const audioSource = currentTrack ? { uri: currentTrack.audioUrl } : null;
  const audioPlayer = useExpoAudioPlayer(audioSource);

  // Player state derived from expo-audio player - with defensive access
  const isPlaying = useMemo(() => {
    try {
      const playing = audioPlayer?.playing || false;
      const paused = audioPlayer?.paused || false;

      // Handle expo-audio inconsistency: if both playing and paused are true, prioritize paused
      const actuallyPlaying = playing && !paused;
      return actuallyPlaying;
    } catch {
      return false;
    }
  }, [audioPlayer]);

  const position = useMemo(() => {
    try {
      return audioPlayer?.currentTime || 0;
    } catch {
      return 0;
    }
  }, [audioPlayer]);

  const isPaused = useMemo(() => {
    try {
      const paused = audioPlayer?.paused || false;
      const playing = audioPlayer?.playing || false;

      // Handle expo-audio inconsistency: if both playing and paused are true, consider it paused
      const actuallyPaused = paused || (!playing && position > 0);
      return actuallyPaused;
    } catch {
      return false;
    }
  }, [audioPlayer, position]);

  const duration = useMemo(() => {
    try {
      return audioPlayer?.duration || 0;
    } catch {
      return 0;
    }
  }, [audioPlayer]);

  const playbackRate = useMemo(() => {
    try {
      return audioPlayer?.playbackRate || 1;
    } catch {
      return 1;
    }
  }, [audioPlayer]);

  const volume = useMemo(() => {
    try {
      return audioPlayer?.volume || 1;
    } catch {
      return 1;
    }
  }, [audioPlayer]);

  const isPlayerLoaded = useMemo(() => {
    try {
      return audioPlayer?.isLoaded || false;
    } catch {
      return false;
    }
  }, [audioPlayer]);

  // Derived state for compatibility
  const progress = useMemo(() => {
    return duration > 0 ? position / duration : 0;
  }, [position, duration]);

  const metadata = useMemo(
    () => ({
      articleId: currentTrack?.articleId?.toString(),
      articleTitle: currentTrack?.title,
    }),
    [currentTrack]
  );

  const audioState = useMemo((): AudioState => {
    if (isLoading || (currentTrack && !isPlayerLoaded)) return AUDIO_STATES.LOADING;
    if (isPlaying) return AUDIO_STATES.PLAYING;
    if (isPaused && position > 0) return AUDIO_STATES.PAUSED;
    if (currentTrack) return AUDIO_STATES.STOPPED;
    return AUDIO_STATES.IDLE;
  }, [isLoading, isPlaying, isPaused, position, currentTrack, isPlayerLoaded]);

  // Initialize audio session
  const initAudioSession = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio session:', error);
      handleError(error as Error, { toastMessage: 'Failed to initialize audio session' });
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initAudioSession();
  }, [initAudioSession]);

  // Player readiness check to prevent operating on disposed players
  const isPlayerReady = useMemo(() => {
    try {
      return audioPlayer && typeof audioPlayer.play === 'function' && isPlayerLoaded;
    } catch {
      return false;
    }
  }, [audioPlayer, isPlayerLoaded]);

  // Handle auto-play when player and track are ready
  useEffect(() => {
    if (shouldAutoPlay && audioPlayer && currentTrack) {
      // Use immediate execution in microtask to avoid setTimeout race conditions
      Promise.resolve().then(() => {
        try {
          // Re-check that we still have auto-play intent, valid references
          if (shouldAutoPlay && audioPlayer && currentTrack) {
            // Clear the flag before attempting to play
            setShouldAutoPlay(false);

            // Defensive call to play()
            try {
              // Check that player is still accessible
              if (typeof audioPlayer.play === 'function') {
                audioPlayer.play();
              }
            } catch (playError) {
              console.warn('Failed to start auto-play, player may have been disposed:', playError);
            }
          } else {
            setShouldAutoPlay(false);
          }
        } catch (error) {
          console.error('Error in auto-play:', error);
          setShouldAutoPlay(false);
        }
      });
    }
  }, [shouldAutoPlay, audioPlayer, currentTrack]);

  // Control methods - following expo-audio docs pattern exactly
  const play = useCallback(async () => {
    try {
      if (!isPlayerReady || !currentTrack) {
        console.warn('Cannot play: player not ready or missing currentTrack');
        return;
      }

      // Following expo-audio docs: if audio is at the end, seek to start first
      // "expo-audio doesn't automatically reset the playback position when audio finishes"
      if (duration > 0 && Math.abs(position - duration) < 0.5) {
        console.log('Audio at end, seeking to start for replay (expo-audio docs pattern)');
        try {
          if (typeof audioPlayer?.seekTo === 'function') {
            await audioPlayer.seekTo(0);
          }
        } catch (seekError) {
          console.warn('Failed to seek to start, continuing with play anyway:', seekError);
        }
      }

      // Defensive call to play() with readiness check
      try {
        if (typeof audioPlayer?.play === 'function') {
          audioPlayer.play();
        } else {
          console.warn('Cannot play: player method not accessible');
        }
      } catch (playError) {
        console.warn('Failed to play audio, player may have been disposed:', playError);
        throw playError; // Re-throw for error handling
      }
    } catch (error) {
      console.error('Error in play method:', error);
      // Only show toast for unexpected errors, not native object disposal errors
      if (
        error instanceof Error &&
        !error.message.includes('NativeSharedObjectNotFoundException')
      ) {
        handleError(error, { toastMessage: 'Failed to play audio' });
      }
    }
  }, [isPlayerReady, currentTrack, duration, position, audioPlayer]);

  const pause = useCallback(async () => {
    try {
      if (!isPlayerReady) return;
      if (typeof audioPlayer?.pause === 'function') {
        audioPlayer.pause();
      }
    } catch (error) {
      console.warn('Failed to pause audio:', error);
      // Only show toast for unexpected errors, not native object disposal errors
      if (
        error instanceof Error &&
        !error.message.includes('NativeSharedObjectNotFoundException')
      ) {
        handleError(error, { toastMessage: 'Failed to pause audio' });
      }
    }
  }, [isPlayerReady, audioPlayer]);

  const stop = useCallback(async () => {
    try {
      // Clear the current track and queue first to signal stop intent
      setCurrentTrack(null);
      setQueue([]);
      setCurrentIndex(-1);
      setShouldAutoPlay(false);

      // Only attempt player operations if player is accessible
      if (audioPlayer && isPlayerReady) {
        // Try to pause and seek with defensive access
        try {
          if (typeof audioPlayer.pause === 'function') {
            audioPlayer.pause();
          }
        } catch (pauseError) {
          console.warn('Failed to pause audio player:', pauseError);
        }

        try {
          if (typeof audioPlayer.seekTo === 'function') {
            await audioPlayer.seekTo(0);
          }
        } catch (seekError) {
          console.warn('Failed to seek audio player:', seekError);
        }
      }
    } catch (error) {
      console.error('Error in stop method:', error);
      // Only show toast for unexpected errors, not native object disposal errors
      if (
        error instanceof Error &&
        !error.message.includes('NativeSharedObjectNotFoundException')
      ) {
        handleError(error, { toastMessage: 'Failed to stop audio' });
      }
    }
  }, [audioPlayer, isPlayerReady]);

  const seekTo = useCallback(
    async (position: number) => {
      try {
        if (!isPlayerReady) return;
        if (typeof audioPlayer?.seekTo === 'function') {
          await audioPlayer.seekTo(position);
        }
      } catch (error) {
        console.warn('Failed to seek audio:', error);
        // Only show toast for unexpected errors, not native object disposal errors
        if (
          error instanceof Error &&
          !error.message.includes('NativeSharedObjectNotFoundException')
        ) {
          handleError(error, { toastMessage: 'Failed to seek audio' });
        }
      }
    },
    [isPlayerReady, audioPlayer]
  );

  const setVolume = useCallback(
    async (newVolume: number) => {
      try {
        if (!isPlayerReady) return;
        if (audioPlayer && 'volume' in audioPlayer) {
          audioPlayer.volume = Math.max(0, Math.min(1, newVolume));
        }
      } catch (error) {
        console.warn('Failed to set volume:', error);
        // Only show toast for unexpected errors, not native object disposal errors
        if (
          error instanceof Error &&
          !error.message.includes('NativeSharedObjectNotFoundException')
        ) {
          handleError(error, { toastMessage: 'Failed to set volume' });
        }
      }
    },
    [isPlayerReady, audioPlayer]
  );

  const setPlaybackRate = useCallback(
    async (rate: number) => {
      try {
        if (!isPlayerReady) return;
        if (typeof audioPlayer?.setPlaybackRate === 'function') {
          audioPlayer.setPlaybackRate(Math.max(0.5, Math.min(2, rate)));
        }
      } catch (error) {
        console.warn('Failed to set playback rate:', error);
        // Only show toast for unexpected errors, not native object disposal errors
        if (
          error instanceof Error &&
          !error.message.includes('NativeSharedObjectNotFoundException')
        ) {
          handleError(error, { toastMessage: 'Failed to set playback rate' });
        }
      }
    },
    [isPlayerReady, audioPlayer]
  );

  // Track loading - following expo-audio docs pattern exactly
  const loadTrack = useCallback(async (track: EnhancedAudioTrack) => {
    try {
      setIsLoading(true);

      setQueue([track]);
      setCurrentIndex(0);
      setCurrentTrack(track);

      // The useAudioPlayer hook will automatically recreate the player with the new source
    } catch (error) {
      console.error('Error loading track:', error);
      handleError(error as Error, { toastMessage: 'Failed to load track' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Queue loading - following expo-audio docs pattern exactly
  const loadQueue = useCallback(async (tracks: EnhancedAudioTrack[], startIndex = 0) => {
    try {
      setIsLoading(true);

      if (tracks.length === 0) {
        setQueue([]);
        setCurrentIndex(-1);
        setCurrentTrack(null);
        return;
      }

      const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const initialTrack = tracks[validStartIndex];

      setQueue(tracks);
      setCurrentIndex(validStartIndex);
      setCurrentTrack(initialTrack || null);

      // The useAudioPlayer hook will automatically recreate the player with the new source
    } catch (error) {
      console.error('Error loading queue:', error);
      handleError(error as Error, { toastMessage: 'Failed to load queue' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced playback that loads and immediately plays (user-initiated)
  const startEnhancedPlayback = useCallback(
    async (tracks: EnhancedAudioTrack[], startIndex = 0): Promise<boolean> => {
      try {
        // Set auto-play flag to maintain user interaction context
        setShouldAutoPlay(true);

        // Load the queue - the auto-play effect will handle playback when ready
        await loadQueue(tracks, startIndex);

        return true; // Success
      } catch (error) {
        console.error('Error in startEnhancedPlayback:', error);
        setShouldAutoPlay(false); // Reset flag on error
        handleError(error as Error, { toastMessage: 'Failed to start enhanced playback' });
        return false; // Failure
      }
    },
    [loadQueue]
  );

  // Navigation methods
  const next = useCallback(async () => {
    if (currentIndex >= queue.length - 1) return;

    try {
      setIsLoading(true);
      const nextIndex = currentIndex + 1;
      const nextTrack = queue[nextIndex];

      if (nextTrack) {
        if (currentTrack) {
          setPlaybackHistory(prev => [currentTrack, ...prev.slice(0, 19)]);
        }
        setCurrentIndex(nextIndex);
        setCurrentTrack(nextTrack);

        // The useAudioPlayer hook will automatically recreate the player with the new source
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
      handleError(error as Error, { toastMessage: 'Failed to skip to next track' });
    } finally {
      setIsLoading(false);
    }
  }, [currentIndex, queue, currentTrack]);

  const previous = useCallback(async () => {
    try {
      setIsLoading(true);

      if (position > 3) {
        await seekTo(0);
        return;
      }

      if (currentIndex <= 0) return;

      const prevIndex = currentIndex - 1;
      const prevTrack = queue[prevIndex];

      if (prevTrack) {
        setCurrentIndex(prevIndex);
        setCurrentTrack(prevTrack);

        // The useAudioPlayer hook will automatically recreate the player with the new source
      }
    } catch (error) {
      console.error('Error skipping to previous track:', error);
      handleError(error as Error, { toastMessage: 'Failed to skip to previous track' });
    } finally {
      setIsLoading(false);
    }
  }, [position, currentIndex, queue, seekTo]);

  const skipToTrack = useCallback(
    async (index: number) => {
      if (index < 0 || index >= queue.length) return;

      try {
        setIsLoading(true);
        const track = queue[index];

        if (track) {
          if (currentTrack) {
            setPlaybackHistory(prev => [currentTrack, ...prev.slice(0, 19)]);
          }
          setCurrentIndex(index);
          setCurrentTrack(track);

          // The useAudioPlayer hook will automatically recreate the player with the new source
        }
      } catch (error) {
        console.error('Error skipping to track:', error);
        handleError(error as Error, { toastMessage: 'Failed to skip to track' });
      } finally {
        setIsLoading(false);
      }
    },
    [queue, currentTrack]
  );

  // Queue manipulation
  const addToQueue = useCallback(
    (track: EnhancedAudioTrack, position?: number) => {
      setQueue(prev => {
        const newQueue = [...prev];
        const insertPosition = position ?? newQueue.length;
        newQueue.splice(insertPosition, 0, track);

        if (insertPosition <= currentIndex) {
          setCurrentIndex(prev => prev + 1);
        }

        return newQueue;
      });
    },
    [currentIndex]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;

      setQueue(prev => {
        const newQueue = [...prev];
        newQueue.splice(index, 1);

        if (index < currentIndex) {
          setCurrentIndex(prev => prev - 1);
        } else if (index === currentIndex) {
          if (newQueue.length === 0) {
            setCurrentIndex(-1);
            setCurrentTrack(null);
          } else {
            const nextIndex = Math.min(currentIndex, newQueue.length - 1);
            const nextTrack = newQueue[nextIndex];

            setCurrentIndex(nextIndex);
            setCurrentTrack(nextTrack || null);

            // The useAudioPlayer hook will automatically recreate the player with the new source
          }
        }

        return newQueue;
      });
    },
    [queue.length, currentIndex]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    setCurrentTrack(null);
    setPlaybackHistory([]);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      switch (prev) {
        case 'none':
          return 'all';
        case 'all':
          return 'one';
        case 'one':
          return 'none';
        default:
          return 'none';
      }
    });
  }, []);

  const reset = useCallback(() => {
    clearQueue();
    setIsShuffled(false);
    setRepeatMode('none');
  }, [clearQueue]);

  const getTrackById = useCallback(
    (id: string) => {
      return queue.find(track => track.id === id);
    },
    [queue]
  );

  // Computed state
  const canGoNext = useMemo(() => {
    return currentIndex < queue.length - 1;
  }, [currentIndex, queue.length]);

  const canGoPrevious = useMemo(() => {
    return currentIndex > 0;
  }, [currentIndex]);

  // Handle automatic track progression when audio finishes (following expo-audio docs behavior)
  useEffect(() => {
    if (!isPlayerReady || !currentTrack) return;

    // Check if audio has finished (reached the end)
    if (duration > 0 && Math.abs(position - duration) < 0.5 && !isPlaying && isPaused) {
      console.log('Track finished, handling auto-progression');

      // Handle repeat mode
      if (repeatMode === 'one') {
        try {
          if (
            typeof audioPlayer?.seekTo === 'function' &&
            typeof audioPlayer?.play === 'function'
          ) {
            audioPlayer.seekTo(0);
            audioPlayer.play();
          }
        } catch (error) {
          console.warn('Failed to restart track:', error);
        }
        return;
      }

      // Check if we can advance to next track
      if (canGoNext) {
        next();
      } else if (repeatMode === 'all' && queue.length > 0) {
        skipToTrack(0);
      }
    }
  }, [
    position,
    duration,
    isPlaying,
    isPaused,
    isPlayerReady,
    audioPlayer,
    currentTrack,
    repeatMode,
    canGoNext,
    queue.length,
    next,
    skipToTrack,
  ]);

  // Legacy actions for compatibility
  const actions = useMemo(
    () => ({
      stopPlayback: stop,
      playTrack: loadTrack,
      playQueue: loadQueue,
      startEnhancedPlayback: startEnhancedPlayback,
    }),
    [stop, loadTrack, loadQueue, startEnhancedPlayback]
  );

  return {
    // Legacy compatibility properties
    progress,
    metadata,
    audioState,
    currentTrackIndex: currentIndex,
    actions,

    // State properties
    currentTrack,
    isPlaying,
    isPaused,
    isLoading: isLoading || (currentTrack !== null && !isPlayerLoaded),
    position,
    duration,
    playbackRate,
    volume,
    queue,
    currentIndex,
    playbackHistory,

    // Control methods
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setPlaybackRate,

    // Queue management
    loadTrack,
    loadQueue,
    next,
    previous,
    skipToTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    toggleRepeat,

    // State flags
    canGoNext,
    canGoPrevious,
    isShuffled,
    repeatMode,

    // Utility methods
    reset,
    getTrackById,
  };
}
