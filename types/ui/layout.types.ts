import { ViewProps, StyleProp, ViewStyle, ScrollView } from 'react-native';
import { Edge } from 'react-native-safe-area-context';
import { Article } from '../articles.types';
import { BaseStyleProps, BaseThemedProps } from './base.types';

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
  safeAreaEdges?: Edge[];
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

/**
 * Props for the ArticleSentence component
 */
export interface ArticleSentenceProps {
  /** Sentence data */
  sentence: import('../articles.types').ArticleSentence;
  /** Words in the sentence */
  words: import('../vocabulary.types').SentenceWord[];
  /** Function to render each word */
  renderWord: (word: import('../vocabulary.types').SentenceWord) => React.ReactNode;
  /** Display settings */
  settings: {
    showEnglish: boolean;
    fontScale: number;
    [key: string]: any;
  };
  /** Theme colors */
  colors: {
    englishText: string;
    authorText: string;
    [key: string]: any;
  };
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the CategoryPills component
 */
export interface CategoryPillsProps {
  /** List of categories */
  categories: any[];
  /** Currently selected category ID */
  selectedCategoryId?: number | null;
  /** Callback when a category is selected */
  onSelectCategory: (categoryId: number | null) => void;
  /** Whether to include an "All" option */
  includeAllOption?: boolean;
  /** Label for the "All" option */
  allLabel?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps {
  /** Title text to display */
  title: string;
  /** Description text to display */
  description: string;
  /** Icon name to display */
  icon?: string;
  /** Button action text */
  actionText?: string;
  /** Callback when the action button is pressed */
  onAction?: () => void;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

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
  containerStyle?: StyleProp<ViewStyle>;
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
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the SignInRequired component
 */
export interface SignInRequiredProps {
  /** Title for the sign in prompt */
  title?: string;
  /** Message to display */
  message?: string;
  /** Optional benefit title to display */
  benefitTitle?: string;
  /** Optional benefit description to display */
  benefitDescription?: string;
  /** Optional header title to display */
  headerTitle?: string;
  /** Theme colors object */
  colors: any;
  /** Callback when sign in button is pressed */
  onSignIn?: () => void;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the StatCard component
 */
export interface StatCardProps {
  /** Title text for the stat */
  title: string;
  /** Value of the stat */
  value: string | number;
  /** Icon name to display */
  icon?: string;
  /** Whether the stat is loading */
  isLoading?: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the VocabularyEmptyState component
 */
export interface VocabularyEmptyStateProps {
  /** Theme colors object */
  colors: any;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the VocabularyStats component
 */
export interface VocabularyStatsProps {
  /** Number of words the user knows */
  knownWords: number;
  /** Number of words due for review */
  dueWords: number;
  /** Number of words the user is learning */
  learningWords: number;
  /** Whether the stats are loading */
  isLoading?: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the WordReviewCard component
 */
export interface WordReviewCardProps {
  /** Arabic word to display */
  arabicWord: string;
  /** English translation of the word */
  englishWord: string;
  /** Example sentence containing the word */
  exampleSentence?: string;
  /** Translation of the example sentence */
  exampleTranslation?: string;
  /** Whether to show the full details */
  showDetails: boolean;
  /** Whether to show meaning */
  showMeaning: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}
