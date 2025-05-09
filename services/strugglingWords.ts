import { StudyWord } from '@/types/vocabulary.types';
import { checkAuthentication } from '@/services/supabase';

import { studyWordsFSRSService } from './studyWordsFSRS';

export const strugglingWordsService = {
  /**
   * Get words that the user is struggling with the most.
   *
   * This fetches words with high difficulties and focuses on those that
   * have been recently reviewed but still have low stability.
   */
  async getStrugglingWords(userId: string, limit: number = 10): Promise<StudyWord[]> {
    // First ensure user is authenticated
    await checkAuthentication(userId);

    // Get all study words for the user
    const allWords = await studyWordsFSRSService.getFSRSWords(userId);

    // Filter for words that have been reviewed at least once
    const reviewedWords = allWords.filter(
      word => word.fsrs_last_review !== null && word.fsrs_reps > 0
    );

    // Sort by difficulty (high to low), and then by stability (low to high)
    // This prioritizes difficult words that haven't been learned well yet
    const sortedWords = reviewedWords.sort((a, b) => {
      // Primary sort by difficulty (descending)
      if (b.fsrs_difficulty !== a.fsrs_difficulty) {
        return b.fsrs_difficulty - a.fsrs_difficulty;
      }

      // Secondary sort by stability (ascending - we want less stable words first)
      if (a.fsrs_stability !== null && b.fsrs_stability !== null) {
        return a.fsrs_stability - b.fsrs_stability;
      }

      // Fallback to most recently reviewed
      const aDate = a.fsrs_last_review ? new Date(a.fsrs_last_review).getTime() : 0;
      const bDate = b.fsrs_last_review ? new Date(b.fsrs_last_review).getTime() : 0;
      return bDate - aDate;
    });

    // Return the top N struggling words
    return sortedWords.slice(0, limit);
  },
};
