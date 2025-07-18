import type { StyleProp, ViewStyle } from 'react-native';

import type { BaseAnimatedStyleProps, BaseOptionalPressableProps } from './base.types';

/**
 * Props for card components with basic styling and functionality
 */
export interface BaseCardProps extends BaseAnimatedStyleProps {
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Children to render inside the card */
  children?: React.ReactNode;
  /** Optional callback when card is pressed */
  onPress?: () => void;
  /** Optional callback when card is long pressed */
  onLongPress?: () => void;
  /** Shadow size for the card */
  shadowSize?: 'large' | 'medium' | 'none' | 'small';
  /** Whether to include press animation */
  includePressAnimation?: boolean;
  /** Custom loading component to use */
  loadingComponent?: React.ReactNode;
  /** Additional styling for the content container */
  contentStyle?: StyleProp<ViewStyle>;
  /** Whether the card is disabled (reduces opacity and prevents interactions) */
  disabled?: boolean;
  /** Optional test identifier used for testing */
  testID?: string;
}

/**
 * Props for article variant of ThemedCard
 */
export interface ArticleCardProps extends BaseCardProps, BaseOptionalPressableProps {
  /** Variant of the card */
  variant: 'article';
  /** URL of the image to display in the card */
  imageUrl: string;
  /** Title text to display in the card */
  title: string;
  /** Category text to display in a pill on the card */
  category: string;
  /** Category to display with author (separate from pill) */
  categoryForDisplay: string;
  /** Author name to display in the card */
  author: string;
  /** Summary text to display in the card */
  summary: string;
}
