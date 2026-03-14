import type { ArticleId } from './branded.types';

/**
 * Enhanced audio track type for article-level audio playback
 * Used by the enhanced audio player for managing article audio state
 */
export interface EnhancedAudioTrack {
  /** Composite ID for the track, e.g., "article-123" */
  id: string;
  /** ID of the article this track belongs to */
  articleId?: ArticleId;

  /** URL to the audio file */
  audioUrl: string;
  /** Title of the article (used for display) */
  title: string;
  /** Author name for lock screen display (optional) */
  artist?: string;
  /** Image URL for instant artwork display (optional but recommended) */
  imageUrl?: string;
}
