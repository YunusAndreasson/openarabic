// Import the type from the central location
import { STRINGS } from '@/constants/strings';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

import { articlesService } from './articles';
import { audioCache } from './audioCache';
import { readingListService } from './readingList';

// Helper function to generate composite ID
const generateTrackId = (articleId: number): string => {
  return `article-${articleId}`;
};

// Helper function to get the appropriate audio URL based on preference
const getAudioUrlForPreference = (
  article: { audio_url: string; audio_url_bilingual?: string | null },
  preference: 'arabic' | 'bilingual'
): string => {
  if (preference === 'bilingual' && article.audio_url_bilingual) {
    return article.audio_url_bilingual;
  }
  // Fall back to Arabic audio if bilingual is not available or preference is Arabic
  return article.audio_url;
};

export const enhancedAudioService = {
  /**
   * Generates enhanced audio track for an article
   */
  async generateEnhancedAudioTrack(
    articleId: number,
    audioPreference: 'arabic' | 'bilingual' = 'bilingual'
  ): Promise<EnhancedAudioTrack | null> {
    try {
      // Fetch article details - audio is guaranteed to be available
      const article = await articlesService.getArticleById(articleId);

      // Select audio URL based on preference
      const audioUrl = getAudioUrlForPreference(article, audioPreference);

      // Use cached audio path when possible for offline support and cache accounting
      const cachedAudioUrl = await audioCache.getAudio(audioUrl);

      return {
        id: generateTrackId(articleId),
        articleId,
        audioUrl: cachedAudioUrl,
        title: article.title,
        imageUrl: String(article.image_url),
      };
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: STRINGS.FAILED_TO_GENERATE_AUDIO_TRACK,
        analyticsEventName: 'Enhanced_Audio_Generation_Error',
        sentrySeverity: 'error',
      });
      return null;
    }
  },

  /**
   * Gets enhanced audio tracks for all reading list items
   */
  async getReadingListEnhancedTracks(
    userId: string,
    audioPreference: 'arabic' | 'bilingual' = 'bilingual'
  ): Promise<EnhancedAudioTrack[]> {
    try {
      // Fetch user's reading list - all articles guaranteed to have audio
      const readingList = await readingListService.getReadingList(userId);

      // Build tracks directly from the reading list items
      const allTracks: EnhancedAudioTrack[] = [];

      for (const item of readingList) {
        const article = item.articles;

        // Select audio URL based on preference
        const audioUrl = getAudioUrlForPreference(article, audioPreference);
        const cachedAudioUrl = await audioCache.getAudio(audioUrl);

        allTracks.push({
          id: generateTrackId(item.article_id),
          articleId: item.article_id,
          audioUrl: cachedAudioUrl,
          title: article.title,
          imageUrl: String(article.image_url),
        });
      }

      return allTracks;
    } catch (error) {
      await handleError(error instanceof Error ? error : String(error), {
        toastMessage: STRINGS.FAILED_TO_GET_ENHANCED_AUDIO_TRACKS,
        analyticsEventName: 'Enhanced_Audio_Playlist_Error',
        sentrySeverity: 'error',
      });
      return [];
    }
  },
};
