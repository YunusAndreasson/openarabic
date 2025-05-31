import type { ImageContentPosition, ImageTransition } from 'expo-image';

import type { BaseStyleProps, BaseOptionalPressableProps } from './base.types';

/**
 * Image configuration options
 */
export interface ImageConfig {
  /** How the image should fit within its container */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Transition duration in milliseconds */
  transition?: number | ImageTransition;
  /** Whether to show loading indicator */
  showLoadingIndicator?: boolean;
  /** Caching policy for the image */
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  /** Blur radius for smooth transitions */
  blurRadius?: number;
}

/**
 * Props for the EnhancedImage component
 */
export interface EnhancedImageProps extends BaseStyleProps, BaseOptionalPressableProps {
  /** Source URL of the image - required and must be non-null */
  source: string;

  /** Content fit mode */
  contentFit?: ImageConfig['contentFit'];

  /** Content position within container */
  contentPosition?: ImageContentPosition;

  /** Whether to show loading indicator */
  showLoadingIndicator?: boolean;

  /** Alt text for accessibility */
  alt?: string;

  /** Callback when image loads successfully */
  onLoad?: () => void;

  /** Callback when image fails to load */
  onError?: () => void;

  /** For testing/debugging - disable optimizations */
  disableOptimization?: boolean;

  /** Image transition duration in ms or transition object */
  transition?: number | ImageTransition;

  /** Skip transition effect entirely */
  skipTransition?: boolean;

  /** Caching policy */
  cachePolicy?: ImageConfig['cachePolicy'];

  /** Blur radius for progressive loading */
  blurRadius?: number;

  /** Whether the image is allowed to be downscaled when rendered */
  allowDownscaling?: boolean;

  /** Loading priority */
  priority?: 'low' | 'normal' | 'high';


  /** Whether to prefetch this image before it's displayed */
  prefetch?: boolean;

  /** ThumbHash string for efficient placeholder generation */
  thumbhash?: string;

  /** Placeholder image using blurhash or thumbhash */
  placeholder?: { blurhash?: string; thumbhash?: string };

  /** Whether animated images should automatically play */
  autoplay?: boolean;
}
