import type { ArticleId } from './branded.types';

/**
 * Enhanced audio track type for article-level audio playback
 * Used by the enhanced audio player for managing article audio state
 */
export type EnhancedAudioTrack = {
  /** Composite ID for the track, e.g., "article-123" */
  id: string;
  /** ID of the article this track belongs to */
  articleId?: ArticleId;

  /** URL to the audio file */
  audioUrl: string;
  /** Title of the article (used for display) */
  title: string;
  /** Image URL for instant artwork display (optional but recommended) */
  imageUrl?: string;
  /** Duration of the audio track in seconds (optional until loaded) */
  duration?: number;
};
