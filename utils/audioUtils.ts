import type { QueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { articlesService } from '@/services/articles';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { generateImageUrl } from '@/utils/imageUtils';

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
 * Check if audio service is currently busy (loading or transitioning)
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
  prefetchArticle?: (id: number) => Promise<boolean | void>
): Promise<void> {
  // Prefetch article data
  queryClient
    .prefetchQuery({
      queryKey: ['article', articleId],
      queryFn: () => articlesService.getArticleById(articleId as ArticleId),
    })
    .catch(() => {});

  // Get cached article for image URL
  const cachedArticle = queryClient.getQueryData<Article>(['article', articleId]);
  const imageUrl = generateImageUrl(cachedArticle?.image_url);

  if (imageUrl) {
    // Prefetch image - silent failure won't block functionality
    Image.prefetch(imageUrl).catch(() => null);
  } else if (prefetchArticle) {
    // Fallback to full article prefetch if no cached image
    prefetchArticle(articleId).catch(() => {});
  }
}
