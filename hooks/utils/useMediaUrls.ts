import { useMemo } from 'react';

import { generateStorageUrl, type StorageBucket } from '@/utils/storageUtils';

/**
 * Custom hooks for consistent URL memoization across the app
 *
 * These hooks ensure that media URLs are only recalculated when the path changes,
 * preventing unnecessary re-renders and improving performance.
 *
 * Usage:
 * ```typescript
 * const imageUrl = useImageUrl(article.image_url);
 * const audioUrl = useAudioUrl(word.audio_url);
 * ```
 */

/**
 * Generate and memoize image URL
 *
 * Converts a Supabase storage path to a full URL with automatic memoization.
 * Only recalculates when the path changes.
 *
 * @param path - Image path or full URL
 * @returns Memoized full image URL (empty string if invalid)
 *
 * @example
 * ```typescript
 * const imageUrl = useImageUrl(article.image_url);
 * <EnhancedImage source={imageUrl} />
 * ```
 */
export const useImageUrl = (path: string | null | undefined): string => {
  return useMemo(() => generateStorageUrl('images', path), [path]);
};

/**
 * Generate and memoize audio URL
 *
 * Converts a Supabase storage path to a full URL with automatic memoization.
 * Only recalculates when the path changes.
 *
 * @param path - Audio path or full URL
 * @returns Memoized full audio URL (empty string if invalid)
 *
 * @example
 * ```typescript
 * const audioUrl = useAudioUrl(word.audio_url);
 * await audioPlayer.play({ audioUrl });
 * ```
 */
export const useAudioUrl = (path: string | null | undefined): string => {
  return useMemo(() => generateStorageUrl('audio', path), [path]);
};

/**
 * Generic storage URL hook for custom buckets
 *
 * Use this for non-standard storage buckets or when you need flexibility.
 * For images and audio, prefer useImageUrl and useAudioUrl for clarity.
 *
 * @param bucket - Storage bucket name
 * @param path - File path or full URL
 * @returns Memoized full storage URL (empty string if invalid)
 *
 * @example
 * ```typescript
 * const customUrl = useStorageUrl('custom-bucket', file.path);
 * ```
 */
export const useStorageUrl = (bucket: StorageBucket, path: string | null | undefined): string => {
  return useMemo(() => generateStorageUrl(bucket, path), [bucket, path]);
};
