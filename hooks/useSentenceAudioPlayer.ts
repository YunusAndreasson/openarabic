import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { setCurrentWord, setPlayingState, setCurrentSentence } from '../store/audioSlice';
import type { RootState } from '../store/store';
import { handleError } from '../utils/errorHandling';

// Define types
export type WordTiming = {
  wordId: number;
  startTime: number; // Always in milliseconds
  endTime: number; // Always in milliseconds
  position: number; // Add position field
  // Add a unique key for each word occurrence
  uniqueKey?: string;
};

export type SentenceAudio = {
  sentenceId: number;
  audioUrl: string;
  wordTimings: WordTiming[];
};

type TrackWordTimingFunction = () => () => void;

// Helper function to normalize timing values to milliseconds
const normalizeTimingToMs = (time: string | number): number => {
  if (typeof time === 'string') {
    // Convert string seconds to milliseconds
    return Math.round(parseFloat(time) * 1000);
  }
  // Assume number is already in milliseconds
  return time;
};

export function useSentenceAudioPlayer(): {
  currentWordId: number | null;
  currentPosition: number | null;
  isPlaying: boolean;
  audioState: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  progress: number;
  duration: number;
  currentSentenceIndex: number | null;
  startPlayback: (sentences: SentenceAudio[]) => Promise<boolean>;
  stopPlayback: () => Promise<boolean>;
  trackWordTiming: TrackWordTimingFunction;
  soundRef: React.RefObject<Audio.Sound | null>;
  wordTimingRef: React.RefObject<WordTiming[]>;
  animationFrameRef: React.RefObject<number | null>;
  playNextSentenceRef: React.RefObject<(() => Promise<boolean>) | null>;
  setAudioState: (state: 'idle' | 'loading' | 'playing' | 'paused' | 'error') => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setCurrentSentenceIndex: (value: number | null) => void;
} {
  const dispatch = useDispatch();

  // Get state from Redux including position
  const currentWordId = useSelector((state: RootState) => state.audio.currentWordId);
  const currentPosition = useSelector((state: RootState) => state.audio.currentPosition);
  const isPlaying = useSelector((state: RootState) => state.audio.isPlaying);
  const currentSentenceIndex = useSelector((state: RootState) => state.audio.currentSentenceId);

  // Remove useState hooks that are now managed by Redux
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>(
    'idle'
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wordTimingRef = useRef<WordTiming[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const sentencesRef = useRef<SentenceAudio[]>([]);
  const playNextSentenceRef = useRef<(() => Promise<boolean>) | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // More resilient word timing tracking with better initialization
  const trackWordTiming: TrackWordTimingFunction = useCallback(() => {
    let frameId: number | null = null;
    const WORD_OVERLAP_MS = 200;

    const updateWordHighlight = async (): Promise<void> => {
      try {
        // If no sound or no word timings, just exit
        if (!soundRef.current || !wordTimingRef.current || wordTimingRef.current.length === 0) {
          frameId = requestAnimationFrame(updateWordHighlight);
          animationFrameRef.current = frameId;
          return;
        }

        // Get current playback status
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) {
          frameId = requestAnimationFrame(updateWordHighlight);
          animationFrameRef.current = frameId;
          return;
        }

        // Get current time
        const currentTimeMs = status.positionMillis;

        // Find active word
        let activeWordId = null;
        let activePosition = null;

        // Check every word's timing
        for (let i = 0; i < wordTimingRef.current.length; i++) {
          const word = wordTimingRef.current[i];
          if (!word) continue;

          // If current time is within this word's range
          if (currentTimeMs >= word.startTime && currentTimeMs <= word.endTime + WORD_OVERLAP_MS) {
            activeWordId = word.wordId;
            activePosition = i;
            break;
          }
        }

        // Update Redux state
        dispatch(
          setCurrentWord({
            wordId: activeWordId,
            position: activePosition,
          })
        );

        // Continue animation loop
        frameId = requestAnimationFrame(updateWordHighlight);
        animationFrameRef.current = frameId;
      } catch (error) {
        handleError(error as Error);

        // Keep the animation going even if there's an error
        frameId = requestAnimationFrame(updateWordHighlight);
        animationFrameRef.current = frameId;
      }
    };

    // Start the animation loop
    frameId = requestAnimationFrame(updateWordHighlight);
    animationFrameRef.current = frameId;

    // Cleanup function
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        animationFrameRef.current = null;
      }
    };
  }, [dispatch]);

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus): void => {
      if (!status.isLoaded) {
        if (status.error) {
          setAudioState('error');
          dispatch(setCurrentWord({ wordId: null, position: null }));
          dispatch(setPlayingState(false));
        }
        return;
      }

      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);

      if (status.isPlaying) {
        setAudioState('playing');
        dispatch(setPlayingState(true));
      } else if (status.isBuffering) {
        setAudioState('loading');
      } else if (status.didJustFinish) {
        // When a sentence finishes, explicitly call playNextSentence
        // Keep isPlaying true during the transition
        setAudioState('loading'); // Show loading state during transition

        // Call with a slight delay to ensure proper cleanup
        setTimeout(() => {
          if (playNextSentenceRef.current) {
            playNextSentenceRef.current();
          }
        }, 50);
      } else {
        setAudioState('paused');
        dispatch(setPlayingState(false));
      }
    },
    [dispatch]
  );

  // Initialize audio session
  const initAudioSession = useCallback(async (): Promise<boolean> => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      return true;
    } catch (error) {
      handleError(error as Error);
      return false;
    }
  }, []);

  // Clean up audio resources
  const cleanupAudio = useCallback(async (): Promise<void> => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } finally {
        soundRef.current = null;
      }
    }

    dispatch(setCurrentWord({ wordId: null, position: null }));
    dispatch(setPlayingState(false));
    dispatch(setCurrentSentence(null));
    setAudioState('idle');
  }, [dispatch]);

  // Stop playback
  const stopPlayback = useCallback(async (): Promise<boolean> => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
      await cleanupAudio();
      return true;
    } catch (error) {
      handleError(error as Error);
      return false;
    }
  }, [cleanupAudio]);

  // Improve playNextSentence to ensure reliable transitions
  const playNextSentence = useCallback(async (): Promise<boolean> => {
    try {
      // Clean up current sentence
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Since we can only go forward, we can simplify the index logic
      const nextIndex = (currentSentenceIndex ?? -1) + 1;
      if (nextIndex >= sentencesRef.current.length) {
        await cleanupAudio();
        return false;
      }

      // Load next sentence
      const nextSentence = sentencesRef.current[nextIndex];
      if (!nextSentence?.audioUrl) {
        await cleanupAudio();
        return false;
      }

      // Update state for next sentence
      dispatch(setCurrentSentence(nextIndex));
      dispatch(setPlayingState(true));
      setAudioState('loading');

      // Prepare word timings - they must be in order since we only move forward
      wordTimingRef.current = nextSentence.wordTimings
        .map((timing, index) => ({
          wordId: Number(timing.wordId),
          startTime: normalizeTimingToMs(timing.startTime),
          endTime: normalizeTimingToMs(timing.endTime),
          position: index,
        }))
        .filter(timing => timing.startTime < timing.endTime);

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextSentence.audioUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 50, positionMillis: 0 },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;

      // Start word tracking if we have timings
      if (wordTimingRef.current.length > 0) {
        const cleanup = trackWordTiming();
        cleanupRef.current = () => {
          cleanup();
          if (soundRef.current) {
            soundRef.current.unloadAsync().catch(handleError);
          }
        };
      }

      setAudioState('playing');
      return true;
    } catch (error) {
      handleError(error as Error);
      await cleanupAudio();
      return false;
    }
  }, [currentSentenceIndex, cleanupAudio, onPlaybackStatusUpdate, trackWordTiming, dispatch]);

  // Simplify startPlayback since we always start from the beginning
  const startPlayback = useCallback(
    async (sentences: SentenceAudio[]): Promise<boolean> => {
      if (!sentences?.length || !sentences[0]?.audioUrl) {
        return false;
      }

      try {
        // Store sentences and initialize
        sentencesRef.current = sentences;
        await initAudioSession();
        await cleanupAudio();

        // Start with first sentence
        dispatch(setCurrentSentence(0));
        dispatch(setPlayingState(true));
        setAudioState('loading');

        // Prepare word timings for first sentence
        wordTimingRef.current = sentences[0].wordTimings
          .map((timing, index) => ({
            wordId: Number(timing.wordId),
            startTime: normalizeTimingToMs(timing.startTime),
            endTime: normalizeTimingToMs(timing.endTime),
            position: index,
          }))
          .filter(timing => timing.startTime < timing.endTime);

        // Create and load the sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: sentences[0].audioUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 50, positionMillis: 0 },
          onPlaybackStatusUpdate
        );

        soundRef.current = sound;

        // Start word tracking if we have timings
        if (wordTimingRef.current.length > 0) {
          const cleanup = trackWordTiming();
          cleanupRef.current = () => {
            cleanup();
            if (soundRef.current) {
              soundRef.current.unloadAsync().catch(handleError);
            }
          };
        }

        setAudioState('playing');
        return true;
      } catch (error) {
        handleError(error as Error);
        await cleanupAudio();
        return false;
      }
    },
    [initAudioSession, cleanupAudio, onPlaybackStatusUpdate, trackWordTiming, dispatch]
  );

  // Update playNextSentence ref
  useEffect(() => {
    playNextSentenceRef.current = playNextSentence;
  }, [playNextSentence]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  return {
    currentWordId,
    currentPosition,
    isPlaying,
    audioState,
    progress,
    duration,
    currentSentenceIndex,
    startPlayback,
    stopPlayback,
    trackWordTiming,
    soundRef,
    wordTimingRef,
    animationFrameRef,
    playNextSentenceRef,
    setAudioState,
    setProgress,
    setDuration,
    setCurrentSentenceIndex: (value: number | null) => dispatch(setCurrentSentence(value)),
  };
}
