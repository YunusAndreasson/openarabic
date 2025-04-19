// Import the type from the central location
import type { EnhancedAudioTrack } from '../types/audio.types';
import { handleError } from '../utils/errorHandling';

import { articlesService } from './articles';
import { readingListService } from './readingList';
import { studyWordsFSRSService } from './studyWordsFSRS';

// Define sentence type used within this service
interface SentenceData {
  id: number;
  position: number;
  audio_url: string | null;
}

// Define study word type used within this service
interface StudyWordData {
  id: number;
  word: string;
  audio_url_english: string | null;
  audio_url_arabic: string | null;
  sentenceId: number;
}

// Interface for article audio data structure
interface ArticleAudioData {
  articleId: number;
  title: string;
  sentences: SentenceData[];
  studyWords: StudyWordData[];
}

// Define other necessary types locally if not imported
type AudioTrackType = 'sentence' | 'study_word_english' | 'study_word_arabic';

// Helper function to generate composite ID
const generateTrackId = (
  type: AudioTrackType,
  articleId: number,
  entityId: number // Sentence ID or Word ID
): string => {
  return `article-${type.startsWith('study') ? 'word' : 'sentence'}-${articleId}-${entityId}`;
};

// Helper function to generate descriptive title
const generateTitle = (type: AudioTrackType, baseTitle: string, entityId?: number): string => {
  switch (type) {
    case 'sentence':
      return `Sentence ${entityId || 'N/A'}`;
    case 'study_word_english':
      return `Word: ${baseTitle} (English)`;
    case 'study_word_arabic':
      return `Word: ${baseTitle} (Arabic)`;
    default:
      return baseTitle;
  }
};

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
            audio_url: sentence.audio_url,
          })),
        studyWords: articleStudyWords
          .filter(word => word.sentence_word_id !== null)
          .map(word => ({
            id: word.sentence_word_id as number,
            word: word.sentence_word?.word_form || '',
            audio_url_english: word.sentence_word?.english_audio_url || null,
            audio_url_arabic: word.sentence_word?.arabic_audio_url || null,
            sentenceId: word.sentence_word?.sentence_id || 0,
          })),
      };

      // Generate enhanced tracks
      return this.createEnhancedTrackSequence(audioData);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), {
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

    // Group words by sentence
    const wordsBySentence: Record<number, typeof audioData.studyWords> = {};

    // Initialize the map
    audioData.sentences.forEach(sentence => {
      wordsBySentence[sentence.id] = [];
    });

    // Group words by their sentence ID
    audioData.studyWords.forEach(word => {
      const sentenceId = word.sentenceId || 0;
      if (sentenceId > 0 && wordsBySentence[sentenceId]) {
        wordsBySentence[sentenceId].push(word);
      }
    });

    // Process sentences in order with their associated words
    audioData.sentences
      .filter(sentence => sentence.audio_url) // Only include sentences with audio
      .sort((a, b) => a.position - b.position) // Ensure correct order
      .forEach(sentence => {
        const sentenceWords = wordsBySentence[sentence.id] || [];

        // First add all study words for this sentence (English then Arabic pairs)
        sentenceWords.forEach(word => {
          // Add English pronunciation
          if (word.audio_url_english) {
            tracks.push({
              id: generateTrackId('study_word_english', audioData.articleId, word.id),
              type: 'study_word_english',
              articleId: audioData.articleId,
              audioUrl: word.audio_url_english,
              title: generateTitle('study_word_english', word.word),
              wordId: word.id,
              sentenceId: sentence.id,
              sentencePosition: sentence.position,
            });
          }

          // Add Arabic pronunciation immediately after English
          if (word.audio_url_arabic) {
            tracks.push({
              id: generateTrackId('study_word_arabic', audioData.articleId, word.id),
              type: 'study_word_arabic',
              articleId: audioData.articleId,
              audioUrl: word.audio_url_arabic,
              title: generateTitle('study_word_arabic', word.word),
              wordId: word.id,
              sentenceId: sentence.id,
              sentencePosition: sentence.position,
            });
          }
        });

        // Then add the full sentence audio
        if (sentence.audio_url) {
          tracks.push({
            id: generateTrackId('sentence', audioData.articleId, sentence.id),
            type: 'sentence',
            articleId: audioData.articleId,
            audioUrl: sentence.audio_url,
            title: generateTitle('sentence', '', sentence.id),
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

  // Fetches enhanced audio tracks for a single article
  async getArticleEnhancedTracks(articleId: number): Promise<EnhancedAudioTrack[]> {
    try {
      // Get article details with sentences and words
      const article = await articlesService.getArticleById(articleId);

      // Transform article data into audio data structure
      const audioData: ArticleAudioData = {
        articleId,
        title: article.title,
        sentences: (article.article_sentences || [])
          .filter(sentence => sentence.audio_url)
          .sort((a, b) => a.position - b.position)
          .map(sentence => ({
            id: sentence.id,
            position: sentence.position,
            audio_url: sentence.audio_url,
          })),
        studyWords: (article.article_sentences || []).flatMap(sentence =>
          (sentence.sentence_words || [])
            .filter(word => word.english_audio_url || word.arabic_audio_url)
            .map(word => ({
              id: word.id,
              word: word.word_form,
              audio_url_english: word.english_audio_url,
              audio_url_arabic: word.arabic_audio_url,
              sentenceId: sentence.id,
            }))
        ),
      };

      const tracks: EnhancedAudioTrack[] = [];
      const sortedSentences = [...audioData.sentences].sort((a, b) => a.position - b.position);

      sortedSentences.forEach((sentence: SentenceData) => {
        const wordsForSentence = audioData.studyWords.filter(
          (word: StudyWordData) => word.sentenceId === sentence.id
        );

        wordsForSentence.forEach((word: StudyWordData) => {
          if (word.audio_url_english) {
            tracks.push({
              id: generateTrackId('study_word_english', audioData.articleId, word.id),
              type: 'study_word_english',
              articleId: audioData.articleId,
              audioUrl: word.audio_url_english,
              title: generateTitle('study_word_english', word.word, word.id),
              wordId: word.id,
              sentenceId: sentence.id,
              sentencePosition: sentence.position,
            });
          }
          if (word.audio_url_arabic) {
            tracks.push({
              id: generateTrackId('study_word_arabic', audioData.articleId, word.id),
              type: 'study_word_arabic',
              articleId: audioData.articleId,
              audioUrl: word.audio_url_arabic,
              title: generateTitle('study_word_arabic', word.word, word.id),
              wordId: word.id,
              sentenceId: sentence.id,
              sentencePosition: sentence.position,
            });
          }
        });

        if (sentence.audio_url) {
          tracks.push({
            id: generateTrackId('sentence', audioData.articleId, sentence.id),
            type: 'sentence',
            articleId: audioData.articleId,
            audioUrl: sentence.audio_url,
            title: generateTitle('sentence', '', sentence.id),
            sentenceId: sentence.id,
            sentencePosition: sentence.position,
          });
        }
      });

      return tracks;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: 'Error fetching enhanced audio tracks for article',
        analyticsEventName: 'Enhanced_Audio_Playlist_Error',
        sentrySeverity: 'error',
      });
      return [];
    }
  },
};
