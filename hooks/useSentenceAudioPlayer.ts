import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useState, useRef, useCallback, useEffect } from 'react';

// Define types
export type WordTiming = {
  wordId: number;
  startTime: number;
  endTime: number;
};

export type SentenceAudio = {
  sentenceId: number;
  audioUrl: string;
  wordTimings: WordTiming[];
};

type TrackWordTimingFunction = () => () => void;

export function useSentenceAudioPlayer() {
  // Component state
  const [currentWordId, setCurrentWordId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>(
    'idle'
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const wordTimingRef = useRef<WordTiming[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const sentencesRef = useRef<SentenceAudio[]>([]);
  const playNextSentenceRef = useRef<(() => Promise<boolean>) | null>(null);

  // Track word timing during playback
  const trackWordTiming: TrackWordTimingFunction = useCallback(() => {
    let frameId: number | null = null;
    const WORD_OVERLAP_MS = 200; // Overlap between words to prevent flicker
    let lastActiveWord: WordTiming | null = null;

    const updateWordHighlight = async () => {
      try {
        // Skip if there's no sound to check or no timing data
        if (!soundRef.current || wordTimingRef.current.length === 0) {
          return;
        }

        // Get current playback status
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) {
          return;
        }

        // Get current playback time in milliseconds
        const currentTimeMs = status.positionMillis;

        // Find the word that should be highlighted at the current time
        // Include overlap to prevent gaps between words
        const activeWord = wordTimingRef.current.find(timing => {
          const isWithinMainTiming =
            currentTimeMs >= timing.startTime && currentTimeMs <= timing.endTime + WORD_OVERLAP_MS;

          // If we're in a gap between words, keep the last word highlighted
          // until we find the next word
          const isInGapAfterWord =
            lastActiveWord?.wordId === timing.wordId &&
            currentTimeMs > timing.endTime &&
            currentTimeMs <= timing.endTime + WORD_OVERLAP_MS;

          return isWithinMainTiming || isInGapAfterWord;
        });

        // Update current word if changed
        if (activeWord?.wordId !== currentWordId) {
          const newWordId = activeWord?.wordId;

          // Update the current playing word ID - ensure it's a number
          setCurrentWordId(newWordId !== undefined ? Number(newWordId) : null);

          // Update last active word for gap handling
          lastActiveWord = activeWord || null;
        }

        // Schedule next frame only if we're still playing
        if (status.isPlaying) {
          frameId = requestAnimationFrame(updateWordHighlight);
          animationFrameRef.current = frameId;
        }
      } catch (error) {
        // Cancel animation on error
        if (frameId) {
          cancelAnimationFrame(frameId);
          animationFrameRef.current = null;
        }
      }
    };

    // Start the animation frame loop
    frameId = requestAnimationFrame(updateWordHighlight);
    animationFrameRef.current = frameId;

    // Cleanup function
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        animationFrameRef.current = null;
      }
    };
  }, [currentWordId]);

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus): void => {
    if (!status.isLoaded) {
      if (status.error) {
        setAudioState('error');
        setIsPlaying(false);
      }
      return;
    }

    // Update progress and duration
    setProgress(status.positionMillis);
    setDuration(status.durationMillis || 0);

    // Handle playback state
    if (status.isPlaying) {
      setAudioState('playing');
      setIsPlaying(true);
    } else if (status.isBuffering) {
      setAudioState('loading');
    } else if (status.didJustFinish) {
      // When a sentence finishes, immediately trigger the next one
      // We keep the playing state true during the transition
      playNextSentenceRef.current?.();
    } else {
      // Only set to paused if we're not at the end and not transitioning
      setAudioState('paused');
      setIsPlaying(false);
    }
  }, []);

  // Initialize audio session
  const initAudioSession = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // Clean up audio resources
  const cleanupAudio = useCallback(async () => {
    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Unload sound if it exists
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } finally {
        soundRef.current = null;
      }
    }

    // Reset state
    setCurrentWordId(null);
    setIsPlaying(false);
    setAudioState('idle');
  }, []);

  // Stop playback
  const stopPlayback = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
      await cleanupAudio();
      return true;
    } catch (error) {
      return false;
    }
  }, [cleanupAudio]);

  // Play next sentence in the queue
  const playNextSentence = useCallback(async () => {
    try {
      // Reset word highlighting
      setCurrentWordId(null);

      // Increment sentence index
      const nextIndex = currentSentenceIndex + 1;

      // Check if we have more sentences
      if (nextIndex >= sentencesRef.current.length) {
        // End of article reached
        setAudioState('idle');
        setCurrentSentenceIndex(-1);
        setIsPlaying(false);
        await cleanupAudio();
        return false;
      }

      // Load the next sentence
      setCurrentSentenceIndex(nextIndex);
      const nextSentence = sentencesRef.current[nextIndex];
      if (!nextSentence) {
        await cleanupAudio();
        return false;
      }

      // Clean up previous sound if it exists
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } finally {
          soundRef.current = null;
        }
      }

      // Keep playing state active during transition
      setIsPlaying(true);
      setAudioState('loading');

      // Update word timing reference
      wordTimingRef.current = nextSentence.wordTimings;

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextSentence.audioUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 }, // Faster updates for smoother transitions
        onPlaybackStatusUpdate
      );

      // Store reference to the sound
      soundRef.current = sound;

      // Start word timing tracking
      trackWordTiming();

      // Ensure we're still in playing state
      setIsPlaying(true);
      setAudioState('playing');

      return true;
    } catch (error) {
      await cleanupAudio();
      return false;
    }
  }, [currentSentenceIndex, cleanupAudio, onPlaybackStatusUpdate, trackWordTiming]);

  // Start playback of sentences
  const startPlayback = useCallback(
    async (sentences: SentenceAudio[]) => {
      if (!Array.isArray(sentences) || sentences.length === 0) {
        return false;
      }

      const firstSentence = sentences[0];
      if (!firstSentence?.audioUrl || !Array.isArray(firstSentence.wordTimings)) {
        return false;
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
        setCurrentSentenceIndex(-1);
        setCurrentWordId(null);

        // Start with first sentence
        setCurrentSentenceIndex(0);

        // Keep playing state active during initial load
        setIsPlaying(true);
        setAudioState('loading');

        // Update word timing reference
        wordTimingRef.current = firstSentence.wordTimings;

        // Create and load the sound with the same configuration as playNextSentence
        const { sound } = await Audio.Sound.createAsync(
          { uri: firstSentence.audioUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 50 }, // Match playNextSentence configuration
          onPlaybackStatusUpdate
        );

        // Store reference to the sound
        soundRef.current = sound;

        // Start word timing tracking
        trackWordTiming();

        // Ensure we're in playing state
        setIsPlaying(true);
        setAudioState('playing');

        return true;
      } catch (error) {
        await cleanupAudio();
        return false;
      }
    },
    [initAudioSession, onPlaybackStatusUpdate, trackWordTiming, cleanupAudio]
  );

  // Update playNextSentence ref
  useEffect(() => {
    playNextSentenceRef.current = playNextSentence;
  }, [playNextSentence]);

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
    setCurrentWordId,
    setIsPlaying,
    setAudioState,
    setProgress,
    setDuration,
    setCurrentSentenceIndex,
  };
}
