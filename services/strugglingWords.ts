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

    // Fetch the most difficult words directly from the database
    return studyWordsFSRSService.getFSRSWords(userId, {
      reviewedOnly: true,
      sortByDifficultyAndStability: true,
      limit,
    });
  },
};
