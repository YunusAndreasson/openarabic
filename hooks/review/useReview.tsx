import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { InteractionManager } from 'react-native';
import type { AnimatedStyle, SharedValue } from 'react-native-reanimated';
import { useAnimatedStyle } from 'react-native-reanimated';

import { TIMING_CONFIG } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useOpacityAnimation } from '@/hooks/animations';
import { useSimpleAudioPlayer } from '@/hooks/audio';
import { useAuth } from '@/hooks/auth';
import { useFSRS, useWordSizing } from '@/hooks/vocabulary';
import { audioCache } from '@/services/audioCache';
import type { SessionMetrics } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { generateAudioUrl } from '@/utils/imageUtils';

// Consolidated refs for easier state management
interface ReviewTimeRefs {
  lastVagueTime: number | null;
  lastProgressUpdate: number;
  lastProcessedWordId: string | null;
}

interface ReviewStateRefs {
  meaningTimeout: ReturnType<typeof setTimeout> | null;
  completionTransition: ReturnType<typeof setTimeout> | null;
  initialTransitionTimeout: ReturnType<typeof setTimeout> | null;
  fadeAnimationTimeout: ReturnType<typeof setTimeout> | null;
  maxProgress: number;
  completionTriggered: boolean;
  isUpdatingWord: boolean;
  progressUpdatedForCompletion: boolean;
}

interface UseReviewProps {
  fromRemember?: boolean;
  mode?: string;
  onClose?: () => void;
}

