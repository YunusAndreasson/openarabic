import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

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
  sound?: HTMLAudioElement;
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
    // ... (Full preload logic using refs as before)
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
        if (!queueItem || queueItem.isPreloaded) continue;
        const sound = new Audio(queueItem.track.audioUrl);
        await new Promise<void>(resolve => {
          sound.oncanplaythrough = () => {
            if (queueItem) {
              queueItem.sound = sound;
              queueItem.isPreloaded = true;
            }
            resolve();
          };
          sound.onerror = () => {
            if (queueItem) queueItem.isPreloaded = true;
            resolve();
          };
          sound.load();
          setTimeout(() => {
            if (queueItem && !queueItem.isPreloaded) {
              queueItem.isPreloaded = true;
              resolve();
            }
          }, 3000);
        });
      }
    } catch (error) {
      handleError(error as Error);
    } finally {
      preloadInProgressRef.current = false;
    }
  }, []);

  const playQueuedTrackLogic = useCallback(
    async (index: number): Promise<boolean> => {
      // ... (Full playQueuedTrack logic using refs, updateExposedState, updateMetadata)
      const queue = audioQueueRef.current;
      if (index < 0 || index >= queue.length || !queue[index]) return false;
      const queueItem = queue[index];
      currentIndexRef.current = index;
      updateExposedState();
      updateMetadata(queueItem.track);
      try {
        if (queueItem.isPreloaded && queueItem.sound) {
          const sound = queueItem.sound;
          sound.currentTime = 0;
          await sound.play();
          isPlayingRef.current = true;
          updateExposedState();
          await new Promise<void>(resolve => {
            const durationMs =
              sound.duration && isFinite(sound.duration) ? sound.duration * 1000 : 3000;
            let ended = false;
            const onEnd = () => {
              if (!ended) {
                ended = true;
                setIsTrackEnded(true);
                resolve();
              }
            };
            sound.onended = onEnd;
            sound.onerror = onEnd;
            setTimeout(onEnd, durationMs + 500);
          });
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
            setTimeout(() => {
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
    // ... (Full stopPlayback logic using refs, updateExposedState, updateMetadata)
    isPlayingRef.current = false;
    setIsTrackEnded(false);
    if (audioPlayer && typeof audioPlayer.stopPlayback === 'function') {
      await audioPlayer.stopPlayback();
    }
    audioQueueRef.current.forEach(item => {
      item.sound?.pause();
      if (item.sound) item.sound.src = '';
    });
    audioQueueRef.current = [];
    currentIndexRef.current = -1;
    updateMetadata(null);
    updateExposedState();
    return true;
  }, [audioPlayer, updateExposedState, updateMetadata]);

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
    if (!isPlayingRef.current) return false;
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= audioQueueRef.current.length) {
      await actionsRef.current.stopPlayback();
      return false;
    }
    return await actionsRef.current.playQueuedTrack(nextIndex);
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
    return (
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
    const timer = setTimeout(() => {
      actionsRef.current.playNextTrack().catch(handleError);
    }, 100);
    return () => clearTimeout(timer);
  }, [isTrackEnded]);

  // Effect to trigger preload when index changes
  useEffect(() => {
    if (isPlayingRef.current && !preloadInProgressRef.current) {
      actionsRef.current.preloadTracks();
    }
  }, [audioState]);
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
