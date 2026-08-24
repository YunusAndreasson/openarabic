import type { QueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { articleQueries } from '@/constants/queries';
import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import type { Article } from '@/types/articles.types';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId } from '@/types/branded.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * Extract current article ID from audio status
 * @returns Article ID as number or undefined if no track is playing
 */
export function getCurrentArticleId(): number | undefined {
  const status = simpleAudioService.getStatus();
  return status.currentTrack?.articleId
    ? parseInt(status.currentTrack.articleId.toString(), 10)
    : undefined;
}

/**
 * Check if audio service is currently busy (loading)
 * @returns true if audio is loading, false otherwise
 */
export function isAudioBusy(): boolean {
  const status = simpleAudioService.getStatus();
  // With no current track the service is idle, not busy. The default
  // `isLoaded: false` from a freshly-mounted service must not be read as
  // "still loading" — that would block the very first play attempt.
  if (!status.currentTrack) return false;
  return !status.isLoaded || status.isBuffering;
}

/**
 * Safely stop audio playback with status check
 * Handles both graceful shutdown and fire-and-forget scenarios
 * @param throwOnError - If true, throws errors; if false, silently catches them
 */
export async function stopAudioSafely(throwOnError: boolean = false): Promise<void> {
  try {
    const status = simpleAudioService.getStatus();
    const isLoadingOrPlaying = status.playing || !status.isLoaded || status.isBuffering;
    if (isLoadingOrPlaying) {
      await simpleAudioService.stop();
    }
  } catch (error) {
    if (throwOnError) {
      throw error;
    }
    // Silent catch for fire-and-forget scenarios
  }
}

/**
 * Stop only non-playlist audio (word previews, single-word playback).
 * Playlist-mode audio deliberately survives screen unmounts and tab
 * switches — the global MiniPlayer is its control surface. Use this in
 * screen-lifecycle cleanups whose job is disposing leaked word players.
 * @param throwOnError - If true, throws errors; if false, silently catches them
 */
export async function stopNonPlaylistAudioSafely(throwOnError: boolean = false): Promise<void> {
  if (simpleAudioService.getPlaylistInfo().isPlaylistMode) {
    return;
  }
  await stopAudioSafely(throwOnError);
}

/**
 * Prefetch article data and image for smooth audio transitions
 * @param articleId - Article to prefetch
 * @param queryClient - React Query client for cache access
 * @param prefetchArticle - Optional prefetch function for full article data
 */
export async function prefetchArticleWithImage(
  articleId: ArticleId,
  queryClient: QueryClient,
  prefetchArticle?: (id: ArticleId) => Promise<boolean | undefined>,
): Promise<void> {
  // Prefetch article data
  queryClient.prefetchQuery(articleQueries.detail(articleId)).catch(() => {
    // Silent failure
  });

  // Get cached article for image URL
  const cachedArticle = queryClient.getQueryData<Article>(
    articleQueries.detail(articleId).queryKey,
  );
  const imageUrl = generateStorageUrl('images', cachedArticle?.image_url);

  if (imageUrl) {
    // Prefetch image - silent failure won't block functionality
    Image.prefetch(imageUrl, { cachePolicy: 'memory-disk' }).catch(() => null);
  } else if (prefetchArticle) {
    // Fallback to full article prefetch if no cached image
    prefetchArticle(articleId).catch(() => {
      // Silent failure
    });
  }
}

/**
 * Word audio data interface for track generation
 */
export interface WordAudioData {
  id: number | string;
  audio_url?: string | null;
  audio_url_en?: string | null;
  title?: string;
  root_id?: number;
  letters?: string;
  meaning?: string;
  english?: string;
  word_form?: string;
}

/**
 * A saved word, as the audio player wants it.
 *
 * The mapping is trivial and that is the point: it was written out by hand on
 * the word screen and again on the word sheet, so a fifth field — or a rename
 * on `roots` — would have had to be found in two places. Returns `null` for a
 * word whose root never loaded, which is also the "nothing to play" answer.
 */
export function toWordAudioData(word: StudyWord): WordAudioData | null {
  if (!word.root) return null;
  return {
    id: word.root_id,
    audio_url: word.root.audio_url,
    audio_url_en: word.root.audio_url_en,
    letters: word.root.letters,
    meaning: word.root.meaning,
  };
}

/**
 * Generate an audio track from word data
 * Prefers Arabic audio, falls back to English audio if available
 * @param word - Word data containing audio URLs and metadata
 * @param trackIdPrefix - Optional prefix for the track ID (default: 'word')
 * @returns Audio track or null if no audio URL available
 */
export async function generateWordAudioTrack(
  word: WordAudioData,
  trackIdPrefix: string = 'word',
): Promise<EnhancedAudioTrack | null> {
  // Only use Arabic audio for vocabulary words
  const audioUrl = generateStorageUrl('audio', word.audio_url);

  if (!audioUrl) {
    return null;
  }

  // Get cached local path to eliminate network latency. Quick mode: this runs
  // on tap-to-play paths, so a cache miss gets one short bounded download
  // attempt rather than the patient multi-retry sequence.
  const cachedAudioUrl = await audioCache.getAudio(audioUrl, { quick: true });

  // Generate track with appropriate title
  const trackTitle =
    word.letters || word.meaning || word.english || word.word_form || 'Arabic Pronunciation';

  const track: EnhancedAudioTrack = {
    id: `${trackIdPrefix}-${word.id || word.root_id}-ar`,
    audioUrl: cachedAudioUrl,
    title: trackTitle,
  };

  return track;
}
