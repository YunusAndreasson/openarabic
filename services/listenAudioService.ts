import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { STRINGS } from '@/constants/strings';

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
        id: `word-${index}-ar`,
        rootId: word.root.id,
        audioUrl: arabicAudio,
        title: word.root.letters || 'Arabic', // Use Arabic word as title
      });

      // Add English track
      tracks.push({
        id: `word-${index}-en`,
        rootId: word.root.id,
        audioUrl: englishAudio,
        title: word.root.meaning || 'English', // Use English meaning as title
      });
    });

    return tracks;
  },

  /**
   * Randomizes a selection of vocabulary words up to the specified limit
   */
  async getRandomVocabularyTracks(
    words: StudyWord[],
    limit: number = 20,
    signal?: AbortSignal
  ): Promise<EnhancedAudioTrack[]> {
    try {
      if (!words?.length || signal?.aborted) return [];

      // Filter words with both audio types
      const wordsWithAudio = words.filter(word => word.root?.audio_url && word.root?.audio_url_en);

      if (signal?.aborted) return [];

      // Shuffle the array to randomize the order
      wordsWithAudio.sort(() => 0.5 - Math.random());

      // Take limited number of words
      const selectedWords = wordsWithAudio.slice(0, limit);

      if (signal?.aborted) return [];

      // Convert to tracks
      return signal?.aborted ? [] : this.generateVocabularyTracks(selectedWords);
    } catch (error) {
      if (!signal?.aborted) {
        await handleError(error instanceof Error ? error : new Error(String(error)), {
          toastMessage: STRINGS.FAILED_TO_GENERATE_VOCABULARY_AUDIO_TRACKS,
          analyticsEventName: 'Listen_Audio_Generation_Error',
          sentrySeverity: 'error',
        });
      }
      return [];
    }
  },
};
