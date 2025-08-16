import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';

interface UseMemoryBadgeOptions {
  studyWords: StudyWord[] | undefined;
}

interface UseMemoryBadgeResult {
  shouldShowMemoryBadge: boolean;
}

/**
 * Lightweight hook for calculating memory badge status
 * This hook only performs calculations and doesn't fetch data
 */
export function useMemoryBadge({ studyWords }: UseMemoryBadgeOptions): UseMemoryBadgeResult {
  const shouldShowMemoryBadge = useMemo(() => {
    if (!studyWords?.length) return false;

    // Cache the filtered words to avoid recalculation
    const wordsWithReviews = studyWords.filter(word => word.fsrs_last_review !== null);

    if (wordsWithReviews.length === 0) return false;

    // Calculate average retention based on FSRS state and stability
    let totalRetention = 0;
    let validWords = 0;

    wordsWithReviews.forEach(word => {
      if (word.fsrs_state === 2 && word.fsrs_stability !== null) {
        // Mastered words: retention based on stability
        const retention = Math.min(100, Math.max(0, word.fsrs_stability * 10));
        totalRetention += retention;
        validWords++;
      } else if (word.fsrs_state === 0 || word.fsrs_state === 1 || word.fsrs_state === 3) {
        // Learning words: lower retention
        totalRetention += 30; // Learning words have lower retention
        validWords++;
      }
    });

    if (validWords === 0) return false;

    const averageRetention = totalRetention / validWords;

    // Show red dot when retention is below 40% (poor threshold)
    return averageRetention < 40;
  }, [studyWords]);

  return {
    shouldShowMemoryBadge,
  };
}
