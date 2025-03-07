import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyWordsService } from '../services/study_words';

/**
 * Enhanced Spaced Repetition System (SRS)
 *
 * This implementation uses an advanced algorithm inspired by research on memory and forgetting curves.
 * It enhances the traditional SM-2 algorithm with stability-based calculations and spacing effects.
 *
 * Key components:
 *
 * 1. Memory Stability: Represents how well a word is remembered in long-term memory.
 *    - Increases with successful recalls, especially for already stable memories
 *    - Decreases significantly with failures
 *
 * 2. Interval Calculation: Based on stability rather than simple multiplication
 *    - More stable items get longer intervals
 *    - Failed items get reset to short intervals
 *
 * 3. Spacing Effect: Rewards longer intervals with bonus increases
 *    - Words remembered after longer intervals receive larger stability boosts
 *
 * 4. Recovery Mechanism: Special handling for frequently forgotten words
 *    - Words with high lapse counts get shorter intervals
 *
 * 5. Tuning Parameters:
 *    - STABILITY_GROWTH_FACTOR: Controls how quickly stability increases
 *    - FAILURE_STABILITY_REDUCTION: Controls how much stability is lost on failure
 *    - SPACING_EFFECT_STRENGTH: Controls the bonus for longer intervals
 *    - LAPSE_PENALTY_FACTOR: Controls the penalty for frequently forgotten words
 *
 * This algorithm should provide more efficient learning by:
 *   - Presenting well-known words less frequently
 *   - Focusing more attention on difficult words
 *   - Optimizing intervals based on memory research
 */

// Types for study words
export interface StudyWord {
  sentence_word_id: string;
  sentence_word: {
    word_form: string;
    english: string;
    sentence?: {
      arabic: string;
    };
  };
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
  stability: number; // Memory stability - how well the item is remembered
  previous_interval: number; // The interval before the current one
  // Session-specific properties (not stored in database)
  sessionData?: {
    isNew?: boolean; // Is this a new word (review_count <= 1)
    failedInSession?: boolean; // Was this word failed in the current session
    consecutiveSuccesses?: number; // How many consecutive successes since last failure
    remainingReviewsNeeded?: number; // How many more reviews this word needs in the session
  };
  reinsertPosition?: number; // Position where this word should be reinserted in the queue
}

interface SrsStats {
  totalWords: number;
  averageInterval: number;
  averageStability: number;
  averageEaseFactor: number;
  successRate: number;
  masteredCount: number;
  learningCount: number;
  averageLapses: number;
  failedWordsRemaining: number;
  newWordsCount: number;
  failedInSessionCount: number;
}

interface UseSpacedRepetitionProps {
  userId: string | undefined;
  onComplete?: () => void;
}

interface UseSpacedRepetitionReturn {
  dueWords: StudyWord[];
  currentIndex: number;
  currentWord: StudyWord | undefined;
  isLoading: boolean;
  isUpdating: boolean;
  updateWord: (wordId: string, success: boolean) => Promise<void>;
  progress: number;
  isComplete: boolean;
  invalidateQueries: () => void;
  transitionType: 'fade' | 'slide'; // Ensure transitionType is properly exported
  getSrsStats: () => SrsStats; // Added function to get SRS statistics
}

// Session configuration - extracted for testability
export const SESSION_CONFIG = {
  REQUIRED_CONSECUTIVE_SUCCESSES: 2, // Number of consecutive successes needed for failed words
  NEW_WORD_MINIMUM_REVIEWS: 2, // Minimum number of times to show new words
  REQUEUE_DELAY_MIN: 2, // Minimum number of other cards before reshowing a failed word
  REQUEUE_DELAY_MAX: 5, // Maximum number of other cards before reshowing a failed word
  NEW_WORD_THRESHOLD: 1, // Words with review_count <= this are considered new
};

