import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectCurrentWordId,
  selectCurrentPosition,
  selectIsPlaying,
  selectCurrentSentenceId,
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
  timingIntervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  setManualNavigation: (isManual: boolean, timeoutMs?: number) => void;
} {
  const dispatch = useDispatch();

  // Redux states
  const currentWordId = useSelector(selectCurrentWordId);
  const currentPosition = useSelector(selectCurrentPosition);
  const isPlaying = useSelector(selectIsPlaying);
  const currentSentenceIndex = useSelector(selectCurrentSentenceId);

  // Local states
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>(
    'idle'
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wordTimingRef = useRef<WordTiming[]>([]);
  const timingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentencesRef = useRef<SentenceAudio[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const preloadedSoundsRef = useRef<(Audio.Sound | null)[]>([]);
  const playNextSentenceRef = useRef<PlayNextSentenceFunction>(async (): Promise<void> => {});
  // Add completion flag ref to prevent duplicate next sentence calls
  const isHandlingCompletionRef = useRef(false);
  // Add ref to track when completion was last handled
  const lastCompletionTimeRef = useRef(0);
  // We keep a forward-only pointer
  const lastActiveIndex = useRef(0);
  // Add a ref to track previous position for detecting backward seeks
  const prevPositionRef = useRef(0);
  // Add refs to track all active timers
  const activeTimersRef = useRef<
    Set<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>
  >(new Set());

  // Add a new ref to track the original index offset
  const sentenceIndexOffsetRef = useRef<number>(0);

  // Add a ref to track manual navigation
  const isManualNavigationRef = useRef<boolean>(false);

  // Add a timeout ref to clear the manual navigation flag
  const manualNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add a ref for the safety timer
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add a ref to track the last progress update time for throttling
  const lastProgressUpdateRef = useRef<number>(0);
  const PROGRESS_UPDATE_THRESHOLD_MS = 250; // Minimum ms between progress updates

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

  // Helper to safely clear and remove a timer
  const clearTimer = useCallback(
    (timerId: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null) => {
      if (timerId) {
        clearTimeout(timerId);
        clearInterval(timerId);
        activeTimersRef.current.delete(timerId);
      }
    },
    []
  );

  // Helper to register a new timer
  const registerTimer = useCallback(
    (timerId: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) => {
      activeTimersRef.current.add(timerId);
      return timerId;
    },
    []
  );

  // Effect to clean up all active timers on unmount
  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(timerId => {
        clearTimer(timerId);
      });
      activeTimersRef.current.clear();
    };
  }, [clearTimer]);

  // ---- Cleanup function ----
  const cleanupAudio = useCallback(async (): Promise<void> => {
    // Clear timing interval
    if (timingIntervalRef.current !== null) {
      clearTimer(timingIntervalRef.current);
      timingIntervalRef.current = null;
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

    // Clear all active timers
    activeTimersRef.current.forEach(timerId => {
      clearTimer(timerId);
    });
    activeTimersRef.current.clear();
  }, [dispatch, clearTimer]);

  // ---- Word tracking with efficient interval-based approach ----
  const trackWordTiming = useCallback((): (() => void) => {
    // Use interval instead of requestAnimationFrame to reduce CPU usage
    const INTERVAL_MS = 450;
    const WORD_OVERLAP_MS = 200;
    const MAX_CHECKS_PER_INTERVAL = 4;

    // Clear any existing timing interval
    if (timingIntervalRef.current !== null) {
      clearTimer(timingIntervalRef.current);
      timingIntervalRef.current = null;
    }

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

        const currentTimeMs = status.positionMillis;
        const timings = wordTimingRef.current;

        // Detect backward seeking by comparing with previous position
        if (currentTimeMs < prevPositionRef.current - 100) {
          // 100ms threshold to avoid minor fluctuations
          // Reset lastActiveIndex to start searching from beginning
          lastActiveIndex.current = 0;
        }
        prevPositionRef.current = currentTimeMs;

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

    // Start the interval and register it
    const intervalId = setInterval(updateWordHighlight, INTERVAL_MS);
    timingIntervalRef.current = registerTimer(intervalId);

    // Return cleanup function
    return () => {
      if (timingIntervalRef.current) {
        clearTimer(timingIntervalRef.current);
        timingIntervalRef.current = null;
      }
    };
  }, [dispatch, clearTimer, registerTimer]);

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

      // Throttle progress updates to reduce unnecessary renders
      const now = Date.now();
      if (now - lastProgressUpdateRef.current > PROGRESS_UPDATE_THRESHOLD_MS) {
        setProgress(status.positionMillis);
        setDuration(status.durationMillis ?? 0);
        lastProgressUpdateRef.current = now;
      }

      // REVISED: Improved completion detection logic, relying primarily on didJustFinish
      // This is the canonical source of truth for when to move to the next sentence
      if (status.didJustFinish) {
        // Skip automatic next sentence if manual navigation is in progress
        if (isManualNavigationRef.current) {
          return;
        }

        // Debounce completion handling
        const now = Date.now();
        if (now - lastCompletionTimeRef.current < 1000) {
          return; // Skip if we handled completion recently
        }

        // Use atomic flag to prevent duplicate calls
        if (isHandlingCompletionRef.current) {
          return;
        }
        isHandlingCompletionRef.current = true;
        lastCompletionTimeRef.current = now;

        // Check if we're already at the last sentence to prevent infinite loop
        const isAtLastSentence =
          currentSentenceIndex !== null &&
          sentencesRef.current.length > 0 &&
          currentSentenceIndex >= sentencesRef.current.length - 1 + sentenceIndexOffsetRef.current;

        if (isAtLastSentence) {
          // Use a separate async function to handle cleanup
          (async () => {
            // Stop all playback and reset state
            if (soundRef.current) {
              try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
              } catch (error) {
                handleError(error as Error);
              }
            }

            // Reset state
            dispatch(
              updateAudioState({
                wordId: null,
                position: null,
                isPlaying: false,
                sentenceId: null,
              })
            );
            setAudioState('idle');

            isHandlingCompletionRef.current = false;
          })().catch(() => {
            isHandlingCompletionRef.current = false;
          });
          return;
        }

        // IMPORTANT: Let playNextSentence handle all index calculations
        // This ensures there's a single source of truth for advancing sentences
        playNextSentenceRef
          .current()
          .catch(error => {
            handleError(error);
            dispatch(setPlayingState(false));
            isHandlingCompletionRef.current = false;
          })
          .finally(() => {
            // Ensure completion flag is always reset
            setTimeout(() => {
              isHandlingCompletionRef.current = false;
            }, 500);
          });
        return;
      }

      // Completely revised state synchronization check to avoid "unexpected stop" errors
      // Only consider it unexpected if:
      // 1. We think we should be playing (Redux state)
      // 2. The status indicates it's not playing or buffering
      // 3. It's not at the end of the track
      // 4. It's been at least 500ms since we started playing (to avoid initial state conflicts)
      if (
        isPlaying &&
        !status.isPlaying &&
        !status.isBuffering &&
        !status.didJustFinish &&
        status.positionMillis > 0 && // Only care if we've actually started playing
        status.durationMillis &&
        status.positionMillis < status.durationMillis - 400 // Increased margin to avoid conflict with end detection
      ) {
        // Audio has genuinely stopped unexpectedly
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
    [dispatch, isPlaying, currentSentenceIndex, sentenceIndexOffsetRef]
  );

  // Add effect to detect stalled transitions
  useEffect(() => {
    let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

    if (isTransitioning) {
      transitionTimeout = setTimeout(() => {
        setIsTransitioning(false);
        dispatch(updateAudioState({ isPlaying: false }));
        setAudioState('paused');
      }, 3000);
      registerTimer(transitionTimeout);
    }

    return () => {
      if (transitionTimeout) {
        clearTimer(transitionTimeout);
      }
    };
  }, [isTransitioning, dispatch, clearTimer, registerTimer]);

  // Add a safety timer to detect and recover from stuck playback - make more robust
  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    // Only set up the timer when actually playing
    if (isPlaying && currentSentenceIndex !== null) {
      safetyTimer = setTimeout(() => {
        // Skip stalling detection if manual navigation is in progress
        if (isManualNavigationRef.current) {
          return;
        }

        // Check if we're still on the same sentence after a delay
        if (soundRef.current && isPlaying) {
          soundRef.current
            .getStatusAsync()
            .then(status => {
              if (status.isLoaded) {
                const { positionMillis, durationMillis, isPlaying: stillPlaying } = status;

                // Check if we're near the end - if so, let the normal didJustFinish handle it
                // Now we only consider playback stuck if we're not within 90% of the duration
                // This avoids overlap with the normal end-of-track detection in onPlaybackStatusUpdate
                const isNearEnd =
                  positionMillis > 0 &&
                  durationMillis != null &&
                  durationMillis > 0 &&
                  positionMillis >= durationMillis * 0.9;

                // Only consider it stuck if:
                // 1. It's not playing AND
                // 2. We're NOT near the end (let didJustFinish handle end-of-track cases)
                const isStuck = !stillPlaying && !isNearEnd;

                if (isStuck) {
                  // Prevent race conditions with onPlaybackStatusUpdate by using the same flags
                  if (isHandlingCompletionRef.current) {
                    return; // Skip if already handling completion
                  }

                  // Use atomic flag to prevent duplicate calls
                  isHandlingCompletionRef.current = true;
                  lastCompletionTimeRef.current = Date.now();

                  // Force next sentence regardless of current position
                  playNextSentenceRef.current().catch(error => {
                    handleError(error);
                    // Reset the flag in case of error
                    isHandlingCompletionRef.current = false;
                  });
                }
              }
            })
            .catch(_err => {
              // If we can't even check status, assume we need to move forward
              // But first check if we're already handling completion
              if (isHandlingCompletionRef.current) {
                return; // Skip if already handling completion
              }

              // Use atomic flag to prevent duplicate calls
              isHandlingCompletionRef.current = true;
              lastCompletionTimeRef.current = Date.now();

              playNextSentenceRef.current().catch(error => {
                handleError(error);
                // Reset the flag in case of error
                isHandlingCompletionRef.current = false;
              });
            });
        }
      }, 1500); // Increased from 1000ms to 1500ms to give more time for normal completion

      // Store reference to the timer
      safetyTimerRef.current = safetyTimer;

      // Register the timer for cleanup
      if (registerTimer) {
        registerTimer(safetyTimer);
      }
    }

    return () => {
      if (safetyTimer) {
        clearTimer(safetyTimer);
        safetyTimerRef.current = null;
      }
    };
  }, [isPlaying, currentSentenceIndex, clearTimer, registerTimer]);

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

    // Convert to relative index for array access
    const relativeIdx = currentIdx - sentenceIndexOffsetRef.current;

    if (relativeIdx < 0) {
      return;
    }

    // Store a reference to the currently playing sound to avoid unloading it
    const currentSound = soundRef.current;

    // Unload sentences that are too far behind - but never unload the currently playing sound
    for (let i = 0; i < relativeIdx - 1; i++) {
      const sound = preloadedSoundsRef.current[i];

      // Skip if this is the sound currently playing or if no sound
      if (!sound || sound === currentSound) {
        continue;
      }

      // Also protect the sound at the current index
      if (i === relativeIdx) {
        continue;
      }

      try {
        await sound.unloadAsync();
        preloadedSoundsRef.current[i] = null;
      } catch (err) {
        handleError(err as Error);
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
        const { sound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          { shouldPlay: false }
        );
        preloadedSoundsRef.current[i] = sound;
      } catch (error) {
        handleError(error as Error);
      }
    }
  }, [currentSentenceIndex, sentenceIndexOffsetRef.current, handleError]);

  // Update preloading window when sentence changes - use a longer timeout to ensure playback is stable first
  useEffect(() => {
    if (currentSentenceIndex !== null) {
      // Add a delay before updating the preload window to prevent race conditions
      const timeoutId = setTimeout(() => {
        updatePreloadingWindow();
      }, 500); // 500ms delay to ensure the current audio is stable

      return () => clearTimer(timeoutId);
    }
  }, [currentSentenceIndex, updatePreloadingWindow]);

  // Helper functions to reduce cognitive complexity in playNextSentence

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
      return null;
    }

    // Adjust the index by subtracting the offset
    // This transforms from original array index to sliced array index
    const adjustedIndex = nextIndex - sentenceIndexOffsetRef.current;

    if (adjustedIndex < 0 || adjustedIndex >= sentencesRef.current.length) {
      return null;
    }

    const nextSentence = sentencesRef.current[adjustedIndex];
    if (!nextSentence) {
      return null;
    }

    if (!nextSentence.audioUrl) {
      return null;
    }

    return nextSentence;
  }, []);

  // ---- Play next sentence (recursive playback) ----
  const playNextSentence = useCallback(async (): Promise<void> => {
    if (isTransitioning) {
      return;
    }

    try {
      // Ensure we clean up completion flags regardless of success or failure
      const cleanupCompletionState = () => {
        isHandlingCompletionRef.current = false;
      };

      // Properly track transition state
      setIsTransitioning(true);

      // Get the next sentence index (null by default)
      const fromIndex = currentSentenceIndex;
      const nextIndex = fromIndex !== null ? fromIndex + 1 : 0;

      // Only validate the sentence if we have a current index
      const nextSentence = validateSentenceData(nextIndex);

      // Check if we're at the end
      if (!nextSentence) {
        // IMPROVEMENT: Use a single atomic update with all needed properties
        dispatch(
          updateAudioState({
            sentenceId: fromIndex,
            isPlaying: false,
            wordId: null,
            position: null,
          })
        );
        setAudioState('idle');
        setIsTransitioning(false);
        cleanupCompletionState();
        return;
      }

      // IMPORTANT: Explicitly set the current sentence index in Redux before processing
      // This ensures UI and audio are always synchronized
      // IMPROVEMENT: Use a single updateAudioState instead of separate dispatches
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
        soundRef.current = null;
      }

      // REVISED: More robust sound loading
      let sound: Audio.Sound;
      const adjustedIndex = nextIndex - sentenceIndexOffsetRef.current;
      const preloadedSound = preloadedSoundsRef.current[adjustedIndex];

      if (preloadedSound) {
        sound = preloadedSound;
        await sound.setStatusAsync({
          shouldPlay: true,
          progressUpdateIntervalMillis: 100,
          positionMillis: 0,
        });
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          { progressUpdateIntervalMillis: 100 },
          onPlaybackStatusUpdate
        );
        sound = newSound;
        await sound.playAsync();
      }

      // Store the sound and clear transition state
      soundRef.current = sound;
      setAudioState('playing');
      setIsTransitioning(false);

      // Ensure playback actually starts and completion detection works
      setTimeout(async () => {
        if (soundRef.current) {
          try {
            const checkStatus = await soundRef.current.getStatusAsync();
            if (checkStatus.isLoaded && !checkStatus.isPlaying) {
              await soundRef.current.playAsync();
            }

            // Note: The 5-second completion check has been removed to rely on
            // the other check mechanisms (onPlaybackStatusUpdate)
          } catch (err) {
            handleError(err as Error);
          }
        }
      }, 500);

      // Initialize word tracking with cleanup
      if (mappedTimings.length > 0) {
        const trackingCleanup = trackWordTiming();
        cleanupRef.current = trackingCleanup;
      }

      // Ensure the transition state is cleared and completion flags are reset
      setIsTransitioning(false);
      cleanupCompletionState();
    } catch (error) {
      setAudioState('error');
      setIsTransitioning(false);
      dispatch(
        updateAudioState({
          isPlaying: false,
        })
      );
      // Ensure completion flags are reset even on error
      isHandlingCompletionRef.current = false;
      handleError(error as Error);
    }
  }, [
    dispatch,
    validateSentenceData,
    prepareWordTimings,
    onPlaybackStatusUpdate,
    currentSentenceIndex,
    sentenceIndexOffsetRef,
    isTransitioning,
  ]);

  // Add a new function to resume at a specific sentence without incrementing
  const playSentenceAtIndex = useCallback(
    async (targetIndex: number): Promise<void> => {
      try {
        // Validate sentence exists
        const sentenceData = validateSentenceData(targetIndex);
        if (!sentenceData) {
          dispatch(
            updateAudioState({
              sentenceId: null,
              isPlaying: false,
              wordId: null,
              position: null,
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
          soundRef.current = null;
        }

        // Load sound for this specific sentence
        let sound: Audio.Sound;
        const adjustedIndex = targetIndex - sentenceIndexOffsetRef.current;
        const preloadedSound = preloadedSoundsRef.current[adjustedIndex];

        if (preloadedSound) {
          sound = preloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: 0, // Start from beginning of this sentence
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
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
      } catch (error) {
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
      try {
        // Check if we already have a loaded sound for this sentence
        if (soundRef.current && currentSentenceIndex === sentenceIndex && audioState === 'paused') {
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
            } catch (err) {
              handleError(err as Error);
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
                  positionSet = true;
                } else {
                  // Wait a bit before retrying
                  await new Promise(resolve => setTimeout(resolve, 100));
                  retries++;
                }
              } catch (err) {
                handleError(err as Error);
                retries++;
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            if (!positionSet) {
              handleError(new Error(`Failed to set position after ${maxRetries} retries`));
            }
          } catch (err) {
            handleError(err as Error);
          }
        }

        return true;
      } catch (error) {
        handleError(error as Error);
        return false;
      }
    },
    [validateSentenceData, playSentenceAtIndex, dispatch, currentSentenceIndex, audioState]
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

      if (!sentences?.length || !sentences[0]?.audioUrl) {
        return false;
      }

      try {
        // Store sentences and the sentenceOffset for index calculations
        sentencesRef.current = sentences;
        sentenceIndexOffsetRef.current = sentenceOffset;

        // Reset transition state
        setIsTransitioning(false);

        // Preload audio with error handling
        setAudioState('loading');

        const preloadSuccess = await preloadAudioFiles(sentences);
        if (!preloadSuccess && !forceReset) {
          handleError(new Error('Failed to preload audio files'));
        }

        // Clean up previous playback state
        await cleanupAudio();

        // First sentence to play
        const firstSentence = sentences[0];

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

        wordTimingRef.current = validTimings;

        // Find correct position for initialWordId with fallback
        let wordPosition = null;
        if (initialWordId !== null) {
          const foundIndex = validTimings.findIndex(t => t.wordId === initialWordId);
          wordPosition = foundIndex >= 0 ? foundIndex : null;
          lastActiveIndex.current = wordPosition !== null ? wordPosition : 0;
        } else {
          lastActiveIndex.current = 0;
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
            }
          }
        }

        // Update Redux with well-validated state - use the absolute index
        dispatch(
          updateAudioState({
            sentenceId: sentenceOffset,
            isPlaying: true,
            wordId: initialWordId,
            position: wordPosition,
          })
        );

        // Load and play audio with appropriate position
        let sound: Audio.Sound;
        const firstPreloadedSound = preloadedSoundsRef.current[0];

        if (firstPreloadedSound) {
          sound = firstPreloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: finalPositionMs,
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          // Fallback with retry mechanism
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

        // Ensure playback actually starts and completion detection works
        setTimeout(async () => {
          if (soundRef.current) {
            try {
              const checkStatus = await soundRef.current.getStatusAsync();
              if (checkStatus.isLoaded && !checkStatus.isPlaying) {
                await soundRef.current.playAsync();
              }

              // Note: The 5-second completion check has been removed to rely on
              // the other check mechanisms (onPlaybackStatusUpdate)
            } catch (err) {
              handleError(err as Error);
            }
          }
        }, 500);

        // Initialize word tracking with cleanup
        if (validTimings.length > 0) {
          const trackingCleanup = trackWordTiming();
          cleanupRef.current = trackingCleanup;
        }

        setAudioState('playing');
        return true;
      } catch (error) {
        handleError(error as Error);
        await cleanupAudio();

        // Instead of skipping to the next sentence, retry the current one with exponential backoff
        if (!forceReset) {
          try {
            // Wait a bit before retrying to allow for transient issues to resolve
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Retry with forceReset to bypass preload check
            return await startPlayback(sentences, {
              ...options,
              forceReset: true,
            });
          } catch (retryError) {
            handleError(retryError as Error);
            // Update state to show error
            dispatch(
              updateAudioState({
                isPlaying: false,
                sentenceId: sentenceOffset,
              })
            );
            setAudioState('error');
          }
        }

        // If we get here, all retries failed
        dispatch(
          updateAudioState({
            isPlaying: false,
            sentenceId: sentenceOffset,
          })
        );
        setAudioState('error');
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
      if (timingIntervalRef.current) {
        clearTimer(timingIntervalRef.current);
        timingIntervalRef.current = null;
      }
    };
  }, []);

  // Helper to set manual navigation mode with automatic timeout
  const setManualNavigation = useCallback(
    (isManual: boolean, timeoutMs = 2000) => {
      // Clear any existing timeout
      if (manualNavigationTimeoutRef.current) {
        clearTimeout(manualNavigationTimeoutRef.current);
        manualNavigationTimeoutRef.current = null;
      }

      // Set the flag immediately
      isManualNavigationRef.current = isManual;

      // IMPROVEMENT: Clear stalling detection timer during manual navigation
      // to prevent unwanted auto-advancement
      if (isManual && safetyTimerRef.current) {
        clearTimer(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }

      // If turning on manual navigation, set a timeout to turn it off
      if (isManual && timeoutMs > 0) {
        manualNavigationTimeoutRef.current = setTimeout(() => {
          isManualNavigationRef.current = false;
          manualNavigationTimeoutRef.current = null;
        }, timeoutMs);
      }
    },
    [clearTimer]
  );

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
    timingIntervalRef,

    // New method
    setManualNavigation,
  };
}
