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

export function useSentenceAudioPlayer() {
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
  const animationFrameRef = useRef<number | null>(null);
  const sentencesRef = useRef<SentenceAudio[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const preloadedSoundsRef = useRef<(Audio.Sound | null)[]>([]);
  const playNextSentenceRef = useRef<() => Promise<void>>(async () => {});

  // We keep a forward-only pointer
  const lastActiveIndex = useRef(0);

  // ---- HELPER: Convert timing to ms if needed ----
  const normalizeTimingToMs = useCallback((time: number | string) => {
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
  const cleanupAudio = useCallback(async () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        // ignore
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
  const trackWordTiming = useCallback(() => {
    // Use interval instead of requestAnimationFrame to reduce CPU usage
    const INTERVAL_MS = 250; // Check every 250ms instead of every frame (~16ms)
    const WORD_OVERLAP_MS = 200;

    let intervalId: NodeJS.Timeout | null = null;

    const updateWordHighlight = async () => {
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
        const maxChecksPerInterval = 5;
        let checksPerformed = 0;

        // Start from lastActiveIndex and move forward until we find a match
        for (let i = lastActiveIndex.current; i < timings.length; i++) {
          // Limit number of checks per interval to reduce CPU usage
          if (checksPerformed >= maxChecksPerInterval) break;
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
    animationFrameRef.current = intervalId as unknown as number;

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
    (status: AVPlaybackStatus) => {
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
              // ignore
            }
          }
        }

        preloadedSoundsRef.current = [];

        // Preload all audio files in parallel
        const preloadPromises = sentences.map(async (sentence, index) => {
          if (!sentence.audioUrl) {
            preloadedSoundsRef.current[index] = null;
            return;
          }

          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: sentence.audioUrl },
              { shouldPlay: false }
            );
            preloadedSoundsRef.current[index] = sound;
          } catch (error) {
            handleError(error as Error);
            preloadedSoundsRef.current[index] = null;
          }
        });

        await Promise.all(preloadPromises);
        setIsPreloading(false);
        return true;
      } catch (error) {
        handleError(error as Error);
        setIsPreloading(false);
        return false;
      }
    },
    [initAudioSession]
  );

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
        .map((timing, i) => {
          return {
            wordId: timing.wordId,
            startTime: normalizeTimingToMs(timing.startTime),
            endTime: normalizeTimingToMs(timing.endTime),
            position: i,
          };
        })
        .filter(t => t.startTime < t.endTime);

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
          progressUpdateIntervalMillis: 50,
          positionMillis: 0,
        });
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      } else {
        // Fallback to loading on demand if preload failed
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: nextSentence.audioUrl },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 50,
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
        cleanupRef.current = () => {
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
  useEffect(() => {
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
          .map((timing, i) => ({
            wordId: timing.wordId,
            startTime: normalizeTimingToMs(timing.startTime),
            endTime: normalizeTimingToMs(timing.endTime),
            position: i,
          }))
          .filter(t => t.startTime < t.endTime);

        lastActiveIndex.current = 0;

        // Use preloaded sound if available
        let sound: Audio.Sound;
        const firstPreloadedSound = preloadedSoundsRef.current[0];
        if (firstPreloadedSound) {
          sound = firstPreloadedSound;
          await sound.setStatusAsync({
            shouldPlay: true,
            progressUpdateIntervalMillis: 50,
            positionMillis: 0,
          });
          sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        } else {
          // Fallback to loading on demand
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: firstSentence.audioUrl },
            {
              shouldPlay: true,
              progressUpdateIntervalMillis: 50,
              positionMillis: 0,
            },
            onPlaybackStatusUpdate
          );
          sound = newSound;
        }

        soundRef.current = sound;

        if (wordTimingRef.current.length > 0) {
          const trackingCleanup = trackWordTiming();
          cleanupRef.current = () => {
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
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Unload all preloaded sounds
      for (const sound of preloadedSoundsRef.current) {
        if (sound) {
          sound.unloadAsync().catch(() => {
            /* ignore */
          });
        }
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
