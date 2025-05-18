import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SharedValue } from 'react-native-reanimated';
import { AppState, AppStateStatus } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { StudyWord } from '@/types/vocabulary.types';
import { useOpacityAnimation } from '@/hooks/animations';

// Constants for timing
const DELAY_BETWEEN_WORDS = 600; // ms
const DELAY_BETWEEN_LANGUAGES = 1000; // ms
const MAX_AUDIO_DURATION = 8000; // ms
const RECOVERY_CHECK_INTERVAL = 3000; // ms
const STUCK_THRESHOLD = 12000; // ms

interface AudioPlayerState {
  sound: Audio.Sound | null;
  lastUrl: string | null;
}

interface UseListenProps {
  onClose?: () => void;
  /**
   * Flag indicating if the screen was opened from the vocabulary tab
   * Used for proper navigation behavior
   */
  fromVocabulary?: boolean;
}

interface UseListenReturn {
  currentArabicWord: string;
  currentEnglishMeaning: string;
  isArabicActive: boolean;
  isEnglishActive: boolean;
  opacity: SharedValue<number>;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  isComplete: boolean;
  isTransitioning: boolean;
  handleClose: () => void;
  totalWords: number;
  currentWordIndex: number;
}

function useAudioPlayer() {
  const audioState = useRef<AudioPlayerState>({
    sound: null,
    lastUrl: null,
  });
  // Add ref to track app state
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const cleanup = useCallback(async () => {
    const { sound } = audioState.current;
    if (sound) {
      try {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      } catch (e) {
        // Silent cleanup
      }
      audioState.current.sound = null;
    }
  }, []);

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
    } catch (e) {
      // Silent error
    }
  }, []);

  const playAudio = useCallback(
    async (url: string): Promise<void> => {
      if (!url) return Promise.resolve();

      try {
        await cleanup();
        audioState.current.lastUrl = url;

        // Use the separate initAudioSession function
        await initAudioSession();

        // Create a promise that will be resolved when audio finishes
        return new Promise(resolve => {
          const timeoutId = setTimeout(() => {
            // Safety timeout in case audio doesn't complete properly
            resolve();
          }, MAX_AUDIO_DURATION);

          Audio.Sound.createAsync({ uri: url }, { shouldPlay: true })
            .then(({ sound }) => {
              audioState.current.sound = sound;

              sound.setOnPlaybackStatusUpdate(status => {
                if (!status.isLoaded) return;

                if ('didJustFinish' in status && status.didJustFinish) {
                  clearTimeout(timeoutId);
                  resolve();
                }
              });
            })
            .catch(() => {
              // If audio fails to load, still resolve to continue sequence
              clearTimeout(timeoutId);
              resolve();
            });
        });
      } catch {
        // Ensure we always resolve so sequence continues
        return Promise.resolve();
      }
    },
    [cleanup, initAudioSession]
  );

  // Add AppState effect to reinitialize audio session when app state changes
  useEffect(() => {
    // Initialize audio session on mount
    initAudioSession();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Maintain audio session regardless of app state
      // This allows continuous audio playback in background
      if (
        (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') ||
        (appStateRef.current === 'active' && nextAppState.match(/inactive|background/))
      ) {
        initAudioSession();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
      cleanup().catch(() => {});
    };
  }, [cleanup, initAudioSession]);

  return { playAudio, cleanup };
}

