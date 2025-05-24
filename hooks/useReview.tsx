import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { useWordSizing } from '@/hooks/useWordSizing';
import { handleError } from '@/utils/errorHandling';

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

// Consolidated refs for easier state management
interface ReviewTimeRefs {
  lastVagueTime: number | null;
  lastProgressUpdate: number;
  lastProcessedWordId: string | null;
}

interface ReviewStateRefs {
  meaningTimeout: ReturnType<typeof setTimeout> | null;
  completionTransition: ReturnType<typeof setTimeout> | null;
  timeoutRef: ReturnType<typeof setTimeout> | null;
  maxProgress: number;
  completionTriggered: boolean;
  isUpdatingWord: boolean;
  progressUpdatedForCompletion: boolean;
}

// Add session metrics tracking interface
interface SessionMetrics {
  wordsReviewed: number;
  wordsKnown: number;
  wordsVague: number;
  wordsUnknown: number;
  averageStabilityIncrease: number;
  longestStreak: number;
  currentStreak: number;
  masteredWords: number;
  startTime: number;
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
  isUpdating: boolean;
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
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  sessionMetrics: SessionMetrics;
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
const PRELOAD_DELAY = 100;

// Timing constants for transitions (milliseconds)
const TRANSITION_DELAYS = {
  initial: 150, // Initial delay before animation (was 200)
  fadeAnimation: 200, // Delay for fade animation (was 300)
  meaningDisplay: {
    normal: 1500, // Display time for meaning overlay (was 2000)
    struggling: 2500, // Display time for struggling words (was 3000)
  },
};

export function useReview({ onClose }: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playAudio, cleanup: cleanupAudio } = useAudioPlayer();

