/**
 * Enhanced audio track type for article-level audio playback
 * Used by the enhanced audio player for managing article audio state
 */
export type EnhancedAudioTrack = {
  /** Composite ID for the track, e.g., "article-123" */
  id: string;
  /** ID of the article this track belongs to */
  articleId?: number;

  /** URL to the audio file */
  audioUrl: string;
  /** Title of the article (used for display) */
  title: string;
  /** Duration of the audio track in seconds (optional until loaded) */
  duration?: number;
};
