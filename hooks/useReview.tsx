import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { useWordSizing } from '@/hooks/useWordSizing';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

// Create a standalone audio player outside of React component lifecycle
const standaloneAudioPlayer: {
  sound: Audio.Sound | null;
  lastUrl: string | null;
  isPlaying: boolean;
  playAudio: (url: string) => Promise<void>;
  cleanup: () => Promise<void>;
} = {
  sound: null,
  lastUrl: null,
  isPlaying: false,

  playAudio: async (url: string) => {
    try {
      if (standaloneAudioPlayer.lastUrl === url && standaloneAudioPlayer.isPlaying) {
        return;
      }

      await standaloneAudioPlayer.cleanup();

      standaloneAudioPlayer.lastUrl = url;
      standaloneAudioPlayer.isPlaying = true;

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        status => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            standaloneAudioPlayer.isPlaying = false;
          }
        }
      );

      standaloneAudioPlayer.sound = sound;

      setTimeout(() => {
        if (standaloneAudioPlayer.lastUrl === url) {
          standaloneAudioPlayer.isPlaying = false;
        }
      }, 3000);
    } catch (error) {
      handleError(error instanceof Error ? error : String(error));
      standaloneAudioPlayer.isPlaying = false;
    }
  },

  cleanup: async () => {
    if (standaloneAudioPlayer.sound) {
      try {
        await standaloneAudioPlayer.sound.stopAsync().catch(() => {});
        await standaloneAudioPlayer.sound.unloadAsync().catch(() => {});
      } catch (e) {
        handleError(e instanceof Error ? e : new Error(String(e)));
      }
      standaloneAudioPlayer.sound = null;
    }
    standaloneAudioPlayer.isPlaying = false;
  },
};

interface UseReviewProps {
  fromVocabulary?: boolean;
  onClose?: () => void;
}

interface UseReviewReturn {
  // States
  showMeaningOverlay: boolean;
  currentMeaning: string;
  currentSentence: { wordForm: string };
  isTransitioningToCompletion: boolean;
  showInitialLoading: boolean;
  opacity: SharedValue<number>;
  isComplete: boolean;
  isLoading: boolean;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  wordFontSize: number;

  // Handlers
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleClose: () => void;
}