  // Use optimized opacity animation from hooks/animations
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TRANSITION_DELAYS.fadeAnimation,
  });

  const preloadedAudioRef = useRef<Map<string, PreloadedAudio>>(new Map());

  // UI state
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({ wordForm: '' });
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [isVagueMeaning, setIsVagueMeaning] = useState(false);
  const [isStruggling, setIsStruggling] = useState(false);

  // Consolidated time tracking refs
  const timeRefs = useRef<ReviewTimeRefs>({
    lastVagueTime: null,
    lastProgressUpdate: Date.now(),
    lastProcessedWordId: null,
  });

  // Consolidated state refs
  const stateRefs = useRef<ReviewStateRefs>({
    meaningTimeout: null,
    completionTransition: null,
    timeoutRef: null,
    maxProgress: 0,
    completionTriggered: false,
    isUpdatingWord: false,
    progressUpdatedForCompletion: false,
  });

  // Session metrics tracking
  const sessionMetricsRef = useRef<SessionMetrics>({
    wordsReviewed: 0,
    wordsKnown: 0,
    wordsVague: 0,
    wordsUnknown: 0,
    averageStabilityIncrease: 0,
    longestStreak: 0,
    currentStreak: 0,
    masteredWords: 0,
    startTime: Date.now(),
  });

  const triggerCompletionTransition = useCallback(() => {
    if (stateRefs.current.completionTriggered) return;
    stateRefs.current.completionTriggered = true;

    cleanupAudio();
    setIsTransitioningToCompletion(true);
    fadeOut();

    stateRefs.current.maxProgress = 100;
    setProgressAnimationKey(prev => prev + 1);

    if (stateRefs.current.completionTransition) {
      clearTimeout(stateRefs.current.completionTransition);
    }

    stateRefs.current.completionTransition = setTimeout(() => {
      if (stateRefs.current.completionTriggered) {
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
        isStruggling
          ? TRANSITION_DELAYS.meaningDisplay.struggling
          : TRANSITION_DELAYS.meaningDisplay.normal
      );
    },
    []
  );

  // Shows meaning overlay if needed
  const displayMeaning = useCallback(
    (confidence: 'known' | 'vague' | 'unknown', isStruggling: boolean) => {
      if (confidence === 'known') return null;

      const meaning = currentWord?.root?.meaning || 'No translation available';
      return showMeaningWithTimeout(meaning, confidence === 'vague', isStruggling);
    },
    [currentWord?.root?.meaning, showMeaningWithTimeout]
  );

  // Determines if the user is struggling with this word
  const checkIsStruggling = useCallback(
    (confidence: 'known' | 'vague' | 'unknown'): boolean => {
      if (confidence !== 'vague') return false;

      const now = Date.now();
      return (
        timeRefs.current.lastVagueTime !== null &&
        now - timeRefs.current.lastVagueTime < 24 * 60 * 60 * 1000 && // Within 24 hours
        (currentWord?.fsrs_stability ?? 0) < 15
      );
    },
    [currentWord?.fsrs_stability]
  );

  // Process the word update in FSRS
  const processFeedback = useCallback(
    async (
      confidence: 'known' | 'vague' | 'unknown',
      isStruggling: boolean,
      controller: AbortController
    ) => {
      if (!currentWord?.root_id || controller.signal.aborted) return;

      try {
        // If struggling, treat it more like 'unknown' than 'vague'
        const effectiveConfidence = isStruggling ? 'unknown' : confidence;
        await updateWord(currentWord.root_id, effectiveConfidence);
        if (!stateRefs.current.isUpdatingWord) return;

        setTimeout(() => fadeIn(), 150);
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
        if (!stateRefs.current.isUpdatingWord) return;
        fadeIn();
      } finally {
        stateRefs.current.isUpdatingWord = false;
        if (stateRefs.current.meaningTimeout) {
          clearTimeout(stateRefs.current.meaningTimeout);
          stateRefs.current.meaningTimeout = null;
        }
      }
    },
    [currentWord, updateWord, fadeIn]
  );

  // Enhanced preload function to handle multiple upcoming words
  const preloadAudio = useCallback(async (audioUrls: string[]) => {
    if (!audioUrls.length) return;

    clearTimeout(stateRefs.current.timeoutRef ?? undefined);
    stateRefs.current.timeoutRef = setTimeout(async () => {
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

  const handleKnowledgeResponse = useCallback(
    (confidence: 'known' | 'vague' | 'unknown') => {
      // Guard conditions: exit early if we're already in a processing state
      if (
        stateRefs.current.isUpdatingWord ||
        isTransitioningToCompletion ||
        isComplete ||
        stateRefs.current.completionTriggered
      ) {
        return;
      }

      stateRefs.current.isUpdatingWord = true;
      const controller = new AbortController();

      // Update session metrics
      const metrics = sessionMetricsRef.current;
      metrics.wordsReviewed++;

      // Track response types
      if (confidence === 'known') {
        metrics.wordsKnown++;
        metrics.currentStreak++;
        metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);

        // Check if word is now mastered (stability >= 5 days after this review)
        const currentStability = currentWord?.fsrs_stability ?? 0;
        if (currentStability >= 4) {
          // Likely to reach 5+ after this review
          metrics.masteredWords++;
        }
      } else if (confidence === 'vague') {
        metrics.wordsVague++;
        metrics.currentStreak = 0; // Reset streak on vague
      } else {
        metrics.wordsUnknown++;
        metrics.currentStreak = 0; // Reset streak on unknown
      }

      // Calculate average stability increase (simplified estimation)
      if (currentWord?.fsrs_stability) {
        const estimatedIncrease =
          confidence === 'known'
            ? currentWord.fsrs_stability * 0.3
            : confidence === 'vague'
              ? currentWord.fsrs_stability * 0.1
              : 0;
        const totalIncrease =
          metrics.averageStabilityIncrease * (metrics.wordsReviewed - 1) + estimatedIncrease;
        metrics.averageStabilityIncrease = totalIncrease / metrics.wordsReviewed;
      }

      // Start transition animation
      setTimeout(() => {
        if (controller.signal.aborted) return;

        // Clean up any playing audio before proceeding
        cleanupAudio();
        fadeOut();

        setTimeout(() => {
          if (controller.signal.aborted) return;

          // Determine if user is struggling with this word
          const isStruggling = checkIsStruggling(confidence);

          // Update UI with meaning if needed
          stateRefs.current.meaningTimeout = displayMeaning(confidence, isStruggling);

          // Create dedicated audio playing for English audio (don't use main audio player)
          if (
            (confidence === 'vague' || confidence === 'unknown') &&
            currentWord?.root?.audio_url_en
          ) {
            // Use direct Audio API instead of shared audio player to avoid conflicts
            Audio.Sound.createAsync({ uri: currentWord.root.audio_url_en }, { shouldPlay: true })
              .then(({ sound }) => {
                sound.setOnPlaybackStatusUpdate(status => {
                  if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync().catch(() => {});
                  }
                });
              })
              .catch(error => {
                handleError(error instanceof Error ? error : new Error(String(error)));
              });
          }

          // Track vague responses for future struggle detection
          if (confidence === 'vague') {
            timeRefs.current.lastVagueTime = Date.now();
          }

          // Schedule the actual word processing
          if (confidence === 'unknown' || confidence === 'vague') {
            stateRefs.current.meaningTimeout = setTimeout(
              () => {
                // Process feedback after meaning display timeout
                processFeedback(confidence, isStruggling, controller);
              },
              isStruggling
                ? TRANSITION_DELAYS.meaningDisplay.struggling
                : TRANSITION_DELAYS.meaningDisplay.normal
            );
          } else {
            // For "known" responses, process immediately with minimum delay
            processFeedback(confidence, isStruggling, controller);
          }
        }, TRANSITION_DELAYS.fadeAnimation);
      }, TRANSITION_DELAYS.initial);

      return () => controller.abort();
    },
    [
      isTransitioningToCompletion,
      isComplete,
      cleanupAudio,
      fadeOut,
      checkIsStruggling,
      displayMeaning,
      processFeedback,
      currentWord?.root?.audio_url_en,
      currentWord?.fsrs_stability,
    ]
  );

  // Effect: Handle completion transition
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !stateRefs.current.completionTriggered) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      cleanupAudio();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition, cleanupAudio]);

  // Effect: Update progress bar
  useEffect(() => {
    // Don't update during transition to completion to avoid cycles
    if (isTransitioningToCompletion) return;

    if (!isComplete && progress !== undefined) {
      const now = Date.now();
      if (now - timeRefs.current.lastProgressUpdate < 100) {
        return;
      }

      const safeProgress = Math.min(100, Math.max(0, progress));
      if (safeProgress > stateRefs.current.maxProgress) {
        stateRefs.current.maxProgress = safeProgress;
        setProgressAnimationKey(prev => prev + 1);
        timeRefs.current.lastProgressUpdate = now;
      }

      // Only update if not already at 100% to prevent cycles
      if (isComplete && stateRefs.current.maxProgress < 100) {
        stateRefs.current.maxProgress = 100;
        // Use a ref to track if we've already updated this cycle
        if (!stateRefs.current.progressUpdatedForCompletion) {
          stateRefs.current.progressUpdatedForCompletion = true;
          setProgressAnimationKey(prev => prev + 1);
        }
      }
    }
  }, [isComplete, progress, isTransitioningToCompletion]);

  // Effect: Ensure 100% progress on completion
  useEffect(() => {
    // Skip if we've already updated or if we're transitioning
    if (
      isComplete &&
      !isTransitioningToCompletion &&
      !stateRefs.current.progressUpdatedForCompletion
    ) {
      stateRefs.current.maxProgress = 100;
      stateRefs.current.progressUpdatedForCompletion = true;
      setProgressAnimationKey(prev => prev + 1);
    }

    // Reset the flag when completion state changes
    if (!isComplete) {
      stateRefs.current.progressUpdatedForCompletion = false;
    }
  }, [isComplete, isTransitioningToCompletion]);

  // Effect: Handle current word changes and preload audio
  useEffect(() => {
    if (stateRefs.current.completionTriggered || isComplete || isTransitioningToCompletion) {
      return;
    }

    if (currentWord?.root && !isComplete && !isTransitioningToCompletion) {
      const wordId = String(currentWord.root_id || 'unknown');
      const wordForm = currentWord.root.letters;
      const audioUrl = currentWord.root.audio_url;

      // Always update the current sentence
      setCurrentSentence({ wordForm });

      // ALWAYS play audio for Arabic words, regardless of lastProcessedWordId
      if (audioUrl) {
        playAudio(audioUrl).catch(handleError);
      }

      // Update the lastProcessedWordId after playing audio
      timeRefs.current.lastProcessedWordId = wordId;

      // Preload audio for multiple upcoming words - use requestAnimationFrame for timing optimization
      requestAnimationFrame(() => {
        // Get audio URLs for the next PRELOAD_COUNT words
        const upcomingUrls = wordQueue
          .slice(0, PRELOAD_COUNT)
          .map(word => word?.root?.audio_url)
          .filter(Boolean) as string[];

        if (upcomingUrls.length > 0) {
          preloadAudio(upcomingUrls);
        }
      });
    }
  }, [
    currentWord?.root_id,
    currentWord?.root?.letters,
    currentWord?.root?.audio_url,
    isComplete,
    isTransitioningToCompletion,
    wordQueue,
    preloadAudio,
    playAudio,
  ]);

  const handleSwipeLeft = useCallback(() => {
    // Removed haptic feedback for swipe left
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse]);

  const handleSwipeRight = useCallback(() => {
    // No haptic feedback for "known" response
    handleKnowledgeResponse('known');
  }, [handleKnowledgeResponse]);

  const handleTap = useCallback(() => {
    // Removed haptic feedback for tap (vague)
    handleKnowledgeResponse('vague');
  }, [handleKnowledgeResponse]);

  const handleClose = useCallback(() => {
    const mounted = { current: true };
    // Removed haptic feedback for closing review
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
      stateRefs.current.completionTriggered = true;
      stateRefs.current.progressUpdatedForCompletion = false;
      fadeIn();
      cleanupAudio();

      if (stateRefs.current.meaningTimeout) {
        clearTimeout(stateRefs.current.meaningTimeout);
        stateRefs.current.meaningTimeout = null;
      }

      if (stateRefs.current.completionTransition) {
        clearTimeout(stateRefs.current.completionTransition);
        stateRefs.current.completionTransition = null;
      }

      // Clean up all preloaded audio
      for (const [, data] of preloadedAudioRef.current.entries()) {
        if (data.sound) {
          data.sound.unloadAsync().catch(() => {});
        }
      }
      preloadedAudioRef.current.clear();

      stateRefs.current.isUpdatingWord = false;
      stateRefs.current.maxProgress = 0;
      timeRefs.current.lastProcessedWordId = null;
    };
  }, [fadeIn, cleanupAudio]);

  return {
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    opacity,
    isComplete,
    isUpdating: stateRefs.current.isUpdatingWord,
    progress,
    maxProgress: stateRefs.current.maxProgress,
    progressAnimationKey,
    wordFontSize,
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleClose,
    animatedStyle: useAnimatedStyle(
      (): ViewStyle => ({
        opacity: opacity.value,
      })
    ),
    sessionMetrics: sessionMetricsRef.current,
  };
}