// SRS algorithm constants - extracted for testability
export const SRS_CONSTANTS = {
  STABILITY_GROWTH_FACTOR: 0.5, // Controls stability growth rate
  MAX_STABILITY: 90, // Maximum stability value to prevent DB overflow
  FAILURE_STABILITY_REDUCTION: 0.6, // How much stability is retained after failure
  SPACING_EFFECT_STRENGTH: 0.1, // Strength of the spacing effect bonus
  LAPSE_PENALTY_FACTOR: 0.05, // Penalty per lapse
  MIN_STABILITY: 1, // Minimum stability value
  MAX_EASE_FACTOR: 2.5, // Maximum ease factor
  EASE_INCREASE: 0.1, // Ease factor increase on success
  EASE_DECREASE: 0.2, // Ease factor decrease on failure
  DB_MAX_PRECISION: 99.99, // Maximum value for database fields with (4,2) precision
};

// PURE FUNCTION: Calculate next review data based on a success/failure response
// Extracted for testability
export function calculateNextReview(
  word: StudyWord,
  success: boolean,
  constants = SRS_CONSTANTS
): {
  newStability: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewDate: string;
  previousInterval: number;
} {
  const previousInterval = word.interval_days;

  // Handle potential missing values for existing records
  const currentStability = word.stability ?? constants.MIN_STABILITY;
  const currentPreviousInterval = word.previous_interval ?? 0;

  let newStability: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (success) {
    // If successful, increase stability based on current stability and ease factor
    const stabilityIncrease =
      currentStability * constants.STABILITY_GROWTH_FACTOR * word.ease_factor;

    // Apply an upper bound to stability to prevent excessive growth
    newStability = Math.min(constants.MAX_STABILITY, currentStability + stabilityIncrease);

    // Make sure stability fits in the database precision (4,2)
    newStability = Math.min(constants.DB_MAX_PRECISION, newStability);

    // Calculate new interval based on stability
    newInterval = Math.round(newStability);

    // Adjust ease factor - successful recall slightly increases ease
    newEaseFactor = Math.min(constants.MAX_EASE_FACTOR, word.ease_factor + constants.EASE_INCREASE);

    // Make sure ease_factor fits in the database precision (4,2)
    newEaseFactor = Math.min(constants.DB_MAX_PRECISION, newEaseFactor);

    // Apply spacing effect - longer previous intervals lead to better retention
    if (currentPreviousInterval > 0) {
      const spacingBonus = Math.sqrt(currentPreviousInterval) * constants.SPACING_EFFECT_STRENGTH;
      const spacingMultiplier = 1 + spacingBonus;
      newInterval = Math.max(newInterval, Math.round(newInterval * spacingMultiplier));
    }
  } else {
    // If failed, decrease stability significantly
    newStability = Math.max(
      constants.MIN_STABILITY,
      currentStability * constants.FAILURE_STABILITY_REDUCTION
    );

    // Reset interval to a small value
    newInterval = 1;

    // Adjust ease factor - failed recall decreases ease
    newEaseFactor = Math.max(1.3, word.ease_factor - constants.EASE_DECREASE);
  }

  // Apply recovery penalty for words that have lapsed frequently
  if (word.lapses > 2) {
    const lapseCount = word.lapses;
    const recoveryPenalty = 1 - lapseCount * constants.LAPSE_PENALTY_FACTOR;
    newInterval = Math.max(1, Math.round(newInterval * recoveryPenalty));
  }

  // Cap the interval to prevent date overflow errors
  const cappedInterval = Math.min(newInterval, 365 * 30); // Cap at 30 years

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + cappedInterval);

  // Validate the date is within reasonable bounds
  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setFullYear(now.getFullYear() + 30); // Max 30 years in the future

  const finalNextReview = nextReview > maxDate ? maxDate : nextReview;

  return {
    newStability,
    newInterval: cappedInterval,
    newEaseFactor,
    nextReviewDate: finalNextReview.toISOString(),
    previousInterval,
  };
}

// PURE FUNCTION: Determine if a word needs to be requeued
// Extracted for testability
export function shouldRequeueWord(
  word: StudyWord,
  success: boolean,
  config = SESSION_CONFIG
): boolean {
  // Word needs requeuing if:
  // 1. It was failed (success = false)
  // 2. It's a new word that needs more reviews
  // 3. It was previously failed and needs more consecutive successes

  return (
    !success ||
    (word.sessionData?.isNew === true && (word.sessionData?.remainingReviewsNeeded || 0) > 0) ||
    (word.sessionData?.failedInSession === true &&
      (word.sessionData?.consecutiveSuccesses || 0) < config.REQUIRED_CONSECUTIVE_SUCCESSES)
  );
}

