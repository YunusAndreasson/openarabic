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

/**
 * Helper function to retry an async operation with exponential backoff
 * @param operation Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Initial delay in ms
 * @param _retryLog Description for logging purposes
 * @returns Promise resolving to operation result
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 300,
  _retryLog = 'operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Retry silently
      }
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Calculate exponential backoff delay with small jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError;
}

// Define a proper type for the playNextSentence function
type PlayNextSentenceFunction = {
  (): Promise<void>;
  playSentenceAtIndex?: (targetIndex: number) => Promise<void>;
};

export function useSentenceAudioPlayer(): {
  currentWordId: number | null;
  currentPosition: number | null;
  isPlaying: boolean;
  currentSentenceIndex: number | null;
  audioState: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  progress: number;
  duration: number;
  isPreloading: boolean;
  startPlayback: (
    sentences: SentenceAudio[],
    options?: {
      startPositionMs?: number;
      initialWordId?: number | null;
      sentenceOffset?: number;
      forceReset?: boolean;
    }
  ) => Promise<boolean>;
  stopPlayback: (shouldUnload?: boolean) => Promise<boolean>;
  resumePlayback: (sentenceIndex: number, audioPositionMs?: number) => Promise<boolean>;
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
  const playNextSentenceRef = useRef<PlayNextSentenceFunction>(async (): Promise<void> => {});
  // Add a ref to track if we're already transitioning between sentences
  const isTransitioningRef = useRef<boolean>(false);

  // We keep a forward-only pointer
  const lastActiveIndex = useRef(0);

  // Add a new ref to track the original index offset
  const sentenceIndexOffsetRef = useRef<number>(0);

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

    // Reset the sentence index offset
    sentenceIndexOffsetRef.current = 0;

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

      // REVISED: Simplify and strengthen completion detection logic
      const isAtEnd =
        status.didJustFinish ||
        (status.durationMillis != null &&
          status.durationMillis > 0 &&
          status.positionMillis >= status.durationMillis - 50);

      if (isAtEnd) {
        console.log('Audio completion detected - moving to next sentence');
        isTransitioningRef.current = false; // Reset transition flag to ensure we can proceed
        playNextSentenceRef.current().catch(error => {
          handleError(error);
          dispatch(setPlayingState(false));
        });
        return;
      }

      // State synchronization check
      if (isPlaying && !status.isPlaying && !status.isBuffering && !status.didJustFinish) {
        // Audio has stopped unexpectedly - reset the UI state
        console.log('Audio has stopped unexpectedly - resetting UI state');
        dispatch(setPlayingState(false));
        setAudioState('paused');
        return;
      }

      if (status.isPlaying) {
        setAudioState('playing');
        dispatch(setPlayingState(true));
      } else if (status.isBuffering) {
        setAudioState('loading');
      } else {
        setAudioState('paused');
        dispatch(setPlayingState(false));
      }
    },
    [dispatch, isPlaying]
  );

  // Add effect to detect stalled transitions
  useEffect(() => {
    let transitionTimeout: NodeJS.Timeout | null = null;

    if (isTransitioningRef.current) {
      console.log('Starting transition timeout monitor');
      transitionTimeout = setTimeout(() => {
        console.log('Transition timeout detected - force resetting state');

        // The transition process has stalled
        isTransitioningRef.current = false;

        // Reset Redux state to non-playing
        dispatch(
          updateAudioState({
            isPlaying: false,
          })
        );

        setAudioState('paused');
      }, 3000); // 3-second timeout
    }

    return () => {
      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
      }
    };
  }, [isTransitioningRef.current, dispatch]);

  // Add a last position monitoring system to catch edge cases
  useEffect(() => {
    let positionMonitor: NodeJS.Timeout | null = null;

    if (isPlaying && soundRef.current) {
      // Set up position monitoring every 300ms as a safety net
      positionMonitor = setInterval(async () => {
        try {
          if (!soundRef.current) {
            if (positionMonitor) clearInterval(positionMonitor);
            return;
          }

          const status = await soundRef.current.getStatusAsync();
          if (!status.isLoaded) return;

          const currentPos = status.positionMillis;
          const totalDuration = status.durationMillis || 0;

          // If position is not advancing and we're very close to the end
          if (totalDuration > 0 && currentPos >= totalDuration - 100) {
            console.log('Position monitor detected end of audio');
            // We're at the end but not advancing - force next sentence
            if (positionMonitor) clearInterval(positionMonitor);
            playNextSentenceRef.current().catch(error => {
              handleError(error);
            });
          }
        } catch (error) {
          // Silently handle errors - don't interrupt playback
          console.error('Position monitor error', error);
        }
      }, 300);
    }

    return () => {
      if (positionMonitor) clearInterval(positionMonitor);
    };
  }, [isPlaying]);

  // Add a safety timer to detect and recover from stuck playback - make more robust
  useEffect(() => {
    let safetyTimer: NodeJS.Timeout | null = null;

    // Only set up the timer when actually playing
    if (isPlaying && currentSentenceIndex !== null) {
      safetyTimer = setTimeout(() => {
        // Check if we're still on the same sentence after a delay
        if (soundRef.current && isPlaying) {
          soundRef.current
            .getStatusAsync()
            .then(status => {
              if (status.isLoaded) {
                const { positionMillis, durationMillis, isPlaying: stillPlaying } = status;

                // More aggressive check - either we're at the end or just not making progress
                const isAtEnd =
                  positionMillis > 0 &&
                  durationMillis != null &&
                  durationMillis > 0 &&
                  positionMillis >= durationMillis * 0.95;

                const isStuck = !stillPlaying || isAtEnd;

                if (isStuck) {
                  console.log('Safety timer detected stuck playback - forcing next sentence');
                  // Force next sentence regardless of current position
                  playNextSentenceRef.current().catch(error => {
                    handleError(error);
                  });
                }
              }
            })
            .catch(_err => {
              // If we can't even check status, assume we need to move forward
              console.log('Safety timer encountered error - forcing next sentence');
              playNextSentenceRef.current().catch(error => {
                handleError(error);
              });
            });
        }
      }, 1000); // Slightly increased from 800ms to 1000ms for better reliability
    }

    return () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
    };
  }, [isPlaying, currentSentenceIndex]);

  // Add a more reliable audio completion check
  useEffect(() => {
    if (!isPlaying || !soundRef.current) return;

    const checkInterval = setInterval(async () => {
      try {
        if (!soundRef.current) return;

        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        // If we're very close to the end and not advancing
        if (
          status.durationMillis &&
          status.positionMillis >= status.durationMillis - 200 &&
          !isTransitioningRef.current
        ) {
          console.log('Completion check detected end of audio');
          clearInterval(checkInterval);
          playNextSentenceRef.current().catch(handleError);
        }
      } catch (err) {
        console.error('Error in completion check:', err);
      }
    }, 200);

    return () => clearInterval(checkInterval);
  }, [isPlaying, handleError]);

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

        // Preload all audio files for smoother playback between sentences
        // This is especially important for continuous playback
        const preloadPromises = [];

        for (let i = 0; i < sentences.length; i++) {
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

              // Use retry with backoff for preloading
              const sound = await retryWithBackoff(
                async () => {
                  const { sound } = await Audio.Sound.createAsync(
                    { uri: sentenceToLoad.audioUrl },
                    { shouldPlay: false }
                  );
                  return sound;
                },
                3, // Max 3 retries
                300, // Start with 300ms delay
                `preloading sentence ${idx}`
              );

              preloadedSoundsRef.current[idx] = sound;
            } catch (error) {
              handleError(error as Error);
              preloadedSoundsRef.current[idx] = null;
            }
          })(i);

          preloadPromises.push(promise);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initAudioSession, currentSentenceIndex]
  );

  // Helper function to load next sentences in window (called after sentence change)
  const updatePreloadingWindow = useCallback(async (): Promise<void> => {
    if (!sentencesRef.current.length) return;

    const PRELOAD_WINDOW_SIZE = 3;
    const currentIdx = currentSentenceIndex ?? 0;

    console.log(
      `Updating preload window around sentence ${currentIdx} (offset: ${sentenceIndexOffsetRef.current})`
    );

    // Convert to relative index for array access
    const relativeIdx = currentIdx - sentenceIndexOffsetRef.current;

    if (relativeIdx < 0) {
      console.log(`Relative index ${relativeIdx} is negative, skipping preload update`);
      return;
    }

    // Unload sentences that are too far behind
    for (let i = 0; i < relativeIdx - 1; i++) {
      const sound = preloadedSoundsRef.current[i];
      if (sound) {
        try {
          console.log(`Unloading preloaded sound for relative index ${i}`);
          await sound.unloadAsync();
          preloadedSoundsRef.current[i] = null;
        } catch (err) {
          handleError(err as Error);
        }
      }
    }

    // Preload sentences ahead
    for (
      let i = relativeIdx + 1;
      i < Math.min(relativeIdx + PRELOAD_WINDOW_SIZE, sentencesRef.current.length);
      i++
    ) {
      // Skip if already loaded or no URL
      const nextSentence = sentencesRef.current[i];
      if (preloadedSoundsRef.current[i] || !nextSentence?.audioUrl) continue;

      try {
        console.log(
          `Preloading sound for relative index ${i} (absolute: ${i + sentenceIndexOffsetRef.current})`
        );
        const { sound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          { shouldPlay: false }
        );
        preloadedSoundsRef.current[i] = sound;
      } catch (error) {
        console.error(`Error preloading sound for index ${i}:`, error);
        handleError(error as Error);
      }
    }
  }, [currentSentenceIndex, sentenceIndexOffsetRef.current]);

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

  // Helper functions to reduce cognitive complexity in playNextSentence
  const releaseCurrentSound = useCallback(async (): Promise<void> => {
    const currentSound = soundRef.current;
    if (!currentSound) return;

    console.log('Releasing current sound');

    try {
      // Add a timeout promise to prevent hanging
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Release sound operation timed out after 1000ms'));
        }, 1000);
      });

      // Create the main sound release operation
      const releasePromise = (async () => {
        try {
          if (!currentSound) return; // Double-check in case it became null

          const status = await currentSound.getStatusAsync();
          if (status.isLoaded) {
            console.log('Stopping current sound');
            await currentSound.stopAsync();

            const isPreloaded = preloadedSoundsRef.current.includes(currentSound);
            if (!isPreloaded) {
              console.log('Unloading current sound (not preloaded)');
              await currentSound.unloadAsync();
            } else {
              console.log('Sound is preloaded, skipping unload');
            }
          } else {
            console.log('Sound is not loaded, skipping stop/unload');
          }
        } catch (err) {
          console.error('Error in sound release operation:', err);
          throw err;
        }
      })();

      // Race between timeout and release operation
      await Promise.race([releasePromise, timeoutPromise]);
    } catch (err) {
      console.error('Error or timeout releasing sound:', err);
      // Don't rethrow, just log - we still need to clear the reference
      handleError(err as Error);
    } finally {
      // Always clear the reference even if there was an error
      console.log('Clearing sound reference');
      soundRef.current = null;
    }
  }, []);

  const loadSoundForSentence = useCallback(
    async (index: number, sentenceData: SentenceAudio): Promise<Audio.Sound> => {
      console.log(`Loading sound for sentence ${index}`);
      try {
        setAudioState('loading');

        // Check if we already have this sound preloaded
        const preloadedSound = preloadedSoundsRef.current[index];
        if (preloadedSound) {
          console.log(`Using preloaded sound for sentence ${index}`);
          return preloadedSound;
        }

        // Find URI for this sentence
        const sentenceUri = sentenceData.audioUrl;

        if (!sentenceUri) {
          throw new Error(`No audio URI found for sentence ${index}`);
        }

        console.log(`Creating new sound object for sentence ${index} with URI ${sentenceUri}`);

        // Create a timeout promise
        const timeoutPromise = new Promise<Audio.Sound>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Sound loading timed out after 5000ms for sentence ${index}`));
          }, 5000);
        });

        // Create the sound loading promise
        const loadPromise = (async () => {
          const { sound } = await Audio.Sound.createAsync(
            { uri: sentenceUri },
            { progressUpdateIntervalMillis: 100 },
            onPlaybackStatusUpdate
          );

          console.log(`Sound successfully created for sentence ${index}`);
          return sound;
        })();

        // Race between timeout and loading
        const sound = await Promise.race([loadPromise, timeoutPromise]);

        // Verify the sound loaded correctly
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          throw new Error(`Sound was created but not loaded for sentence ${index}`);
        }

        // Start playback immediately
        console.log(`Starting playback for sentence ${index}`);
        await sound.playAsync();

        return sound;
      } catch (error) {
        console.error(`Error loading sound for sentence ${index}:`, error);
        handleError(error as Error);
        throw error; // Re-throw to handle in the calling function
      }
    },
    [onPlaybackStatusUpdate]
  );

  const prepareWordTimings = useCallback(
    (sentence: SentenceAudio): WordTiming[] => {
      return sentence.wordTimings
        .map(
          (timing, i): WordTiming => ({
            wordId: timing.wordId,
            startTime: normalizeTimingToMs(timing.startTime),
            endTime: normalizeTimingToMs(timing.endTime),
            position: i,
          })
        )
        .filter((t): boolean => t.startTime < t.endTime);
    },
    [normalizeTimingToMs]
  );

  // Update validateSentenceData to better handle index adjustments
  const validateSentenceData = useCallback((nextIndex: number): SentenceAudio | null => {
    if (!sentencesRef.current || sentencesRef.current.length === 0) {
      console.log(`validateSentenceData: No sentences in reference array`);
      return null;
    }

    // Adjust the index by subtracting the offset
    // This transforms from original array index to sliced array index
    const adjustedIndex = nextIndex - sentenceIndexOffsetRef.current;

    console.log(
      `validateSentenceData: Looking for sentence at adjusted index ${adjustedIndex} (original: ${nextIndex}, offset: ${sentenceIndexOffsetRef.current})`
    );
    console.log(`validateSentenceData: Array length: ${sentencesRef.current.length}`);

    if (adjustedIndex < 0 || adjustedIndex >= sentencesRef.current.length) {
      console.log(
        `validateSentenceData: Adjusted index ${adjustedIndex} out of bounds (0-${sentencesRef.current.length - 1})`
      );
      return null;
    }

    const nextSentence = sentencesRef.current[adjustedIndex];
    if (!nextSentence) {
      console.log(`validateSentenceData: No sentence found at adjusted index ${adjustedIndex}`);
      return null;
    }

    if (!nextSentence.audioUrl) {
      console.log(
        `validateSentenceData: No audio URL for sentence at adjusted index ${adjustedIndex}`
      );
      return null;
    }

    console.log(
      `validateSentenceData: Successfully found sentence at adjusted index ${adjustedIndex}`
    );
    return nextSentence;
  }, []);

  // ---- Function to move to the NEXT sentence ----
  const playNextSentence = useCallback(
    async (fromIndex: number = currentSentenceIndex ?? -1): Promise<void> => {
      // REVISED: Remove the transition lock that might prevent progress
      console.log(`Transitioning to next sentence after ${fromIndex}`);

      try {
        // Reset word highlight
        dispatch(setCurrentWord({ wordId: null, position: null }));

        const nextIndex = fromIndex + 1;
        console.log(`Attempting to validate next sentence at index ${nextIndex}`);

        // Validate next sentence exists
        const nextSentence = validateSentenceData(nextIndex);
        if (!nextSentence) {
          console.log(`No valid sentence found at index ${nextIndex}, ending playback`);
          dispatch(
            updateAudioState({
              sentenceId: fromIndex,
              isPlaying: false,
            })
          );
          setAudioState('idle');
          return;
        }

        // Update Redux state
        dispatch(
          updateAudioState({
            sentenceId: nextIndex,
            isPlaying: true,
            wordId: null,
            position: null,
          })
        );

        setAudioState('loading');

        // Prepare word timings
        const mappedTimings = prepareWordTimings(nextSentence);
        wordTimingRef.current = mappedTimings;
        lastActiveIndex.current = 0;

        // REVISED: Make sound cleanup more reliable with a timeout
        try {
          if (soundRef.current) {
            const unloadPromise = soundRef.current.unloadAsync();
            const timeoutPromise = new Promise<void>(resolve => {
              setTimeout(resolve, 1000);
            });
            await Promise.race([unloadPromise, timeoutPromise]);
            soundRef.current = null;
          }
        } catch (err) {
          console.error('Error unloading previous sound:', err);
          soundRef.current = null;
        }

        console.log(`Loading next sound at index ${nextIndex}`);

        // REVISED: More robust sound loading
        let sound: Audio.Sound;
        const adjustedIndex = nextIndex - sentenceIndexOffsetRef.current;
        const preloadedSound = preloadedSoundsRef.current[adjustedIndex];

        if (preloadedSound) {
          console.log(`Using preloaded sound for sentence ${nextIndex}`);
          sound = preloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: 0,
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          console.log(`Creating new sound for sentence ${nextIndex}`);
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: nextSentence.audioUrl },
            { progressUpdateIntervalMillis: 100 },
            onPlaybackStatusUpdate
          );
          sound = newSound;
          await sound.playAsync();
        }

        // Store the sound
        soundRef.current = sound;
        setAudioState('playing');
        console.log(`Successfully transitioned to sentence ${nextIndex}`);
      } catch (error) {
        console.error(`Error during sentence transition:`, error);
        setAudioState('error');
        dispatch(
          updateAudioState({
            isPlaying: false,
          })
        );
        handleError(error as Error);
      }
    },
    [
      dispatch,
      validateSentenceData,
      prepareWordTimings,
      onPlaybackStatusUpdate,
      handleError,
      currentSentenceIndex,
      sentenceIndexOffsetRef,
    ]
  );

  // Add a new function to resume at a specific sentence without incrementing
  const playSentenceAtIndex = useCallback(
    async (targetIndex: number): Promise<void> => {
      console.log(`Playing specific sentence at index ${targetIndex}`);

      try {
        // Reset word highlight
        dispatch(setCurrentWord({ wordId: null, position: null }));

        // Validate sentence exists
        const sentenceData = validateSentenceData(targetIndex);
        if (!sentenceData) {
          console.log(`No valid sentence found at index ${targetIndex}, ending playback`);
          dispatch(
            updateAudioState({
              sentenceId: null,
              isPlaying: false,
            })
          );
          setAudioState('idle');
          return;
        }

        // Update Redux state - important to set exactly the target index
        dispatch(
          updateAudioState({
            sentenceId: targetIndex, // Use the exact target index
            isPlaying: true,
            wordId: null,
            position: null,
          })
        );

        setAudioState('loading');

        // Prepare word timings
        const mappedTimings = prepareWordTimings(sentenceData);
        wordTimingRef.current = mappedTimings;
        lastActiveIndex.current = 0;

        // Clean up previous sound
        try {
          if (soundRef.current) {
            const unloadPromise = soundRef.current.unloadAsync();
            const timeoutPromise = new Promise<void>(resolve => {
              setTimeout(resolve, 1000);
            });
            await Promise.race([unloadPromise, timeoutPromise]);
            soundRef.current = null;
          }
        } catch (err) {
          console.error('Error unloading previous sound:', err);
          soundRef.current = null;
        }

        console.log(`Loading sound for specific sentence ${targetIndex}`);

        // Load sound for this specific sentence
        let sound: Audio.Sound;
        const adjustedIndex = targetIndex - sentenceIndexOffsetRef.current;
        const preloadedSound = preloadedSoundsRef.current[adjustedIndex];

        if (preloadedSound) {
          console.log(`Using preloaded sound for sentence ${targetIndex}`);
          sound = preloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: 0, // Start from beginning of this sentence
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          console.log(`Creating new sound for sentence ${targetIndex}`);
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: sentenceData.audioUrl },
            { progressUpdateIntervalMillis: 100 },
            onPlaybackStatusUpdate
          );
          sound = newSound;
          await sound.playAsync();
        }

        // Store the sound
        soundRef.current = sound;
        setAudioState('playing');
        console.log(`Successfully started playback for specific sentence ${targetIndex}`);
      } catch (error) {
        console.error(`Error playing specific sentence:`, error);
        setAudioState('error');
        dispatch(
          updateAudioState({
            isPlaying: false,
          })
        );
        handleError(error as Error);
      }
    },
    [
      dispatch,
      validateSentenceData,
      prepareWordTimings,
      onPlaybackStatusUpdate,
      handleError,
      sentenceIndexOffsetRef,
    ]
  );

  // Export the new function through the ref
  useEffect(() => {
    const originalPlayNextSentence = playNextSentence;

    // Create an extended version of the ref that includes both functions
    playNextSentenceRef.current = originalPlayNextSentence;
    // Add the playSentenceAtIndex function as a property
    playNextSentenceRef.current.playSentenceAtIndex = playSentenceAtIndex;
  }, [playNextSentence, playSentenceAtIndex]);

  // ---- Stop playback mid-sentence if needed ----
  const stopPlayback = useCallback(
    async (shouldUnload = true): Promise<boolean> => {
      try {
        if (soundRef.current) {
          // Always stop playback
          await soundRef.current.stopAsync();

          // Only unload if explicitly requested - for pause we want to keep the sound loaded
          if (shouldUnload) {
            await cleanupAudio();
          } else {
            // Just update Redux state but keep the sound loaded
            dispatch(
              updateAudioState({
                isPlaying: false,
              })
            );
            setAudioState('paused');
          }
        }
        return true;
      } catch (error) {
        handleError(error as Error);
        return false;
      }
    },
    [cleanupAudio, dispatch]
  );

  // For public API - add resumePlayback
  const resumePlayback = useCallback(
    async (sentenceIndex: number, audioPositionMs: number = 0): Promise<boolean> => {
      console.log(`Resuming playback at sentence ${sentenceIndex}, position ${audioPositionMs}ms`);

      try {
        // Check if we already have a loaded sound for this sentence
        if (soundRef.current && currentSentenceIndex === sentenceIndex && audioState === 'paused') {
          console.log(`Sound already loaded for sentence ${sentenceIndex}, resuming directly`);

          // Update Redux state
          dispatch(
            updateAudioState({
              sentenceId: sentenceIndex,
              isPlaying: true,
            })
          );

          // Ensure position is set correctly
          if (audioPositionMs > 0) {
            try {
              await soundRef.current.setPositionAsync(audioPositionMs);
              console.log(`Set position to ${audioPositionMs}ms`);
            } catch (err) {
              console.error('Error setting position:', err);
            }
          }

          // Resume playback
          await soundRef.current.playAsync();
          setAudioState('playing');
          return true;
        }

        // If we don't have a loaded sound or it's for a different sentence,
        // load a new one using playSentenceAtIndex
        const sentenceData = validateSentenceData(sentenceIndex);
        if (!sentenceData) {
          console.log(`Cannot resume - invalid sentence index ${sentenceIndex}`);
          return false;
        }

        // Use the same sentence index without incrementing
        await playSentenceAtIndex(sentenceIndex);

        // If we have a position, seek to it - but make sure sound is loaded first
        if (audioPositionMs > 0 && soundRef.current) {
          try {
            // Create a retry loop to ensure the sound is fully loaded
            let retries = 0;
            const maxRetries = 5;
            let positionSet = false;

            while (retries < maxRetries && !positionSet) {
              try {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                  await soundRef.current.setPositionAsync(audioPositionMs);
                  console.log(`Set position to ${audioPositionMs}ms after ${retries} retries`);
                  positionSet = true;
                } else {
                  // Wait a bit before retrying
                  await new Promise(resolve => setTimeout(resolve, 100));
                  retries++;
                }
              } catch (err) {
                console.error(`Error setting position (retry ${retries}):`, err);
                retries++;
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            if (!positionSet) {
              console.error(`Failed to set position after ${maxRetries} retries`);
            }
          } catch (err) {
            console.error('Error in position retry loop:', err);
          }
        }

        return true;
      } catch (error) {
        console.error('Error in resumePlayback:', error);
        handleError(error as Error);
        return false;
      }
    },
    [
      validateSentenceData,
      playSentenceAtIndex,
      handleError,
      dispatch,
      currentSentenceIndex,
      audioState,
    ]
  );

  // ---- Start from the first sentence in a list ----
  const startPlayback = useCallback(
    async (
      sentences: SentenceAudio[],
      options?: {
        startPositionMs?: number;
        initialWordId?: number | null;
        sentenceOffset?: number;
        forceReset?: boolean;
      }
    ): Promise<boolean> => {
      const {
        startPositionMs = 0,
        initialWordId = null,
        sentenceOffset = 0,
        forceReset = false,
      } = options || {};

      console.log(
        `startPlayback: Starting with ${sentences.length} sentences, offset=${sentenceOffset}, position=${startPositionMs}ms`
      );

      if (!sentences?.length || !sentences[0]?.audioUrl) {
        console.log(`startPlayback: No valid sentences provided`);
        return false;
      }

      try {
        // Store sentences and the sentenceOffset for index calculations
        sentencesRef.current = sentences;
        sentenceIndexOffsetRef.current = sentenceOffset;

        // Important: Make sure the transition flag is reset to false
        isTransitioningRef.current = false;

        console.log(
          `startPlayback: Set sentences array (length: ${sentences.length}) with offset ${sentenceOffset}`
        );
        console.log(
          `startPlayback: First sentence ID: ${sentences[0]?.sentenceId}, Last sentence ID: ${sentences[sentences.length - 1]?.sentenceId}`
        );

        // Preload audio with error handling
        setAudioState('loading');
        console.log(`startPlayback: Preloading audio files...`);
        const preloadSuccess = await preloadAudioFiles(sentences);
        if (!preloadSuccess && !forceReset) {
          console.log(`startPlayback: Preloading failed`);
          handleError(new Error('Failed to preload audio files'));
        }

        // Clean up previous playback state
        await cleanupAudio();
        console.log(`startPlayback: Cleaned up previous playback state`);

        // First sentence to play
        const firstSentence = sentences[0];
        console.log(`startPlayback: Preparing first sentence (ID: ${firstSentence.sentenceId})`);

        // Prepare word timings with validation
        const validTimings = firstSentence.wordTimings
          .map(
            (timing, i): WordTiming => ({
              wordId: timing.wordId,
              startTime: normalizeTimingToMs(timing.startTime),
              endTime: normalizeTimingToMs(timing.endTime),
              position: i,
            })
          )
          .filter((t): boolean => t.startTime < t.endTime && t.startTime >= 0);

        console.log(`startPlayback: Prepared ${validTimings.length} valid word timings`);
        wordTimingRef.current = validTimings;

        // Find correct position for initialWordId with fallback
        let wordPosition = null;
        if (initialWordId !== null) {
          const foundIndex = validTimings.findIndex(t => t.wordId === initialWordId);
          wordPosition = foundIndex >= 0 ? foundIndex : null;
          lastActiveIndex.current = wordPosition !== null ? wordPosition : 0;
          console.log(`startPlayback: Found word ${initialWordId} at position ${wordPosition}`);
        } else {
          lastActiveIndex.current = 0;
          console.log(`startPlayback: No initial word ID, starting at beginning`);
        }

        // Validate startPositionMs against word timing
        let finalPositionMs = startPositionMs;
        if (wordPosition !== null && wordPosition >= 0 && validTimings.length > wordPosition) {
          const wordTiming = validTimings[wordPosition];
          if (wordTiming && typeof wordTiming.startTime === 'number') {
            const wordStart = wordTiming.startTime;

            // Use word start time with a small adjustment for natural timing
            if (startPositionMs === 0 || Math.abs(startPositionMs - wordStart) > 1000) {
              finalPositionMs = Math.max(0, wordStart - 100);
              console.log(
                `startPlayback: Adjusted position to ${finalPositionMs}ms based on word timing`
              );
            }
          }
        }

        // Update Redux with well-validated state - use the absolute index
        console.log(`startPlayback: Updating Redux state (sentenceId: ${sentenceOffset})`);
        dispatch(
          updateAudioState({
            sentenceId: sentenceOffset,
            isPlaying: true,
            wordId: initialWordId,
            position: wordPosition,
          })
        );

        // Load and play audio with appropriate position
        console.log(`startPlayback: Loading and playing audio...`);
        let sound: Audio.Sound;
        const firstPreloadedSound = preloadedSoundsRef.current[0];

        if (firstPreloadedSound) {
          console.log(`startPlayback: Using preloaded sound`);
          sound = firstPreloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: finalPositionMs,
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          // Fallback with retry mechanism
          console.log(`startPlayback: No preloaded sound, loading dynamically`);
          sound = await retryWithBackoff(
            async () => {
              const { sound } = await Audio.Sound.createAsync(
                { uri: firstSentence.audioUrl },
                {
                  shouldPlay: true,
                  progressUpdateIntervalMillis: 100,
                  positionMillis: finalPositionMs,
                },
                onPlaybackStatusUpdate
              );
              return sound;
            },
            3,
            300,
            'loading first sentence'
          );
        }

        soundRef.current = sound;
        console.log(`startPlayback: Sound loaded and assigned`);

        // Ensure playback actually starts and completion detection works
        setTimeout(async () => {
          if (soundRef.current) {
            try {
              const checkStatus = await soundRef.current.getStatusAsync();
              if (checkStatus.isLoaded && !checkStatus.isPlaying) {
                console.log(`startPlayback: Playback not started automatically, forcing play`);
                await soundRef.current.playAsync();
              }

              // Set up a completion check for this sound directly
              setTimeout(async () => {
                try {
                  if (!soundRef.current) return;
                  const finalCheck = await soundRef.current.getStatusAsync();
                  if (
                    finalCheck.isLoaded &&
                    finalCheck.durationMillis &&
                    finalCheck.positionMillis >= finalCheck.durationMillis - 100
                  ) {
                    console.log('Delayed completion check - forcing next sentence');
                    playNextSentenceRef.current().catch(handleError);
                  }
                } catch (err) {
                  console.error('Delayed completion check error:', err);
                }
              }, 5000); // Check 5 seconds after starting playback
            } catch (err) {
              console.error('Error checking playback status:', err);
            }
          }
        }, 500);

        // Initialize word tracking with cleanup
        if (validTimings.length > 0) {
          const trackingCleanup = trackWordTiming();
          cleanupRef.current = trackingCleanup;
          console.log(`startPlayback: Word tracking initialized`);
        }

        setAudioState('playing');
        console.log(`startPlayback: Successfully started playback`);
        return true;
      } catch (error) {
        console.error('Error in startPlayback:', error);
        handleError(error as Error);
        await cleanupAudio();

        // Recovery attempt for critical failures
        if (sentenceOffset > 0 && sentences.length > 1 && !forceReset) {
          try {
            // Try to play next sentence instead
            console.log(`startPlayback: Attempting recovery with next sentence`);
            const nextSentences = sentences.slice(1);
            return await startPlayback(nextSentences, {
              sentenceOffset: sentenceOffset + 1,
              forceReset: true,
            });
          } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
            handleError(recoveryError as Error);
          }
        }

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
      currentSentenceIndex,
      handleError,
    ]
  );

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

  // ---- Handle audio completion ----
  const handleAudioComplete = useCallback(async () => {
    console.log(`Audio completion detected - moving to next sentence`);

    // If no current sentence index, reset
    if (currentSentenceIndex === null || currentSentenceIndex === undefined) {
      console.log('No current sentence index - resetting state');
      dispatch(setPlayingState(false));
      return;
    }

    // Otherwise play the next sentence
    await playNextSentence(currentSentenceIndex);
  }, [playNextSentence, currentSentenceIndex, dispatch]);

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
    resumePlayback,
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