interface UseReviewReturn {
  currentSentence: { wordForm: string };
  currentMeaning: string;
  currentWord?: StudyWord | null;
  showTranslation: boolean;
  isVagueMeaning: boolean;
  isStruggling: boolean;
  isTransitioningToCompletion: boolean;
  opacity: SharedValue<number>;
  isComplete: boolean;
  isUpdating: boolean;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  wordFontSize: number;
  currentWordKey: string;
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleLongPress: () => void;
  handleClose: () => void;
  transparentStyle: AnimatedStyle<ViewStyle>;
  sessionMetrics: SessionMetrics;
  // Hesitation state and callbacks
  isHesitating: boolean;
  handleHesitationStart: () => void;
  handleHesitationEnd: () => void;
  // Add audio preloading state
  isAudioPreloading: boolean;
  audioPreloadProgress: number;
  // Add audio ready state
  isCurrentWordAudioReady: boolean;
  // Add audio preloading completion state
  isAudioPreloadingComplete: boolean;
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

// Timing constants for transitions (milliseconds)
const TRANSITION_DELAYS = {
  initial: TIMING_CONFIG.FAST.duration, // Initial delay before animation
  fadeAnimation: TIMING_CONFIG.MEDIUM.duration, // Delay for fade animation
  meaningDisplay: {
    normal: 3000, // Display time for meaning overlay (increased from 1500)
    struggling: 4000, // Display time for struggling words (increased from 2500)
  },
};

export function useReview({ fromRemember, mode, onClose }: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use enhanced audio player instead of local expo-av implementation
  const audioPlayer = useSimpleAudioPlayer();

  // Create stable refs for audio player methods to avoid dependency issues
  const audioPlayerRef = useRef(audioPlayer);
  audioPlayerRef.current = audioPlayer;

  // Use optimized opacity animation from hooks/animations
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: TRANSITION_DELAYS.fadeAnimation,
  });

  // UI state
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [isVagueMeaning, setIsVagueMeaning] = useState(false);
  const [isStruggling, setIsStruggling] = useState(false);
  // Ensure UI re-renders when updating state changes so gestures re-enable
  const [isUpdatingUI, setIsUpdatingUI] = useState(false);
  // Hesitation state
  const [isHesitating, setIsHesitating] = useState(false);
  // Audio preloading state
  const [isAudioPreloading, setIsAudioPreloading] = useState(false);
  const [audioPreloadProgress, setAudioPreloadProgress] = useState(0);
  // Track if audio has been preloaded to prevent infinite loops
  const hasPreloadedAudioRef = useRef(false);
  // Track the actual word content to prevent unnecessary preloading
  const lastPreloadedWordsRef = useRef<string>('');
  // Track if current word audio is ready
  const [isCurrentWordAudioReady, setIsCurrentWordAudioReady] = useState(false);
  // Track if audio preloading is fully complete
  const [isAudioPreloadingComplete, setIsAudioPreloadingComplete] = useState(false);

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
    initialTransitionTimeout: null,
    fadeAnimationTimeout: null,
    maxProgress: 0,
    completionTriggered: false,
    isUpdatingWord: false,
    progressUpdatedForCompletion: false,
  });

  // Add navigation timer ref for cleanup
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Add controller ref for proper cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  const triggerCompletionTransition = useCallback(() => {
    if (stateRefs.current.completionTriggered) return;
    stateRefs.current.completionTriggered = true;

    // UI completion transition

    // Stop any playing audio to free resources
    audioPlayerRef.current.stop().catch(() => {});
    setIsTransitioningToCompletion(true);
    // Call fadeOut directly instead of depending on it
    fadeOut();

    stateRefs.current.maxProgress = 100;
    setProgressAnimationKey(prev => prev + 1);

    if (stateRefs.current.completionTransition) {
      clearTimeout(stateRefs.current.completionTransition);
    }

    stateRefs.current.completionTransition = setTimeout(() => {
      if (stateRefs.current.completionTriggered) {
        setIsTransitioningToCompletion(false);
      }
    }, TIMING_CONFIG.MEDIUM.duration);
  }, []); // Remove fadeOut from dependencies

  const { currentWord, isComplete, progress, updateWord, invalidateQueries, wordQueue } = useFSRS({
    userId: user?.id,
    onComplete: triggerCompletionTransition,
    useAllWords: fromRemember, // When fromRemember is true, use all words instead of just due words
    mode, // Pass the mode for struggling words filtering
    // Apply cooldown even for "Study all words" so recently reviewed words don't reappear immediately
    sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
  });

  const wordFontSize = useWordSizing(currentWord?.root?.letters, fontConfig);

  // Derive currentSentence directly from currentWord to avoid timing issues
  const currentSentence = useMemo(() => {
    const wordForm = currentWord?.root?.letters ?? '';
    return { wordForm };
  }, [currentWord]);

  // Unique key for the current word to trigger renders even if the text is identical
  const currentWordKey = useMemo(
    () =>
      currentWord
        ? `${currentWord.root_id}-${currentWord.fsrs_last_review ?? ''}-${
            currentWord.fsrs_reps ?? 0
          }`
        : 'none',
    [currentWord]
  );

  // Ensure translation is hidden when advancing to a new word
  useEffect(() => {
    // Clear any pending translation timers
    if (stateRefs.current.meaningTimeout) {
      clearTimeout(stateRefs.current.meaningTimeout);
      stateRefs.current.meaningTimeout = null;
    }
    // Immediately hide translation and reset related flags
    setShowTranslation(false);
    setIsStruggling(false);
    setCurrentMeaning('');
    // Reset stale completion flag if a new word/session appears
    if (currentWordKey !== 'none' && stateRefs.current.completionTriggered) {
      stateRefs.current.completionTriggered = false;
      setIsTransitioningToCompletion(false);
      // UI completion reset for new word
    }
  }, [currentWordKey]);

  // Batch state updates for translation display
  const showTranslationWithTimeout = useCallback(
    (meaning: string, isVague: boolean, isStruggling: boolean = false) => {
      setCurrentMeaning(meaning);
      setIsVagueMeaning(isVague);
      setShowTranslation(true);
      setIsStruggling(isStruggling);

      return setTimeout(
        () => {
          setShowTranslation(false);
          setIsStruggling(false);
        },
        isStruggling
          ? TRANSITION_DELAYS.meaningDisplay.struggling
          : TRANSITION_DELAYS.meaningDisplay.normal
      );
    },
    []
  );

  // Shows translation if needed
  const displayMeaning = useCallback(
    (confidence: 'known' | 'vague' | 'unknown', isStruggling: boolean) => {
      if (confidence === 'known') return null;

      const meaning = currentWord?.root?.meaning || 'No translation available';
      const shouldShowAsError = confidence === 'unknown';
      return showTranslationWithTimeout(
        meaning,
        confidence === 'vague',
        shouldShowAsError || isStruggling
      );
    },
    [currentWord?.root?.meaning, showTranslationWithTimeout]
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
      if (!currentWord?.root_id || controller.signal.aborted) {
        return;
      }

      try {
        // If struggling, treat it more like 'unknown' than 'vague'
        const effectiveConfidence = isStruggling ? 'unknown' : confidence;
        // Word processing begin
        await updateWord(currentWord.root_id, effectiveConfidence);

        if (!stateRefs.current.isUpdatingWord) return;

        // FIXED: Check if completion is needed after word processing
        // This ensures completion happens at the right time
        if (isComplete) {
          // Session is already complete, trigger completion transition
          triggerCompletionTransition();
          // Word process complete immediately
        } else {
          // Continue with normal flow
          setTimeout(() => fadeIn(), TIMING_CONFIG.FAST.duration);
          // Word process done
        }
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
        if (!stateRefs.current.isUpdatingWord) return;
        fadeIn();
        // Word process error logged
      } finally {
        stateRefs.current.isUpdatingWord = false;
        setIsUpdatingUI(false);
        if (stateRefs.current.meaningTimeout) {
          clearTimeout(stateRefs.current.meaningTimeout);
          stateRefs.current.meaningTimeout = null;
        }
      }
    },
    [currentWord?.root_id, updateWord, fadeIn, isComplete, triggerCompletionTransition]
  );

  // Enhanced audio playback function for single audio files
  const playAudio = useCallback(async (url: string) => {
    if (!url) return Promise.resolve();

    const track = {
      id: `review-${Date.now()}`,
      audioUrl: url,
      title: 'Review Audio', // Assuming a default title for now
      duration: 0,
    };

    try {
      // Play audio immediately since it's preloaded
      const success = await audioPlayerRef.current.play(track);
      return success;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
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

      // Set updating flag immediately to prevent concurrent processing
      stateRefs.current.isUpdatingWord = true;
      setIsUpdatingUI(true);

      // Abort any previous operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

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
      // Clear any pending transition timers before scheduling new ones
      if (stateRefs.current.initialTransitionTimeout) {
        clearTimeout(stateRefs.current.initialTransitionTimeout);
        stateRefs.current.initialTransitionTimeout = null;
      }
      if (stateRefs.current.fadeAnimationTimeout) {
        clearTimeout(stateRefs.current.fadeAnimationTimeout);
        stateRefs.current.fadeAnimationTimeout = null;
      }

      stateRefs.current.initialTransitionTimeout = setTimeout(() => {
        if (controller.signal.aborted) return;

        // Clean up any playing audio before proceeding
        audioPlayerRef.current.stop().catch(() => {});

        // Only fade out if we're moving to a new word (known response)
        // For vague/unknown responses, we want to keep the Arabic word visible
        if (confidence === 'known') {
          fadeOut();
        }

        stateRefs.current.fadeAnimationTimeout = setTimeout(() => {
          if (controller.signal.aborted) return;

          // Determine if user is struggling with this word
          const isStruggling = checkIsStruggling(confidence);

          // Update UI with meaning if needed
          stateRefs.current.meaningTimeout = displayMeaning(confidence, isStruggling);
          // Meaning display logged

          // Play English feedback audio for vague/unknown responses
          if (
            (confidence === 'vague' || confidence === 'unknown') &&
            currentWord?.root?.audio_url_en
          ) {
            const englishAudioUrl = generateAudioUrl(currentWord.root.audio_url_en);
            if (englishAudioUrl) {
              playAudio(englishAudioUrl);
            }
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
                // Meaning timeout elapsed
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
    },
    [
      isTransitioningToCompletion,
      isComplete,
      fadeOut,
      checkIsStruggling,
      displayMeaning,
      processFeedback,
      playAudio,
      currentWord?.root?.audio_url_en,
      currentWord?.fsrs_stability,
      generateAudioUrl,
    ]
  );

  // Effect: Handle completion transition
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !stateRefs.current.completionTriggered) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      // Ensure any remaining audio is stopped
      audioPlayerRef.current.stop().catch(() => {});
      // UI completion isComplete effect
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

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
        // UI progress updated
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

  // Audio preloading function - loads all audio files at session start
  const preloadSessionAudio = useCallback(
    async (words: StudyWord[]) => {
      if (!words.length) {
        return;
      }

      setIsAudioPreloading(true);
      setIsAudioPreloadingComplete(false);
      setAudioPreloadProgress(0);

      try {
        const audioUrls: string[] = [];

        // Collect all unique audio URLs from the session words
        words.forEach(word => {
          if (word.root?.audio_url) {
            const audioUrl = generateAudioUrl(word.root.audio_url);
            if (audioUrl && !audioUrls.includes(audioUrl)) {
              audioUrls.push(audioUrl);
            }
          }
          if (word.root?.audio_url_en) {
            const englishAudioUrl = generateAudioUrl(word.root.audio_url_en);
            if (englishAudioUrl && !audioUrls.includes(englishAudioUrl)) {
              audioUrls.push(englishAudioUrl);
            }
          }
        });

        if (audioUrls.length === 0) {
          setIsAudioPreloading(false);
          setIsAudioPreloadingComplete(true);
          return;
        }

        // Preload all audio files in parallel for better performance
        // CRITICAL FIX: Load audio files in batches to prevent resource exhaustion
        const totalUrls = audioUrls.length;
        let completedUrls = 0;
        const BATCH_SIZE = 5; // Process 5 audio files at a time
        const BATCH_DELAY = 100; // 100ms delay between batches

        // Create progress tracking function
        const trackProgress = () => {
          completedUrls++;
          setAudioPreloadProgress((completedUrls / totalUrls) * 100);
        };

        // Process audio files in batches to prevent overwhelming the system
        for (let i = 0; i < audioUrls.length; i += BATCH_SIZE) {
          const batch = audioUrls.slice(i, i + BATCH_SIZE);

          // Process current batch in parallel
          const batchPromises = batch.map(async url => {
            try {
              await audioCache.getAudio(url);
              trackProgress();
              return true;
            } catch {
              trackProgress(); // Still count as completed to avoid hanging
              return false;
            }
          });

          // Wait for current batch to complete
          await Promise.all(batchPromises);

          // Small delay between batches to prevent resource exhaustion
          if (i + BATCH_SIZE < audioUrls.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        }

        // Mark preloading as complete immediately
        setIsAudioPreloadingComplete(true);
      } catch {
        // Don't block the session if audio preloading fails
        setIsAudioPreloadingComplete(true);
      } finally {
        setIsAudioPreloading(false);
        setAudioPreloadProgress(0);
      }
    },
    [generateAudioUrl]
  );

  // Effect: Preload audio when session starts (ONCE)
  useEffect(() => {
    // Create a stable signature of the words to prevent unnecessary preloading
    const wordsSignature = wordQueue?.map(w => w.root_id).join(',') || '';

    // Only preload if we have words, haven't started preloading, haven't already preloaded, and session isn't complete
    // AND the words have actually changed
    if (
      wordQueue &&
      wordQueue.length > 0 &&
      !isAudioPreloading &&
      !hasPreloadedAudioRef.current &&
      !isComplete &&
      !isTransitioningToCompletion &&
      wordsSignature !== lastPreloadedWordsRef.current
    ) {
      hasPreloadedAudioRef.current = true;
      lastPreloadedWordsRef.current = wordsSignature;
      preloadSessionAudio(wordQueue);
    }
  }, [
    wordQueue?.length,
    isAudioPreloading,
    isComplete,
    isTransitioningToCompletion,
    preloadSessionAudio,
  ]);

  // Reset preload flag when session completes
  useEffect(() => {
    if (isComplete) {
      hasPreloadedAudioRef.current = false;
      lastPreloadedWordsRef.current = '';
      setIsAudioPreloadingComplete(false);
    }
  }, [isComplete]);

  // Effect: Stop any existing audio when practice session starts
  useEffect(() => {
    // Stop any existing audio from other sessions (like listen tab) when practice starts
    if (currentWord && !isComplete && !isTransitioningToCompletion) {
      audioPlayerRef.current.stop().catch(() => {});
    }
  }, [currentWord, isComplete, isTransitioningToCompletion]);

  // Effect: Stop any existing audio when practice session initializes
  useEffect(() => {
    // Stop any existing audio when the practice session first starts
    if (wordQueue && wordQueue.length > 0 && !isComplete) {
      audioPlayerRef.current.stop().catch(() => {});
    }
  }, [wordQueue?.length, isComplete]);

  // Effect: Pre-configure audio session for faster first playback
  useEffect(() => {
    if (wordQueue && wordQueue.length > 0 && !isComplete) {
      // Pre-configure audio session in background to reduce first audio delay
      audioPlayerRef.current.preconfigureAudioSession?.().catch(() => {
        // Ignore pre-configuration errors - session will be configured on first play
      });
    }
  }, [wordQueue?.length, isComplete]);

  // Effect: Handle current word changes and play audio (simplified - no more loading)
  useEffect(() => {
    if (stateRefs.current.completionTriggered || isComplete || isTransitioningToCompletion) {
      return;
    }

    if (!currentWord?.root) {
      return;
    }

    if (showTranslation) {
      return;
    }

    // CRITICAL FIX: Only play audio after preloading is complete
    if (isAudioPreloading || !isAudioPreloadingComplete) {
      return;
    }

    const wordId = String(currentWord.root_id);
    const audioUrl = generateAudioUrl(currentWord.root.audio_url);

    // Since audio is preloaded, mark as ready immediately
    setIsCurrentWordAudioReady(true);

    // Play audio for Arabic words (now preloaded, so should be instant)
    if (audioUrl) {
      // Play audio immediately since it's already cached
      playAudio(audioUrl).catch(handleError);
    }

    // Update the lastProcessedWordId
    timeRefs.current.lastProcessedWordId = wordId;
  }, [
    currentWord,
    isComplete,
    isTransitioningToCompletion,
    showTranslation,
    playAudio,
    generateAudioUrl,
    isAudioPreloading,
    isAudioPreloadingComplete,
  ]);

  // Safety watchdog: if no current word and not transitioning, force completion
  useEffect(() => {
    if (
      !isComplete &&
      !isTransitioningToCompletion &&
      !stateRefs.current.completionTriggered &&
      !stateRefs.current.isUpdatingWord &&
      !currentWord
    ) {
      const timer = setTimeout(() => {
        if (
          !isComplete &&
          !isTransitioningToCompletion &&
          !stateRefs.current.completionTriggered &&
          !stateRefs.current.isUpdatingWord &&
          !currentWord
        ) {
          // UI watchdog completion warning
          triggerCompletionTransition();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentWord, isComplete, isTransitioningToCompletion, triggerCompletionTransition]);

  const handleSwipeLeft = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWord || !isCurrentWordAudioReady)
      return;
    // Gesture swipe left - after hesitation: unknown, otherwise: unknown
    handleKnowledgeResponse('unknown');
  }, [handleKnowledgeResponse, isComplete, currentWord, isCurrentWordAudioReady]);

  const handleSwipeRight = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWord || !isCurrentWordAudioReady)
      return;
    // Gesture swipe right - after hesitation: vague, otherwise: known
    const confidence = isHesitating ? 'vague' : 'known';
    handleKnowledgeResponse(confidence);
  }, [handleKnowledgeResponse, isComplete, currentWord, isCurrentWordAudioReady, isHesitating]);

  const handleLongPress = useCallback(() => {
    if (isComplete || stateRefs.current.isUpdatingWord || !currentWord || !isCurrentWordAudioReady)
      return;
  }, [currentWord, isComplete, isCurrentWordAudioReady]);

  // Hesitation callbacks
  const handleHesitationStart = useCallback(() => {
    setIsHesitating(true);
  }, []);

  const handleHesitationEnd = useCallback(() => {
    setIsHesitating(false);
  }, []);

  const handleClose = useCallback(() => {
    const mounted = { current: true };

    // Stop any playing audio when closing
    audioPlayerRef.current.stop().catch(() => {});

    if (!mounted.current) return;

    // Defer query invalidation until after navigation animation completes
    InteractionManager.runAfterInteractions(() => {
      if (!mounted.current) return;

      invalidateQueries();

      if (user?.id) {
        // Invalidate and refetch all relevant FSRS queries so counts update immediately
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        queryClient.invalidateQueries({
          queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
        });
        queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(user.id) });

        // Eagerly refetch to avoid stale due counts right after session
        queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
        queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        queryClient.refetchQueries({
          queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
        });
        queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.stats(user.id) });
      }
    });

    // Clear any existing navigation timer
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = setTimeout(() => {
      if (mounted.current) {
        if (onClose) {
          onClose();
        } else if (fromRemember) {
          router.replace(ROUTE_PATHS.STUDY_TAB);
        } else {
          router.back();
        }
      }
      mounted.current = false;
      // Session ended (closed)
    }, 100);
  }, [invalidateQueries, user?.id, queryClient, onClose, fromRemember, router]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Abort any ongoing knowledge response operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      stateRefs.current.completionTriggered = true;
      stateRefs.current.progressUpdatedForCompletion = false;

      // Explicitly reset UI state on unmount
      setIsTransitioningToCompletion(false);
      setShowTranslation(false);

      // Safely call fadeIn with error handling to prevent crashes
      try {
        fadeIn();
      } catch {
        // Animation cleanup failed - continue
      }

      // Ensure audio is stopped and cleaned up
      try {
        audioPlayerRef.current.stop().catch(() => {});
      } catch {
        // Audio cleanup failed - continue
      }

      // Clean up all timers with null checks
      if (stateRefs.current.meaningTimeout) {
        clearTimeout(stateRefs.current.meaningTimeout);
        stateRefs.current.meaningTimeout = null;
      }

      if (stateRefs.current.completionTransition) {
        clearTimeout(stateRefs.current.completionTransition);
        stateRefs.current.completionTransition = null;
      }

      if (stateRefs.current.initialTransitionTimeout) {
        clearTimeout(stateRefs.current.initialTransitionTimeout);
        stateRefs.current.initialTransitionTimeout = null;
      }

      if (stateRefs.current.fadeAnimationTimeout) {
        clearTimeout(stateRefs.current.fadeAnimationTimeout);
        stateRefs.current.fadeAnimationTimeout = null;
      }

      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }

      // Reset all state refs to prevent stale references
      stateRefs.current.isUpdatingWord = false;
      setIsUpdatingUI(false);
      stateRefs.current.maxProgress = 0;
      timeRefs.current.lastProcessedWordId = null;
      timeRefs.current.lastVagueTime = null;
      timeRefs.current.lastProgressUpdate = Date.now();
    };
  }, [fadeIn]);

  // Create a transparent style for non-transitioning states
  const transparentStyle = useAnimatedStyle(
    (): ViewStyle => ({
      opacity: 1,
    }),
    []
  );

  return {
    currentSentence,
    currentMeaning,
    currentWord,
    showTranslation,
    isVagueMeaning,
    isStruggling,
    isTransitioningToCompletion,
    opacity,
    isComplete,
    isUpdating: isUpdatingUI,
    progress,
    maxProgress: stateRefs.current.maxProgress,
    progressAnimationKey,
    wordFontSize,
    currentWordKey,
    handleSwipeLeft,
    handleSwipeRight,
    handleLongPress,
    handleClose,
    transparentStyle,
    sessionMetrics: sessionMetricsRef.current,
    // Hesitation state and callbacks
    isHesitating,
    handleHesitationStart,
    handleHesitationEnd,
    // Add audio preloading state
    isAudioPreloading,
    audioPreloadProgress,
    // Add audio ready state
    isCurrentWordAudioReady,
    // Add audio preloading completion state
    isAudioPreloadingComplete,
  };
}
