import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { useWordSizing } from '@/hooks/useWordSizing';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

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
  const { loadAndPlayAudio, stopPlayback } = useAudioPlayer();
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

  // Define completion transition function
  const triggerCompletionTransition = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    stopPlayback();

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
        stopPlayback();
      }
    }, 350);
  }, [fadeOut, stopPlayback]);

  // Initialize FSRS hook
  const { currentWord, wordQueue, isLoading, isComplete, progress, updateWord, invalidateQueries } =
    useFSRS({
      userId: user?.id,
      onComplete: triggerCompletionTransition,
    });

  // Calculate dynamic font size for Arabic words based on window width
  const dynamicFontConfig = {
    minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6, // For very small screens
    maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3, // Fixed font size for most words
    minScreenWidth: 320, // iPhone SE width
    maxScreenWidth: 500, // Tablet width threshold
  };

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.sentence_word?.word_form, dynamicFontConfig);

  // Preload audio function
  const preloadNextAudio = useCallback(async (audioUrl: string) => {
    if (!audioUrl) return;

    try {
      if (nextWordAudioRef.current?.url === audioUrl && nextWordAudioRef.current.loaded) {
        return; // Already loaded this audio
      }

      // Clean up previous preloaded audio if it exists
      if (nextWordAudioRef.current?.sound) {
        await nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
      }

      // Create and load the sound but don't play it
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
    return () => {}; // Empty cleanup function for when showInitialLoading is false
  }, [showInitialLoading]);

  // Handle completion state
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      stopPlayback();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition, stopPlayback]);

  // Update current sentence and handle audio
  // eslint-disable-next-line sonarjs/cognitive-complexity
  useEffect(() => {
    if (completionTriggeredRef.current || isComplete || isTransitioningToCompletion) {
      return;
    }

    if (currentWord?.sentence_word && !isComplete && !isTransitioningToCompletion) {
      const wordForm = currentWord.sentence_word.word_form;
      const audioUrl = currentWord.sentence_word.arabic_audio_url;
      setCurrentSentence({ wordForm });

      // Use preloaded audio if available, otherwise load and play
      if (audioUrl) {
        if (
          nextWordAudioRef.current?.url === audioUrl &&
          nextWordAudioRef.current.loaded &&
          nextWordAudioRef.current.sound
        ) {
          // If we have this audio preloaded, use it
          const preloadedSound = nextWordAudioRef.current.sound;
          preloadedSound.playAsync().catch(handleError);

          // Clear the reference since we're now using it
          nextWordAudioRef.current = null;
        } else {
          // Otherwise load and play normally
          loadAndPlayAudio(audioUrl);
        }
      }

      // Preload next word's audio
      const nextWord = wordQueue[0];
      if (nextWord?.sentence_word?.arabic_audio_url) {
        preloadNextAudio(nextWord.sentence_word.arabic_audio_url);
      } else {
        // Clean up previous preloaded audio if no next word
        if (nextWordAudioRef.current?.sound) {
          nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
          nextWordAudioRef.current = null;
        }
      }
    }
  }, [
    currentWord,
    wordQueue,
    isComplete,
    isTransitioningToCompletion,
    loadAndPlayAudio,
    preloadNextAudio,
  ]);

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
    stopPlayback();
    fadeOut();

    setTimeout(() => {
      const meaning = currentWord?.sentence_word?.english || 'No translation available';
      setCurrentMeaning(meaning);
      setShowMeaningOverlay(true);

      meaningTimeoutRef.current = setTimeout(() => {
        setShowMeaningOverlay(false);

        if (currentWord?.sentence_word_id) {
          updateWord(currentWord.sentence_word_id, false)
            .then(() => {
              if (!isUpdatingWordRef.current) return;
              setTimeout(() => {
                fadeIn();
              }, 150);
            })
            .catch(_ => {
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
  }, [
    currentWord,
    updateWord,
    isTransitioningToCompletion,
    isComplete,
    fadeIn,
    fadeOut,
    stopPlayback,
  ]);

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
    stopPlayback();
    fadeOut();

    setTimeout(() => {
      if (currentWord?.sentence_word_id) {
        updateWord(currentWord.sentence_word_id, true)
          .then(() => {
            if (!isUpdatingWordRef.current) return;
            setTimeout(() => {
              fadeIn();
            }, 150);
          })
          .catch(_ => {
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
  }, [
    currentWord,
    updateWord,
    isTransitioningToCompletion,
    isComplete,
    fadeIn,
    fadeOut,
    stopPlayback,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    const mounted = { current: true };
    lightFeedback();

    stopPlayback()
      .then(() => {
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
      })
      .catch(error => {
        handleError(error);
        if (mounted.current) {
          if (onClose) {
            onClose();
          } else {
            router.back();
          }
        }
      });

    return () => {
      mounted.current = false;
    };
  }, [invalidateQueries, user?.id, queryClient, stopPlayback, onClose]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      completionTriggeredRef.current = true;
      fadeIn();

      stopPlayback().catch(error => {
        handleError(error);
      });

      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = null;
      }

      if (completionTransitionRef.current) {
        clearTimeout(completionTransitionRef.current);
        completionTransitionRef.current = null;
      }

      // Clean up any preloaded audio
      if (nextWordAudioRef.current?.sound) {
        nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
      }

      isUpdatingWordRef.current = false;
      maxProgressRef.current = 0;
      nextWordAudioRef.current = null;
    };
  }, [fadeIn, stopPlayback]);

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
