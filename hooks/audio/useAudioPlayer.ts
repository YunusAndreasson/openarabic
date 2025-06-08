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
  console.log('🎵 useAudioPlayer: Creating audio player with source:', audioSource);
  const audioPlayer = useExpoAudioPlayer(audioSource);

  // Use the proper expo-audio status hook
  const status = useAudioPlayerStatus(audioPlayer);
  console.log('🎵 useAudioPlayer: Player status:', status);

  // Check for player errors
  useEffect(() => {
    if (currentTrack && !status?.isLoaded && status?.playbackState === 'unknown') {
      console.warn('🟡 useAudioPlayer: Player struggling to load track:', currentTrack.audioUrl);
    }
  }, [status, currentTrack]);

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
    const newState =
      isLoading || (currentTrack && !isPlayerLoaded)
        ? AUDIO_STATES.LOADING
        : isPlaying
          ? AUDIO_STATES.PLAYING
          : isPaused
            ? AUDIO_STATES.PAUSED
            : currentTrack
              ? AUDIO_STATES.STOPPED
              : AUDIO_STATES.IDLE;

    console.log(
      '🎵 useAudioPlayer: Audio state calculated:',
      newState,
      '- isLoading:',
      isLoading,
      'currentTrack:',
      !!currentTrack,
      'isPlayerLoaded:',
      isPlayerLoaded,
      'isPlaying:',
      isPlaying
    );
    return newState;
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
    console.log(
      '🎵 useAudioPlayer: Auto-play effect - shouldAutoPlay:',
      shouldAutoPlay,
      'audioPlayer:',
      !!audioPlayer,
      'currentTrack:',
      !!currentTrack,
      'isPlayerLoaded:',
      isPlayerLoaded
    );
    if (shouldAutoPlay && audioPlayer && currentTrack && isPlayerLoaded) {
      console.log('🎵 useAudioPlayer: Auto-play triggered for track:', currentTrack.title);
      // Clear the flag immediately to prevent multiple calls
      setShouldAutoPlay(false);

      // Use immediate execution in microtask to avoid setTimeout race conditions
      Promise.resolve().then(() => {
        try {
          // Defensive call to play()
          if (typeof audioPlayer.play === 'function') {
            console.log('🎵 useAudioPlayer: Calling audioPlayer.play()');
            audioPlayer.play();
          }
        } catch (error) {
          console.error('🚨 useAudioPlayer: Auto-play failed:', error);
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
      console.log('🚨 useAudioPlayer: stop() called - clearing current track');
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
      console.log(
        '🎵 useAudioPlayer: loadQueue called with',
        tracks.length,
        'tracks, startIndex:',
        startIndex
      );
      setIsLoading(true);

      if (tracks.length === 0) {
        setQueue([]);
        setCurrentIndex(-1);
        setCurrentTrack(null);
        return;
      }

      const validStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const initialTrack = tracks[validStartIndex];

      console.log('🎵 useAudioPlayer: Setting initial track:', initialTrack?.title);

      setQueue(tracks);
      setCurrentIndex(validStartIndex);
      setCurrentTrack(initialTrack || null);

      // The useAudioPlayer hook will automatically recreate the player with the new source
    } catch (error) {
      console.error('🚨 useAudioPlayer: loadQueue failed:', error);
      handleError(error as Error, { toastMessage: 'Failed to load queue' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced playback that loads and immediately plays (user-initiated)
  const startEnhancedPlayback = useCallback(
    async (tracks: EnhancedAudioTrack[], startIndex = 0): Promise<boolean> => {
      try {
        console.log(
          '🎵 useAudioPlayer: startEnhancedPlayback called with',
          tracks.length,
          'tracks'
        );
        // Set auto-play flag to maintain user interaction context
        setShouldAutoPlay(true);

        // Load the queue - the auto-play effect will handle playback when ready
        await loadQueue(tracks, startIndex);

        return true; // Success
      } catch (error) {
        console.error('🚨 useAudioPlayer: startEnhancedPlayback failed:', error);
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
        console.log('🎵 useAudioPlayer: Moving to next track:', nextTrack.title);
        setCurrentIndex(nextIndex);
        setCurrentTrack(nextTrack);
        setShouldAutoPlay(true); // Ensure next track auto-plays

        // The useAudioPlayer hook will automatically recreate the player with the new source
      }
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Failed to skip to next track' });
    } finally {
      setIsLoading(false);
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
        console.log('🎵 useAudioPlayer: Track finished too quickly, ignoring');
        return;
      }

      console.log('🎵 useAudioPlayer: Track genuinely finished, advancing to next track');
      console.log(
        '🎵 useAudioPlayer: Track details - duration:',
        duration,
        'currentTime:',
        currentTime
      );

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
          console.log(
            '🎵 useAudioPlayer: Advancing from track',
            currentIndex,
            'to',
            currentIndex + 1
          );
          next();
        } else {
          console.log('🎵 useAudioPlayer: Reached end of queue, no more tracks');
          // Clear current track to signal completion
          setCurrentTrack(null);
          setCurrentIndex(-1);
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
          console.log('🎵 useAudioPlayer: Tracking start time for track', currentIndex);
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
