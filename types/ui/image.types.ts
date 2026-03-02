import type { BaseStyleProps } from './base.types';

/**
 * Props for the EnhancedImage component
 * Optimized for Expo Image v3 with modern features and smart defaults
 *
 * Note: EnhancedImage is not pressable. If press handling is needed,
 * wrap the component in a Pressable or BaseCard.
 */
export interface EnhancedImageProps extends BaseStyleProps {
  /** Source URL or local asset for the image */
  source: string | number;

  /** Content fit mode */
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

  /** Cross-fade duration in ms; set 0 for instant */
  transition?: number;

  /** Hint for texture reuse when the same URL is shown in different places */
  recyclingKey?: string;

  /** Loading priority */
  priority?: 'high' | 'low' | 'normal';
}
