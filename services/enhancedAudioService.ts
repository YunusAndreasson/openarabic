// Import the type from the central location
import type { EnhancedAudioTrack } from '../types/audio.types';
import { handleError } from '../utils/errorHandling';

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
      handleError(error instanceof Error ? error : new Error(String(error)), {
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

      // Create a flat array of all tracks from all articles
      const allTracks: EnhancedAudioTrack[] = [];

      // Process each reading list item
      for (const item of readingList) {
        // Skip items without articles
        if (!item.articles) continue;

        // Get track for this article
        const articleTrack = await this.generateEnhancedAudioTrack(item.article_id);
        if (articleTrack) {
          allTracks.push(articleTrack);
        }
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

  /**
   * Gets enhanced audio track for a single article
   */
  async getArticleEnhancedTrack(articleId: number): Promise<EnhancedAudioTrack | null> {
    try {
      return await this.generateEnhancedAudioTrack(articleId);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: 'Error fetching enhanced audio track for article',
        analyticsEventName: 'Enhanced_Audio_Track_Error',
        sentrySeverity: 'error',
      });
      return null;
    }
  },
};
