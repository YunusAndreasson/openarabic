// Audio player hook using expo-audio for Expo SDK 53
import {
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
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
    startEnhancedPlayback: (tracks: EnhancedAudioTrack[], startIndex?: number) => Promise<boolean>;
  };

  // State properties (only used ones)
  currentTrack: EnhancedAudioTrack | null;
  isLoading: boolean;
  position: number;
  duration: number;

  // Control methods (only used ones)
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
}

/**
 * Hook for enhanced audio player using expo-audio
 */
export function useAudioPlayer(): EnhancedPlayerAPI {
  // Main state management
  const [currentTrack, setCurrentTrack] = useState<EnhancedAudioTrack | null>(null);
  const [queue, setQueue] = useState<EnhancedAudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Create audio player with current track source - following expo-audio docs pattern exactly
  const audioSource = currentTrack ? { uri: currentTrack.audioUrl } : null;
  const audioPlayer = useExpoAudioPlayer(audioSource);

  // Use the proper expo-audio status hook
  const status = useAudioPlayerStatus(audioPlayer);

  // Get position and duration from status
  const position = status?.currentTime || 0;
  const duration = status?.duration || 0;

  // Player state derived from expo-audio status
  const isPlaying = useMemo(() => {
    return status?.playing || false;
  }, [status?.playing]);

  const isPaused = useMemo(() => {
    return !status?.playing && position > 0;
  }, [status?.playing, position]);

  const isPlayerLoaded = useMemo(() => {
    return status?.isLoaded || false;
  }, [status?.isLoaded]);

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
    if (isPaused) return AUDIO_STATES.PAUSED;
    if (currentTrack) return AUDIO_STATES.STOPPED;
    return AUDIO_STATES.IDLE;
  }, [isLoading, isPlaying, isPaused, currentTrack, isPlayerLoaded]);

  // Initialize audio session
  const initAudioSession = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
      });
    } catch (error) {
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
    if (shouldAutoPlay && audioPlayer && currentTrack && isPlayerLoaded) {
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
            } catch {
              // Silently handle auto-play failures
            }
          } else {
            setShouldAutoPlay(false);
          }
        } catch {
          setShouldAutoPlay(false);
        }
      });
    }
  }, [shouldAutoPlay, audioPlayer, currentTrack, isPlayerLoaded]);

  // Control methods - following expo-audio docs pattern exactly
  const play = useCallback(async () => {
    try {
      if (!isPlayerReady || !currentTrack) {
        return;
      }

      // Following expo-audio docs: if audio is at the end, seek to start first
      // "expo-audio doesn't automatically reset the playback position when audio finishes"
      if (duration > 0 && Math.abs(position - duration) < 0.5) {
        try {
          if (typeof audioPlayer?.seekTo === 'function') {
            await audioPlayer.seekTo(0);
          }
        } catch {
          // Silently handle seek failures, continue with play
        }
      }

      // Defensive call to play() with readiness check
      if (typeof audioPlayer?.play === 'function') {
        audioPlayer.play();
      }
    } catch (error) {
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
        } catch {
          // Silently handle pause errors
        }

        try {
          if (typeof audioPlayer.seekTo === 'function') {
            await audioPlayer.seekTo(0);
          }
        } catch {
          // Silently handle seek errors
        }
      }
    } catch (error) {
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
        setShouldAutoPlay(false); // Reset flag on error
        handleError(error as Error, { toastMessage: 'Failed to start enhanced playback' });
        return false; // Failure
      }
    },
    [loadQueue]
  );

  // Navigation methods (only next is used internally)
  const next = useCallback(async () => {
    if (currentIndex >= queue.length - 1) return;

    try {
      setIsLoading(true);
      const nextIndex = currentIndex + 1;
      const nextTrack = queue[nextIndex];

      if (nextTrack) {
        setCurrentIndex(nextIndex);
        setCurrentTrack(nextTrack);

        // The useAudioPlayer hook will automatically recreate the player with the new source
      }
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Failed to skip to next track' });
    } finally {
      setIsLoading(false);
    }
  }, [currentIndex, queue]);

  // Handle automatic track progression when audio finishes (following expo-audio docs behavior)
  useEffect(() => {
    if (!isPlayerReady || !currentTrack) return;

    // Check if audio has finished (reached the end)
    if (duration > 0 && Math.abs(position - duration) < 0.5 && !isPlaying && isPaused) {
      // Check if we can advance to next track
      if (currentIndex < queue.length - 1) {
        next();
      }
    }
  }, [
    position,
    duration,
    isPlaying,
    isPaused,
    isPlayerReady,
    currentTrack,
    currentIndex,
    queue.length,
    next,
  ]);

  // Legacy actions for compatibility
  const actions = useMemo(
    () => ({
      stopPlayback: stop,
      startEnhancedPlayback: startEnhancedPlayback,
    }),
    [stop, startEnhancedPlayback]
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
    isLoading: isLoading || (currentTrack !== null && !isPlayerLoaded),
    position,
    duration,

    // Control methods
    play,
    pause,
    stop,
    seekTo,
  };
}
