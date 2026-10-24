import { STRINGS } from '@/constants/strings';
import { articlesService } from '@/services/articles';
import { audioCache } from '@/services/audioCache';
import type { SourceTrackedAudioTrack } from '@/services/audioPlayer';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { ArticleId } from '@/types/branded.types';
import type { AudioLanguage } from '@/types/enums';
import { handleError } from '@/utils/errorHandling';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { generateStorageUrl } from '@/utils/storageUtils';

const errorConfig = {
  generate: createServiceErrorConfig('enhanced_audio_track', 'load', {
    toastMessage: STRINGS.FAILED_TO_GENERATE_AUDIO_TRACK,
    analyticsEventName: 'Enhanced_Audio_Generation_Error',
  }),
  playlist: createServiceErrorConfig('enhanced_audio_playlist', 'load', {
    toastMessage: STRINGS.FAILED_TO_GET_ENHANCED_AUDIO_TRACKS,
    analyticsEventName: 'Enhanced_Audio_Playlist_Error',
  }),
};

// Helper function to generate composite ID
const generateTrackId = (articleId: ArticleId): string => {
  return `article-${articleId}`;
};

/**
 * The slice of an article this service actually reads. Deliberately narrow so a
 * caller holding a fuller Article can pass it straight through.
 */
export interface AudioTrackArticle {
  title: string;
  image_url: string;
  audio_url: string;
  audio_url_bilingual?: string | null;
  author?: { name: string };
}

// Helper function to select audio URL based on preference
const selectAudioUrl = (
  article: { audio_url: string; audio_url_bilingual?: string | null },
  audioPreference: 'arabic' | 'bilingual',
): string => {
  return audioPreference === 'bilingual' && article.audio_url_bilingual
    ? article.audio_url_bilingual
    : article.audio_url;
};

// Helper function to create enhanced audio track.
// The track keeps its pre-resolution sourceUrl so the playlist lane in
// simpleAudioService can invalidate a corrupt cached copy and re-resolve
// (the review lane's self-heal, applied to playlists).
//
// Resolution is cache-hit-or-stream, never download-then-play. Article audio is
// minutes long; waiting for the whole file before the first sample meant the
// Listen button sat dead for seconds with no feedback (measured 4.7s on a
// 5-minute article over a fast connection — far worse on mobile data).
// expo-audio streams a remote URL fine, so a miss plays immediately and warms
// the cache behind playback for next time.
const createEnhancedTrack = async (
  articleId: ArticleId,
  article: { title: string; image_url: string; author?: { name: string } },
  audioUrl: string,
): Promise<SourceTrackedAudioTrack> => {
  const sourceUrl = generateStorageUrl('audio', audioUrl) || audioUrl;
  const cachedAudioUrl = await audioCache.getCachedPath(sourceUrl);

  return {
    id: generateTrackId(articleId),
    articleId,
    audioUrl: cachedAudioUrl ?? sourceUrl,
    sourceUrl,
    title: article.title,
    artist: article.author?.name,
    imageUrl: generateStorageUrl('images', article.image_url),
  };
};

/**
 * Cache a track that is currently STREAMING, so the next play of it is local.
 *
 * Call this only once playback has actually started. Warming while the player
 * is still opening its connection makes the download compete for bandwidth
 * with the stream it is meant to help — which would slow down exactly the tap
 * this path exists to make fast. A track that already resolved to a cached
 * file (audioUrl !== sourceUrl) has nothing to warm.
 */
export function warmTrackCache(track: SourceTrackedAudioTrack): void {
  if (!track.sourceUrl || track.audioUrl !== track.sourceUrl) {
    return;
  }
  void audioCache.prefetch(track.sourceUrl);
}

export const enhancedAudioService = {
  /**
   * Generates enhanced audio track for an article.
   *
   * `knownArticle` lets a caller that already holds the article hand it over
   * instead of paying for a refetch. That matters here: getArticleById pulls
   * DETAIL_VIEW_COLUMNS — every sentence, every sentence_word, their roots and
   * word types — and the only fields this needs are the title, audio URLs,
   * image and author. The article reader already has all of it cached under
   * ['article', id] with staleTime Infinity, so refetching it on the Listen tap
   * was re-downloading the entire article to read five fields.
   */
  async generateEnhancedAudioTrack(
    articleId: ArticleId,
    audioPreference: 'arabic' | 'bilingual' = 'bilingual',
    knownArticle?: AudioTrackArticle | null,
  ): Promise<SourceTrackedAudioTrack | null> {
    try {
      // Fetch article details only when the caller doesn't already have them.
      const article = knownArticle ?? (await articlesService.getArticleById(articleId));

      // Select and create track using helpers
      const selectedAudioUrl = selectAudioUrl(article, audioPreference);
      return await createEnhancedTrack(articleId, article, selectedAudioUrl);
    } catch (error) {
      await handleError(error, {
        ...errorConfig.generate,
        analyticsProperties: { articleId },
      });
      return null;
    }
  },
};

/**
 * How a failure to build the reading-list tracks is reported — once, by the
 * query cache, from `audioQueries.tracks`' `meta`.
 *
 * No toast. The failure is rethrown, not answered with []: the tracks are an
 * app-wide query, and an empty array is a SUCCESS to React Query — a network
 * blip at startup was cached as an empty playlist (no retry, `error` never
 * set, so the Playlist screen's own failure toast could not fire), and a failed
 * refetch overwrote good tracks with nothing. Thrown, the query retries, keeps
 * the last good tracks, and the Playlist screen surfaces the error itself.
 */
export const READING_LIST_TRACKS_ERROR_REPORT = { ...errorConfig.playlist, showToast: false };

/**
 * The enhanced audio tracks for a reading list, in its order.
 *
 * Metadata only — this never downloads. It backs the persisted tracks query
 * the Playlist screen observes, so caching here would mean downloading every
 * saved article's audio whenever that query refetches (every reading-list or
 * audio-preference invalidation), competing for bandwidth with whatever the
 * user actually tapped. Tracks resolve to cached paths when present and
 * stream otherwise; whichever one the user plays is warmed by the play path
 * via warmTrackCache.
 *
 * Takes the list rather than fetching it: `audioQueries.tracks` reads it
 * through the reading-list query's own cache entry, where this used to
 * download the whole list a second time. The per-track cache lookups are
 * independent, so they run together.
 */
export function buildReadingListTracks(
  readingList: readonly BookmarkItem[],
  audioPreference: AudioLanguage,
): Promise<SourceTrackedAudioTrack[]> {
  return Promise.all(
    readingList.map(item =>
      createEnhancedTrack(
        item.article_id as ArticleId,
        item.articles,
        selectAudioUrl(item.articles, audioPreference),
      ),
    ),
  );
}
