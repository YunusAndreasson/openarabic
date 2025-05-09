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

interface AudioPlayerState {
  sound: Audio.Sound | null;
  lastUrl: string | null;
  isPlaying: boolean;
}

// Enhanced interface to store multiple preloaded sounds
interface PreloadedAudio {
  url: string;
  loaded: boolean;
  sound?: Audio.Sound;
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
  opacity: SharedValue<number>;
  isComplete: boolean;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  wordFontSize: number;
  isVagueMeaning: boolean;
  isStruggling: boolean;
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

// Number of upcoming words to preload audio for
const PRELOAD_COUNT = 3;
// Preloading delay in milliseconds
const PRELOAD_DELAY = 150;

export function useReview({ onClose }: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playAudio, cleanup: cleanupAudio } = useAudioPlayer();

  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({ initialOpacity: 1 });
  const preloadedAudioRef = useRef<Map<string, PreloadedAudio>>(new Map());

  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({ wordForm: '' });
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [isVagueMeaning, setIsVagueMeaning] = useState(false);
  const [isStruggling, setIsStruggling] = useState(false);
  const lastVagueTimeRef = useRef<number | null>(null);

  const meaningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxProgressRef = useRef(0);
  const completionTriggeredRef = useRef(false);
  const isUpdatingWordRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef(Date.now());
  const lastProcessedWordIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCompletionTransition = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    cleanupAudio();
    setIsTransitioningToCompletion(true);
    fadeOut();

    maxProgressRef.current = 100;
    setProgressAnimationKey(prev => prev + 1);

    if (completionTransitionRef.current) {
      clearTimeout(completionTransitionRef.current);
    }

    completionTransitionRef.current = setTimeout(() => {
      if (completionTriggeredRef.current) {
        setIsTransitioningToCompletion(false);
        cleanupAudio();
      }
    }, 200);
  }, [fadeOut, cleanupAudio]);

  const { currentWord, wordQueue, isComplete, progress, updateWord, invalidateQueries } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
  });

  const wordFontSize = useWordSizing(currentWord?.root?.letters, fontConfig);

  // Enhanced preload function to handle multiple upcoming words
  const preloadAudio = useCallback(async (audioUrls: string[]) => {
    if (!audioUrls.length) return;

    clearTimeout(timeoutRef.current ?? undefined);
    timeoutRef.current = setTimeout(async () => {
      try {
        // Process each URL
        for (const audioUrl of audioUrls) {
          if (!audioUrl) continue;

          // Skip if already loaded
          if (
            preloadedAudioRef.current.has(audioUrl) &&
            preloadedAudioRef.current.get(audioUrl)?.loaded
          ) {
            continue;
          }

          // Clean up old sound if exists
          const existing = preloadedAudioRef.current.get(audioUrl);
          if (existing?.sound) {
            await existing.sound.unloadAsync().catch(() => {});
          }

          // Create and store new sound
          const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
          preloadedAudioRef.current.set(audioUrl, {
            url: audioUrl,
            loaded: true,
            sound,
          });
        }

        // Clean up any sounds that aren't in our current set of upcoming words
        const urlSet = new Set(audioUrls);
        for (const [url, data] of preloadedAudioRef.current.entries()) {
          if (!urlSet.has(url) && data.sound) {
            await data.sound.unloadAsync().catch(() => {});
            preloadedAudioRef.current.delete(url);
          }
        }
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }, PRELOAD_DELAY);
  }, []);

  // Batch state updates for meaning overlay
  const showMeaningWithTimeout = useCallback(
    (meaning: string, isVague: boolean, isStruggling: boolean = false) => {
      setCurrentMeaning(meaning);
      setIsVagueMeaning(isVague);
      setShowMeaningOverlay(true);
      setIsStruggling(isStruggling);

      return setTimeout(
        () => {
          setShowMeaningOverlay(false);
          setIsStruggling(false);
        },
        isStruggling ? 3000 : 2000
      );
    },
    []
  );

  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      cleanupAudio();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition, cleanupAudio]);

  useEffect(() => {
    if (!isComplete && progress !== undefined) {
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

      // Ensure that if we're complete, the progress bar shows 100%
      if (isComplete && maxProgressRef.current < 100) {
        maxProgressRef.current = 100;
        setProgressAnimationKey(prev => prev + 1);
      }
    }
  }, [isComplete, progress]);

  useEffect(() => {
    // When the review is complete, ensure progress bar is at 100%
    if (isComplete && !isTransitioningToCompletion) {
      maxProgressRef.current = 100;
      setProgressAnimationKey(prev => prev + 1);
    }
  }, [isComplete, isTransitioningToCompletion]);

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

      // Preload audio for multiple upcoming words
      setTimeout(() => {
        // Get audio URLs for the next PRELOAD_COUNT words
        const upcomingUrls = wordQueue
          .slice(0, PRELOAD_COUNT)
          .map(word => word?.root?.audio_url)
          .filter(Boolean) as string[];

        if (upcomingUrls.length > 0) {
          preloadAudio(upcomingUrls);
        }
      }, PRELOAD_DELAY);
    }
  }, [
    currentWord?.root_id,
    isComplete,
    isTransitioningToCompletion,
    wordQueue,
    preloadAudio,
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

          const now = Date.now();
          const isStruggling =
            confidence === 'vague' &&
            lastVagueTimeRef.current !== null &&
            now - lastVagueTimeRef.current < 24 * 60 * 60 * 1000 && // Within 24 hours
            (currentWord?.fsrs_stability ?? 0) < 15;

          if (confidence === 'unknown' || confidence === 'vague') {
            const meaning = currentWord?.root?.meaning || 'No translation available';
            meaningTimeoutRef.current = showMeaningWithTimeout(
              meaning,
              confidence === 'vague',
              isStruggling
            );
          }

          if (confidence === 'vague') {
            lastVagueTimeRef.current = now;
          }

          const processFeedback = async () => {
            if (!currentWord?.root_id || controller.signal.aborted) return;

            try {
              // If struggling, treat it more like 'unknown' than 'vague'
              const effectiveConfidence = isStruggling ? 'unknown' : confidence;
              await updateWord(currentWord.root_id, effectiveConfidence);
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
            meaningTimeoutRef.current = setTimeout(processFeedback, isStruggling ? 3000 : 2000);
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

      // Clean up all preloaded audio
      for (const [, data] of preloadedAudioRef.current.entries()) {
        if (data.sound) {
          data.sound.unloadAsync().catch(() => {});
        }
      }
      preloadedAudioRef.current.clear();

      isUpdatingWordRef.current = false;
      maxProgressRef.current = 0;
      lastProcessedWordIdRef.current = null;
    };
  }, [fadeIn, cleanupAudio]);

  return {
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    opacity,
    isComplete,
    progress,
    maxProgress: maxProgressRef.current,
    progressAnimationKey,
    wordFontSize,
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleClose,
  };
}
