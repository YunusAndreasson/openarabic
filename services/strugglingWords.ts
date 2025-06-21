import { checkAuthentication } from '@/services/supabase';
import type { StudyWord } from '@/types/vocabulary.types';
import { isStrugglingWord } from '@/utils/wordClassification';

import { studyWordsFSRSService } from './studyWordsFSRS';

export const strugglingWordsService = {
  /**
   * Get words that the user is struggling with the most.
   *
   * This fetches words that meet the isStrugglingWord() criteria AND have been reviewed,
   * ensuring consistency between the display count and actual session content.
   */
  async getStrugglingWords(userId: string, limit: number = 10): Promise<StudyWord[]> {
    // First ensure user is authenticated
    await checkAuthentication(userId);

    // Fetch reviewed words sorted by difficulty and stability
    // We fetch more than the limit to filter for struggling words
    const candidateWords = await studyWordsFSRSService.getFSRSWords(userId, {
      reviewedOnly: true,
      sortByDifficultyAndStability: true,
      limit: limit * 5, // Fetch more candidates to ensure we can find enough struggling words
    });

    // Filter to only include words that actually meet the struggling criteria
    const strugglingWords = candidateWords.filter(word => isStrugglingWord(word));

    // Return up to the requested limit of actual struggling words
    return strugglingWords.slice(0, limit);
  },
};
