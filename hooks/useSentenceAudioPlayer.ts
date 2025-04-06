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

  // Get state from Redux instead of local state
  const currentWordId = useSelector((state: RootState) => state.audio.currentWordId);
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
    let lastHighlightInfo = { wordId: null as number | null, position: null as number | null };
    let lastUpdateTime = 0;

    // Immediately check for first word on start
    const checkFirstWord = (): void => {
      if (wordTimingRef.current.length > 0) {
        const firstWord = wordTimingRef.current[0];
        if (!firstWord) return;

        if (firstWord.startTime <= 50) {
          dispatch(
            setCurrentWord({
              wordId: firstWord.wordId,
              position: 0,
            })
          );
          lastHighlightInfo = { wordId: firstWord.wordId, position: 0 };
          lastUpdateTime = Date.now();
        }
      }
    };

    checkFirstWord();

    // eslint-disable-next-line sonarjs/cognitive-complexity
    const updateWordHighlight = async (): Promise<void> => {
      try {
        if (!soundRef.current || wordTimingRef.current.length === 0) {
          return;
        }

        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded || !status.isPlaying) {
          return;
        }

        const currentTimeMs = status.positionMillis;
        const now = Date.now();

        // Throttle updates to prevent too frequent state changes
        if (now - lastUpdateTime < 50) {
          frameId = requestAnimationFrame(updateWordHighlight);
          return;
        }

        // Find the active word by scanning forward from last known position
        const startIndex = lastHighlightInfo.position !== null ? lastHighlightInfo.position : 0;
        let foundActiveWord = false;
        let activeWordIndex = -1;
        let activeWord = null;

        // Scan forward from last position
        for (let i = startIndex; i < wordTimingRef.current.length; i++) {
          const timing = wordTimingRef.current[i];
          if (!timing) continue;

          // Check if current time is within this word's timing range
          if (
            currentTimeMs >= timing.startTime &&
            currentTimeMs <= timing.endTime + WORD_OVERLAP_MS
          ) {
            activeWord = timing;
            activeWordIndex = i;
            foundActiveWord = true;
            break;
          }

          // If we've gone past the current time, stop searching
          if (timing.startTime > currentTimeMs) {
            break;
          }
        }

        // Update state if needed
        if (foundActiveWord && activeWord) {
          if (
            activeWordIndex !== lastHighlightInfo.position ||
            activeWord.wordId !== lastHighlightInfo.wordId
          ) {
            dispatch(
              setCurrentWord({
                wordId: activeWord.wordId,
                position: activeWordIndex,
              })
            );

            lastHighlightInfo = {
              wordId: activeWord.wordId,
              position: activeWordIndex,
            };
            lastUpdateTime = now;
          }
        } else if (lastHighlightInfo.wordId !== null) {
          // Only clear highlight if we're past the last word's end time
          const lastWord = wordTimingRef.current[wordTimingRef.current.length - 1];
          if (lastWord && currentTimeMs > lastWord.endTime + WORD_OVERLAP_MS) {
            dispatch(
              setCurrentWord({
                wordId: null,
                position: null,
              })
            );

            lastHighlightInfo = { wordId: null, position: null };
            lastUpdateTime = now;
          }
        }

        frameId = requestAnimationFrame(updateWordHighlight);
        animationFrameRef.current = frameId;
      } catch (error) {
        if (frameId) {
          handleError(error as Error);
          cancelAnimationFrame(frameId);
          animationFrameRef.current = null;
        }
      }
    };

    frameId = requestAnimationFrame(updateWordHighlight);
    animationFrameRef.current = frameId;

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
      // Reset word highlighting and cancel any ongoing animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      dispatch(setCurrentWord({ wordId: null, position: null }));

      // Increment sentence index
      const nextIndex = (currentSentenceIndex ?? -1) + 1;

      // Check if we have more sentences
      if (nextIndex >= sentencesRef.current.length) {
        // End of article reached
        setAudioState('idle');
        dispatch(setCurrentSentence(null));
        dispatch(setPlayingState(false));
        await cleanupAudio();
        return false;
      }

      // Load the next sentence
      dispatch(setCurrentSentence(nextIndex));
      const nextSentence = sentencesRef.current[nextIndex];
      if (!nextSentence || !nextSentence.audioUrl) {
        await cleanupAudio();
        return false;
      }

      // Clean up previous sound if it exists
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (error) {
          handleError(error as Error);
        } finally {
          soundRef.current = null;
        }
      }

      // Keep playing state active during transition
      dispatch(setPlayingState(true));
      setAudioState('loading');

      // Update word timing reference - ensure it's an array and validate timings
      if (Array.isArray(nextSentence.wordTimings)) {
        // Validate and normalize word timings
        wordTimingRef.current = nextSentence.wordTimings.map((timing, index) => ({
          ...timing,
          startTime: normalizeTimingToMs(timing.startTime),
          endTime: normalizeTimingToMs(timing.endTime),
          wordId: Number(timing.wordId),
          position: index, // Ensure each word has its position
        }));
      } else {
        wordTimingRef.current = [];
      }

      // Create and load the sound with more reliable configuration
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 50,
            positionMillis: 0, // Explicitly start from beginning
          },
          onPlaybackStatusUpdate
        );

        // Store reference to the sound
        soundRef.current = sound;

        // Explicitly start tracking to ensure highlighting begins immediately
        if (wordTimingRef.current.length > 0) {
          const cleanup = trackWordTiming();
          // Store cleanup function in ref
          cleanupRef.current = () => {
            cleanup();
            if (soundRef.current) {
              soundRef.current.unloadAsync();
            }
          };
          return true;
        }

        // Ensure we're still in playing state
        dispatch(setPlayingState(true));
        setAudioState('playing');

        return true;
      } catch (audioError) {
        handleError(audioError as Error);
        await cleanupAudio();
        return false;
      }
    } catch (error) {
      handleError(error as Error);
      await cleanupAudio();
      return false;
    }
  }, [currentSentenceIndex, cleanupAudio, onPlaybackStatusUpdate, trackWordTiming, dispatch]);

  // Improve startPlayback for more reliable initialization
  const startPlayback = useCallback(
    async (sentences: SentenceAudio[]): Promise<boolean> => {
      if (!Array.isArray(sentences) || sentences.length === 0) {
        return false;
      }

      const firstSentence = sentences[0];
      if (!firstSentence?.audioUrl) {
        return false;
      }

      if (!Array.isArray(firstSentence.wordTimings) || firstSentence.wordTimings.length === 0) {
        // Continue without word timings
      }

      try {
        // Store sentences in ref
        sentencesRef.current = sentences;

        // Initialize audio session
        const sessionInitialized = await initAudioSession();
        if (!sessionInitialized) {
          throw new Error('Failed to initialize audio session');
        }

        // Reset state
        await cleanupAudio();
        dispatch(setCurrentSentence(null));
        dispatch(setCurrentWord({ wordId: null, position: null }));

        // Start with first sentence (explicitly set to 0 to ensure it's a number)
        dispatch(setCurrentSentence(0));

        // Keep playing state active during initial load
        dispatch(setPlayingState(true));
        setAudioState('loading');

        // Update word timing reference - ensure it's an array
        if (Array.isArray(firstSentence.wordTimings)) {
          wordTimingRef.current = firstSentence.wordTimings;
        } else {
          wordTimingRef.current = [];
        }

        // Create and load the sound with more reliable configuration
        const { sound } = await Audio.Sound.createAsync(
          { uri: firstSentence.audioUrl },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 50,
            positionMillis: 0, // Explicitly start from beginning
          },
          onPlaybackStatusUpdate
        );

        // Store reference to the sound
        soundRef.current = sound;

        // Explicitly start tracking to ensure highlighting begins immediately
        if (wordTimingRef.current.length > 0) {
          trackWordTiming();
        }

        // Ensure we're in playing state
        dispatch(setPlayingState(true));
        setAudioState('playing');

        return true;
      } catch (error) {
        handleError(error as Error);
        return false;
      }
    },
    [initAudioSession, onPlaybackStatusUpdate, trackWordTiming, cleanupAudio, dispatch]
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
