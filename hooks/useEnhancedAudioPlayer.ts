// Import correctly from expo-av using default import syntax
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
// Import correctly from expo-av using default import syntax

// Import EnhancedAudioTrack from its central definition
import { handleError } from '@/utils/errorHandling';

import type { EnhancedAudioTrack } from '../types/audio.types';

import { AUDIO_STATES, useAudioPlayer } from './useAudioPlayer';

/**
 * Type for metadata about the current playback session
 */
interface PlaybackMetadata {
  articleId: number;
  articleTitle: string;
  currentTrackType: 'study_word_english' | 'study_word_arabic' | 'sentence' | null;
  currentWordId: number | null;
  currentSentenceId: number | null;
  currentSentencePosition: number | null;
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
  currentTrackType: null,
  currentWordId: null,
  currentSentenceId: null,
  currentSentencePosition: null,
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
  getStudyWordsCount: (articleId: number) => number;
  isStudyWordTrack: () => boolean;
  isSentenceTrack: () => boolean;
  isActiveArticle: (articleId: number) => boolean;
  initializeQueue: (tracks: EnhancedAudioTrack[], startIndex?: number) => boolean;
  preloadTracks: () => Promise<void>;
  playQueuedTrack: (index: number) => Promise<boolean>;
}

export type EnhancedPlayerAPI = EnhancedPlayerState & { actions: EnhancedPlayerActions };

/**
 * Hook for enhanced audio player that handles study words and sentence-level audio
 * using a queue-based system with preloading
 */
