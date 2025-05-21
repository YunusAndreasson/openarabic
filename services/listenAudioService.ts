import { StudyWord } from '@/types/vocabulary.types';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

// Constants for track types
export const TRACK_TYPES = {
  ARABIC: 'ar',
  ENGLISH: 'en',
} as const;

export const listenAudioService = {
  /**
   * Converts vocabulary words to enhanced audio tracks for the listen screen
   * Each word creates two tracks: Arabic and English
   */
  generateVocabularyTracks(words: StudyWord[]): EnhancedAudioTrack[] {
    if (!words?.length) return [];

    const tracks: EnhancedAudioTrack[] = [];

    words.forEach((word, index) => {
      const arabicAudio = word.root?.audio_url;
      const englishAudio = word.root?.audio_url_en;

      // Skip words without both audio types
      if (!arabicAudio || !englishAudio || !word.root) {
        return;
      }

      // Add Arabic track
      tracks.push({
        id: `word-${index}-${TRACK_TYPES.ARABIC}`,
        articleId: word.root.id, // Reuse articleId field to store rootId
        audioUrl: arabicAudio,
        title: word.root.letters || 'Arabic', // Use Arabic word as title
      });

      // Add English track
      tracks.push({
        id: `word-${index}-${TRACK_TYPES.ENGLISH}`,
        articleId: word.root.id, // Reuse articleId field to store rootId
        audioUrl: englishAudio,
        title: word.root.meaning || 'English', // Use English meaning as title
      });
    });

    return tracks;
  },

  /**
   * Randomizes a selection of vocabulary words up to the specified limit
   */
  getRandomVocabularyTracks(words: StudyWord[], limit: number = 20): EnhancedAudioTrack[] {
    try {
      if (!words?.length) return [];

      // Filter words with both audio types
      const wordsWithAudio = words.filter(word => word.root?.audio_url && word.root?.audio_url_en);

      // Shuffle the array to randomize the order
      const shuffled = [...wordsWithAudio].sort(() => 0.5 - Math.random());

      // Take limited number of words
      const selectedWords = shuffled.slice(0, limit);

      // Convert to tracks
      return this.generateVocabularyTracks(selectedWords);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: 'Failed to generate vocabulary audio tracks',
        analyticsEventName: 'Listen_Audio_Generation_Error',
        sentrySeverity: 'error',
      });
      return [];
    }
  },
};
