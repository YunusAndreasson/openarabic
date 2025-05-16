import type { ViewStyle, StyleProp } from 'react-native';

import type { Article } from '../articles.types';

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
  /** Shadow size for the card */
  shadowSize?: 'small' | 'medium' | 'large' | 'none';
  /** Whether to include press animation */
  includePressAnimation?: boolean;
  /** Custom loading component to use */
  loadingComponent?: React.ReactNode;
  /** Additional styling for the content container */
  contentStyle?: StyleProp<ViewStyle>;
  /** Whether the card is disabled (reduces opacity and prevents interactions) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Variant types for ThemedCard
 */
export type CardVariant = 'article' | 'compact' | 'basic';

/**
 * Props for basic variant of ThemedCard
 */
export interface BasicCardProps extends BaseCardProps, BaseOptionalPressableProps {
  variant: 'basic';
  children?: React.ReactNode;
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
  /** Author name to display in the card */
  author?: string;
  /** Summary text to display in the card */
  summary?: string;
  /** Placeholder image using blurhash or thumbhash */
  placeholder?: { blurhash?: string; thumbhash?: string };
}

/**
 * Props for compact variant of ThemedCard
 */
export interface CompactCardProps extends BaseCardProps, BaseOptionalPressableProps {
  /** Variant of the card */
  variant: 'compact';
  /** Children to render inside the card (use this OR article data) */
  children?: React.ReactNode;
  /** Article data to display in the card */
  article: Article;
  /** Show time ago instead of difficulty */
  showTimeAgo?: boolean;
  /** Hide difficulty completely */
  hideDifficulty?: boolean;
  /** When the article was last opened */
  lastOpenedAt?: string;
  /** Number of words due for review in this article */
  dueWordCount?: number;
}

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 *
 * The 'compact' variant can handle article data directly, removing the need for CompactArticleCard.
 */
export type ThemedCardProps =
  | ArticleCardProps
  | CompactCardProps
  | BasicCardProps
  | (BaseCardProps &
      BaseOptionalPressableProps & {
        /** URL of the image to display in the card (for article variant) */
        imageUrl: string;
        /** Title text to display in the card (for article variant) */
        title: string;
        /** Category text to display in a pill on the card (for article variant) */
        category: string;
        /** Author name to display in the card (for article variant) */
        author?: string;
        /** Summary text to display in the card (for article variant) */
        summary?: string;
        /** Children to render inside the card (for compact variant) */
        children?: React.ReactNode;
        /** Article data to display (for compact variant) */
        article: Article;
        /** Show time ago instead of difficulty (for compact variant) */
        showTimeAgo?: boolean;
        /** Hide difficulty completely (for compact variant) */
        hideDifficulty?: boolean;
        /** When the article was last opened (for compact variant) */
        lastOpenedAt?: string;
        /** Number of words due for review in this article (for compact variant) */
        dueWordCount?: number;
        /** Variant of the card */
        variant?: CardVariant;
      });
