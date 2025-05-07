import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ViewProps, StyleProp, ViewStyle, ScrollView } from 'react-native';

import type { ArticleSentence, Category } from '../articles.types';
import type { SentenceWord } from '../vocabulary.types';

import type { BaseStyleProps, BaseThemedProps } from './base.types';
import type { ThemeColors } from './theme.types';

/**
 * ThemedView is a flexible container component that automatically applies theme colors
 * and provides options for scrollable content, safe area insets, and more.
 *
 * It serves as the foundation for most screens in the app, ensuring consistent
 * theming and behavior across the application.
 */
export interface ThemedViewProps extends ViewProps {
  /** Determines whether the view should be scrollable */
  scrollable?: boolean;
  /** Optional style for the ScrollView content container when scrollable */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to use SafeAreaView (default: true) */
  useSafeArea?: boolean;
  /** Whether to include bottom insets in safe area (default: true) */
  includeBottomInset?: boolean;
  /** Specific edges to apply safe area insets to (overrides includeBottomInset) */
  safeAreaEdges?: ('top' | 'right' | 'bottom' | 'left')[];
  /** Optional ScrollView props */
  scrollViewProps?: Omit<React.ComponentProps<typeof ScrollView>, 'children'>;
  /** Children to render inside the view */
  children?: React.ReactNode;
}

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps {
  /**
   * Title text for the header
   */
  title: string;

  /**
   * Optional callback for when the back button is pressed
   * If provided, a back button will be shown
   */
  onBackPress?: () => void;
}

/**
 * Props for the AnimatedItem component
 */
export interface AnimatedItemProps extends BaseStyleProps {
  /** Children to render */
  children: React.ReactNode;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Whether to animate on mount */
  animate?: boolean;
}

export interface DisplaySettings {
  showEnglish: boolean;
  fontScale: number;
  showTransliteration?: boolean;
  showWordType?: boolean;
  [key: string]: boolean | number | undefined;
}

/**
 * Props for the ArticleSentence component
 */
export interface ArticleSentenceProps {
  /** Sentence data */
  sentence: ArticleSentence;
  /** Words in the sentence */
  words: SentenceWord[];
  /** Function to render each word */
  renderWord: (word: SentenceWord) => React.ReactNode;
  /** Display settings */
  settings: DisplaySettings;
  /** Theme colors */
  colors: ThemeColors;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the CategoryPills component
 */
export interface CategoryPillsProps extends BaseThemedProps {
  categories: Category[];
  selectedCategoryId?: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  includeAllOption?: boolean;
  allLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface IconProps {
  name: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
}

/**
 * Base empty state props shared by both variants
 */
export interface BaseEmptyStateProps extends BaseThemedProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  submessage?: string;
  customActionButton?: React.ReactNode;
  iconSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
  iconContainerStyle?: StyleProp<ViewStyle>;
  hideArticlesButton?: boolean;
}

/**
 * Empty state props with an icon name string
 */
export interface EmptyStateWithIconNameProps extends BaseEmptyStateProps {
  iconType: 'name';
  icon: ComponentProps<typeof Ionicons>['name'];
}

/**
 * Empty state props with an IconProps object
 */
export interface EmptyStateWithIconPropsProps extends BaseEmptyStateProps {
  iconType: 'props';
  icon: IconProps;
}

/**
 * Props for the EmptyState component using a discriminated union
 * for better type safety of the icon property
 */
export type EmptyStateProps = EmptyStateWithIconNameProps | EmptyStateWithIconPropsProps;

/**
 * Props for the ErrorState component
 */
export interface ErrorStateProps {
  /** Error message to display */
  message: string;
  /** Callback when retry button is pressed */
  onRetry?: () => void;
  /** Title text to display */
  title?: string;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
}

/**
 * Props for the SectionTitle component
 */
export interface SectionTitleProps {
  /** Title text to display */
  title: string;
  /** Action text to display */
  actionText?: string;
  /** Callback when action text is pressed */
  onAction?: () => void;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
}

/**
 * Props for the SignInRequired component
 */
export interface SignInRequiredProps extends BaseThemedProps {
  title?: string;
  message?: string;
  benefitTitle?: string;
  benefitDescription?: string;
  headerTitle?: string;
  onSignIn?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Props for the StatCard component
 */
export interface StatCardProps extends BaseThemedProps {
  label: string;
  value: string | number;
  icon?: ComponentProps<typeof Ionicons>['name'];
  animateValue?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

/**
 * Props for the VocabularyEmptyState component
 */
export interface VocabularyEmptyStateProps extends BaseThemedProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Props for the VocabularyStats component
 */
export interface VocabularyStatsProps {
  /** Total number of words */
  totalWords: number;
  /** Number of mastered words */
  masteredWords: number;
  /** Number of words the user knows */
  knownWords?: number;
  /** Number of words due for review */
  dueWords?: number;
  /** Number of words the user is learning */
  learningWords?: number;
  /** Whether the stats are loading */
  isLoading?: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the WordReviewCard component
 */
export interface WordReviewCardProps {
  /** Word object to display */
  word: {
    sentence_word?: {
      word_form: string;
    };
  } | null;
  /** Type of transition animation */
  transitionType?: string;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

export interface CategoryListProps extends BaseThemedProps {
  categories: Category[];
  selectedCategoryId?: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  includeAllOption?: boolean;
  allLabel?: string;
  disabled?: boolean;
}