// PURE FUNCTION: Calculate position to reinsert a word
// Extracted for testability
export function calculateReinsertPosition(
  word: StudyWord,
  currentPosition: number,
  remainingWords: number,
  success: boolean,
  config = SESSION_CONFIG
): number {
  let reinsertDelay = 0;

  if (!success) {
    // For failed words, add some space before reshowing
    reinsertDelay = Math.min(
      remainingWords,
      Math.floor(Math.random() * (config.REQUEUE_DELAY_MAX - config.REQUEUE_DELAY_MIN + 1)) +
        config.REQUEUE_DELAY_MIN
    );
  } else if (word.sessionData?.isNew) {
    // For new words needing more reviews, add more space
    reinsertDelay = Math.min(remainingWords, Math.floor(remainingWords / 2));
  } else if (word.sessionData?.failedInSession) {
    // For previously failed words needing more successes, add moderate space
    reinsertDelay = Math.min(remainingWords, Math.floor(remainingWords / 3));
  }

  // Calculate final position and ensure it's not beyond the queue
  return currentPosition + 1 + reinsertDelay;
}

// PURE FUNCTION: Calculate progress percentage
// Extracted for testability
export function calculateProgress(
  currentIndex: number,
  wordsInQueue: number,
  failedWordsCount: number
): number {
  // If no words, progress is 0
  if (wordsInQueue === 0) {
    return 0;
  }

  // Total words = current words + failed words waiting to be reshown
  const totalWordsToReview = wordsInQueue + failedWordsCount;

  // Completed words = current position
  const completedWords = currentIndex;

  // Calculate progress percentage
  const progress = (completedWords / Math.max(1, totalWordsToReview)) * 100;

  // Ensure it's between 0-100
  return Math.min(100, Math.max(0, Math.round(progress)));
}

// PURE FUNCTION: Check if review is complete
// Extracted for testability
export function isReviewComplete(
  currentIndex: number,
  wordsCount: number,
  failedWordsCount: number,
  hasWords: boolean,
  wordsLoaded: boolean
): boolean {
  // If words haven't been loaded, review is not complete
  if (!wordsLoaded) {
    return false;
  }

  // Review is complete when:
  // 1. We've reached the end of the queue
  // 2. There are no failed words left to review
  // 3. There were words to review in the first place
  // 4. Words have been properly processed

  const atEnd = currentIndex >= wordsCount;
  const noFailedWords = failedWordsCount === 0;
  const hasProcessedWords = wordsCount > 0;

  return atEnd && noFailedWords && hasWords && hasProcessedWords;
}

// PURE FUNCTION: Get SRS statistics
// Extracted for testability
export function getSrsStatsFromWords(words: StudyWord[], failedWordsCount: number): SrsStats {
  if (words.length === 0) {
    return {
      totalWords: 0,
      averageInterval: 0,
      averageStability: 0,
      averageEaseFactor: 0,
      successRate: 0,
      masteredCount: 0,
      learningCount: 0,
      averageLapses: 0,
      failedWordsRemaining: 0,
      newWordsCount: 0,
      failedInSessionCount: 0,
    };
  }

  // Calculate statistics from the words array
  let totalInterval = 0;
  let totalStability = 0;
  let totalEaseFactor = 0;
  let totalSuccesses = 0;
  let totalLapses = 0;
  let masteredCount = 0;

  words.forEach(word => {
    totalInterval += word.interval_days;
    totalStability += word.stability ?? 1;
    totalEaseFactor += word.ease_factor;
    totalSuccesses += word.review_count - word.lapses;
    totalLapses += word.lapses;

    // Consider a word "mastered" if its interval is over 30 days
    if (word.interval_days >= 30) {
      masteredCount++;
    }
  });

  const totalWords = words.length;
  const averageInterval = totalInterval / totalWords;
  const averageStability = totalStability / totalWords;
  const averageEaseFactor = totalEaseFactor / totalWords;
  const totalReviews = words.reduce((sum, word) => sum + word.review_count, 0);
  const successRate = totalReviews > 0 ? (totalSuccesses / totalReviews) * 100 : 0;
  const learningCount = totalWords - masteredCount;
  const averageLapses = totalLapses / totalWords;

  // Count new words and failed in session
  const newWordsCount = words.filter(w => w.sessionData?.isNew).length;
  const failedInSessionCount = words.filter(w => w.sessionData?.failedInSession).length;

  return {
    totalWords,
    averageInterval,
    averageStability,
    averageEaseFactor,
    successRate,
    masteredCount,
    learningCount,
    averageLapses,
    failedWordsRemaining: failedWordsCount,
    newWordsCount,
    failedInSessionCount,
  };
}

