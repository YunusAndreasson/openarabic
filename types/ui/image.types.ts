import type { ImageContentPosition, ImageTransition } from 'expo-image';

import type { BaseStyleProps, BaseOptionalPressableProps } from './base.types';

/**
 * Image configuration options
 */
export interface ImageConfig {
  /** How the image should fit within its container */
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Transition duration in milliseconds */
  transition?: ImageTransition | number;
  /** Caching policy for the image */
  cachePolicy?: 'disk' | 'memory-disk' | 'memory' | 'none';
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
  /** Alt text for accessibility */
  alt?: string;

  /** Callback when image loads successfully */
  onLoad?: () => void;

  /** Callback when image fails to load */
  onError?: () => void;

  /** Image transition duration in ms or transition object */
  transition?: ImageTransition | number;

  /** Skip transition effect entirely */
  skipTransition?: boolean;

  /** Caching policy */
  cachePolicy?: ImageConfig['cachePolicy'];

  /** Blur radius for progressive loading */
  blurRadius?: number;

  /** Whether the image is allowed to be downscaled when rendered */
  allowDownscaling?: boolean;

  /** Loading priority */
  priority?: 'high' | 'low' | 'normal';

  /** Placeholder image using blurhash or thumbhash */
  placeholder?: { blurhash?: string; thumbhash?: string };

  /** Whether animated images should automatically play */
  autoplay?: boolean;
}
