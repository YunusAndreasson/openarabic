import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SharedValue } from 'react-native-reanimated';

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

  const playAudio = useCallback(
    async (url: string): Promise<void> => {
      if (!url) return Promise.resolve();

      try {
        await cleanup();
        audioState.current.lastUrl = url;

        // Set audio mode once for better performance
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });

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
    [cleanup]
  );

  useEffect(() => {
    return () => {
      cleanup().catch(() => {});
    };
  }, [cleanup]);

  return { playAudio, cleanup };
}

export function useListen({ onClose }: UseListenProps = {}): UseListenReturn {
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
    if (allWords?.length && wordList.length === 0) {
      // Filter words with both audio_url and audio_url_en
      const wordsWithAudio = allWords.filter(
        word => word.root?.audio_url && word.root?.audio_url_en
      );

      // Shuffle the array to randomize the order
      const shuffled = [...wordsWithAudio].sort(() => 0.5 - Math.random());

      // Take first 20 words or less
      const selectedWords = shuffled.slice(0, 20);
      setWordList(selectedWords);

      // Initialize progress timestamp
      lastProgressUpdateRef.current = Date.now();
    }
  }, [allWords, wordList.length]);

  // Current word properties
  const currentWord = wordList[currentWordIndex] || null;
  const currentArabicWord = currentWord?.root?.letters || '';
  const currentEnglishMeaning = currentWord?.root?.meaning || '';

  // Calculate progress
  const progress = wordList.length > 0 ? (currentWordIndex / wordList.length) * 100 : 0;
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
          const newProgress = (newIndex / wordList.length) * 100;
          if (newProgress > maxProgressRef.current) {
            maxProgressRef.current = newProgress;
            setProgressAnimationKey(p => p + 1);
          }
          return newIndex;
        });

        fadeIn();
      }, 300);
    } else {
      // Complete the session
      setIsComplete(true);
    }
  }, [currentWordIndex, wordList.length, fadeIn, fadeOut]);

  // Play word sequence
  const playWordSequence = useCallback(async () => {
    if (!currentWord || isPlayingRef.current) return;

    isPlayingRef.current = true;
    lastProgressUpdateRef.current = Date.now();

    // Explicitly set English inactive and Arabic active at the start
    setIsEnglishActive(false);
    setIsArabicActive(true);

    try {
      // Play Arabic audio
      if (currentWord.root?.audio_url) {
        await playAudio(currentWord.root.audio_url);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Delay between Arabic and English
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LANGUAGES));

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
    if (currentWord && !isComplete && !isPlayingRef.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Start the sequence after a short delay
      timeoutRef.current = setTimeout(() => {
        playWordSequence();
      }, 500);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [currentWord, isComplete, playWordSequence]);

  // Recovery mechanism to prevent getting stuck
  useEffect(() => {
    const recoveryTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastProgress = now - lastProgressUpdateRef.current;

      // If we've been on the same word for too long, force moving to the next word
      if (currentWord && !isComplete && timeSinceLastProgress > STUCK_THRESHOLD) {
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
    cleanup();

    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    }

    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        router.back();
      }
    }, 100);
  }, [user?.id, queryClient, onClose, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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
