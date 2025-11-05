import type { QueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { articlesService } from '@/services/articles';
import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import type { Article } from '@/types/articles.types';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId } from '@/types/branded.types';
import { generateAudioUrl, generateImageUrl } from '@/utils/imageUtils';

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
  return status.isLoading;
}

/**
 * Safely stop audio playback with status check
 * Handles both graceful shutdown and fire-and-forget scenarios
 * @param throwOnError - If true, throws errors; if false, silently catches them
 */
export async function stopAudioSafely(throwOnError: boolean = false): Promise<void> {
  try {
    const status = simpleAudioService.getStatus();
    if (status.isPlaying || status.isLoading) {
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
 * Prefetch article data and image for smooth audio transitions
 * @param articleId - Article to prefetch
 * @param queryClient - React Query client for cache access
 * @param prefetchArticle - Optional prefetch function for full article data
 */
export async function prefetchArticleWithImage(
  articleId: number,
  queryClient: QueryClient,
  prefetchArticle?: (id: number) => Promise<boolean | void>,
): Promise<void> {
  // Prefetch article data
  queryClient
    .prefetchQuery({
      queryKey: ['article', articleId],
      queryFn: () => articlesService.getArticleById(articleId as ArticleId),
    })
    .catch(() => {
      // Silent failure
    });

  // Get cached article for image URL
  const cachedArticle = queryClient.getQueryData<Article>(['article', articleId]);
  const imageUrl = generateImageUrl(cachedArticle?.image_url);

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
  // Prefer Arabic audio, fallback to English audio if available
  const audioUrl = generateAudioUrl(word.audio_url) || generateAudioUrl(word.audio_url_en);

  if (!audioUrl) {
    return null;
  }

  // Get cached local path to eliminate network latency
  const cachedAudioUrl = await audioCache.getAudio(audioUrl);

  // Generate track with appropriate title
  const trackTitle =
    word.letters || word.meaning || word.english || word.word_form || 'Arabic Pronunciation';

  const track: EnhancedAudioTrack = {
    id: `${trackIdPrefix}-${word.id || word.root_id}-${word.audio_url ? 'ar' : 'en'}`,
    audioUrl: cachedAudioUrl,
    title: trackTitle,
  };

  return track;
}
