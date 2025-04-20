import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { useWordSizing } from '@/hooks/useWordSizing';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

interface AudioPlayerState {
  sound: Audio.Sound | null;
  lastUrl: string | null;
  isPlaying: boolean;
}

function useAudioPlayer() {
  const audioState = useRef<AudioPlayerState>({
    sound: null,
    lastUrl: null,
    isPlaying: false,
  });

  const cleanup = useCallback(async () => {
    const { sound } = audioState.current;
    if (sound) {
      try {
        const promises = [sound.stopAsync().catch(() => {}), sound.unloadAsync().catch(() => {})];
        await Promise.all(promises);
      } catch (e) {
        handleError(e instanceof Error ? e : new Error(String(e)));
      }
      audioState.current.sound = null;
    }
    audioState.current.isPlaying = false;
  }, []);

  const playAudio = useCallback(
    async (url: string) => {
      try {
        if (audioState.current.lastUrl === url && audioState.current.isPlaying) {
          return;
        }

        await cleanup();

        audioState.current.lastUrl = url;
        audioState.current.isPlaying = true;

        const audioMode = {
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        };

        await Audio.setAudioModeAsync(audioMode);

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          status => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              audioState.current.isPlaying = false;
            }
          }
        );

        audioState.current.sound = sound;

        const controller = new AbortController();
        setTimeout(() => {
          if (!controller.signal.aborted && audioState.current.lastUrl === url) {
            audioState.current.isPlaying = false;
          }
        }, 3000);

        return () => controller.abort();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
        audioState.current.isPlaying = false;
        return () => {};
      }
    },
    [cleanup]
  );

  useEffect(() => {
    return () => {
      cleanup().catch(e => handleError(e instanceof Error ? e : new Error(String(e))));
    };
  }, [cleanup]);

  return { playAudio, cleanup };
}

interface UseReviewProps {
  fromVocabulary?: boolean;
  onClose?: () => void;
}

interface UseReviewReturn {
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
  isVagueMeaning: boolean;
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleTap: () => void;
  handleClose: () => void;
}

interface WordSizingConfig {
  minFontSize: number;
  maxFontSize: number;
  minScreenWidth: number;
  maxScreenWidth: number;
}

const fontConfig: WordSizingConfig = {
  minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
  maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
  minScreenWidth: 320,
  maxScreenWidth: 500,
};

export function useReview({
  fromVocabulary = false,
  onClose,
}: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playAudio, cleanup: cleanupAudio } = useAudioPlayer();

  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({ initialOpacity: 1 });
  const nextWordAudioRef = useRef<{ url: string; loaded: boolean; sound?: Audio.Sound } | null>(
    null
  );

  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({ wordForm: '' });
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [showInitialLoading, setShowInitialLoading] = useState(fromVocabulary);
  const [isVagueMeaning, setIsVagueMeaning] = useState(false);

  const meaningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxProgressRef = useRef(0);
  const completionTriggeredRef = useRef(false);
  const isUpdatingWordRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef(Date.now());
  const lastProcessedWordIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const triggerCompletionTransition = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    cleanupAudio();

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
        cleanupAudio();
      }
    }, 350);
  }, [fadeOut, cleanupAudio]);

  const { currentWord, wordQueue, isLoading, isComplete, progress, updateWord, invalidateQueries } =
    useFSRS({
      userId: user?.id,
      onComplete: triggerCompletionTransition,
    });

  const wordFontSize = useWordSizing(currentWord?.root?.letters, fontConfig);

  const preloadNextAudio = useCallback(async (audioUrl: string) => {
    if (!audioUrl) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
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
        handleError(error instanceof Error ? error : new Error(String(error)));
        nextWordAudioRef.current = {
          url: audioUrl,
          loaded: false,
        };
      }
    }, 300);
  }, []);

  // Batch state updates for meaning overlay
  const showMeaningWithTimeout = useCallback((meaning: string, isVague: boolean) => {
    setCurrentMeaning(meaning);
    setIsVagueMeaning(isVague);
    setShowMeaningOverlay(true);

    return setTimeout(() => {
      setShowMeaningOverlay(false);
    }, 2000);
  }, []);

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

  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      cleanupAudio();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition, cleanupAudio]);

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
        playAudio(audioUrl).catch(handleError);
      }

      setTimeout(() => {
        const nextWord = wordQueue[0];
        if (nextWord?.root?.audio_url) {
          preloadNextAudio(nextWord.root.audio_url);
        }
      }, 300);
    }
  }, [
    currentWord?.root_id,
    isComplete,
    isTransitioningToCompletion,
    wordQueue,
    preloadNextAudio,
    playAudio,
  ]);

  const handleKnowledgeResponse = useCallback(
    (confidence: 'known' | 'vague' | 'unknown') => {
      if (
        isUpdatingWordRef.current ||
        isTransitioningToCompletion ||
        isComplete ||
        completionTriggeredRef.current
      ) {
        return;
      }

      isUpdatingWordRef.current = true;

      const controller = new AbortController();
      setTimeout(() => {
        if (controller.signal.aborted) return;

        cleanupAudio();
        fadeOut();

        setTimeout(() => {
          if (controller.signal.aborted) return;

          if (confidence === 'unknown' || confidence === 'vague') {
            const meaning = currentWord?.root?.meaning || 'No translation available';
            meaningTimeoutRef.current = showMeaningWithTimeout(meaning, confidence === 'vague');
          }

          const processFeedback = async () => {
            if (!currentWord?.root_id || controller.signal.aborted) return;

            try {
              await updateWord(currentWord.root_id, confidence);
              if (!isUpdatingWordRef.current) return;
              setTimeout(() => fadeIn(), 150);
            } catch (error) {
              handleError(error instanceof Error ? error : new Error(String(error)));
              if (!isUpdatingWordRef.current) return;
              fadeIn();
            } finally {
              isUpdatingWordRef.current = false;
              if (meaningTimeoutRef.current) {
                clearTimeout(meaningTimeoutRef.current);
                meaningTimeoutRef.current = null;
              }
            }
          };

          if (confidence === 'unknown' || confidence === 'vague') {
            meaningTimeoutRef.current = setTimeout(processFeedback, 2000);
          } else {
            processFeedback();
          }
        }, 300);
      }, 200);

      return () => controller.abort();
    },
    [
      currentWord,
      updateWord,
      isTransitioningToCompletion,
      isComplete,
      fadeIn,
      fadeOut,
      cleanupAudio,
      showMeaningWithTimeout,
    ]
  );

  const handleSwipeLeft = useCallback(() => {
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse]);

  const handleSwipeRight = useCallback(() => {
    handleKnowledgeResponse('known');
  }, [handleKnowledgeResponse]);

  const handleTap = useCallback(() => {
    handleKnowledgeResponse('vague');
  }, [handleKnowledgeResponse]);

  const handleClose = useCallback(() => {
    const mounted = { current: true };
    lightFeedback();

    cleanupAudio();

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
  }, [invalidateQueries, user?.id, queryClient, onClose, cleanupAudio]);

  // Cleanup effect
  useEffect(() => {
    const controller = new AbortController();

    return () => {
      controller.abort();
      completionTriggeredRef.current = true;
      fadeIn();
      cleanupAudio();

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
  }, [fadeIn, cleanupAudio]);

  return {
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
    isVagueMeaning,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleClose,
  };
}
