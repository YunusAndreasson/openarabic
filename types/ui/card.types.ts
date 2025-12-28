import type { StyleProp, ViewStyle } from 'react-native';

import type { BaseComponentProps } from './base.types';

/**
 * Props for card components with basic styling and functionality
 * Note: Use 'loading' prop from BaseComponentProps for loading state
 */
export interface BaseCardProps extends BaseComponentProps {
  /** Optional callback when card is long pressed */
  onLongPress?: () => void;
  /** Shadow size for the card */
  shadowSize?: 'large' | 'medium' | 'none' | 'small' | 'subtle';
  /** Additional styling for the content container */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for article variant of ThemedCard
 */
export interface ArticleCardProps extends BaseCardProps {
  /** Variant of the card */
  variant: 'article';
  /** URL of the image to display in the card */
  imageUrl: string;
  /** Title text to display in the card */
  title: string;
  /** Category name (used in author line, and pill if pillLabel not provided) */
  category: string;
  /** Optional custom label for the pill (defaults to category if not provided) */
  pillLabel?: string;
  /** Summary text to display in the card */
  summary: string;
}
