import type { ImageContentPosition } from 'expo-image';

import type { BaseOptionalPressableProps, BaseStyleProps } from './base.types';

/**
 * Image configuration options - simplified since most values are hardcoded defaults
 */
export interface ImageConfig {
  /** How the image should fit within its container */
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Caching policy for the image */
  cachePolicy?: 'disk' | 'memory-disk' | 'memory' | 'none';
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

  /** Callback when image loads successfully */
  onLoad?: () => void;

  /** Callback when image fails to load */
  onError?: () => void;

  /** Caching policy */
  cachePolicy?: ImageConfig['cachePolicy'];

  /** Loading priority */
  priority?: 'high' | 'low' | 'normal';

  /** Cross-fade duration in ms; set 0 for instant */
  transition?: number;

  /** Hint for texture reuse when the same URL is shown in different places */
  recyclingKey?: string;
}
