import { BaseStyleProps, BaseOptionalPressableProps } from './base.types';

/**
 * Props for the EnhancedImage component
 */
export interface EnhancedImageProps extends BaseStyleProps, BaseOptionalPressableProps {
  /** Source URL of the image */
  source: string;

  /** Content fit mode */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

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

  /** Image transition duration in ms */
  transition?: number;

  /** Caching policy */
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';

  /** Blur radius for progressive loading */
  blurRadius?: number;

  /** Loading priority */
  priority?: 'low' | 'normal' | 'high';

  /** Original width of the image in pixels (for responsive sizing) */
  originalWidth?: number;

  /** Original height of the image in pixels (for responsive sizing) */
  originalHeight?: number;

  /** Percentage of screen width the container takes (0-1) */
  containerWidthPercent?: number;

  /** Whether the image is currently visible in the viewport */
  isVisible?: boolean;

  /** Distance from viewport in pixels (for priority calculation) */
  distanceFromViewport?: number;

  /** Whether to prefetch this image before it's displayed */
  prefetch?: boolean;
}
