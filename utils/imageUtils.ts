import { SUPABASE_URL } from '@/constants/Supabase';

/**
 * Centralized image URL generator for consistent image handling across the app
 * Handles both full URLs and filenames, with proper fallbacks
 */
export class ImageUrlGenerator {
  private static instance: ImageUrlGenerator;

  private constructor() {}

  static getInstance(): ImageUrlGenerator {
    if (!ImageUrlGenerator.instance) {
      ImageUrlGenerator.instance = new ImageUrlGenerator();
    }
    return ImageUrlGenerator.instance;
  }

  /**
   * Generate the full URL for an image
   * Handles both full URLs (already complete) and filenames (need reconstruction)
   */
  generateImageUrl(imageUrl: string | null | undefined): string | undefined {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return undefined;
    }

    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's a relative path or filename, reconstruct the full URL
    if (imageUrl.includes('images/') || !imageUrl.includes('/')) {
      return this.reconstructImageUrl(imageUrl);
    }

    // Fallback: treat as filename and reconstruct
    return this.reconstructImageUrl(imageUrl);
  }

  /**
   * Reconstruct a full Supabase storage URL from a filename
   */
  reconstructImageUrl(filename: string): string {
    return `${SUPABASE_URL}/storage/v1/object/public/images/${filename}`;
  }

  /**
   * Generate URL for audio files
   */
  generateAudioUrl(audioUrl: string | null | undefined): string | undefined {
    if (!audioUrl || typeof audioUrl !== 'string') {
      return undefined;
    }

    // If it's already a full URL, return as-is
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      return audioUrl;
    }

    // Reconstruct audio URL
    return this.reconstructAudioUrl(audioUrl);
  }

  /**
   * Reconstruct a full Supabase storage URL from an audio filename
   */
  reconstructAudioUrl(filename: string): string {
    return `${SUPABASE_URL}/storage/v1/object/public/audio/${filename}`;
  }
}

// Export singleton instance for easy use
export const imageUrlGenerator = ImageUrlGenerator.getInstance();

// Convenience functions for common use cases
export const generateImageUrl = (imageUrl: string | null | undefined): string => {
  return imageUrlGenerator.generateImageUrl(imageUrl) || '';
};

export const generateAudioUrl = (audioUrl: string | null | undefined): string | undefined => {
  return imageUrlGenerator.generateAudioUrl(audioUrl);
};

// Legacy compatibility functions
export const reconstructImageUrl = (filename: string): string => {
  return imageUrlGenerator.reconstructImageUrl(filename);
};

export const reconstructAudioUrl = (filename: string): string => {
  return imageUrlGenerator.reconstructAudioUrl(filename);
};

export const reconstructFullUrl = (filename: string, bucket: string): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
};
