import { STRINGS } from '@/constants/strings';
import { articlesService } from '@/services/articles';
import { audioCache } from '@/services/audioCache';
import { bookmarkService } from '@/services/bookmark';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId } from '@/types/branded.types';
import { handleError } from '@/utils/errorHandling';
import { generateAudioUrl, generateImageUrl } from '@/utils/imageUtils';

// Helper function to generate composite ID
const generateTrackId = (articleId: ArticleId): string => {
  return `article-${articleId}`;
};

export const enhancedAudioService = {
  /**
   * Generates enhanced audio track for an article
   */
  async generateEnhancedAudioTrack(
    articleId: ArticleId,
    audioPreference: 'arabic' | 'bilingual' = 'bilingual',
  ): Promise<EnhancedAudioTrack | null> {
    try {
      // Fetch article details - audio is guaranteed to be available
      const article = await articlesService.getArticleById(articleId);

      // Select the correct audio URL based on preference
      const selectedAudioUrl =
        audioPreference === 'bilingual' && article.audio_url_bilingual
          ? article.audio_url_bilingual
          : article.audio_url;

      // Use centralized URL generator
      const fullAudioUrl = generateAudioUrl(selectedAudioUrl);
      const cachedAudioUrl = await audioCache.getAudio(fullAudioUrl || selectedAudioUrl);

      return {
        id: generateTrackId(articleId),
        articleId,
        audioUrl: cachedAudioUrl,
        title: article.title,
        imageUrl: generateImageUrl(article.image_url),
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
    audioPreference: 'arabic' | 'bilingual' = 'bilingual',
  ): Promise<EnhancedAudioTrack[]> {
    try {
      // Fetch user's reading list with the correct audio URL selected at database level
      const readingList = await bookmarkService.getReadingList(userId);

      // Build tracks directly from the reading list items
      const allTracks: EnhancedAudioTrack[] = [];

      for (const item of readingList) {
        const article = item.articles;

        // Select the correct audio URL based on preference
        const selectedAudioUrl =
          audioPreference === 'bilingual' && article.audio_url_bilingual
            ? article.audio_url_bilingual
            : article.audio_url;

        // Use centralized URL generator
        const fullAudioUrl = generateAudioUrl(selectedAudioUrl);
        const cachedAudioUrl = await audioCache.getAudio(fullAudioUrl || selectedAudioUrl);

        allTracks.push({
          id: generateTrackId(item.article_id as ArticleId),
          articleId: item.article_id,
          audioUrl: cachedAudioUrl,
          title: article.title,
          imageUrl: generateImageUrl(article.image_url),
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
