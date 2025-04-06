import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  setCurrentWord,
  setPlayingState,
  setCurrentSentence,
  updateAudioState,
} from '../store/audioSlice';
import type { RootState } from '../store/store';
import type { Tables } from '../types/database.types';
import { handleError } from '../utils/errorHandling';

export type WordTiming = {
  wordId: number;
  startTime: number; // ms
  endTime: number; // ms
  position: number;
  uniqueKey?: string;
};

export type SentenceAudio = {
  sentenceId: number;
  audioUrl: string;
  wordTimings: WordTiming[];
};

export type SentenceWordsMap = Map<number, Tables<'sentence_words'>[]>;

export function useSentenceAudioPlayer(): {
  currentWordId: number | null;
  currentPosition: number | null;
  isPlaying: boolean;
  currentSentenceIndex: number | null;
  audioState: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  progress: number;
  duration: number;
  isPreloading: boolean;
  startPlayback: (sentences: SentenceAudio[]) => Promise<boolean>;
  stopPlayback: () => Promise<boolean>;
  preloadAudioFiles: (sentences: SentenceAudio[]) => Promise<boolean>;
  findWordById: (
    wordId: number,
    sentenceWordsMap: SentenceWordsMap
  ) => Tables<'sentence_words'> | undefined;
  setAudioState: (state: 'idle' | 'loading' | 'playing' | 'paused' | 'error') => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setCurrentSentenceIndex: (idx: number | null) => void;
  soundRef: React.MutableRefObject<Audio.Sound | null>;
  wordTimingRef: React.MutableRefObject<WordTiming[]>;
  animationFrameRef: React.MutableRefObject<NodeJS.Timeout | null>;
} {
  const dispatch = useDispatch();

  // Redux states
  const currentWordId = useSelector((state: RootState) => state.audio.currentWordId);
  const currentPosition = useSelector((state: RootState) => state.audio.currentPosition);
  const isPlaying = useSelector((state: RootState) => state.audio.isPlaying);
  const currentSentenceIndex = useSelector((state: RootState) => state.audio.currentSentenceId);

  // Local states
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>(
    'idle'
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wordTimingRef = useRef<WordTiming[]>([]);
  const animationFrameRef = useRef<NodeJS.Timeout | null>(null);
  const sentencesRef = useRef<SentenceAudio[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const preloadedSoundsRef = useRef<(Audio.Sound | null)[]>([]);
  const playNextSentenceRef = useRef<() => Promise<void>>(async (): Promise<void> => {});

  // We keep a forward-only pointer
  const lastActiveIndex = useRef(0);

  // ---- HELPER: Find a word by ID from all sentences ----
  const findWordById = useCallback(
    (wordId: number, sentenceWordsMap: SentenceWordsMap): Tables<'sentence_words'> | undefined => {
      if (!sentenceWordsMap) return undefined;

      // Iterate through all sentences to find the word
      for (const words of sentenceWordsMap.values()) {
        const word = words.find(w => w.id === wordId);
        if (word) return word;
      }

      return undefined;
    },
    []
  );

  // ---- HELPER: Convert timing to ms if needed ----
  const normalizeTimingToMs = useCallback((time: number | string): number => {
    if (typeof time === 'string') {
      return Math.round(parseFloat(time) * 1000);
    }
    return time;
  }, []);

  // ---- Helper to init audio session ----
  const initAudioSession = useCallback(async (): Promise<void> => {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  // ---- Cleanup function ----
  const cleanupAudio = useCallback(async (): Promise<void> => {
    if (animationFrameRef.current !== null) {
      clearInterval(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        handleError(err as Error);
      }
      soundRef.current = null;
    }

    // Reset store (batch update instead of multiple dispatches)
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: false,
        sentenceId: null,
      })
    );

    // Reset local states
    setAudioState('idle');
    setProgress(0);
    setDuration(0);
    lastActiveIndex.current = 0;
  }, [dispatch]);

  // ---- Word tracking with efficient interval-based approach ----
  const trackWordTiming = useCallback((): (() => void) => {
    // Use interval instead of requestAnimationFrame to reduce CPU usage
    const INTERVAL_MS = 400; // Increased from 250ms to 400ms for better performance
    const WORD_OVERLAP_MS = 200;
    const MAX_CHECKS_PER_INTERVAL = 5;

    let intervalId: NodeJS.Timeout | null = null;

    const updateWordHighlight = async (): Promise<void> => {
      try {
        // If no audio or no words, skip this update
        if (!soundRef.current || wordTimingRef.current.length === 0) {
          return;
        }

        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) {
          return;
        }

        // If we never go backward, we only search forward
        const currentTimeMs = status.positionMillis;
        const timings = wordTimingRef.current;

        // We'll limit how many words we check per interval to reduce processing
        let checksPerformed = 0;

        // Start from lastActiveIndex and move forward until we find a match
        for (let i = lastActiveIndex.current; i < timings.length; i++) {
          // Limit number of checks per interval to reduce CPU usage
          if (checksPerformed >= MAX_CHECKS_PER_INTERVAL) break;
          checksPerformed++;

          const word = timings[i];
          // Skip if word is undefined (TypeScript safety)
          if (!word) continue;

          // If the "word" is in range, highlight it
          if (currentTimeMs >= word.startTime && currentTimeMs <= word.endTime + WORD_OVERLAP_MS) {
            dispatch(setCurrentWord({ wordId: word.wordId, position: i }));
            lastActiveIndex.current = i;
            break;
          }
          // If the current time is beyond this word's range, keep going.
          if (currentTimeMs > word.endTime + WORD_OVERLAP_MS) {
            // We can advance lastActiveIndex. This effectively "skips" past words we've passed.
            lastActiveIndex.current = i;
          }
        }
      } catch (error) {
        handleError(error as Error);
      }
    };

    // Start the interval
    intervalId = setInterval(updateWordHighlight, INTERVAL_MS);

    // Store reference for cleanup
    animationFrameRef.current = intervalId;

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        animationFrameRef.current = null;
      }
    };
  }, [dispatch]);

  // ---- Playback status callback ----
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus): void => {
      if (!status.isLoaded) {
        if (status.error) {
          setAudioState('error');
          // Batch update instead of multiple dispatches
          dispatch(
            updateAudioState({
              wordId: null,
              position: null,
              isPlaying: false,
            })
          );
        }
        return;
      }

      setProgress(status.positionMillis);
      setDuration(status.durationMillis ?? 0);

      if (status.isPlaying) {
        setAudioState('playing');
        dispatch(setPlayingState(true));
      } else if (status.isBuffering) {
        setAudioState('loading');
      } else if (status.didJustFinish) {
        // Move to the next sentence immediately
        playNextSentenceRef.current();
      } else {
        setAudioState('paused');
        dispatch(setPlayingState(false));
      }
    },
    [dispatch]
  );

  // ---- Preload all audio files ----
  const preloadAudioFiles = useCallback(
    // eslint-disable-next-line sonarjs/cognitive-complexity
    async (sentences: SentenceAudio[]): Promise<boolean> => {
      if (!sentences?.length) return false;

      try {
        setIsPreloading(true);
        await initAudioSession();

        // Clean up any previously preloaded sounds
        for (const sound of preloadedSoundsRef.current) {
          if (sound) {
            try {
              await sound.unloadAsync();
            } catch (err) {
              handleError(err as Error);
            }
          }
        }

        preloadedSoundsRef.current = [];

        // Use sliding window approach - only preload current and next 2 sentences
        // This saves memory and improves performance
        const PRELOAD_WINDOW_SIZE = 3;
        const currentIndex = currentSentenceIndex ?? 0;
        const startIdx = currentIndex;
        const endIdx = Math.min(startIdx + PRELOAD_WINDOW_SIZE, sentences.length);

        // Preload only window of audio files in parallel
        const preloadPromises = [];

        for (let i = 0; i < sentences.length; i++) {
          // Only preload if in our sliding window
          if (i >= startIdx && i < endIdx) {
            const sentence = sentences[i];
            if (!sentence?.audioUrl) {
              preloadedSoundsRef.current[i] = null;
              continue;
            }

            const promise = (async (idx: number) => {
              try {
                const sentenceToLoad = sentences[idx];
                if (!sentenceToLoad?.audioUrl) {
                  preloadedSoundsRef.current[idx] = null;
                  return;
                }

                const { sound } = await Audio.Sound.createAsync(
                  { uri: sentenceToLoad.audioUrl },
                  { shouldPlay: false }
                );
                preloadedSoundsRef.current[idx] = sound;
              } catch (error) {
                handleError(error as Error);
                preloadedSoundsRef.current[idx] = null;
              }
            })(i);

            preloadPromises.push(promise);
          } else {
            // Set to null for positions outside window
            preloadedSoundsRef.current[i] = null;
          }
        }

        await Promise.all(preloadPromises);
        setIsPreloading(false);
        return true;
      } catch (error) {
        handleError(error as Error);
        setIsPreloading(false);
        return false;
      }
    },
    [initAudioSession, currentSentenceIndex]
  );

  // Helper function to load next sentences in window (called after sentence change)
  const updatePreloadingWindow = useCallback(async (): Promise<void> => {
    if (!sentencesRef.current.length) return;

    const PRELOAD_WINDOW_SIZE = 3;
    const currentIdx = currentSentenceIndex ?? 0;

    // Unload sentences that are too far behind
    for (let i = 0; i < currentIdx - 1; i++) {
      const sound = preloadedSoundsRef.current[i];
      if (sound) {
        try {
          await sound.unloadAsync();
          preloadedSoundsRef.current[i] = null;
        } catch (err) {
          handleError(err as Error);
        }
      }
    }

    // Preload sentences ahead
    for (
      let i = currentIdx + 1;
      i < Math.min(currentIdx + PRELOAD_WINDOW_SIZE, sentencesRef.current.length);
      i++
    ) {
      // Skip if already loaded or no URL
      const nextSentence = sentencesRef.current[i];
      if (preloadedSoundsRef.current[i] || !nextSentence?.audioUrl) continue;

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          { shouldPlay: false }
        );
        preloadedSoundsRef.current[i] = sound;
      } catch (error) {
        handleError(error as Error);
      }
    }
  }, [currentSentenceIndex]);

  // Update preloading window when sentence changes
  useEffect(() => {
    if (currentSentenceIndex !== null) {
      // Use requestIdleCallback to avoid blocking the main thread
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          updatePreloadingWindow();
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          updatePreloadingWindow();
        }, 0);
      }
    }
  }, [currentSentenceIndex, updatePreloadingWindow]);

  // ---- Function to move to the NEXT sentence ----
  const playNextSentence = useCallback(async (): Promise<void> => {
    try {
      // If there's an existing cleanup callback (word-tracking cleanup, etc.), call it
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // nextIndex
      const nextIndex = (currentSentenceIndex ?? -1) + 1;
      if (nextIndex >= sentencesRef.current.length) {
        // We've finished all sentences
        await cleanupAudio();
        return;
      }

      // Move forward to next sentence
      const nextSentence = sentencesRef.current[nextIndex];
      if (!nextSentence?.audioUrl) {
        await cleanupAudio();
        return;
      }

      // Update Redux (batch update instead of multiple dispatches)
      dispatch(
        updateAudioState({
          sentenceId: nextIndex,
          isPlaying: true,
        })
      );
      setAudioState('loading');

      // Prepare word timings (forward-only)
      const mappedTimings: WordTiming[] = nextSentence.wordTimings
        .map(
          (timing, i): WordTiming => ({
            wordId: timing.wordId,
            startTime: normalizeTimingToMs(timing.startTime),
            endTime: normalizeTimingToMs(timing.endTime),
            position: i,
          })
        )
        .filter((t): boolean => t.startTime < t.endTime);

      wordTimingRef.current = mappedTimings;

      // Reset the "lastActiveIndex" to 0 for the new sentence
      lastActiveIndex.current = 0;

      // Use preloaded sound if available, otherwise load on demand
      let sound: Audio.Sound;
      const preloadedSound = preloadedSoundsRef.current[nextIndex];
      if (preloadedSound) {
        sound = preloadedSound;
        await sound.setStatusAsync({
          shouldPlay: true,
          progressUpdateIntervalMillis: 100, // Increased from 50ms to 100ms for better performance
          positionMillis: 0,
        });
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      } else {
        // Fallback to loading on demand if preload failed
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 100, // Increased from 50ms to 100ms
            positionMillis: 0,
          },
          onPlaybackStatusUpdate
        );
        sound = newSound;
      }

      soundRef.current = sound;

      // Start word tracking if we have timings
      if (mappedTimings.length > 0) {
        const trackingCleanup = trackWordTiming();
        cleanupRef.current = (): void => {
          trackingCleanup();
          // Don't unload the sound as it might be preloaded and reused
        };
      }

      setAudioState('playing');
    } catch (error) {
      handleError(error as Error);
      await cleanupAudio();
    }
  }, [
    currentSentenceIndex,
    cleanupAudio,
    trackWordTiming,
    dispatch,
    normalizeTimingToMs,
    onPlaybackStatusUpdate,
  ]);

  // Update the ref with the latest function
  useEffect((): void => {
    playNextSentenceRef.current = playNextSentence;
  }, [playNextSentence]);

  // ---- Start from the first sentence in a list ----
  const startPlayback = useCallback(
    async (sentences: SentenceAudio[]): Promise<boolean> => {
      if (!sentences?.length || !sentences[0]?.audioUrl) {
        return false;
      }

      try {
        sentencesRef.current = sentences;

        // Preload all audio files before starting playback
        setAudioState('loading');
        await preloadAudioFiles(sentences);

        await cleanupAudio(); // clean up any old playback

        // Jump right to the first sentence (batch update instead of multiple dispatches)
        dispatch(
          updateAudioState({
            sentenceId: 0,
            isPlaying: true,
          })
        );
        setAudioState('loading');

        const firstSentence = sentences[0];
        wordTimingRef.current = firstSentence.wordTimings
          .map(
            (timing, i): WordTiming => ({
              wordId: timing.wordId,
              startTime: normalizeTimingToMs(timing.startTime),
              endTime: normalizeTimingToMs(timing.endTime),
              position: i,
            })
          )
          .filter((t): boolean => t.startTime < t.endTime);

        lastActiveIndex.current = 0;

        // Use preloaded sound if available
        let sound: Audio.Sound;
        const firstPreloadedSound = preloadedSoundsRef.current[0];
        if (firstPreloadedSound) {
          sound = firstPreloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100, // Increased from 50ms to 100ms for better performance
            positionMillis: 0,
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          // Fallback to loading on demand
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: firstSentence.audioUrl },
            {
              shouldPlay: true,
              progressUpdateIntervalMillis: 100, // Increased from 50ms to 100ms
              positionMillis: 0,
            },
            onPlaybackStatusUpdate
          );
          sound = newSound;
        }

        soundRef.current = sound;

        if (wordTimingRef.current.length > 0) {
          const trackingCleanup = trackWordTiming();
          cleanupRef.current = (): void => {
            trackingCleanup();
            // Don't unload as it might be preloaded
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
    [
      cleanupAudio,
      onPlaybackStatusUpdate,
      trackWordTiming,
      dispatch,
      normalizeTimingToMs,
      preloadAudioFiles,
    ]
  );

  // ---- Stop playback mid-sentence if needed ----
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

  useEffect(() => {
    // On unmount, do final cleanup
    return (): void => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Unload all preloaded sounds
      for (const sound of preloadedSoundsRef.current) {
        if (sound) {
          sound.unloadAsync().catch((error): void => {
            handleError(error as Error);
          });
        }
      }

      // Clear any remaining intervals
      if (animationFrameRef.current) {
        clearInterval(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return {
    // Redux-based states
    currentWordId,
    currentPosition,
    isPlaying,
    currentSentenceIndex,

    // Local states
    audioState,
    progress,
    duration,
    isPreloading,

    // Methods
    startPlayback,
    stopPlayback,
    preloadAudioFiles,
    findWordById,

    // Debug or advanced
    setAudioState,
    setProgress,
    setDuration,
    setCurrentSentenceIndex: (idx: number | null) => dispatch(setCurrentSentence(idx)),

    // Refs if needed
    soundRef,
    wordTimingRef,
    animationFrameRef,
  };
}