export function useEnhancedAudioPlayer(): EnhancedPlayerAPI {
  // Base audio player
  const audioPlayer = useAudioPlayer();

  // --- State ---
  const [metadata, setMetadata] = useState<PlaybackMetadata>(initialMetadata);
  const [isTrackEnded, setIsTrackEnded] = useState(false);
  const [audioState, setAudioState] = useState(AUDIO_STATES.IDLE);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [playlistModeActive, setPlaylistModeActive] = useState(false);
  // --- End State ---

  // --- Refs for stability and internal tracking ---
  const audioQueueRef = useRef<QueuedAudioItem[]>([]);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const preloadInProgressRef = useRef(false);
  const preloadBatchSizeRef = useRef(3);
  const currentPlaylistRef = useRef<EnhancedAudioTrack[]>([]);
  const lastStateUpdateRef = useRef(Date.now());
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const trackEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to hold stable callbacks implementing the Actions interface
  const actionsRef = useRef<EnhancedPlayerActions>({
    resetTrackEndedFlag: () => {},
    startEnhancedPlayback: async () => false,
    startEnhancedShufflePlayback: async () => false,
    stopPlayback: async () => false,
    playNextTrack: async () => false,
    getStudyWordsCount: () => 0,
    isStudyWordTrack: () => false,
    isSentenceTrack: () => false,
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
    setAudioState(prev => (prev === newAudioState ? prev : newAudioState));
    setPlaylistModeActive(prev => {
      const next = audioQueueRef.current.length > 1;
      return prev === next ? prev : next;
    });
  }, []);

  const updateMetadata = useCallback((track: EnhancedAudioTrack | null) => {
    if (!track) {
      setMetadata(initialMetadata);
      return;
    }
    const titleParts = track?.title?.split(' (') || [];
    const baseTitle = titleParts[0] || '';
    setMetadata(prev => {
      const next = {
        articleId: track.articleId,
        articleTitle: baseTitle,
        currentTrackType: track.type,
        currentWordId: track.wordId || null,
        currentSentenceId: track.sentenceId || null,
        currentSentencePosition: track.sentencePosition || null,
      };
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      return next;
    });
  }, []);

  const convertToBaseTracks = useCallback((enhancedTracks: EnhancedAudioTrack[]) => {
    return enhancedTracks.map(track => {
      const idParts = track.id.split('-');
      const numericId = idParts.length > 2 && idParts[2] ? parseInt(idParts[2], 10) : 0;
      return { id: numericId || 0, audioUrl: track.audioUrl, title: track.title };
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
      if (index < 0 || index >= queue.length || !queue[index]) return false;

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
        let durationMillis: number | null = null;

        if (queueItem.isPreloaded && queueItem.sound) {
          soundObject = queueItem.sound;
          currentSoundRef.current = soundObject;
          await soundObject.replayAsync();
          const status = await soundObject.getStatusAsync();
          if (status.isLoaded) {
            durationMillis = status.durationMillis ?? null;
          }
        } else {
          // Load and play on demand
          try {
            const { sound, status } = await Audio.Sound.createAsync(
              { uri: queueItem.track.audioUrl },
              { shouldPlay: true }
            );
            soundObject = sound;
            currentSoundRef.current = sound;
            if (status.isLoaded) {
              durationMillis = status.durationMillis ?? null;
            }
            // Update queue item if it was loaded on demand
            if (queueItem) {
              queueItem.sound = sound;
              queueItem.isPreloaded = true;
            }
          } catch (loadError) {
            setIsTrackEnded(true);
            return false;
          }
        }

        if (soundObject) {
          await soundObject.playAsync();
          isPlayingRef.current = true;
          updateExposedState();
          if (durationMillis && isFinite(durationMillis)) {
            // Clear any existing timeouts
            if (trackEndTimeoutRef.current) {
              clearTimeout(trackEndTimeoutRef.current);
              trackEndTimeoutRef.current = null;
            }
            // Store the timeout ID so we can clear it if needed
            trackEndTimeoutRef.current = setTimeout(() => {
              if (isPlayingRef.current && currentIndexRef.current === index) {
                setIsTrackEnded(true);
              }
            }, durationMillis + 500);
          }
          return true;
        } else {
          const baseTracks = convertToBaseTracks([queueItem.track]);
          if (!audioPlayer || typeof audioPlayer.playTrack !== 'function') {
            setIsTrackEnded(true);
            return false;
          }
          const success = await audioPlayer.playTrack(baseTracks, 0);
          isPlayingRef.current = success;
          updateExposedState();
          if (success) {
            const trackDuration = queueItem.track.duration ?? 3000;
            // Clear any existing timeouts
            if (trackEndTimeoutRef.current) {
              clearTimeout(trackEndTimeoutRef.current);
              trackEndTimeoutRef.current = null;
            }
            // Store the timeout ID so we can clear it if needed
            trackEndTimeoutRef.current = setTimeout(() => {
              if (isPlayingRef.current && currentIndexRef.current === index) {
                setIsTrackEnded(true);
              }
            }, trackDuration + 500);
          }
          return success;
        }
      } catch (error) {
        handleError(error as Error);
        setIsTrackEnded(true);
        isPlayingRef.current = false;
        updateExposedState();
        return false;
      }
    },
    [audioPlayer, updateExposedState, updateMetadata, convertToBaseTracks]
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

    // Stop and unload the current sound if it exists
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch (error) {
        handleError(error as Error, { toastMessage: 'Error unloading current sound during stop' });
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
          handleError(error as Error, {
            toastMessage: `Error unloading preloaded sound for track ${item.index}`,
          });
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
    (tracks: EnhancedAudioTrack[], _startIndex = 0): boolean => {
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
      if (!tracks || tracks.length === 0) return false;
      await actionsRef.current.stopPlayback();
      currentPlaylistRef.current = tracks;
      actionsRef.current.initializeQueue(tracks, startIndex);
      isPlayingRef.current = true;
      updateExposedState();
      actionsRef.current.preloadTracks();
      return await actionsRef.current.playQueuedTrack(startIndex);
    },
    [updateExposedState]
  );

  actionsRef.current.startEnhancedShufflePlayback = useCallback(
    async tracks => {
      if (!tracks || tracks.length === 0) return false;
      await actionsRef.current.stopPlayback();
      const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5);
      currentPlaylistRef.current = shuffledTracks;
      actionsRef.current.initializeQueue(shuffledTracks, 0);
      isPlayingRef.current = true;
      updateExposedState();
      actionsRef.current.preloadTracks();
      return await actionsRef.current.playQueuedTrack(0);
    },
    [updateExposedState]
  );

  actionsRef.current.getStudyWordsCount = useCallback(articleId => {
    return Math.floor(
      (currentPlaylistRef.current || []).filter(
        track =>
          track.articleId === articleId &&
          (track.type === 'study_word_english' || track.type === 'study_word_arabic')
      ).length / 2
    );
  }, []);

  // Assign state-dependent checks (these are called via stable wrappers later)
  actionsRef.current.isStudyWordTrack = () =>
    metadata.currentTrackType === 'study_word_english' ||
    metadata.currentTrackType === 'study_word_arabic';
  actionsRef.current.isSentenceTrack = () => metadata.currentTrackType === 'sentence';
  actionsRef.current.isActiveArticle = articleId =>
    audioState !== AUDIO_STATES.IDLE && metadata.articleId === articleId;

  // --- Effects ---
  // Effect to advance track when one ends
  useEffect(() => {
    if (!isTrackEnded || !isPlayingRef.current) return;

    setIsTrackEnded(false);

    // Call playNextTrack directly without a console.log
    actionsRef.current.playNextTrack().catch(e => handleError(e as Error));
  }, [isTrackEnded]);

  // Effect to trigger preload when index changes
  useEffect(() => {
    if (isPlayingRef.current && !preloadInProgressRef.current) {
      actionsRef.current.preloadTracks();
    }
  }, [audioState]);

  // Add initAudioSession function
  const initAudioSession = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
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
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        initAudioSession();
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background - ensure audio session stays active
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

  return useMemo(
    () => ({
      progress: audioPlayer?.progress ?? 0,
      duration: audioPlayer?.duration ?? 0,
      metadata,
      isTrackEnded,
      audioState,
      currentTrackIndex,
      playlistMode: playlistModeActive,
      // IMPORTANT: Return the stable actions object itself
      actions: stableActions,
    }),
    [
      audioPlayer?.progress,
      audioPlayer?.duration,
      metadata,
      isTrackEnded,
      audioState,
      currentTrackIndex,
      playlistModeActive,
      stableActions, // Add stableActions to satisfy exhaustive-deps
    ]
  );
}
