// Import correctly from expo-av using default import syntax
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
// Import correctly from expo-av using default import syntax

// Import EnhancedAudioTrack from its central definition
import { handleError } from '@/utils/errorHandling';

import type { EnhancedAudioTrack } from '@/types/audio.types';

import { AUDIO_STATES } from './useAudioPlayer';

/**
 * Type for metadata about the current playback session
 */
interface PlaybackMetadata {
  articleId: number;
  articleTitle: string;
}

/**
 * Interface for queued audio item
 */
interface QueuedAudioItem {
  track: EnhancedAudioTrack;
  index: number;
  sound?: Audio.Sound | null;
  isPreloaded: boolean;
}

// Default initial metadata state
const initialMetadata: PlaybackMetadata = {
  articleId: 0,
  articleTitle: '',
};

// Define the return type for clarity and stability
export interface EnhancedPlayerState {
  progress: number;
  duration: number;
  metadata: PlaybackMetadata;
  isTrackEnded: boolean;
  audioState: (typeof AUDIO_STATES)[keyof typeof AUDIO_STATES];
  currentTrackIndex: number;
  playlistMode: boolean;
}

export interface EnhancedPlayerActions {
  resetTrackEndedFlag: () => void;
  startEnhancedPlayback: (tracks: EnhancedAudioTrack[], startIndex?: number) => Promise<boolean>;
  startEnhancedShufflePlayback: (tracks: EnhancedAudioTrack[]) => Promise<boolean>;
  stopPlayback: () => Promise<boolean>;
  playNextTrack: () => Promise<boolean>;
  isActiveArticle: (articleId: number) => boolean;
  initializeQueue: (tracks: EnhancedAudioTrack[]) => boolean;
  preloadTracks: () => Promise<void>;
  playQueuedTrack: (index: number) => Promise<boolean>;
}

export type EnhancedPlayerAPI = EnhancedPlayerState & { actions: EnhancedPlayerActions };

/**
 * Hook for enhanced audio player that handles article-level audio
 * using a queue-based system with preloading
 */