export function useListen({ onClose, fromVocabulary }: UseListenProps = {}): UseListenReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playAudio, cleanup } = useAudioPlayer();

  // State
  const [wordList, setWordList] = useState<StudyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isArabicActive, setIsArabicActive] = useState(true);
  const [isEnglishActive, setIsEnglishActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);

  // Refs
  const lastProgressUpdateRef = useRef(Date.now());
  const isPlayingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxProgressRef = useRef(0);

  // Animation
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: 300,
  });

  // Fetch words data
  const { allWords } = useFSRSQueries({
    userId: user?.id,
  });

  // Initialize word list when data is available
  useEffect(() => {
    // Only run this effect if we have words and our list is empty
    if (!allWords?.length || wordList.length > 0) {
      return;
    }

    // Filter words with both audio_url and audio_url_en
    const wordsWithAudio = allWords.filter(word => word.root?.audio_url && word.root?.audio_url_en);

    // Shuffle the array to randomize the order
    const shuffled = [...wordsWithAudio].sort(() => 0.5 - Math.random());

    // Take first 20 words or less
    const selectedWords = shuffled.slice(0, 20);

    // Initialize state
    setWordList(selectedWords);
    // Reset progress tracking
    lastProgressUpdateRef.current = Date.now();
    // Reset other state to initial values
    maxProgressRef.current = 0;
    setCurrentWordIndex(0);
  }, [allWords, wordList.length]);

  // Current word properties
  const currentWord = wordList[currentWordIndex] || null;
  const currentArabicWord = currentWord?.root?.letters || '';
  const currentEnglishMeaning = currentWord?.root?.meaning || '';

  // Calculate progress - ensure we use integer math to avoid precision errors
  const progress = wordList.length > 0 ? Math.floor((currentWordIndex / wordList.length) * 100) : 0;

  // Use a memoized value for maxProgress to prevent infinite re-renders
  // Only read the ref, don't set maxProgressRef.current here
  const maxProgress = maxProgressRef.current;

  // Move to the next word safely
  const moveToNextWord = useCallback(() => {
    if (currentWordIndex < wordList.length - 1) {
      fadeOut();

      // Set English to inactive and Arabic to active immediately when transitioning
      setIsArabicActive(true);
      setIsEnglishActive(false);

      // Update timestamp for progress tracking
      lastProgressUpdateRef.current = Date.now();

      // Short delay for animation
      setTimeout(() => {
        setCurrentWordIndex(prev => {
          const newIndex = prev + 1;
          // Use Math.floor to avoid floating point precision issues
          const newProgress = Math.floor((newIndex / wordList.length) * 100);

          // Only update maxProgress if needed and trigger an animation key update
          if (newProgress > maxProgressRef.current) {
            maxProgressRef.current = newProgress;
            setProgressAnimationKey(p => p + 1);
          }
          return newIndex;
        });

        fadeIn();
      }, 300);
    } else {
      // Complete the session - ensure all cleanup happens first
      isPlayingRef.current = false;
      cleanup();
      // Then set complete flag
      setIsComplete(true);
    }
  }, [currentWordIndex, wordList.length, fadeIn, fadeOut, cleanup]);

  // Play word sequence
  const playWordSequence = useCallback(async () => {
    if (!currentWord || isPlayingRef.current) return;

    isPlayingRef.current = true;
    lastProgressUpdateRef.current = Date.now();

    // Explicitly set English inactive and Arabic active at the start
    setIsEnglishActive(false);
    setIsArabicActive(true);

    // Re-initialize the audio session to ensure background playback works
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });

    try {
      // Play Arabic audio
      if (currentWord.root?.audio_url) {
        await playAudio(currentWord.root.audio_url);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Delay between Arabic and English
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LANGUAGES));

      // Re-check app state and reinit audio if needed for English playback
      if (AppState.currentState !== 'active') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
      }

      // Play English audio
      setIsArabicActive(false);
      setIsEnglishActive(true);

      if (currentWord.root?.audio_url_en) {
        await playAudio(currentWord.root.audio_url_en);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Delay before moving to next word
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_WORDS));

      // Re-check app state before moving to next word
      if (AppState.currentState !== 'active') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
      }

      // Move to next word
      moveToNextWord();
    } catch {
      // Even if there's an error, continue to the next word
      setTimeout(() => moveToNextWord(), 1000);
    } finally {
      isPlayingRef.current = false;
    }
  }, [currentWord, moveToNextWord, playAudio]);

  // Trigger word sequence when current word changes
  useEffect(() => {
    // Skip this effect if there's no current word or if the session is complete
    // or if we're already playing something
    if (!currentWord || isComplete || isPlayingRef.current) {
      return;
    }

    // Clear any existing timeout as a safeguard
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Flag to prevent running the effect again during cleanup
    let isMounted = true;

    // Start the sequence after a short delay
    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        playWordSequence();
      }
    }, 500);

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentWord, isComplete, playWordSequence]);

  // Add an effect to handle completion
  useEffect(() => {
    // If just completed, make sure we clean up properly
    if (isComplete) {
      // Ensure all audio is stopped
      cleanup();

      // Stop any timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset audio state
      isPlayingRef.current = false;
    }
  }, [isComplete, cleanup]);

  // Recovery mechanism to prevent getting stuck
  useEffect(() => {
    // Skip effect if no current word or already complete
    if (!currentWord || isComplete) return;

    const recoveryTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastProgress = now - lastProgressUpdateRef.current;

      // If we've been on the same word for too long, force moving to the next word
      if (timeSinceLastProgress > STUCK_THRESHOLD) {
        // Force cleanup
        cleanup();
        isPlayingRef.current = false;

        // Move to next word
        moveToNextWord();
      }
    }, RECOVERY_CHECK_INTERVAL);

    return () => clearInterval(recoveryTimer);
  }, [currentWord, isComplete, cleanup, moveToNextWord]);

  // Close and cleanup
  const handleClose = useCallback(() => {
    // Prevent multiple clicks
    const wasAlreadyComplete = isComplete;

    // Ensure audio is stopped and cleanup is done synchronously first
    cleanup();

    // Reset state to avoid memory leaks
    isPlayingRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Invalidate relevant queries
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    }

    // Use a slightly longer delay to ensure cleanup completes
    setTimeout(
      () => {
        try {
          // If was called via a button after session completion, use the most direct approach
          if (wasAlreadyComplete) {
            if (onClose) {
              onClose();
            } else {
              // Use the most direct approach for completed sessions - forcefully go back
              router.back();
            }
          } else {
            // For user-initiated cancellations during session, use the original logic
            if (onClose) {
              onClose();
            } else if (fromVocabulary) {
              // Use replace instead of navigate to avoid navigation stack issues
              router.replace('/(tabs)/vocabulary');
            } else {
              router.back();
            }
          }
        } catch (error) {
          // Fallback - if navigation fails, forcefully go back
          console.error('Navigation error:', error);
          router.back();
        }
      },
      wasAlreadyComplete ? 100 : 300
    ); // Faster timeout for completed sessions
  }, [user?.id, queryClient, onClose, cleanup, fromVocabulary, isComplete]);

  // Cleanup on unmount
  useEffect(() => {
    // This effect only handles cleanup on unmount, so it shouldn't trigger re-renders
    return () => {
      // Cancel any ongoing audio
      cleanup();

      // Clear any timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset state refs
      isPlayingRef.current = false;
      maxProgressRef.current = 0;
    };
  }, [cleanup]);

  return {
    currentArabicWord,
    currentEnglishMeaning,
    isArabicActive,
    isEnglishActive,
    opacity,
    progress,
    maxProgress,
    progressAnimationKey,
    isComplete,
    isTransitioning,
    handleClose,
    totalWords: wordList.length,
    currentWordIndex,
  };
}
