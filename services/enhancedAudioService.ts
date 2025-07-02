// Import the type from the central location
import { STRINGS } from '@/constants/strings';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { handleError } from '@/utils/errorHandling';

import { articlesService } from './articles';
import { readingListService } from './readingList';

// Helper function to generate composite ID
const generateTrackId = (articleId: number): string => {
  return `article-${articleId}`;
};

export const enhancedAudioService = {
  /**
   * Generates enhanced audio track for an article
   */
  async generateEnhancedAudioTrack(articleId: number): Promise<EnhancedAudioTrack | null> {
    try {
      // Fetch article details - audio is guaranteed to be available
      const article = await articlesService.getArticleById(articleId);

      return {
        id: generateTrackId(articleId),
        articleId,
        audioUrl: article.audio_url,
        title: article.title,
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
  async getReadingListEnhancedTracks(userId: string): Promise<EnhancedAudioTrack[]> {
    try {
      // Fetch user's reading list - all articles guaranteed to have audio
      const readingList = await readingListService.getReadingList(userId);

      // Build tracks directly from the reading list items
      const allTracks: EnhancedAudioTrack[] = [];

      for (const item of readingList) {
        const article = item.articles;

        allTracks.push({
          id: generateTrackId(item.article_id),
          articleId: item.article_id,
          audioUrl: article.audio_url,
          title: article.title,
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