/**
 * Custom hook for managing spaced repetition logic
 */
export function useSpacedRepetition({
  userId,
  onComplete,
}: UseSpacedRepetitionProps): UseSpacedRepetitionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [transitionType, setTransitionType] = useState<'fade' | 'slide'>('fade');
  const [wordsLoaded, setWordsLoaded] = useState(false);
  const wordsRef = useRef<StudyWord[]>([]);
  const failedWordsRef = useRef<StudyWord[]>([]);
  const mountedRef = useRef(true);
  const hasUpdatedWords = useRef(false);
  const queryClient = useQueryClient();

  // Add state for tracking total words processed and seen count
  const totalWordsToReviewRef = useRef(0);
  const uniqueWordsSeenRef = useRef(new Set<string>());
  const wordReviewCountsRef = useRef<Record<string, number>>({});

  console.log('[DEBUG-SR] Hook initialized - currentIndex:', currentIndex);

  // Cleanup on unmount
  useEffect(() => {
    // Reset mounted flag to prevent state updates after unmount
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to invalidate queries
  const invalidateQueries = useCallback(() => {
    console.log('[DEBUG-SR] Invalidating queries');
    queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    queryClient.invalidateQueries({ queryKey: ['studyWords', userId] });
    queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    queryClient.invalidateQueries({ queryKey: ['dueWords', userId] });
  }, [queryClient, userId]);

  // Fetch due words - use server-side filtering for better performance
  const { data: dueWords = [], isLoading } = useQuery({
    queryKey: ['dueWords', userId],
    queryFn: async () => {
      console.log('[DEBUG-SR] Fetching due words for user:', userId);
      if (!userId) throw new Error('User ID is required');
      // Use the onlyDue option to filter on the server side
      const words = await studyWordsService.getStudyWords(userId, { onlyDue: true });
      console.log('[DEBUG-SR] Fetched', words.length, 'due words');

      // Server already filtered for due words, so we just need to sort
      if (words.length > 1) {
        words.sort((a, b) => {
          // Use cached timestamp values to avoid redundant Date object creation
          const dateA = new Date(a.next_review_at).getTime();
          const dateB = new Date(b.next_review_at).getTime();
          return dateA - dateB;
        });
        console.log('[DEBUG-SR] Sorted words by review date');
      }

      return words;
    },
    enabled: !!userId,
    // Improve caching strategy
    staleTime: 60 * 1000, // 1 minute before considering stale
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (React Query v5 uses gcTime instead of cacheTime)
    retry: 3, // Retry failed requests 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Immediately initialize wordsRef when dueWords changes
  useEffect(() => {
    // Only process if dueWords is valid and wordsRef is empty
    if (
      dueWords &&
      Array.isArray(dueWords) &&
      dueWords.length > 0 &&
      wordsRef.current.length === 0
    ) {
      console.log('[DEBUG-SR] Immediate initialization of wordsRef with', dueWords.length, 'words');

      // Process words to mark new words and initialize session data
      const processedWords = dueWords.map(word => ({
        ...word,
        sessionData: {
          isNew: word.review_count <= SESSION_CONFIG.NEW_WORD_THRESHOLD,
          failedInSession: false,
          consecutiveSuccesses: 0,
          remainingReviewsNeeded:
            word.review_count <= SESSION_CONFIG.NEW_WORD_THRESHOLD
              ? SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS
              : 1,
        },
      }));

      // Set the processed words immediately
      wordsRef.current = processedWords;
    }
  }, [dueWords]);

  // Process the words once they're loaded
  useEffect(() => {
    if (dueWords && Array.isArray(dueWords)) {
      console.log(
        '[DEBUG-SR] Updating wordsRef with',
        dueWords.length,
        'words, currentIndex:',
        currentIndex
      );

      // Process words to mark new words and initialize session data
      const processedWords = dueWords.map(word => ({
        ...word,
        sessionData: {
          isNew: word.review_count <= SESSION_CONFIG.NEW_WORD_THRESHOLD,
          failedInSession: false,
          consecutiveSuccesses: 0,
          remainingReviewsNeeded:
            word.review_count <= SESSION_CONFIG.NEW_WORD_THRESHOLD
              ? SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS
              : 1,
        },
      }));

      console.log(
        '[DEBUG-SR] New words count:',
        processedWords.filter(w => w.sessionData?.isNew).length
      );

      // IMPORTANT FIX: Only reset wordsRef if it's currently empty
      // This prevents resetting the state during an active review session
      if (wordsRef.current.length === 0) {
        wordsRef.current = processedWords;
        failedWordsRef.current = []; // Reset failed words queue

        // Reset progress tracking
        totalWordsToReviewRef.current = processedWords.length;
        uniqueWordsSeenRef.current = new Set<string>();
        wordReviewCountsRef.current = {};

        // Initialize word review counts
        processedWords.forEach(word => {
          // Count words that are new twice (since they'll be shown at least twice)
          const isNew = word.review_count <= SESSION_CONFIG.NEW_WORD_THRESHOLD;
          wordReviewCountsRef.current[word.sentence_word_id] = isNew
            ? SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS
            : 1;
        });

        // Update the total words to review count based on minimum reviews needed
        const expectedReviews = Object.values(wordReviewCountsRef.current).reduce(
          (sum, count) => sum + count,
          0
        );
        console.log('[DEBUG-SR] Initial expected reviews:', expectedReviews);

        // Make sure we're at the start of the review if there are words
        if (processedWords.length > 0 && currentIndex > 0) {
          console.log('[DEBUG-SR] Resetting currentIndex to 0');
          setCurrentIndex(0);
        }

        // Mark words as loaded
        setWordsLoaded(true);
      } else {
        console.log('[DEBUG-SR] Not resetting wordsRef - active review session in progress');
      }
    }
  }, [dueWords, currentIndex]);

  // Get current word with safety check to prevent "error loading word"
  const currentWord = useMemo(() => {
    // Try to get the word from wordsRef
    let word = null;

    if (wordsRef.current.length > 0) {
      // Use wordsRef when it's populated
      word = currentIndex < wordsRef.current.length ? wordsRef.current[currentIndex] : undefined;
    } else if (dueWords.length > 0) {
      // Fall back to dueWords if wordsRef is empty
      word = currentIndex < dueWords.length ? dueWords[currentIndex] : undefined;
      console.log('[DEBUG-SR] Using dueWords fallback for currentWord', word?.sentence_word_id);
    }

    // Track word as seen if it exists
    if (word?.sentence_word_id) {
      uniqueWordsSeenRef.current.add(word.sentence_word_id);
    }

    console.log(
      '[DEBUG-SR] Current word updated:',
      word?.sentence_word_id,
      'at index:',
      currentIndex,
      'of',
      wordsRef.current.length,
      'words'
    );
    return word;
  }, [currentIndex, wordsRef, dueWords]);

  // Calculate progress based on completed words vs. total words to review
  const progress = useMemo(() => {
    // Use the extracted pure function for testability
    return calculateProgress(currentIndex, wordsRef.current.length, failedWordsRef.current.length);
  }, [currentIndex, failedWordsRef, wordsRef, wordsLoaded]);

  // Check if review is complete
  const isComplete = useMemo(() => {
    // Use the extracted pure function for testability
    return isReviewComplete(
      currentIndex,
      wordsRef.current.length,
      failedWordsRef.current.length,
      dueWords.length > 0,
      wordsLoaded
    );
  }, [currentIndex, dueWords.length, failedWordsRef, wordsRef, wordsLoaded]);

  // Update also isLoading to consider wordsLoaded state
  const isActuallyLoading = isLoading || !wordsLoaded;

  // Word update mutation
  const updateWordMutation = useMutation({
    mutationFn: async ({
      wordId,
      success,
      wordToUpdate,
    }: {
      wordId: string;
      success: boolean;
      wordToUpdate: StudyWord;
    }) => {
      console.log('[DEBUG-SR] Updating word:', wordId, 'success:', success);
      setIsUpdating(true);
      hasUpdatedWords.current = true;

      // Update session tracking for consecutive successes
      if (wordToUpdate.sessionData) {
        if (success) {
          wordToUpdate.sessionData.consecutiveSuccesses =
            (wordToUpdate.sessionData.consecutiveSuccesses || 0) + 1;
        } else {
          wordToUpdate.sessionData.failedInSession = true;
          wordToUpdate.sessionData.consecutiveSuccesses = 0;

          // Update review count - we now need one more review for this word
          if (wordReviewCountsRef.current[wordId]) {
            wordReviewCountsRef.current[wordId] += 1;
          }
        }

        // Decrement remaining reviews needed counter
        if (
          wordToUpdate.sessionData.remainingReviewsNeeded &&
          wordToUpdate.sessionData.remainingReviewsNeeded > 0
        ) {
          wordToUpdate.sessionData.remainingReviewsNeeded--;
        }
      }

      // Check if this word needs to be requeued
      const needsRequeue = shouldRequeueWord(wordToUpdate, success);

      if (needsRequeue) {
        console.log(
          '[DEBUG-SR] Word needs to be requeued:',
          success ? 'new word needs more reviews' : 'word was failed'
        );

        // Calculate position to reinsert the word
        const currentPosition = currentIndex;
        const remainingWords = Math.max(0, wordsRef.current.length - currentPosition - 1);

        // Calculate the reinsert position using the pure function
        const reinsertPosition = calculateReinsertPosition(
          wordToUpdate,
          currentPosition,
          remainingWords,
          success
        );

        console.log(
          '[DEBUG-SR] Will requeue word at position:',
          reinsertPosition,
          'current position:',
          currentPosition
        );

        // Clone the word to reinsert it
        const wordToReinsert = { ...wordToUpdate };

        // Reinsert the word at the calculated position
        if (reinsertPosition < wordsRef.current.length) {
          failedWordsRef.current.push({
            ...wordToReinsert,
            reinsertPosition,
          });
        }
      }

      // Calculate the next review data using the pure function
      const nextReviewData = calculateNextReview(wordToUpdate, success);

      console.log(
        '[DEBUG-SR] Final values - New stability:',
        nextReviewData.newStability,
        'New interval:',
        nextReviewData.newInterval,
        'New ease factor:',
        nextReviewData.newEaseFactor,
        'Next review:',
        nextReviewData.nextReviewDate
      );

      // Prepare update payload
      const updatedWord = {
        interval_days: nextReviewData.newInterval,
        ease_factor: nextReviewData.newEaseFactor,
        next_review_at: nextReviewData.nextReviewDate,
        review_count: wordToUpdate.review_count + 1,
        lapses: success ? wordToUpdate.lapses : wordToUpdate.lapses + 1,
        stability: nextReviewData.newStability,
        previous_interval: nextReviewData.previousInterval,
      };
      console.log('[DEBUG-SR] Updated word data:', updatedWord);

      // OPTIMIZATION: Update the currentIndex immediately before the API call
      // This allows the UI to show the next word faster while the API call happens in the background
      if (mountedRef.current) {
        // Instead of simply incrementing, we now need to handle requeued words
        const nextWordIndex = getNextWordIndex();
        console.log('[DEBUG-SR] Moving to next word, index:', nextWordIndex);
        setCurrentIndex(nextWordIndex);
      }

      // Apply optimistic update to cache
      queryClient.setQueryData(['dueWords', userId], (oldData: StudyWord[] | undefined) => {
        if (!oldData) return oldData;
        // Create a new array with the updated word
        return oldData.map(word =>
          String(word.sentence_word_id) === String(wordId) ? { ...word, ...updatedWord } : word
        );
      });
      console.log('[DEBUG-SR] Applied optimistic update to cache');

      try {
        // Convert wordId to number as required by the service
        await studyWordsService.updateWordReview(Number(wordId), updatedWord);
        console.log('[DEBUG-SR] Successfully updated word in database');
        return { wordId, success, updatedWord };
      } catch (error: unknown) {
        console.error('[DEBUG-SR] Error updating word review:', error);

        // Add more detailed error logging
        if (error instanceof Error) {
          console.error('[DEBUG-SR] Error details:', {
            message: error.message,
            stack: error.stack,
            wordId,
            updatedWord,
          });
        }

        // Try a fallback approach with a more conservative date if this was a date-related error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage &&
          (errorMessage.includes('time zone') ||
            errorMessage.includes('date') ||
            errorMessage.includes('timestamp'))
        ) {
          console.log('[DEBUG-SR] Attempting fallback with conservative date');
          try {
            // Use a very conservative approach - just 1 year in the future
            const safeDate = new Date();
            safeDate.setFullYear(safeDate.getFullYear() + 1);

            const safeUpdatedWord = {
              ...updatedWord,
              interval_days: Math.min(updatedWord.interval_days, 365),
              next_review_at: safeDate.toISOString(),
            };

            console.log('[DEBUG-SR] Fallback update with safe date:', safeUpdatedWord);
            await studyWordsService.updateWordReview(Number(wordId), safeUpdatedWord);
            console.log('[DEBUG-SR] Fallback update successful');
            return { wordId, success, updatedWord: safeUpdatedWord };
          } catch (fallbackError) {
            console.error('[DEBUG-SR] Fallback update also failed:', fallbackError);
          }
        }

        // Invalidate cache on error to ensure it's up to date
        invalidateQueries();
        throw error;
      }
    },
    onSuccess: () => {
      // OPTIMIZATION: We already updated the currentIndex in the mutationFn
      // So we don't need to do it again here, just log for debugging
      if (mountedRef.current) {
        console.log('[DEBUG-SR] onSuccess called - currentIndex already updated');
        // No need to update currentIndex again
      }
    },
    onError: () => {
      // Continue to next word even if there's an error
      if (mountedRef.current) {
        console.log('[DEBUG-SR] Error occurred, still advancing to next word');
        setCurrentIndex(prev => Math.min(prev + 1, dueWords.length));
      }
    },
    onSettled: () => {
      if (mountedRef.current) {
        console.log('[DEBUG-SR] Setting isUpdating to false');
        setIsUpdating(false);
      }
    },
  });

  const determineTransitionType = useCallback((success: boolean) => {
    const type = success ? 'fade' : 'slide';
    console.log('[DEBUG-SR] Determined transition type:', type, 'for success:', success);
    return type;
  }, []);

  // Update word function
  const updateWord = useCallback(
    async (wordId: string, success: boolean) => {
      console.log('[DEBUG-SR] updateWord called with wordId:', wordId, 'success:', success);

      // Prevent updates if component is unmounted
      if (!mountedRef.current) {
        console.log('[DEBUG-SR] Component unmounted, skipping update');
        return;
      }

      // IMPORTANT FIX: Check if we're already at the end of the review
      if (currentIndex >= dueWords.length) {
        console.log('[DEBUG-SR] Already at end of review, no more words to update');
        return;
      }

      // Guard against updating past the end of the array
      if (currentIndex >= wordsRef.current.length) {
        console.log('[DEBUG-SR] currentIndex out of bounds, skipping update');
        return;
      }

      const wordToUpdate = wordsRef.current[currentIndex];
      if (!wordToUpdate?.sentence_word_id) {
        console.log('[DEBUG-SR] No word to update, skipping');
        return;
      }

      // Ensure we're comparing the correct IDs (both as strings)
      if (String(wordToUpdate.sentence_word_id) !== String(wordId)) {
        console.error('[DEBUG-SR] Word ID mismatch in updateWord', {
          expected: wordToUpdate.sentence_word_id,
          received: wordId,
        });
        return;
      }

      // Set transition type immediately before the animation starts
      // This is the ONLY place we should set the transition type
      console.log('[DEBUG-SR] Setting transition type before animation');
      setTransitionType(determineTransitionType(success));

      console.log('[DEBUG-SR] Calling updateWordMutation.mutate');
      await updateWordMutation.mutate({
        wordId,
        success,
        wordToUpdate,
      });
    },
    [currentIndex, updateWordMutation, determineTransitionType, dueWords.length]
  );

  // Check if review is completed and invalidate relevant queries
  useEffect(() => {
    if (isComplete) {
      console.log('[DEBUG-SR] Review is complete, invalidating queries');
      invalidateQueries();
      if (onComplete) {
        console.log('[DEBUG-SR] Calling onComplete callback');
        onComplete();
      }
    }
  }, [isComplete, onComplete, invalidateQueries]);

  // Invalidate queries on unmount if session was started but not completed
  useEffect(() => {
    return () => {
      if (hasUpdatedWords.current) {
        // Always invalidate queries on unmount if we've updated words
        // We don't need to check mountedRef here as this is a cleanup function
        invalidateQueries();
      }
    };
  }, [invalidateQueries]);

  // Function to determine the next word index, considering requeued words
  const getNextWordIndex = useCallback(() => {
    // Current position and next position in the review
    const currentPos = currentIndex;
    const nextPos = currentPos + 1;

    // First check: are there any failed words that should be shown at this position?
    const wordToReinsert = failedWordsRef.current.find(w => w.reinsertPosition === nextPos);

    if (wordToReinsert) {
      // Remove this word from the failed words queue
      failedWordsRef.current = failedWordsRef.current.filter(
        w => w.sentence_word_id !== wordToReinsert.sentence_word_id
      );

      // Insert the word at the next position
      wordsRef.current.splice(nextPos, 0, wordToReinsert);

      console.log('[DEBUG-SR] Reinserted failed word at position:', nextPos);
    }

    // Now check if we've reached the end of the queue
    const isAtEnd = nextPos >= wordsRef.current.length;

    // If at the end but still have failed words to review,
    // we need to reset to handle the remaining failed words
    if (isAtEnd && failedWordsRef.current.length > 0) {
      console.log(
        '[DEBUG-SR] At end but still have',
        failedWordsRef.current.length,
        'failed words. Processing them...'
      );

      // Process all failed words and add them to the wordsRef at their proper positions
      const failedWordsToAdd = [...failedWordsRef.current];
      failedWordsRef.current = []; // Clear the failed words queue

      // Add all failed words to the review queue
      failedWordsToAdd.forEach(word => {
        const position = Math.min(word.reinsertPosition || 0, wordsRef.current.length);
        wordsRef.current.splice(position, 0, word);
      });

      // Reset to the beginning to handle all words
      console.log('[DEBUG-SR] Processed failed words, resetting to beginning');
      return 0;
    }

    // Return the next position, capped at the array length
    const finalNextPos = Math.min(nextPos, wordsRef.current.length);
    console.log(
      '[DEBUG-SR] Next index:',
      finalNextPos,
      'isAtEnd:',
      isAtEnd,
      'failedWordsCount:',
      failedWordsRef.current.length
    );
    return finalNextPos;
  }, [currentIndex, failedWordsRef, wordsRef]);

  // Function to calculate and return SRS statistics
  const getSrsStats = useCallback((): SrsStats => {
    // Use the extracted pure function
    return getSrsStatsFromWords(wordsRef.current, failedWordsRef.current.length);
  }, [wordsRef, failedWordsRef]);

  return {
    dueWords,
    currentIndex,
    currentWord,
    isLoading: isActuallyLoading,
    isUpdating,
    updateWord,
    progress,
    isComplete,
    invalidateQueries,
    transitionType,
    getSrsStats,
  };
}
