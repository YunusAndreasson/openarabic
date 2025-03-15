import { Platform } from 'react-native';
import { SCREEN_WIDTH, LAYOUT } from '../constants/layout';
import { Colors } from '../constants/Colors';

/**
 * Calculate responsive image dimensions based on original size and container width
 * @param originalWidth - Original image width in pixels
 * @param originalHeight - Original image height in pixels
 * @param containerWidthPercent - Percentage of screen width the container takes (0-1)
 * @returns Object with calculated width and height
 */
export const getResponsiveImageSize = (
  originalWidth: number,
  originalHeight: number,
  containerWidthPercent = 1
) => {
  // Calculate the available width based on screen size and container percentage
  const availableWidth = SCREEN_WIDTH * containerWidthPercent;

  // Calculate the aspect ratio
  const aspectRatio = originalWidth / originalHeight;

  // Calculate the new height based on the aspect ratio
  const newHeight = availableWidth / aspectRatio;

  return {
    width: availableWidth,
    height: newHeight,
  };
};

/**
 * Generate a tiny blurry preview URL for the given image
 * This creates a very small version of the image that can be used as a placeholder
 * @param imageUrl Original image URL
 * @param width Width of the tiny preview (default: 20px)
 * @returns URL for the tiny preview image
 */
export const generateTinyPreview = (imageUrl: string, width = 20): string => {
  if (!imageUrl) return '';

  // Check if the URL is from a service that supports image transformations
  if (imageUrl.includes('picsum.photos')) {
    return imageUrl.replace(/(\d+)\/(\d+)/, `${width}/${width}`);
  }

  // For other URLs, we can't generate a tiny preview easily
  // In a real app, you would use an image processing service like Cloudinary, Imgix, etc.
  return imageUrl;
};

/**
 * Determine the optimal image quality based on network connection and device
 * @param imageUrl Original image URL
 * @returns URL with appropriate quality parameters
 */
export const getOptimizedImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';

  // For demo purposes, we're using picsum.photos which allows easy manipulation
  // In a real app, you would use an image processing service like Cloudinary, Imgix, etc.

  // Check if the URL is from picsum.photos
  if (imageUrl.includes('picsum.photos')) {
    // Add blur parameter for lower quality on slower devices
    if (Platform.OS === 'android' && Platform.Version < 29) {
      return `${imageUrl}?blur=2`;
    }
  }

  return imageUrl;
};

/**
 * Get placeholder color based on theme
 * @param isDarkMode Whether the app is in dark mode
 * @returns Color value for image placeholder
 */
export const getPlaceholderColor = (isDarkMode: boolean): string => {
  // Use Colors constants instead of hardcoded values
  return isDarkMode ? Colors.dark.imagePlaceholder : Colors.light.imagePlaceholder;
};

/**
 * Calculate the priority for image loading based on visibility
 * @param isVisible Whether the image is currently visible in the viewport
 * @param distanceFromViewport Distance from the viewport in pixels (negative if above, positive if below)
 * @returns Priority value ('high', 'normal', 'low')
 */
export const getImageLoadPriority = (
  isVisible: boolean,
  distanceFromViewport = 0
): 'high' | 'normal' | 'low' => {
  if (isVisible) return 'high';

  const viewportBuffer = SCREEN_WIDTH; // Consider 1 screen height as the buffer zone

  if (Math.abs(distanceFromViewport) < viewportBuffer) {
    return 'normal';
  }

  return 'low';
};

/**
 * Configuration options for the OptimizedImage component
 */
export interface ImageOptimizationOptions {
  /** Enable blur-up effect (tiny preview while loading) */
  enableBlurUp?: boolean;
  /** Enable responsive sizing based on screen width */
  enableResponsiveSizing?: boolean;
  /** Enable progressive loading */
  enableProgressiveLoading?: boolean;
  /** Percentage of screen width the image container takes (0-1) */
  containerWidthPercent?: number;
  /** Cache policy for the image */
  cachePolicy?: 'memory-disk' | 'memory' | 'disk' | 'none';
  /** Transition duration in milliseconds */
  transitionDuration?: number;
}

/**
 * Default image optimization options
 */
export const defaultImageOptions: ImageOptimizationOptions = {
  enableBlurUp: true,
  enableResponsiveSizing: true,
  enableProgressiveLoading: true,
  containerWidthPercent: 1,
  cachePolicy: 'memory-disk',
  transitionDuration: LAYOUT.ANIMATION.DURATION.NORMAL,
};
