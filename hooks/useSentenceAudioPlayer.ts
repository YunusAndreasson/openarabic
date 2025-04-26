/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  cancelAnimation,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
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
import type { Tables } from '../types/database.types';
import { handleError } from '../utils/errorHandling';

import { useDebounce, useThrottle } from './useBounce';

type AudioPlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

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

type PlaybackOptions = {
  startPositionMs?: number;
  initialWordId?: number | null;
  sentenceOffset?: number;
  forceReset?: boolean;
};

/**
 * Helper function for a simple retry of an async operation
 * @param operation Function to retry
 * @returns Promise resolving to operation result
 */
async function simpleRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Wait a short time before retrying
    await new Promise(resolve => setTimeout(resolve, 500));
    // One simple retry
    return await operation();
  }
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
  audioState: AudioPlayerState;
  progress: number;
  duration: number;
  isPreloading: boolean;
  startPlayback: (sentences: SentenceAudio[], options?: PlaybackOptions) => Promise<boolean>;
  stopPlayback: (shouldUnload?: boolean) => Promise<boolean>;
  resumePlayback: (sentenceIndex: number, audioPositionMs?: number) => Promise<boolean>;
  preloadAudioFiles: (sentences: SentenceAudio[]) => Promise<boolean>;
  findWordById: (
    wordId: number,
    sentenceWordsMap: SentenceWordsMap
  ) => Tables<'sentence_words'> | undefined;
  setAudioState: (state: AudioPlayerState) => void;
  setCurrentSentenceIndex: (idx: number | null) => void;
  soundRef: React.MutableRefObject<Audio.Sound | null>;
  wordTimingRef: React.MutableRefObject<WordTiming[]>;
  setManualNavigation: (isManual: boolean, timeoutMs?: number) => void;
  progressAnimValue: { value: number };
  durationAnimValue: { value: number };
  audioStateAnimValue: { value: string };
  formattedProgressTime: { value: string };
  formattedDurationTime: { value: string };
  playbackRate: { value: number };
  setPlaybackRate: (rate: number) => void;
} {
  const dispatch = useDispatch();

  // Redux states
  const currentWordId = useSelector(selectCurrentWordId);
  const currentPosition = useSelector(selectCurrentPosition);
  const isPlaying = useSelector(selectIsPlaying);
  const currentSentenceIndex = useSelector(selectCurrentSentenceId);

  // Reanimated shared values
  const isPlayerActive = useSharedValue(false);
  const lastCheckTime = useSharedValue(0);
  const progressAnimValue = useSharedValue(0);
  const durationAnimValue = useSharedValue(0);
  const audioStateAnimValue = useSharedValue<AudioPlayerState>('idle');
  const playbackRate = useSharedValue(1.0);
  const needsStatusCheck = useSharedValue(true);

  // Local states - keep only what's necessary
  const [audioState, setAudioState] = useState<AudioPlayerState>('idle');
  const [isPreloading, setIsPreloading] = useState(false);

  // Computed values from shared values
  const progress = progressAnimValue.value;
  const duration = durationAnimValue.value;

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wordTimingRef = useRef<WordTiming[]>([]);
  const sentencesRef = useRef<SentenceAudio[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const preloadedSoundsRef = useRef<(Audio.Sound | null)[]>([]);
  const playNextSentenceRef = useRef<PlayNextSentenceFunction>(async (): Promise<void> => {});
  const isHandlingCompletionRef = useRef<boolean>(false);
  const lastActiveIndex = useRef<number>(0);
  const activeTimersRef = useRef<
    Set<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>
  >(new Set());
  const sentenceIndexOffsetRef = useRef<number>(0);
  const isManualNavigationRef = useRef<boolean>(false);
  const manualNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper function to format time in MM:SS format
  const formatTimeDisplay = (timeMs: number): string => {
    'worklet';
    if (isNaN(timeMs) || timeMs < 0) return '0:00';

    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Add derived values for formatted time displays
  const formattedProgressTime = useDerivedValue(() => {
    return formatTimeDisplay(progressAnimValue.value);
  });

  const formattedDurationTime = useDerivedValue(() => {
    return formatTimeDisplay(durationAnimValue.value);
  });

  // Add a function to set playback rate
  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (rate < 0.5 || rate > 2.0) {
        return;
      }

      // Animate the rate change for UI
      playbackRate.value = withTiming(rate, { duration: 200 });

      // Apply the rate change to the actual sound
      if (soundRef.current) {
        // Need to run on JS thread since this is an async operation
        (async () => {
          try {
            await soundRef.current?.setRateAsync(rate, true); // true preserves pitch
          } catch (error) {
            handleError(error as Error);
          }
        })();
      }
    },
    [playbackRate]
  );

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

  // Add an effect to detect stalled transitions
  useEffect(() => {
    let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!isPlayerActive.value) {
      transitionTimeout = setTimeout(() => {
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
  }, [isPlayerActive, dispatch, clearTimer, registerTimer]);

  // ---- Cleanup function ----
  const cleanupAudio = useCallback(async (): Promise<void> => {
    // Reset Reanimated shared values with animations for smoother transitions
    isPlayerActive.value = false;
    progressAnimValue.value = withTiming(0, { duration: 300 });
    durationAnimValue.value = withTiming(0, { duration: 300 });
    audioStateAnimValue.value = withTiming('idle', { duration: 300 });

    // Clean up the sound instance
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
    } catch (err) {
      handleError(err as Error);
    }
    soundRef.current = null;

    // Batch update all Redux state changes
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
    lastActiveIndex.current = 0;
  }, [dispatch, isPlayerActive, progressAnimValue, durationAnimValue, audioStateAnimValue]);

  // Use Reanimated's shared values for better performance
  const trackWordTimingWithReanimated = useCallback((): (() => void) => {
    // Constants
    const INTERVAL_MS = 250;
    const WORD_OVERLAP_MS = 250;
    const JITTER_THRESHOLD_MS = 40;

    // Set player as active for Reanimated
    isPlayerActive.value = true;

    // Flag to track if we're already processing
    const isProcessing = { value: false };

    // Reset the check state at the start
    needsStatusCheck.value = true;

    // JS thread function to get sound status
    const getSoundStatus = async () => {
      if (!soundRef.current) {
        return { isLoaded: false } as AVPlaybackStatus;
      }

      try {
        return await soundRef.current.getStatusAsync();
      } catch (error) {
        handleError(error as Error);
        return { isLoaded: false } as AVPlaybackStatus;
      }
    };

    // JS thread function to process word positions based on status
    const processWordPosition = async () => {
      // Skip if already processing
      if (isProcessing.value) return;
      isProcessing.value = true;

      try {
        // Get sound status on JS thread
        const status = await getSoundStatus();

        if (!status.isLoaded) {
          isProcessing.value = false;
          return;
        }

        // Check if we still have valid refs
        if (!wordTimingRef.current || wordTimingRef.current.length === 0) {
          isProcessing.value = false;
          return;
        }

        const currentTimeMs = status.positionMillis;
        const duration = status.durationMillis || 0;

        // Skip processing if we have an invalid position or duration
        if (currentTimeMs < 0 || (duration > 0 && currentTimeMs > duration + 500)) {
          isProcessing.value = false;
          return;
        }

        // Update shared values via worklet-compatible animation methods
        // Only animate large position changes, use direct updates for small increments
        if (Math.abs(progressAnimValue.value - currentTimeMs) > 1000) {
          // Use animation for big jumps (seeking)
          progressAnimValue.value = withTiming(currentTimeMs, { duration: 100 });
        } else {
          // Direct update for small incremental changes (normal playback)
          progressAnimValue.value = currentTimeMs;
        }

        // Only animate duration if it actually changed
        if (durationAnimValue.value !== duration) {
          durationAnimValue.value = withTiming(duration, { duration: 100 });
        }

        const timings = wordTimingRef.current;

        // Exit early if at the last word
        if (lastActiveIndex.current >= timings.length - 1) {
          isProcessing.value = false;
          return;
        }

        // Check if current word is still active
        const currentWord = timings[lastActiveIndex.current];
        if (
          currentWord &&
          currentTimeMs >= currentWord.startTime - JITTER_THRESHOLD_MS &&
          currentTimeMs <= currentWord.endTime + WORD_OVERLAP_MS + JITTER_THRESHOLD_MS
        ) {
          isProcessing.value = false;
          return; // Still on the same word
        }

        // Check a small window of upcoming words
        const MAX_WORDS_TO_CHECK = 4;
        const endIndex = Math.min(lastActiveIndex.current + MAX_WORDS_TO_CHECK, timings.length);

        // Find the current word
        for (let i = lastActiveIndex.current + 1; i < endIndex; i++) {
          const word = timings[i];
          if (!word) continue;

          if (
            currentTimeMs >= word.startTime - JITTER_THRESHOLD_MS &&
            currentTimeMs <= word.endTime + WORD_OVERLAP_MS + JITTER_THRESHOLD_MS
          ) {
            // Found the current word - update state
            dispatch(setCurrentWord({ wordId: word.wordId, position: i }));
            lastActiveIndex.current = i;
            isProcessing.value = false;
            return;
          }
        }

        // Handle the case where we need to look further ahead
        const lastCheckedWord = timings[endIndex - 1];
        if (lastCheckedWord && currentTimeMs > lastCheckedWord.endTime + WORD_OVERLAP_MS) {
          // Jump ahead in larger increments
          const JUMP_SIZE = 5;
          let jumpIndex = endIndex;

          while (jumpIndex < timings.length) {
            const jumpWord = timings[jumpIndex];

            if (!jumpWord) {
              jumpIndex += JUMP_SIZE;
              continue;
            }

            if (currentTimeMs < jumpWord.startTime - JITTER_THRESHOLD_MS) {
              break;
            }

            if (
              currentTimeMs >= jumpWord.startTime - JITTER_THRESHOLD_MS &&
              currentTimeMs <= jumpWord.endTime + WORD_OVERLAP_MS + JITTER_THRESHOLD_MS
            ) {
              dispatch(setCurrentWord({ wordId: jumpWord.wordId, position: jumpIndex }));
              lastActiveIndex.current = jumpIndex;
              isProcessing.value = false;
              return;
            }

            jumpIndex += JUMP_SIZE;
          }

          // Find closest word if we jumped past
          if (jumpIndex >= timings.length) {
            let closestIndex = lastActiveIndex.current;

            for (let i = lastActiveIndex.current + 1; i < timings.length; i++) {
              const word = timings[i];
              if (!word) continue;

              if (word.startTime > currentTimeMs + JITTER_THRESHOLD_MS) {
                break;
              }

              closestIndex = i;
            }

            const closestWord = timings[closestIndex];
            if (closestWord) {
              dispatch(setCurrentWord({ wordId: closestWord.wordId, position: closestIndex }));
              lastActiveIndex.current = closestIndex;
            }
          }
        }
      } catch (error) {
        handleError(error as Error);
      } finally {
        isProcessing.value = false;
        // Signal that we've completed this check
        needsStatusCheck.value = true;
      }
    };

    // This is a pure worklet that triggers JS thread operations when needed
    const checkWordPosition = () => {
      'worklet';

      // Only trigger JS processing if:
      // 1. The player is active
      // 2. We're not already processing
      // 3. A check is needed
      if (isPlayerActive.value && needsStatusCheck.value && !isProcessing.value) {
        // Mark that we've started a check
        needsStatusCheck.value = false;
        // Run the actual processing on the JS thread
        runOnJS(processWordPosition)();
      }
    };

    // Use requestAnimationFrame for timing instead of intervals
    let rafId: number | null = null;
    lastCheckTime.value = Date.now();

    const scheduleNextCheck = () => {
      'worklet';

      // Schedule the next frame
      rafId = requestAnimationFrame(() => {
        const now = Date.now();

        // Only run every INTERVAL_MS milliseconds
        if (now - lastCheckTime.value >= INTERVAL_MS) {
          lastCheckTime.value = now;
          checkWordPosition();
        }

        // Always schedule next check if player is active
        if (isPlayerActive.value) {
          scheduleNextCheck();
        }
      });
    };

    // Start the loop
    scheduleNextCheck();

    // Return cleanup function
    return () => {
      'worklet';
      // Signal player is inactive
      isPlayerActive.value = false;

      // Cancel the animation frame if it exists
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [
    dispatch,
    isPlayerActive,
    lastCheckTime,
    progressAnimValue,
    durationAnimValue,
    needsStatusCheck,
  ]);

  // Effect to clean up all active timers on unmount
  useEffect(() => {
    // Also clean up any active animation frames
    let rafCleanup: (() => void) | null = null;

    // Start word tracking with Reanimated on mount
    if (isPlaying) {
      rafCleanup = trackWordTimingWithReanimated();
    }

    // Capture the ref value inside the effect
    const timers = activeTimersRef.current;

    return () => {
      // Cancel any active animations
      cancelAnimation(progressAnimValue);
      cancelAnimation(durationAnimValue);
      cancelAnimation(audioStateAnimValue);

      // Clean up RAF tracking
      if (rafCleanup) {
        rafCleanup();
      }

      // Clean up all timers using the captured value
      timers.forEach(timerId => {
        clearTimer(timerId);
      });
      timers.clear();
    };
  }, [
    isPlaying,
    trackWordTimingWithReanimated,
    clearTimer,
    progressAnimValue,
    durationAnimValue,
    audioStateAnimValue,
  ]);

  // Use the Reanimated version for word timing
  const trackWordTiming = trackWordTimingWithReanimated;

  // ---- Playback status callback with Reanimated optimization ----
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus): void => {
      if (!status.isLoaded) {
        // Check for error in a safer way
        if ('error' in status && status.error) {
          setAudioState('error');
          audioStateAnimValue.value = withTiming('error', { duration: 200 });
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

      // Update shared values with animations for smoother UI
      // Only animate large position changes, use direct updates for small increments
      if (Math.abs(progressAnimValue.value - status.positionMillis) > 1000) {
        // Use animation for big jumps (seeking)
        progressAnimValue.value = withTiming(status.positionMillis, { duration: 100 });
      } else {
        // Direct update for small incremental changes (normal playback)
        progressAnimValue.value = status.positionMillis;
      }

      // Only animate duration if it actually changed
      const durationMs = status.durationMillis ?? 0;
      if (durationAnimValue.value !== durationMs) {
        durationAnimValue.value = withTiming(durationMs, { duration: 100 });
      }

      // Use throttled function for React state updates
      throttledProgressUpdate(status.positionMillis, status.durationMillis ?? 0);

      // REVISED: Improved completion detection logic, relying primarily on didJustFinish
      // This is the canonical source of truth for when to move to the next sentence
      if (status.didJustFinish) {
        // Skip automatic next sentence if manual navigation is in progress
        if (isManualNavigationRef.current) {
          return;
        }

        // Use throttled completion handling
        throttledHandleCompletion();
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
        // Update Redux and local state together
        dispatch(updateAudioState({ isPlaying: false }));
        setAudioState('paused');
        audioStateAnimValue.value = withTiming('paused', { duration: 200 });
        return;
      }

      // Handle playback state changes
      if (status.isPlaying) {
        setAudioState('playing');
        audioStateAnimValue.value = withSpring('playing');
        dispatch(updateAudioState({ isPlaying: true }));

        // Ensure playback rate is maintained if it was changed
        if (playbackRate.value !== 1.0 && soundRef.current) {
          (async () => {
            try {
              await soundRef.current?.setRateAsync(playbackRate.value, true);
            } catch (error) {
              // Ignore errors from rate setting
            }
          })();
        }
      } else if (status.isBuffering) {
        setAudioState('loading');
        audioStateAnimValue.value = withTiming('loading', { duration: 150 });
      } else {
        setAudioState('paused');
        audioStateAnimValue.value = withTiming('paused', { duration: 200 });
        dispatch(updateAudioState({ isPlaying: false }));
      }
    },
    [dispatch, isPlaying, currentSentenceIndex, sentenceIndexOffsetRef, playbackRate]
  );

  // Throttle React state updates to reduce renders
  const throttledProgressUpdate = useThrottle<[number, number], void>(
    (positionMs, durationMs) => {
      // No need to update local state anymore, just update shared values
      if (Math.abs(progressAnimValue.value - positionMs) > 1000) {
        progressAnimValue.value = withTiming(positionMs, { duration: 100 });
      } else {
        progressAnimValue.value = positionMs;
      }

      if (durationAnimValue.value !== durationMs) {
        durationAnimValue.value = withTiming(durationMs, { duration: 100 });
      }
    },
    250,
    []
  );

  // Throttle completion handling to prevent duplicate calls
  const throttledHandleCompletion = useThrottle(
    () => {
      // No need for flag check - throttle already prevents concurrent calls

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

          // Reset state completely
          dispatch(
            updateAudioState({
              wordId: null,
              position: null,
              isPlaying: false,
              sentenceId: null,
            })
          );
          setAudioState('idle');

          // Reset all refs and offsets
          lastActiveIndex.current = 0;
          sentenceIndexOffsetRef.current = 0;
          isHandlingCompletionRef.current = false;

          // Cancel any active animations
          cancelAnimation(progressAnimValue);
          cancelAnimation(durationAnimValue);
          cancelAnimation(audioStateAnimValue);
        })().catch(handleError);
        return;
      }

      // IMPORTANT: Let playNextSentence handle all index calculations
      // This ensures there's a single source of truth for advancing sentences
      playNextSentenceRef.current().catch(error => {
        handleError(error);
        dispatch(setPlayingState(false));
      });
    },
    1000,
    [currentSentenceIndex]
  );

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

        // Use debounced check for stalled playback
        debouncedCheckStalled();
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
  }, [isPlaying, currentSentenceIndex, clearTimer, registerTimer, handleError]);

  // Debounced function to check for stalled playback
  const debouncedCheckStalled = useDebounce(
    async () => {
      // Check if we're still on the same sentence after a delay
      try {
        const status = await soundRef.current?.getStatusAsync();
        if (!status?.isLoaded || !isPlaying) return;

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

        if (isStuck && !isHandlingCompletionRef.current) {
          // Use atomic flag to prevent duplicate calls
          isHandlingCompletionRef.current = true;
          // Force next sentence regardless of current position
          await playNextSentenceRef.current();
        }
      } catch (error) {
        // If we can't check status or encounter an error and we're not already handling completion
        if (!isHandlingCompletionRef.current) {
          isHandlingCompletionRef.current = true;
          try {
            await playNextSentenceRef.current();
          } catch (err) {
            handleError(err as Error);
            isHandlingCompletionRef.current = false;
          }
        }
      }
    },
    500,
    [isPlaying]
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

              // Use simpleRetry for more stable audio loading
              try {
                const loadSound = async () => {
                  return await Audio.Sound.createAsync(
                    { uri: sentenceToLoad.audioUrl },
                    { shouldPlay: false }
                  );
                };

                const { sound } = await simpleRetry(loadSound);
                preloadedSoundsRef.current[idx] = sound;
              } catch (soundError) {
                handleError(soundError as Error);
                preloadedSoundsRef.current[idx] = null;
              }
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
        const loadSound = async () => {
          return await Audio.Sound.createAsync(
            { uri: nextSentence.audioUrl },
            { shouldPlay: false }
          );
        };

        const { sound } = await simpleRetry(loadSound);
        preloadedSoundsRef.current[i] = sound;
      } catch (error) {
        handleError(error as Error);
      }
    }
  }, [currentSentenceIndex]);

  // Use debounced update for preloading window
  const debouncedUpdatePreloadWindow = useDebounce(updatePreloadingWindow, 500, []);

  // Update preloading window when sentence changes using debounced function
  useEffect(() => {
    if (currentSentenceIndex !== null) {
      debouncedUpdatePreloadWindow();
    }
  }, [currentSentenceIndex, debouncedUpdatePreloadWindow]);

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
    if (!isPlayerActive.value) {
      return;
    }

    try {
      // Ensure we clean up completion flags regardless of success or failure
      const cleanupCompletionState = () => {
        isHandlingCompletionRef.current = false;
      };

      // Get the next sentence index (null by default)
      const fromIndex = currentSentenceIndex;
      const nextIndex = fromIndex !== null ? fromIndex + 1 : 0;

      // Only validate the sentence if we have a current index
      const nextSentence = validateSentenceData(nextIndex);

      // Check if we're at the end
      if (!nextSentence) {
        // Batch update all state changes
        dispatch(
          updateAudioState({
            sentenceId: fromIndex,
            isPlaying: false,
            wordId: null,
            position: null,
          })
        );
        setAudioState('idle');
        cleanupCompletionState();
        return;
      }

      // IMPORTANT: Batch update Redux state before processing
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
        const loadSound = async () => {
          return await Audio.Sound.createAsync(
            { uri: nextSentence.audioUrl },
            { progressUpdateIntervalMillis: 100 },
            onPlaybackStatusUpdate
          );
        };

        const { sound: newSound } = await simpleRetry(loadSound);
        sound = newSound;
        await sound.playAsync();
      }

      // Store the sound and clear transition state
      soundRef.current = sound;
      setAudioState('playing');

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
      cleanupCompletionState();
    } catch (error) {
      setAudioState('error');
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
    isPlayerActive,
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
          const loadSound = async () => {
            return await Audio.Sound.createAsync(
              { uri: sentenceData.audioUrl },
              { progressUpdateIntervalMillis: 100 },
              onPlaybackStatusUpdate
            );
          };

          const { sound: newSound } = await simpleRetry(loadSound);
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
        // Reset Reanimated state for UI immediately
        if (shouldUnload) {
          // If fully unloading, reset all values
          isPlayerActive.value = false;
          audioStateAnimValue.value = withTiming('idle', { duration: 200 });
        } else {
          // If just pausing, update state but keep progress
          audioStateAnimValue.value = withTiming('paused', { duration: 200 });
        }

        if (soundRef.current) {
          // Immediately set state to stop UI updates
          dispatch(setPlayingState(false));

          // Try normal cleanup
          try {
            await soundRef.current.stopAsync();

            // Only unload the audio if shouldUnload is true
            if (shouldUnload) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
            } else {
              // Just pause but keep the sound loaded for resumePlayback
              setAudioState('paused');
            }
          } catch (error) {
            // If normal cleanup fails, ensure ref is nullified
            if (shouldUnload) {
              soundRef.current = null;
            }
          }

          // Failsafe: force Audio module to release audio session
          // but only if we're fully unloading
          if (shouldUnload) {
            try {
              await Audio.setAudioModeAsync({
                playsInSilentModeIOS: false,
                staysActiveInBackground: false,
                shouldDuckAndroid: false,
              });
            } catch (e) {
              // Ignore errors from audio mode change
            }
          }
        }
        return true;
      } catch (error) {
        handleError(error as Error);
        return false;
      }
    },
    [dispatch]
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

        // Reset player state
        isPlayerActive.value = false;

        // Preload audio with error handling
        setAudioState('loading');

        const preloadSuccess = await preloadAudioFiles(sentences);
        if (!preloadSuccess && !forceReset) {
          handleError(new Error('Failed to preload audio files'));
        }

        // Clean up previous playback state
        await cleanupAudio();

        // First sentence to play - use the targetIndex from sentenceOffset
        const targetIndex = sentenceOffset;
        // Make sure the targetIndex is within bounds
        if (targetIndex < 0 || targetIndex >= sentences.length) {
          throw new Error(
            `Invalid sentenceOffset: ${sentenceOffset}. Array length: ${sentences.length}`
          );
        }
        const firstSentence = sentences[targetIndex];
        if (!firstSentence?.audioUrl) {
          throw new Error(`No audio URL for sentence at index ${targetIndex}`);
        }

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
        const firstPreloadedSound = preloadedSoundsRef.current[targetIndex];

        if (firstPreloadedSound) {
          sound = firstPreloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: finalPositionMs,
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          // Use simpleRetry for more stable audio loading
          try {
            const loadSound = async () => {
              return await Audio.Sound.createAsync(
                { uri: firstSentence.audioUrl },
                {
                  shouldPlay: true,
                  progressUpdateIntervalMillis: 100,
                  positionMillis: finalPositionMs,
                },
                onPlaybackStatusUpdate
              );
            };

            const { sound: newSound } = await simpleRetry(loadSound);
            sound = newSound;
          } catch (error) {
            handleError(error as Error);
            throw error; // Rethrow to allow fallback handling in the catch block
          }
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

        // Instead of complex retry logic, do a simple one-time retry
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
            dispatch(updateAudioState({ isPlaying: false, sentenceId: sentenceOffset }));
            setAudioState('error');
          }
        }

        // If we get here, all retries failed
        dispatch(updateAudioState({ isPlaying: false, sentenceId: sentenceOffset }));
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
    };
  }, [handleError]);

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
    setCurrentSentenceIndex: (idx: number | null) => dispatch(setCurrentSentence(idx)),

    // Refs if needed
    soundRef,
    wordTimingRef,

    // New method
    setManualNavigation,

    // Reanimated values
    progressAnimValue,
    durationAnimValue,
    audioStateAnimValue,

    // Derived values and playback rate
    formattedProgressTime,
    formattedDurationTime,
    playbackRate,
    setPlaybackRate,
  };
}
