import { supabase } from '@/services/supabase';

/**
 * Centralized Supabase storage URL generation
 * Uses official Supabase Storage SDK for reliable URL generation
 */

/**
 * Valid Supabase storage buckets
 */
export type StorageBucket = 'images' | 'audio';

/**
 * Validate if a path is a non-empty string
 * Handles null, undefined, and empty strings consistently
 */
export const isValidStoragePath = (path: unknown): path is string => {
  return typeof path === 'string' && path.trim().length > 0;
};

/**
 * Generate the full URL for a Supabase storage object
 *
 * Uses the official Supabase Storage SDK `getPublicUrl` method for reliable,
 * future-proof URL generation. This ensures compatibility with any URL structure
 * changes Supabase may make (CDN changes, path format updates, etc.).
 *
 * Handles three cases:
 * 1. Already a full URL (http:// or https://) - returns as-is
 * 2. Storage filename - uses official SDK to generate full Supabase storage URL
 * 3. Invalid input (null/undefined/empty) - returns empty string
 *
 * @param bucket - Supabase storage bucket ('images' or 'audio')
 * @param path - File path or full URL
 * @returns Full URL or empty string if invalid
 *
 * @example
 * ```typescript
 * generateStorageUrl('images', 'article.jpg')
 * // → 'https://....supabase.co/storage/v1/object/public/images/article.jpg'
 *
 * generateStorageUrl('images', 'https://example.com/image.jpg')
 * // → 'https://example.com/image.jpg' (already full URL)
 *
 * generateStorageUrl('images', null)
 * // → '' (invalid input)
 * ```
 */
export const generateStorageUrl = (
  bucket: StorageBucket,
  path: string | null | undefined,
): string => {
  // Handle invalid inputs consistently - return empty string
  if (!isValidStoragePath(path)) {
    return '';
  }

  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Use official Supabase Storage SDK for reliable URL generation
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
};

/**
 * Generate URL for image files
 * Wrapper around generateStorageUrl for backward compatibility
 *
 * @deprecated Use generateStorageUrl('images', path) directly for new code
 */
export const generateImageUrl = (imageUrl: string | null | undefined): string => {
  return generateStorageUrl('images', imageUrl);
};

/**
 * Generate URL for audio files
 * Wrapper around generateStorageUrl for backward compatibility
 *
 * Note: Returns empty string for invalid input (consistent with generateImageUrl)
 * Previous implementation returned undefined, but empty string is more consistent
 *
 * @deprecated Use generateStorageUrl('audio', path) directly for new code
 */
export const generateAudioUrl = (audioUrl: string | null | undefined): string => {
  return generateStorageUrl('audio', audioUrl);
};
