// Audio player hook using expo-audio for Expo SDK 53
import { createAudioPlayer, setAudioModeAsync, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { AUDIO_STATES, type AudioState } from '@/constants/audio';
import { STRINGS } from '@/constants/strings';
import { audioCache } from '@/services/audioCache';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

// Enhanced player API interface
interface EnhancedPlayerAPI {
  // State
  audioState: AudioState;
  currentTrackIndex: number;
  position: number;
  duration: number;
  isLoading: boolean;
  metadata: {
    articleId?: string;
    articleTitle?: string;
  };
  progress: number;

  // Actions
  actions: {
    startEnhancedPlayback: (tracks: EnhancedAudioTrack[], startIndex?: number) => Promise<boolean>;
    stopPlayback: () => Promise<void>;
    prefetchTracks: (tracks: EnhancedAudioTrack[]) => Promise<EnhancedAudioTrack[]>;
  };
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
      if (action.track === null) {
        return {
          ...state,
          currentTrack: null,
        };
      }
      return {
        ...state,
        currentTrack: action.track,
      };
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
  const { currentTrack, queue: _queue, currentIndex, isLoading, shouldAutoPlay } = state;

  // FIXED: Manual player management to prevent orphaned players
  const audioPlayerRef = useRef<any>(null);
  const currentSourceRef = useRef<string | null>(null);

  // Manually create and manage audio player
  const audioPlayer = useMemo(() => {
    const audioSource = currentTrack ? { uri: currentTrack.audioUrl } : null;
    const newSource = audioSource?.uri || null;

    // If no source, return null (no player needed)
    if (!audioSource) {
      // Clean up existing player if we no longer need it
      if (audioPlayerRef.current) {
        try {
          if (typeof audioPlayerRef.current.pause === 'function') {
            audioPlayerRef.current.pause();
          }
          if (typeof audioPlayerRef.current.remove === 'function') {
            audioPlayerRef.current.remove();
          }
        } catch (error) {
          console.log('⚠️ [MANUAL PLAYER] Error cleaning up player:', error);
        }
        audioPlayerRef.current = null;
        currentSourceRef.current = null;
      }
      return null;
    }

    // If source hasn't changed, return existing player
    if (currentSourceRef.current === newSource && audioPlayerRef.current) {
      return audioPlayerRef.current;
    }

    // Source changed - clean up old player and create new one
    if (audioPlayerRef.current) {
      try {
        if (typeof audioPlayerRef.current.pause === 'function') {
          audioPlayerRef.current.pause();
        }
        if (typeof audioPlayerRef.current.remove === 'function') {
          audioPlayerRef.current.remove();
        }
      } catch (error) {
        console.log('⚠️ [MANUAL PLAYER] Error cleaning up old player:', error);
      }
    }

    // Create new player
    try {
      const newPlayer = createAudioPlayer(audioSource);
      audioPlayerRef.current = newPlayer;
      currentSourceRef.current = newSource;
      return newPlayer;
    } catch (error) {
      console.log('❌ [MANUAL PLAYER] Error creating player:', error);
      audioPlayerRef.current = null;
      currentSourceRef.current = null;
      return null;
    }
  }, [currentTrack?.audioUrl]);

  // Clean up players on unmount
  useEffect(() => {
    return () => {
      // Clean up main player
      if (audioPlayerRef.current) {
        try {
          if (typeof audioPlayerRef.current.pause === 'function') {
            audioPlayerRef.current.pause();
          }
          if (typeof audioPlayerRef.current.remove === 'function') {
            audioPlayerRef.current.remove();
          }
        } catch (error) {
          console.log('⚠️ [MANUAL PLAYER] Error cleaning up main player:', error);
        }
        audioPlayerRef.current = null;
        currentSourceRef.current = null;
      }

      // Clean up dummy player
      if (dummyPlayerRef.current && dummyPlayerRef.current.id !== 'fallback-dummy') {
        try {
          if (typeof dummyPlayerRef.current.remove === 'function') {
            dummyPlayerRef.current.remove();
          }
        } catch (error) {
          console.log('⚠️ [DUMMY PLAYER] Error cleaning up dummy player:', error);
        }
        dummyPlayerRef.current = null;
      }
    };
  }, []);

  // FIXED: Create a persistent dummy player that has proper event emitter structure
  const dummyPlayerRef = useRef<any>(null);

  // Create dummy player once and reuse it for the entire component lifecycle
  if (!dummyPlayerRef.current) {
    try {
      // Create a minimal working player with proper event emitter
      dummyPlayerRef.current = {
        id: 'dummy-player-' + Date.now(),
        currentTime: 0,
        duration: 0,
        isLoaded: false,
        playing: false,
        playbackState: 'unknown',
        isBuffering: false,
        muted: false,
        volume: 1,
        playbackRate: 1,
        // Event emitter methods that useAudioPlayerStatus needs
        addListener: () => ({ remove: () => {} }),
        removeListener: () => {},
        removeAllListeners: () => {},
        emit: () => {},
        // Required player methods
        play: () => Promise.resolve(),
        pause: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        seekTo: () => Promise.resolve(),
      };
    } catch (error) {
      console.log('❌ [DUMMY PLAYER] Failed to create dummy player:', error);
      // Minimal fallback that might work
      dummyPlayerRef.current = {
        id: 'fallback-dummy',
        addListener: () => ({ remove: () => {} }),
      };
    }
  }

  // Always provide a non-null player to the status hook
  const playerForStatusHook = audioPlayer || dummyPlayerRef.current;
  const rawStatus = useAudioPlayerStatus(playerForStatusHook);

  // Create fallback status for when we don't have a real player
  const fallbackStatus = useMemo(
    () => ({
      playing: false,
      isLoaded: false,
      currentTime: 0,
      duration: 0,
      playbackState: 'unknown' as const,
    }),
    []
  );

  // Use actual status only when we have a real player, otherwise use fallback
  const status = audioPlayer ? rawStatus : fallbackStatus;

  // Get position and duration from status with NaN safety
  const position = useMemo(() => {
    const rawPosition = status?.currentTime ?? 0;
    return isNaN(rawPosition) || !isFinite(rawPosition) ? 0 : Math.max(0, rawPosition);
  }, [status?.currentTime]);

  const duration = useMemo(() => {
    const rawDuration = status?.duration ?? 0;
    return isNaN(rawDuration) || !isFinite(rawDuration) ? 0 : Math.max(0, rawDuration);
  }, [status?.duration]);

  // Player state derived from expo-audio status
  const isPlaying = useMemo(() => {
    return status?.playing || false;
  }, [status?.playing]);

  const isPlayerLoaded = useMemo(() => {
    return status?.isLoaded || false;
  }, [status?.isLoaded]);

  // Derived state for compatibility with robust progress calculation
  const progress = useMemo(() => {
    // Ensure we always return a valid number between 0 and 1
    if (!duration || duration <= 0 || !isFinite(duration)) {
      return 0;
    }

    if (!isFinite(position) || position < 0) {
      return 0;
    }

    const calculatedProgress = position / duration;

    // Clamp progress between 0 and 1, handling edge cases
    if (!isFinite(calculatedProgress) || calculatedProgress < 0) {
      return 0;
    }

    return Math.min(calculatedProgress, 1); // Cap at 100%
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

  // SIMPLIFIED: Audio session without background play to prevent native player issues
  const initAudioSession = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false, // DISABLED: Prevents native player lifecycle issues
        shouldRouteThroughEarpiece: false,
      });
    } catch (error) {
      console.log('❌ [AUDIO SESSION] Error initializing:', error);
      handleError(error as Error, { toastMessage: STRINGS.FAILED_TO_INITIALIZE_AUDIO_SESSION });
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

  // SIMPLIFIED: Auto-play logic with immediate execution
  useEffect(() => {
    if (shouldAutoPlay && audioPlayer && currentTrack && isPlayerLoaded) {
      // Clear the flag immediately to prevent multiple calls
      dispatch({ type: 'SET_AUTOPLAY', value: false });

      // Immediate play without setTimeout to reduce timing complexity
      const playAudio = async () => {
        try {
          if (typeof audioPlayer.play === 'function') {
            await audioPlayer.play();
            dispatch({ type: 'SET_LOADING', isLoading: false });
          }
        } catch (error) {
          console.log('❌ [AUTO-PLAY] Error starting playback:', error);
          dispatch({ type: 'SET_LOADING', isLoading: false });
          handleError(error as Error, {
            toastMessage: STRINGS.FAILED_TO_START_PLAYBACK,
            showToast: true,
          });
        }
      };

      playAudio();
    }
  }, [shouldAutoPlay, audioPlayer, currentTrack, isPlayerLoaded]);

  const stop = useCallback(async () => {
    try {
      // Get all potential players - current and any previously active ones
      const playersToStop = [audioPlayer, audioPlayerRef.current].filter(
        (player, index, array) => player && array.indexOf(player) === index // Remove duplicates
      );

      // Stop ALL players to handle orphaned ones
      for (let i = 0; i < playersToStop.length; i++) {
        const player = playersToStop[i];
        if (!player) continue;

        try {
          // Method 1: Pause immediately
          if (typeof player.pause === 'function') {
            player.pause();
          }
        } catch (error) {
          console.log(`❌ [AUDIO STOP] Player ${i + 1} pause error:`, error);
        }

        try {
          // Method 2: Seek to beginning
          if (typeof player.seekTo === 'function') {
            await player.seekTo(0);
          }
        } catch (error) {
          console.log(`❌ [AUDIO STOP] Player ${i + 1} seekTo error:`, error);
        }

        try {
          // Method 3: Remove to clean up (do this last)
          if (typeof player.remove === 'function') {
            player.remove();
          }
        } catch (error) {
          console.log(`❌ [AUDIO STOP] Player ${i + 1} remove error:`, error);
        }
      }

      // Wait for all native operations to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Clear all player references
      audioPlayerRef.current = null;
      currentSourceRef.current = null;

      // Only AFTER stopping all players, reset React state
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_AUTOPLAY', value: false });
    } catch (error) {
      // Always ensure state is reset even if operations fail
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_AUTOPLAY', value: false });

      // Only show toast for unexpected errors, not native object disposal errors
      if (
        error instanceof Error &&
        !error.message.includes('NativeSharedObjectNotFoundException')
      ) {
        handleError(error, { toastMessage: STRINGS.FAILED_TO_STOP_AUDIO });
      }
    }
  }, [audioPlayer, isPlayerReady, audioState, status]);

  const prefetchTracks = useCallback(
    async (tracks: EnhancedAudioTrack[]): Promise<EnhancedAudioTrack[]> => {
      return Promise.all(
        tracks.map(async track => {
          try {
            const cachedAudioUrl = await audioCache.getAudio(track.audioUrl);
            return { ...track, audioUrl: cachedAudioUrl };
          } catch {
            return track;
          }
        })
      );
    },
    []
  );

  // Queue loading - following expo-audio docs pattern exactly
  const loadQueue = useCallback(
    async (
      tracksInput: EnhancedAudioTrack | EnhancedAudioTrack[],
      startIndex = 0
    ): Promise<EnhancedAudioTrack[]> => {
      try {
        const tracks = Array.isArray(tracksInput) ? tracksInput : [tracksInput];

        if (tracks.length === 0) {
          console.log('🚨 [LOAD QUEUE] RESET triggered - received empty tracks array!');
          console.log('🚨 [LOAD QUEUE] Call stack:', new Error().stack);
          dispatch({ type: 'RESET' });
          dispatch({ type: 'SET_LOADING', isLoading: false });
          return [];
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
          throw new Error(STRINGS.ERROR_SELECTED_TRACK_NO_URL);
        }

        dispatch({
          type: 'SET_QUEUE',
          queue: processedTracks,
          index: validStartIndex,
        });

        // The useAudioPlayer hook will automatically recreate the player with the new source
        return processedTracks;
      } catch (error) {
        handleError(error as Error, {
          toastMessage: STRINGS.FAILED_TO_LOAD_AUDIO,
          showToast: true,
        });
        dispatch({ type: 'SET_LOADING', isLoading: false });
        return [];
      }
    },
    []
  );

  // Enhanced playback that loads and immediately plays (user-initiated)
  const startEnhancedPlayback = useCallback(
    async (tracks: EnhancedAudioTrack[], startIndex = 0): Promise<boolean> => {
      try {
        if (tracks.length === 0) {
          return false;
        }

        // Immediate feedback - set loading state before any async work
        dispatch({ type: 'SET_LOADING', isLoading: true });

        // Set auto-play flag to maintain user interaction context
        dispatch({ type: 'SET_AUTOPLAY', value: true });

        const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
        const trackToPlay = tracks[validStartIndex];
        if (!trackToPlay) {
          throw new Error(STRINGS.ERROR_SELECTED_TRACK_NOT_FOUND);
        }

        // Load only the first track to start playback quickly
        const [firstProcessed] = await loadQueue(trackToPlay, 0);
        if (!firstProcessed) {
          throw new Error(STRINGS.ERROR_FAILED_PROCESS_FIRST_TRACK);
        }

        // Prefetch remaining tracks after playback starts
        const remaining = tracks.filter((_, i) => i !== validStartIndex);
        prefetchTracks(remaining)
          .then(prefetched => {
            dispatch({
              type: 'SET_QUEUE',
              queue: [firstProcessed, ...prefetched],
              index: 0,
            });
          })
          .catch(() => {});

        return true; // Success
      } catch (error) {
        dispatch({ type: 'SET_AUTOPLAY', value: false });
        dispatch({ type: 'SET_LOADING', isLoading: false });
        handleError(error as Error, {
          toastMessage: STRINGS.FAILED_TO_START_PLAYBACK,
          showToast: true,
        });
        return false;
      }
    },
    [loadQueue, prefetchTracks]
  );

  // Legacy actions for compatibility
  const actions = useMemo(
    () => ({
      stopPlayback: stop,
      startEnhancedPlayback: startEnhancedPlayback,
      prefetchTracks,
    }),
    [stop, startEnhancedPlayback, prefetchTracks]
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
