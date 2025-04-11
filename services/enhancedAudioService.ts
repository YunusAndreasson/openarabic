import type { Article } from '../types/articles.types';
import type { StudyWord } from '../types/vocabulary.types';
import { handleError } from '../utils/errorHandling';

import { articlesService } from './articles';
import { readingListService } from './readingList';
import { studyWordsFSRSService } from './studyWordsFSRS';

// Define types for enhanced audio track structure
export type AudioTrackType = 'study_word_english' | 'study_word_arabic' | 'sentence';

export interface EnhancedAudioTrack {
  id: string; // unique track ID (composite of article ID, sentence ID, type)
  type: AudioTrackType;
  articleId: number;
  audioUrl: string;
  title: string; // Descriptive title for the track
  position: number; // For ordering
  sentenceId?: number; // For sentence tracks
  wordId?: number; // For study word tracks
  sentencePosition?: number; // Position of sentence in article
}

// Interface for article audio data
interface ArticleAudioData {
  articleId: number;
  title: string;
  sentences: {
    id: number;
    position: number;
    audioUrl: string | null;
  }[];
  studyWords: {
    id: number;
    wordForm: string;
    english: string;
    englishAudioUrl: string | null;
    arabicAudioUrl: string | null;
    sentenceId: number;
  }[];
}

export const enhancedAudioService = {
  /**
   * Generates enhanced audio tracks for a reading list item
   * Includes study words followed by sentence-level audio
   */
  async generateEnhancedAudioTracks(
    userId: string,
    articleId: number
  ): Promise<EnhancedAudioTrack[]> {
    try {
      // Fetch article details with sentences
      const article = await articlesService.getArticleById(articleId);

      // Fetch study words for this article
      const studyWords = await studyWordsFSRSService.getFSRSWords(userId);

      // Filter study words for this article
      const articleStudyWords = studyWords.filter(
        word => word.sentence_word?.sentence?.article_id === articleId
      );

      // Create audio data structure
      const audioData: ArticleAudioData = {
        articleId,
        title: article.title,
        sentences: (article.article_sentences || [])
          .filter(sentence => sentence.audio_url) // Only include sentences with audio
          .sort((a, b) => a.position - b.position) // Ensure correct order
          .map(sentence => ({
            id: sentence.id,
            position: sentence.position,
            audioUrl: sentence.audio_url,
          })),
        studyWords: articleStudyWords.map(word => ({
          id: word.sentence_word_id,
          wordForm: word.sentence_word?.word_form || '',
          english: word.sentence_word?.english || '',
          englishAudioUrl: word.sentence_word?.english_audio_url || null,
          arabicAudioUrl: word.sentence_word?.arabic_audio_url || null,
          sentenceId: word.sentence_word?.sentence_id || 0,
        })),
      };

      // Generate enhanced tracks
      return this.createEnhancedTrackSequence(audioData);
    } catch (error) {
      handleError(error instanceof Error ? error : String(error), {
        toastMessage: 'Failed to generate audio tracks',
        analyticsEventName: 'Enhanced_Audio_Generation_Error',
        sentrySeverity: 'error',
      });
      throw error;
    }
  },

  /**
   * Creates a sequence of audio tracks in the correct order
   * Study words first (English then Arabic), then sentences
   */
  createEnhancedTrackSequence(audioData: ArticleAudioData): EnhancedAudioTrack[] {
    const tracks: EnhancedAudioTrack[] = [];

    // First add study word tracks (English followed by Arabic for each word)
    audioData.studyWords.forEach(word => {
      // Add English pronunciation if available
      if (word.englishAudioUrl) {
        tracks.push({
          id: `study-english-${audioData.articleId}-${word.id}`,
          type: 'study_word_english',
          articleId: audioData.articleId,
          audioUrl: word.englishAudioUrl,
          title: `${word.english} (English)`,
          position: tracks.length, // Position in sequence
          wordId: word.id,
        });
      }

      // Add Arabic pronunciation if available
      if (word.arabicAudioUrl) {
        tracks.push({
          id: `study-arabic-${audioData.articleId}-${word.id}`,
          type: 'study_word_arabic',
          articleId: audioData.articleId,
          audioUrl: word.arabicAudioUrl,
          title: `${word.wordForm} (Arabic)`,
          position: tracks.length, // Position in sequence
          wordId: word.id,
        });
      }
    });

    // Then add sentence tracks in order
    audioData.sentences
      .filter(sentence => sentence.audioUrl) // Ensure we have audio URLs
      .sort((a, b) => a.position - b.position) // Ensure correct order
      .forEach(sentence => {
        if (sentence.audioUrl) {
          tracks.push({
            id: `sentence-${audioData.articleId}-${sentence.id}`,
            type: 'sentence',
            articleId: audioData.articleId,
            audioUrl: sentence.audioUrl,
            title: `Sentence ${sentence.position + 1}`,
            position: tracks.length, // Position in sequence
            sentenceId: sentence.id,
            sentencePosition: sentence.position,
          });
        }
      });

    return tracks;
  },

  /**
   * Gets enhanced audio tracks for all reading list items
   */
  async getReadingListEnhancedTracks(userId: string): Promise<EnhancedAudioTrack[]> {
    try {
      // Fetch user's reading list
      const readingList = await readingListService.getReadingList(userId);

      // Create a flat array of all tracks from all articles
      const allTracks: EnhancedAudioTrack[] = [];

      // Process each reading list item
      for (const item of readingList) {
        // Skip items without articles
        if (!item.articles) continue;

        // Get tracks for this article
        const articleTracks = await this.generateEnhancedAudioTracks(userId, item.article_id);

        // Add to full list
        allTracks.push(...articleTracks);
      }

      return allTracks;
    } catch (error) {
      handleError(error instanceof Error ? error : String(error), {
        toastMessage: 'Failed to get enhanced audio tracks',
        analyticsEventName: 'Enhanced_Audio_Playlist_Error',
        sentrySeverity: 'error',
      });
      return [];
    }
  },
};