export function useReview({
  fromVocabulary = false,
  onClose,
}: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Animation and audio state
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({ initialOpacity: 1 });
  const nextWordAudioRef = useRef<{ url: string; loaded: boolean; sound?: Audio.Sound } | null>(
    null
  );

  // UI state
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({ wordForm: '' });
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [showInitialLoading, setShowInitialLoading] = useState(fromVocabulary);

  // Refs for state management
  const meaningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxProgressRef = useRef(0);
  const completionTriggeredRef = useRef(false);
  const isUpdatingWordRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef(Date.now());
  const lastProcessedWordIdRef = useRef<string | null>(null);

  // Define completion transition function
  const triggerCompletionTransition = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    standaloneAudioPlayer.cleanup();

    maxProgressRef.current = 100;
    setProgressAnimationKey(prev => prev + 1);
    setIsTransitioningToCompletion(true);
    fadeOut();

    if (completionTransitionRef.current) {
      clearTimeout(completionTransitionRef.current);
    }

    completionTransitionRef.current = setTimeout(() => {
      if (completionTriggeredRef.current) {
        setIsTransitioningToCompletion(false);
        standaloneAudioPlayer.cleanup();
      }
    }, 350);
  }, [fadeOut]);

  // Initialize FSRS hook
  const { currentWord, wordQueue, isLoading, isComplete, progress, updateWord, invalidateQueries } =
    useFSRS({
      userId: user?.id,
      onComplete: triggerCompletionTransition,
    });

  // Calculate dynamic font size for Arabic words based on window width
  const dynamicFontConfig = {
    minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
    maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
    minScreenWidth: 320,
    maxScreenWidth: 500,
  };

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.root?.letters, dynamicFontConfig);

  // Preload audio function
  const preloadNextAudio = useCallback(async (audioUrl: string) => {
    if (!audioUrl) return;

    try {
      if (nextWordAudioRef.current?.url === audioUrl && nextWordAudioRef.current.loaded) {
        return;
      }

      if (nextWordAudioRef.current?.sound) {
        await nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
      }

      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });

      nextWordAudioRef.current = {
        url: audioUrl,
        loaded: true,
        sound,
      };
    } catch (error) {
      handleError(error instanceof Error ? error : String(error));
      nextWordAudioRef.current = {
        url: audioUrl,
        loaded: false,
      };
    }
  }, []);

  // Hide initial loading after delay
  useEffect(() => {
    if (showInitialLoading) {
      const mounted = { current: true };
      const timer = setTimeout(() => {
        if (mounted.current) {
          setShowInitialLoading(false);
        }
      }, 300);

      return () => {
        mounted.current = false;
        clearTimeout(timer);
      };
    }
    return () => {};
  }, [showInitialLoading]);

  // Handle completion state
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      standaloneAudioPlayer.cleanup();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

  // Update progress tracking
  useEffect(() => {
    if (!isLoading && progress !== undefined) {
      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 100) {
        return;
      }

      const safeProgress = Math.min(100, Math.max(0, progress));
      if (safeProgress > maxProgressRef.current) {
        maxProgressRef.current = safeProgress;
        setProgressAnimationKey(prev => prev + 1);
        lastProgressUpdateRef.current = now;
      }
    }
  }, [isLoading, progress, isComplete]);

  // Update current sentence and handle audio
  useEffect(() => {
    if (completionTriggeredRef.current || isComplete || isTransitioningToCompletion) {
      return;
    }

    if (currentWord?.root && !isComplete && !isTransitioningToCompletion) {
      const wordId = String(currentWord.root_id || 'unknown');
      const wordForm = currentWord.root.letters;
      const audioUrl = currentWord.root.audio_url;

      if (lastProcessedWordIdRef.current === wordId && currentSentence.wordForm === wordForm) {
        return;
      }

      lastProcessedWordIdRef.current = wordId;
      setCurrentSentence({ wordForm });

      if (audioUrl) {
        standaloneAudioPlayer.playAudio(audioUrl).catch(handleError);
      }

      setTimeout(() => {
        const nextWord = wordQueue[0];
        if (nextWord?.root?.audio_url) {
          preloadNextAudio(nextWord.root.audio_url);
        }
      }, 300);
    }
  }, [currentWord?.root_id, isComplete, isTransitioningToCompletion, wordQueue, preloadNextAudio]);

  // Handle swipe left (don't know)
  const handleSwipeLeft = useCallback(() => {
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      return;
    }

    isUpdatingWordRef.current = true;
    setTimeout(() => {
      standaloneAudioPlayer.cleanup();
      fadeOut();

      setTimeout(() => {
        const meaning = currentWord?.root?.meaning || 'No translation available';
        setCurrentMeaning(meaning);
        setShowMeaningOverlay(true);

        meaningTimeoutRef.current = setTimeout(() => {
          setShowMeaningOverlay(false);

          if (currentWord?.root_id) {
            updateWord(currentWord.root_id, false)
              .then(() => {
                if (!isUpdatingWordRef.current) return;
                setTimeout(() => {
                  fadeIn();
                }, 150);
              })
              .catch(error => {
                handleError(error);
                if (!isUpdatingWordRef.current) return;
                fadeIn();
              })
              .finally(() => {
                isUpdatingWordRef.current = false;
                if (meaningTimeoutRef.current) {
                  clearTimeout(meaningTimeoutRef.current);
                  meaningTimeoutRef.current = null;
                }
              });
          } else {
            fadeIn();
            isUpdatingWordRef.current = false;
          }
        }, 2000);
      }, 300);
    }, 200);
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete, fadeIn, fadeOut]);

  // Handle swipe right (know)
  const handleSwipeRight = useCallback(() => {
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      return;
    }

    isUpdatingWordRef.current = true;
    setTimeout(() => {
      standaloneAudioPlayer.cleanup();
      fadeOut();

      setTimeout(() => {
        if (currentWord?.root_id) {
          updateWord(currentWord.root_id, true)
            .then(() => {
              if (!isUpdatingWordRef.current) return;
              setTimeout(() => {
                fadeIn();
              }, 150);
            })
            .catch(error => {
              handleError(error);
              if (!isUpdatingWordRef.current) return;
              fadeIn();
            })
            .finally(() => {
              isUpdatingWordRef.current = false;
            });
        } else {
          fadeIn();
          isUpdatingWordRef.current = false;
        }
      }, 300);
    }, 200);
  }, [currentWord, updateWord, isTransitioningToCompletion, isComplete, fadeIn, fadeOut]);

  // Handle close
  const handleClose = useCallback(() => {
    const mounted = { current: true };
    lightFeedback();

    standaloneAudioPlayer.cleanup();

    if (!mounted.current) return;

    invalidateQueries();

    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
      queryClient.removeQueries({ queryKey: ['dueWords', user.id] });
      queryClient.removeQueries({ queryKey: ['studyWords', user.id] });
      queryClient.removeQueries({ queryKey: ['vocabularyStats'] });
    }

    setTimeout(() => {
      if (mounted.current) {
        if (onClose) {
          onClose();
        } else {
          router.back();
        }
      }
    }, 100);

    return () => {
      mounted.current = false;
    };
  }, [invalidateQueries, user?.id, queryClient, onClose]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      completionTriggeredRef.current = true;
      fadeIn();

      standaloneAudioPlayer.cleanup();

      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = null;
      }

      if (completionTransitionRef.current) {
        clearTimeout(completionTransitionRef.current);
        completionTransitionRef.current = null;
      }

      if (nextWordAudioRef.current?.sound) {
        nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
      }

      isUpdatingWordRef.current = false;
      maxProgressRef.current = 0;
      nextWordAudioRef.current = null;
      lastProcessedWordIdRef.current = null;
    };
  }, [fadeIn]);

  return {
    // States
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    showInitialLoading,
    opacity,
    isComplete,
    isLoading,
    progress,
    maxProgress: maxProgressRef.current,
    progressAnimationKey,
    wordFontSize,

    // Handlers
    handleSwipeLeft,
    handleSwipeRight,
    handleClose,
  };
}
