import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { isStrugglingWord } from '@/utils/wordClassification';

import { useFSRSQueries } from './useFSRSQueries';

export interface PracticeBadgeData {
  phase: 'red' | 'yellow' | 'green' | 'none';
  count?: number;
  showDot?: boolean;
}

interface UsePracticeBadgeParams {
  userId?: string;
}

/**
 * Smart badge strategy for Practice tab following 3-phase FSRS system:
 * - RED: Due words (urgent preservation) - show count
 * - YELLOW: Struggling words (effortful retrieval) - show count
 * - GREEN: Mixed practice available - show dot only
 * - NONE: No practice needed
 */
export function usePracticeBadge({ userId }: UsePracticeBadgeParams): PracticeBadgeData {
  const { allWords } = useFSRSQueries({ userId });

  return useMemo<PracticeBadgeData>(() => {
    if (!allWords || allWords.length === 0) {
      return { phase: 'none' };
    }

    const now = new Date().toISOString();

    // RED PHASE: Count due words (urgent memory preservation)
    const dueWords = allWords.filter((word: StudyWord) => (word.fsrs_due ?? '9999-12-31') <= now);

    if (dueWords.length > 0) {
      return {
        phase: 'red',
        count: dueWords.length,
      };
    }

    // YELLOW PHASE: Count struggling words (effortful retrieval practice)
    const strugglingWords = allWords.filter((word: StudyWord) => {
      const hasBeenReviewed = word.fsrs_last_review != null && (word.fsrs_reps ?? 0) > 0;
      return hasBeenReviewed && isStrugglingWord(word);
    });

    if (strugglingWords.length > 0) {
      return {
        phase: 'yellow',
        count: strugglingWords.length,
      };
    }

    // GREEN PHASE: Mixed practice available (interleaved review)
    // Show dot indicator for optional practice when words exist but no urgent needs
    if (allWords.length > 0) {
      return {
        phase: 'green',
        showDot: true,
      };
    }

    return { phase: 'none' };
  }, [allWords]);
}