export function useEnhancedAudioPlayer(): EnhancedPlayerAPI {
  // Base audio player
  const [localDuration, setLocalDuration] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);

  // --- State ---
  const [metadata, setMetadata] = useState<PlaybackMetadata>(initialMetadata);
  const [isTrackEnded, setIsTrackEnded] = useState(false);
  const [audioState, setAudioState] = useState<(typeof AUDIO_STATES)[keyof typeof AUDIO_STATES]>(
    AUDIO_STATES.IDLE
  );
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [playlistModeActive, setPlaylistModeActive] = useState(false);
  // --- End State ---

  // --- Refs for stability and internal tracking ---
  const audioQueueRef = useRef<QueuedAudioItem[]>([]);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const preloadInProgressRef = useRef(false);
  const preloadBatchSizeRef = useRef(2);
  const currentPlaylistRef = useRef<EnhancedAudioTrack[]>([]);
  const lastStateUpdateRef = useRef(Date.now());
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const trackEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to hold stable callbacks implementing the Actions interface
  const actionsRef = useRef<EnhancedPlayerActions>({
    resetTrackEndedFlag: () => {},
    startEnhancedPlayback: async () => false,
    startEnhancedShufflePlayback: async () => false,
    stopPlayback: async () => false,
    playNextTrack: async () => false,
    isActiveArticle: () => false,
    initializeQueue: () => false,
    preloadTracks: async () => {},
    playQueuedTrack: async () => false,
  });
  // --- End Refs ---

  // --- Internal Logic Callbacks (used to define actions) ---
  const updateExposedState = useCallback(() => {
    const now = Date.now();
    if (now - lastStateUpdateRef.current < 50) return;
    lastStateUpdateRef.current = now;
    setCurrentTrackIndex(currentIndexRef.current);
    const newAudioState = isPlayingRef.current
      ? AUDIO_STATES.PLAYING
      : audioQueueRef.current.length > 0
        ? AUDIO_STATES.PAUSED
        : AUDIO_STATES.IDLE;
    setAudioState(newAudioState);
    setPlaylistModeActive(audioQueueRef.current.length > 1);
  }, []);

  const updateMetadata = useCallback((track: EnhancedAudioTrack | null) => {
    if (!track) {
      setMetadata(initialMetadata);
      return;
    }
    setMetadata({
      articleId: track.articleId ?? track.rootId ?? 0,
      articleTitle: track.title,
    });
  }, []);

  const preloadTracksLogic = useCallback(async () => {
    if (preloadInProgressRef.current || !isPlayingRef.current) return;
    preloadInProgressRef.current = true;
    try {
      const currentIndex = currentIndexRef.current;
      const queue = audioQueueRef.current;
      const startIndex = currentIndex + 1;
      const endIndex = Math.min(startIndex + preloadBatchSizeRef.current, queue.length);
      if (startIndex >= queue.length) {
        preloadInProgressRef.current = false;
        return;
      }
      for (let i = startIndex; i < endIndex; i++) {
        const queueItem = queue[i];
        if (!queueItem || queueItem.isPreloaded || !queueItem.track.audioUrl) continue;

        // Use expo-av for preloading
        try {
          // Only prepare, don't play yet
          const { sound } = await Audio.Sound.createAsync(
            { uri: queueItem.track.audioUrl },
            { shouldPlay: false }
          );
          if (queueItem) {
            queueItem.sound = sound;
            queueItem.isPreloaded = true;
          } else {
            // If queueItem became null somehow, unload immediately
            await sound.unloadAsync();
          }
        } catch (preloadError) {
          handleError(preloadError as Error, { toastMessage: `Preloading track ${i} failed` });
          if (queueItem) {
            queueItem.isPreloaded = true;
          }
        }
      }
    } catch (error) {
      handleError(error as Error);
    } finally {
      preloadInProgressRef.current = false;
    }
  }, []);

  const playQueuedTrackLogic = useCallback(
    async (index: number): Promise<boolean> => {
      const queue = audioQueueRef.current;
      if (index < 0 || index >= queue.length || !queue[index]) {
        return false;
      }

      if (currentSoundRef.current) {
        try {
          await currentSoundRef.current.stopAsync();
          await currentSoundRef.current.unloadAsync();
        } catch (e) {
          handleError(e as Error, { toastMessage: 'Error stopping/unloading previous sound' });
        } finally {
          currentSoundRef.current = null;
        }
      }

      const queueItem = queue[index];
      if (!queueItem || !queueItem.track.audioUrl) {
        setIsTrackEnded(true);
        updateExposedState();
        return false;
      }

      currentIndexRef.current = index;
      updateExposedState();
      updateMetadata(queueItem.track);
      try {
        let soundObject: Audio.Sound | null = null;

        // Helper function to update playback state from status
        const updatePlaybackState = (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            const duration = status.durationMillis ?? queueItem.track.duration ?? 0;
            const progress = status.positionMillis || 0;
            setLocalDuration(duration);
            setLocalProgress(progress);
            return duration;
          }
          return 0;
        };

        // Set up status update callback
        const onStatusUpdate = (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            updatePlaybackState(status);
          }
        };

        if (queueItem.isPreloaded && queueItem.sound) {
          soundObject = queueItem.sound;
          currentSoundRef.current = soundObject;
          soundObject.setOnPlaybackStatusUpdate(onStatusUpdate);
          await soundObject.replayAsync();
          const status = await soundObject.getStatusAsync();
          const duration = updatePlaybackState(status);

          if (duration && isFinite(duration)) {
            if (trackEndTimeoutRef.current) {
              clearTimeout(trackEndTimeoutRef.current);
            }
            trackEndTimeoutRef.current = setTimeout(() => {
              if (isPlayingRef.current && currentIndexRef.current === index) {
                setIsTrackEnded(true);
              }
            }, duration + 100);
          }
        } else {
          // Load and play on demand
          try {
            const { sound, status } = await Audio.Sound.createAsync(
              { uri: queueItem.track.audioUrl },
              { shouldPlay: true },
              onStatusUpdate
            );
            soundObject = sound;
            currentSoundRef.current = sound;
            const duration = updatePlaybackState(status);

            // Update queue item if it was loaded on demand
            if (queueItem) {
              queueItem.sound = sound;
              queueItem.isPreloaded = true;
            }

            if (duration && isFinite(duration)) {
              if (trackEndTimeoutRef.current) {
                clearTimeout(trackEndTimeoutRef.current);
              }
              trackEndTimeoutRef.current = setTimeout(() => {
                if (isPlayingRef.current && currentIndexRef.current === index) {
                  setIsTrackEnded(true);
                }
              }, duration + 100);
            }
          } catch (loadError) {
            handleError(loadError as Error);
            setIsTrackEnded(true);
            return false;
          }
        }

        if (soundObject) {
          await soundObject.playAsync();
          isPlayingRef.current = true;
          updateExposedState();
          return true;
        } else {
          setIsTrackEnded(true);
          return false;
        }
      } catch (error) {
        handleError(error as Error);
        setIsTrackEnded(true);
        isPlayingRef.current = false;
        updateExposedState();
        return false;
      }
    },
    [updateExposedState, updateMetadata]
  );

  const stopPlaybackLogic = useCallback(async (): Promise<boolean> => {
    // First, clear any pending timeout that might trigger track ended
    if (trackEndTimeoutRef.current) {
      clearTimeout(trackEndTimeoutRef.current);
      trackEndTimeoutRef.current = null;
    }

    // Reset all state immediately to prevent any pending updates
    isPlayingRef.current = false;
    setIsTrackEnded(false);
    currentIndexRef.current = -1;
    setLocalProgress(0);
    setLocalDuration(0);

    // Stop and unload the current sound if it exists
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch (error) {
        // Silently handle cleanup errors - these are expected during normal operation
        handleError(error as Error, { showToast: false, sentrySeverity: 'info' });
      } finally {
        currentSoundRef.current = null;
      }
    }

    // Let base audio player handle its own cleanup as needed
    // The base player should respond to the state changes we've made

    // Unload any preloaded sounds in the queue properly
    const unloadPromises = audioQueueRef.current
      .filter(item => item.sound)
      .map(async item => {
        try {
          if (item.sound) {
            await item.sound.stopAsync(); // Stop first
            await item.sound.unloadAsync(); // Then unload
            item.sound = null;
          }
          item.isPreloaded = false;
        } catch (error) {
          // Silently handle cleanup errors - these are expected during normal operation
          handleError(error as Error, { showToast: false, sentrySeverity: 'info' });
        }
      });

    await Promise.allSettled(unloadPromises);

    // Clear the queue and reset all state variables
    audioQueueRef.current = [];
    currentPlaylistRef.current = [];
    preloadInProgressRef.current = false;

    // Reset metadata
    updateMetadata(null);
    updateExposedState();

    return true;
  }, [updateExposedState, updateMetadata]);

  const initializeQueueLogic = useCallback(
    (tracks: EnhancedAudioTrack[]): boolean => {
      isPlayingRef.current = false;
      currentIndexRef.current = -1;
      audioQueueRef.current = tracks.map((track, index) => ({ track, index, isPreloaded: false }));
      updateExposedState();
      return audioQueueRef.current.length > 0;
    },
    [updateExposedState]
  );

  // --- Assign to actionsRef ---
  actionsRef.current.resetTrackEndedFlag = useCallback(() => {
    setIsTrackEnded(prev => (prev ? false : prev));
  }, []);

  actionsRef.current.initializeQueue = initializeQueueLogic;
  actionsRef.current.preloadTracks = preloadTracksLogic;
  actionsRef.current.playQueuedTrack = playQueuedTrackLogic;
  actionsRef.current.stopPlayback = stopPlaybackLogic;

  actionsRef.current.playNextTrack = useCallback(async () => {
    const currentIndex = currentIndexRef.current;
    const nextIndex = currentIndex + 1;

    try {
      if (!isPlayingRef.current) {
        return false;
      }

      if (nextIndex >= audioQueueRef.current.length) {
        await actionsRef.current.stopPlayback();
        return false;
      }

      return await playQueuedTrackLogic(nextIndex);
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Error advancing to next track' });
      if (nextIndex + 1 < audioQueueRef.current.length) {
        return playQueuedTrackLogic(nextIndex + 1);
      }
      return false;
    }
  }, []);

  actionsRef.current.startEnhancedPlayback = useCallback(
    async (tracks, startIndex = 0) => {
      if (!tracks || tracks.length === 0) {
        return false;
      }
      await actionsRef.current.stopPlayback();
      currentPlaylistRef.current = tracks;
      actionsRef.current.initializeQueue(tracks);
      isPlayingRef.current = true;
      updateExposedState();
      actionsRef.current.preloadTracks();
      return await actionsRef.current.playQueuedTrack(startIndex);
    },
    [updateExposedState]
  );

  actionsRef.current.startEnhancedShufflePlayback = useCallback(
    async tracks => {
      if (!tracks || tracks.length === 0) {
        return false;
      }
      await actionsRef.current.stopPlayback();
      const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5);
      currentPlaylistRef.current = shuffledTracks;
      actionsRef.current.initializeQueue(shuffledTracks);
      isPlayingRef.current = true;
      updateExposedState();
      actionsRef.current.preloadTracks();
      return await actionsRef.current.playQueuedTrack(0);
    },
    [updateExposedState]
  );

  // Assign state-dependent checks (these are called via stable wrappers later)
  actionsRef.current.isActiveArticle = articleId =>
    audioState !== AUDIO_STATES.IDLE && metadata.articleId === articleId;

  // --- Effects ---
  // Effect to advance track when one ends
  useEffect(() => {
    if (!isTrackEnded || !isPlayingRef.current) return;

    setIsTrackEnded(false);

    actionsRef.current.playNextTrack().catch(e => handleError(e as Error));
  }, [isTrackEnded]);

  // Reference for tracking preload state
  const isPreloadingRef = useRef(false);

  // Effect to trigger preload when index changes - changed dependency from audioState to currentTrackIndex
  useEffect(() => {
    if (isPlayingRef.current && !preloadInProgressRef.current && !isPreloadingRef.current) {
      isPreloadingRef.current = true;
      actionsRef.current.preloadTracks().finally(() => {
        isPreloadingRef.current = false;
      });
    }
  }, [currentTrackIndex]);

  // Add initAudioSession function
  const initAudioSession = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Failed to initialize audio session' });
    }
  }, []);

  // Add AppState effect
  useEffect(() => {
    // Initialize audio session on mount
    initAudioSession();

    const subscription = AppState.addEventListener('change', nextAppState => {
      // Maintain audio session regardless of app state
      // This allows continuous audio playback in background
      if (
        (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') ||
        (appStateRef.current === 'active' && nextAppState.match(/inactive|background/))
      ) {
        initAudioSession();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [initAudioSession]);
  // --- End Effects ---

  // --- Final Memoized Return Value ---
  const stableActions = actionsRef.current; // Actions ref current value IS stable between renders

  return useMemo(() => {
    return {
      progress: localProgress,
      duration: localDuration,
      metadata,
      isTrackEnded,
      audioState,
      currentTrackIndex,
      playlistMode: playlistModeActive,
      actions: stableActions,
    };
  }, [
    localProgress,
    localDuration,
    metadata,
    isTrackEnded,
    audioState,
    currentTrackIndex,
    playlistModeActive,
    stableActions,
  ]);
}
