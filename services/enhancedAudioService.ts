// Import the type from the central location
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
      // Fetch article details
      const article = await articlesService.getArticleById(articleId);

      if (!article.audio_url) {
        return null;
      }

      return {
        id: generateTrackId(articleId),
        articleId,
        audioUrl: article.audio_url,
        title: article.title,
      };
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: 'Failed to generate audio track',
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
      // Fetch user's reading list
      const readingList = await readingListService.getReadingList(userId);

      // Build tracks directly from the reading list items
      const allTracks: EnhancedAudioTrack[] = [];

      for (const item of readingList) {
        const article = item.articles;
        if (!article?.audio_url) continue;

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
        toastMessage: 'Failed to get enhanced audio tracks',
        analyticsEventName: 'Enhanced_Audio_Playlist_Error',
        sentrySeverity: 'error',
      });
      return [];
    }
  },
};
