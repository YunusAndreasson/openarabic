// Audio player hook using expo-audio for Expo SDK 53
import {
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';

import { AUDIO_STATES, type AudioState } from '@/constants/audio';
import { audioCache } from '@/services/audioCache';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

/**
 * Enhanced audio player interface
 */
export interface EnhancedPlayerAPI {
  // Legacy compatibility properties (still used)
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

  // State properties (only the ones actually used)
  isLoading: boolean;
  position: number;
  duration: number;
}

interface PlayerState {
  currentTrack: EnhancedAudioTrack | null;
  queue: EnhancedAudioTrack[];
  currentIndex: number;
  isLoading: boolean;
  shouldAutoPlay: boolean;
}

type PlayerAction =
  | { type: 'SET_QUEUE'; queue: EnhancedAudioTrack[]; index: number }
  | { type: 'SET_CURRENT_TRACK'; track: EnhancedAudioTrack | null }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_AUTOPLAY'; value: boolean }
  | { type: 'RESET' };

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isLoading: false,
  shouldAutoPlay: false,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_QUEUE':
      return {
        ...state,
        queue: action.queue,
        currentIndex: action.index,
        currentTrack: action.queue[action.index] || null,
      };
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrack: action.track };
    case 'SET_INDEX':
      return {
        ...state,
        currentIndex: action.index,
        currentTrack: state.queue[action.index] || null,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_AUTOPLAY':
      return { ...state, shouldAutoPlay: action.value };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/**
 * Hook for enhanced audio player using expo-audio
 */
export function useAudioPlayer(): EnhancedPlayerAPI {
  // Main state management via reducer
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const { currentTrack, queue, currentIndex, isLoading, shouldAutoPlay } = state;

  // Create audio player with current track source - following expo-audio docs pattern exactly
  const audioSource = currentTrack ? { uri: currentTrack.audioUrl } : null;
  const audioPlayer = useExpoAudioPlayer(audioSource);

  // Use the proper expo-audio status hook
  const status = useAudioPlayerStatus(audioPlayer);

  // Check for player errors
  useEffect(() => {
    if (currentTrack && !status?.isLoaded && status?.playbackState === 'unknown') {
      // Player having trouble loading track
    }
  }, [status, currentTrack]);

  // Get position and duration from status
  const position = status?.currentTime ?? 0;
  const duration = status?.duration ?? 0;

  // Player state derived from expo-audio status
  const isPlaying = useMemo(() => {
    return status?.playing || false;
  }, [status?.playing]);

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
    // If we have no current track, we should always be IDLE regardless of player state
    if (!currentTrack) {
      return AUDIO_STATES.IDLE;
    }

    const newState =
      isLoading || !isPlayerLoaded
        ? AUDIO_STATES.LOADING
        : isPlaying
        ? AUDIO_STATES.PLAYING
        : AUDIO_STATES.STOPPED;

    return newState;
  }, [isLoading, isPlaying, currentTrack, isPlayerLoaded]);

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
      // Clear the flag immediately to prevent multiple calls
      dispatch({ type: 'SET_AUTOPLAY', value: false });

      // Add a small delay to ensure player is fully ready
      const playAudio = async () => {
        try {
          if (typeof audioPlayer.play === 'function') {
            await audioPlayer.play();
            // Clear loading state once playback starts successfully
            dispatch({ type: 'SET_LOADING', isLoading: false });
          }
        } catch (error) {
          dispatch({ type: 'SET_LOADING', isLoading: false });
          handleError(error as Error, {
            toastMessage: 'Failed to start audio playback',
            showToast: true,
          });
        }
      };

      // Use a small delay to ensure the player is fully initialized
      setTimeout(playAudio, 50);
    }
  }, [shouldAutoPlay, audioPlayer, currentTrack, isPlayerLoaded]);

  const stop = useCallback(async () => {
    try {
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

      // Clear the current track and queue after stopping the player
      dispatch({ type: 'RESET' });
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

  // Queue loading - following expo-audio docs pattern exactly
  const loadQueue = useCallback(async (tracks: EnhancedAudioTrack[], startIndex = 0) => {
    try {
      if (tracks.length === 0) {
        dispatch({ type: 'RESET' });
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return;
      }

      const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

      // Process tracks to use cached audio URLs if available
      const processedTracks = await Promise.all(
        tracks.map(async (track, _index) => {
          try {
            // Get cached audio URL (downloads if not cached)
            const cachedAudioUrl = await audioCache.getAudio(track.audioUrl);
            return {
              ...track,
              audioUrl: cachedAudioUrl,
            };
          } catch {
            // If caching fails, use original URL
            return track;
          }
        })
      );

      // Verify the selected track has a valid audio URL
      const selectedTrack = processedTracks[validStartIndex];
      if (!selectedTrack?.audioUrl) {
        throw new Error('Selected track has no audio URL');
      }

      dispatch({
        type: 'SET_QUEUE',
        queue: processedTracks,
        index: validStartIndex,
      });

      // The useAudioPlayer hook will automatically recreate the player with the new source
    } catch (error) {
      console.error('Queue loading failed:', error);
      handleError(error as Error, {
        toastMessage: 'Failed to load audio',
        showToast: true,
      });
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, []);

  // Enhanced playback that loads and immediately plays (user-initiated)
  const startEnhancedPlayback = useCallback(
    async (tracks: EnhancedAudioTrack[], startIndex = 0): Promise<boolean> => {
      try {
        // Immediate feedback - set loading state before any async work
        dispatch({ type: 'SET_LOADING', isLoading: true });

        // Set auto-play flag to maintain user interaction context
        dispatch({ type: 'SET_AUTOPLAY', value: true });

        // Load the queue - the auto-play effect will handle playback when ready
        await loadQueue(tracks, startIndex);

        return true; // Success
      } catch (error) {
        dispatch({ type: 'SET_AUTOPLAY', value: false }); // Reset flag on error
        dispatch({ type: 'SET_LOADING', isLoading: false }); // Reset loading on error
        handleError(error as Error, {
          toastMessage: 'Failed to start audio playback',
          showToast: true,
        });
        return false; // Failure
      }
    },
    [loadQueue]
  );

  // Navigation methods (only next is used internally)
  const next = useCallback(async () => {
    if (currentIndex >= queue.length - 1) return;

    try {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      const nextIndex = currentIndex + 1;
      const nextTrack = queue[nextIndex];

      if (nextTrack) {
        dispatch({ type: 'SET_INDEX', index: nextIndex });
        dispatch({ type: 'SET_AUTOPLAY', value: true }); // Ensure next track auto-plays

        // The useAudioPlayer hook will automatically recreate the player with the new source
      }
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Failed to skip to next track' });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [currentIndex, queue]);

  // Track when tracks have been playing to prevent premature advancement
  const [trackStartTimes, setTrackStartTimes] = useState<Map<number, number>>(new Map());

  // Handle automatic track progression when audio finishes (using position-based detection)
  useEffect(() => {
    if (!isPlayerReady || !currentTrack || !status || !status.isLoaded) return;

    const { duration, currentTime } = status;

    // Only process tracks that have meaningful duration and have played
    if (duration <= 0 || currentTime <= 0) return;

    // Check if track has finished (reached within 100ms of the end)
    const hasFinished = Math.abs(currentTime - duration) < 0.1;

    if (hasFinished) {
      // Ensure the track has been playing for at least its duration to prevent false positives
      const trackStartTime = trackStartTimes.get(currentIndex);
      const now = Date.now();
      const hasPlayedLongEnough = trackStartTime && now - trackStartTime >= duration * 1000 * 0.8; // 80% of duration

      if (!hasPlayedLongEnough) {
        return;
      }

      // Remove this track from start times to prevent reprocessing
      setTrackStartTimes(prev => {
        const newMap = new Map(prev);
        newMap.delete(currentIndex);
        return newMap;
      });

      // Add a small delay to allow proper track transition
      setTimeout(() => {
        // Check if we can advance to next track
        if (currentIndex < queue.length - 1) {
          next();
        } else {
          // Clear current track to signal completion
          dispatch({ type: 'SET_CURRENT_TRACK', track: null });
          dispatch({ type: 'SET_INDEX', index: -1 });
        }
      }, 200); // Small delay to prevent rapid transitions
    }
  }, [
    status?.duration,
    status?.currentTime,
    status?.isLoaded,
    isPlayerReady,
    currentTrack,
    currentIndex,
    queue.length,
    next,
    trackStartTimes,
  ]);

  // Track when tracks start playing
  useEffect(() => {
    if (isPlaying && currentTrack && currentIndex >= 0) {
      setTrackStartTimes(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(currentIndex)) {
          newMap.set(currentIndex, Date.now());
        }
        return newMap;
      });
    }
  }, [isPlaying, currentTrack, currentIndex]);

  // Clear track start times when starting new queue
  useEffect(() => {
    if (currentIndex === 0 && queue.length > 0) {
      setTrackStartTimes(new Map());
    }
  }, [currentIndex, queue.length]);

  // Cleanup on unmount to release audio resources
  useEffect(() => {
    return () => {
      stop();
      setTrackStartTimes(new Map());
    };
  }, []);

  // Legacy actions for compatibility
  const actions = useMemo(
    () => ({
      stopPlayback: stop,
      startEnhancedPlayback: startEnhancedPlayback,
    }),
    [stop, startEnhancedPlayback]
  );

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // Legacy compatibility properties
      progress,
      metadata,
      audioState,
      currentTrackIndex: currentIndex,
      actions,

      // State properties
      isLoading,
      position,
      duration,
    }),
    [progress, metadata, audioState, currentIndex, actions, isLoading, position, duration]
  );
}
