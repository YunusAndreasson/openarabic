import { SUPABASE_URL } from '@/constants/supabase';

/**
 * Centralized image URL utilities for consistent image handling across the app
 * Handles both full URLs and filenames, with proper fallbacks
 */

/**
 * Generate the full URL for an image
 * Handles both full URLs (already complete) and filenames (need reconstruction)
 */
export const generateImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return '';
  }

  // If it's already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Reconstruct the full Supabase storage URL
  return `${SUPABASE_URL}/storage/v1/object/public/images/${imageUrl}`;
};

/**
 * Generate URL for audio files
 */
export const generateAudioUrl = (audioUrl: string | null | undefined): string | undefined => {
  if (!audioUrl || typeof audioUrl !== 'string') {
    return undefined;
  }

  // If it's already a full URL, return as-is
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }

  // Reconstruct the full Supabase storage URL
  return `${SUPABASE_URL}/storage/v1/object/public/audio/${audioUrl}`;
};

