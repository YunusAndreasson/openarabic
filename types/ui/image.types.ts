import type { ImageContentPosition } from 'expo-image';

import type { BaseStyleProps } from './base.types';

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
 * Optimized for Expo Image v3 with modern features and smart defaults
 *
 * Note: EnhancedImage is not pressable. If press handling is needed,
 * wrap the component in a Pressable or BaseCard.
 */
export interface EnhancedImageProps extends BaseStyleProps {
  /** Source URL of the image - required and must be non-null */
  source: string;

  /** Optional test identifier for testing */
  testID?: string;

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

  /** Placeholder blurhash for instant loading feedback */
  placeholder?: string;

  /** Content fit for placeholder */
  placeholderContentFit?: ImageConfig['contentFit'];

  /** Allow image downscaling to match container size (defaults to true) */
  allowDownscaling?: boolean;

  /** Accessibility label for screen readers (describes what the image shows) */
  accessibilityLabel?: string;

  /** Whether the image is an important accessibility element (defaults to true when accessibilityLabel is provided) */
  accessible?: boolean;

  /** Accessibility hint (provides guidance on what will happen when the element is activated) */
  accessibilityHint?: string;
}
