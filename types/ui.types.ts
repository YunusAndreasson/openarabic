import {
  ViewStyle,
  TextStyle,
  StyleProp,
  TouchableOpacityProps,
  TextProps,
  ScrollView,
  ViewProps,
  TextInputProps,
  LayoutRectangle,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { SharedValue, AnimatedStyleProp } from '@/hooks/animations/types';
import { Category, Article } from './articles.types';
import { AnimatedStyle } from 'react-native-reanimated';
import { Edge } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VocabularyStats as VocabularyStatsType, StudyWord } from '@/types/vocabulary.types';

/**
 * Base props for components with style
 */
export interface BaseStyleProps {
  /** Optional style to apply to the component */
  style?: StyleProp<ViewStyle>;
}

/**
 * Base props for components with animated style
 */
export interface BaseAnimatedStyleProps {
  /** Optional style to apply to the component, supporting animated styles */
  style?: StyleProp<ViewStyle> | StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
}

/**
 * Base props for components with theme colors
 */
export interface BaseThemedProps {
  /** Theme colors for styling */
  colors: ReturnType<typeof useColors>;
}

/**
 * Base props for components with press handlers
 */
export interface BasePressableProps {
  /** Callback when the component is pressed */
  onPress: () => void;
}

/**
 * Base props for components with optional press handlers
 */
export interface BaseOptionalPressableProps {
  /** Optional callback when the component is pressed */
  onPress?: () => void;
}

/**
 * Base props for components with children
 */
export interface BaseChildrenProps {
  /** Children to render inside the component */
  children: React.ReactNode;
}

/**
 * Base props for components with animation properties
 */
export interface BaseAnimationProps {
  /** Delay before starting the animation (in ms) */
  delay?: number;
  /** Duration of the animation (in ms) */
  duration?: number;
}

/**
 * Base props for styling pills
 */
export interface BasePillStyleProps {
  isSelected?: boolean;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

/**
 * Styles for pills
 */
export interface BasePillStyles {
  container: ViewStyle;
  text: TextStyle;
}

/**
 * Base props for category pills
 */
export interface CategoryPillBaseProps {
  category: string;
  absolute?: boolean;
}

/**
 * Pill variant types
 */
export type PillVariant = 'filter' | 'category' | 'horizontal-category';

/**
 * Base props for pill components
 */
export interface BasePillProps {
  /**
   * Unique identifier for the item
   */
  id: string | number;

  /**
   * Label text to display in the pill
   */
  label: string;

  /**
   * Whether the pill is currently selected
   */
  isSelected?: boolean;

  /**
   * Callback when the pill is selected
   */
  onSelect?: (id: string | number) => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;

  /**
   * Whether the pill should be positioned absolutely
   */
  absolute?: boolean;
}

/**
 * Props for filter variant of Pill
 */
export interface FilterPillProps extends BasePillProps {
  /**
   * Variant of the pill
   */
  variant: 'filter';
}

/**
 * Props for category variant of Pill
 */
export interface CategoryPillProps extends BasePillProps {
  /**
   * Variant of the pill
   */
  variant: 'category';
}

/**
 * Props for horizontal-category variant of Pill
 */
export interface HorizontalCategoryPillProps extends BasePillProps {
  /**
   * Variant of the pill
   */
  variant: 'horizontal-category';
}

/**
 * Props for the Pill component
 */
export type PillProps =
  | FilterPillProps
  | CategoryPillProps
  | HorizontalCategoryPillProps
  | (BasePillProps & {
      /**
       * Variant of the pill
       */
      variant?: PillVariant;
    });

/**
 * Interface for filter items
 */
export interface FilterItem {
  /**
   * Unique identifier for the item
   */
  id: number;

  /**
   * Display name for the item
   */
  name: string;

  /**
   * Allow for additional properties
   */
  [key: string]: any;
}

/**
 * Props for the FilterList component
 */
export interface FilterListProps<T extends FilterItem> {
  /**
   * Title for the filter section
   */
  title: string;

  /**
   * Array of items to display in the filter list
   */
  items: T[];

  /**
   * ID of the currently selected item
   */
  selectedId: number | null;

  /**
   * Callback when an item is selected
   */
  onSelect: (id: number) => void;

  /**
   * Callback when filters are cleared
   */
  onClearFilter?: () => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;

  /**
   * Base animation delay for individual items
   */
  itemAnimationDelay?: number;
}

/**
 * Props for horizontal category pill items
 */
export interface HorizontalCategoryPillItemProps extends BasePressableProps {
  category: Category | null;
  isSelected: boolean;
}

/**
 * Props for category pills container
 */
export interface CategoryPillsContainerProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  visible: SharedValue<number>;
}

/**
 * Props for article list component
 */
export interface ArticleListProps extends BaseStyleProps {
  articles: Article[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onArticlePress: (article: Article) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
  initialNumToRender?: number;
  windowSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  removeClippedSubviews?: boolean;
  maintainVisibleContentPosition?: {
    minIndexForVisible: number;
  };
}

/**
 * Props for compact article card component
 */
export interface CompactArticleCardProps extends BaseStyleProps, BaseOptionalPressableProps {
  article: Article;
  showTimeAgo?: boolean;
  hideDifficultyLabel?: boolean;
  hideDifficulty?: boolean;
  lastOpenedAt?: string;
}

/**
 * Base props for card components
 */
export interface BaseCardProps extends BaseAnimatedStyleProps {
  /** Whether the card is in a loading state */
  isLoading?: boolean;
}

/**
 * Button variant types
 */
export type ButtonVariant = 'filled' | 'outlined';

/**
 * Base button props
 */
export interface BaseButtonProps
  extends Omit<TouchableOpacityProps, 'style'>,
    BaseAnimatedStyleProps {
  /** Text displayed on the button */
  title: string;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Size of the icon in pixels */
  iconSize?: number;
  /** Optional style to apply to the content container */
  contentContainerStyle?: ViewStyle;
  /** Optional style to apply to the inner container */
  innerContainerStyle?: ViewStyle;
  /** Optional custom scale amount for the press animation (default is 0.95) */
  scaleAmount?: number;
  /** Additional content to render inside the button */
  children?: React.ReactNode;
}

/**
 * Props for filled variant of ThemedButton
 */
export interface FilledButtonProps extends BaseButtonProps {
  /** Visual style variant of the button */
  variant: 'filled';
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
  /** Optional custom icon component (overrides icon prop if both are provided) */
  iconComponent?: React.ReactNode;
}

/**
 * Props for outlined variant of ThemedButton
 */
export interface OutlinedButtonProps extends BaseButtonProps {
  /** Visual style variant of the button */
  variant: 'outlined';
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
  /** Optional custom icon component (overrides icon prop if both are provided) */
  iconComponent?: React.ReactNode;
}

/**
 * A themed button component that supports different visual styles,
 * icons, loading states, and press animations.
 */
export type ThemedButtonProps =
  | FilledButtonProps
  | OutlinedButtonProps
  | (BaseButtonProps & {
      variant?: ButtonVariant;
      /** Optional Ionicons icon name to display before the title */
      icon?: string;
      /** Optional custom icon component (overrides icon prop if both are provided) */
      iconComponent?: React.ReactNode;
    });

/**
 * Props for ThemedText component
 */
export type ThemedTextProps = TextProps & {
  /** The type of text to display */
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'arabic';
  /** Whether to skip applying the default text color */
  skipDefaultColor?: boolean;
  /** Font size for Arabic text */
  arabicFontSize?: number;
};

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
 * Props for the Loader component
 */
export interface LoaderProps extends BaseAnimatedStyleProps {
  /** Size of the loader - small, large, medium or a specific number */
  size?: number | 'small' | 'medium' | 'large';
  /** Color of the loader (defaults to text color) */
  color?: string;
}

/**
 * Props for a full-screen loading component
 */
export interface LoadingScreenProps {
  /** Color of the loader (defaults to tint color) */
  color?: string;
}

/**
 * Props for the LoadingContainer component
 */
export interface LoadingContainerProps extends BaseAnimatedStyleProps {
  /** Size of the loader - small, medium or large */
  size?: 'small' | 'medium' | 'large';
  /** Color of the loader */
  color?: string;
  /** Additional styles for the container */
  containerStyle?: ViewStyle;
}

/**
 * Props for the app-wide loader component
 */
export interface AppLoaderProps {
  /** Color of the loader (defaults to tint color) */
  color?: string;
}

/**
 * Props for the ThemedModal component
 */
export interface ThemedModalProps extends BaseChildrenProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Function to call when the modal is closed
   */
  onClose: () => void;
  /**
   * Optional title for the modal
   */
  title?: string;
  /**
   * Whether to use a blur effect for the backdrop
   * @default true
   */
  useBlur?: boolean;
  /**
   * Whether to show a close button
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * Whether to animate the modal
   * @default true
   */
  animated?: boolean;
  /**
   * Custom style for the modal content container
   */
  contentStyle?: ViewStyle;
  /**
   * Custom style for the modal title
   */
  titleStyle?: TextStyle;
  /**
   * Whether to close the modal when tapping the backdrop
   * @default true
   */
  closeOnBackdropPress?: boolean;
  /**
   * Whether to use haptic feedback when closing
   * @default true
   */
  useHaptics?: boolean;
  /**
   * Custom width for the modal (percentage of screen width)
   * @default 0.85
   */
  widthPercentage?: number;
  /**
   * Maximum width for the modal
   * @default 400
   */
  maxWidth?: number;
  /**
   * Animation duration in milliseconds
   * @default LAYOUT.ANIMATION.DURATION.NORMAL
   */
  animationDuration?: number;
  /**
   * Blur intensity for the backdrop
   * @default 80
   */
  blurIntensity?: number;
  /**
   * Animation type for the modal
   * @default 'fade'
   */
  animationType?: 'fade' | 'slide' | 'none';
  /**
   * Opacity of the modal overlay
   * @default 0.8
   */
  overlayOpacity?: number;
}

/**
 * AnimatedThemedText combines ThemedText with animation capabilities.
 * It provides a convenient way to create text that animates on changes
 * while maintaining the theming system.
 */
export interface AnimatedThemedTextProps extends Omit<ThemedTextProps, 'style'> {
  /** Text content to display */
  children: React.ReactNode;
  /** Style for the text */
  style?: StyleProp<TextStyle> | StyleProp<AnimatedStyle<StyleProp<TextStyle>>>;
  /** Whether to animate when the content changes */
  animate?: boolean;
  /** Animation magnitude (how much to scale) */
  magnitude?: number;
}

/**
 * Props for the ProgressBar component
 */
export interface ProgressBarProps extends BaseStyleProps {
  /**
   * Progress value between 0 and 100
   */
  progress: number;
  /**
   * Height of the progress bar
   * @default LAYOUT.SPACING.SMALL
   */
  height?: number;
  /**
   * Custom style for the progress fill
   */
  fillStyle?: ViewStyle;
  /**
   * Custom background color for the progress bar
   * If not provided, uses theme-based color
   */
  backgroundColor?: string;
  /**
   * Custom fill color for the progress bar
   * If not provided, uses theme's tint color
   */
  fillColor?: string;
  /**
   * Whether to animate the progress bar
   * @default false
   */
  animationTriggered?: boolean;
  /**
   * Duration of the animation in milliseconds
   * @default 2000
   */
  animationDuration?: number;
}

/**
 * Props for the ThemedInput component
 */
export interface ThemedInputProps extends TextInputProps {
  /** Optional icon name to display on the left side */
  icon?: string;
  /** Optional icon name to display on the right side */
  rightIcon?: string;
  /** Callback when the right icon is pressed */
  onRightIconPress?: () => void;
  /** Error message to display below the input */
  error?: string;
  /** Hint text to display below the input */
  hint?: string;
}

/**
 * Props for the ErrorState component
 */
export interface ErrorStateProps {
  /**
   * Error message to display
   */
  message: string;

  /**
   * Optional callback when retry button is pressed
   */
  onRetry?: () => void;
}

/**
 * Props for the SectionTitle component
 */
export interface SectionTitleProps {
  /** Title text to display */
  title: string;
}

/**
 * Props for the VocabularyEmptyState component
 */
export interface VocabularyEmptyStateProps extends BaseThemedProps {}

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps {
  /**
   * Title text for the empty state
   */
  title: string;

  /**
   * Message text for the empty state
   */
  message: string;

  /**
   * Button title (optional)
   */
  buttonTitle?: string;

  /**
   * Button icon name (optional)
   */
  buttonIcon?: string;

  /**
   * Button press handler (optional)
   */
  onButtonPress?: () => void;
}

/**
 * Props for the FloatingButton component
 */
export interface FloatingButtonProps extends BasePressableProps, BaseThemedProps {
  /** Position of the button (left or right) */
  position: 'left' | 'right';
  /** Distance from the top of the screen */
  top: number;
  /** Animated style for the button */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Ionicons icon name */
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  /** Accessibility label for the button */
  accessibilityLabel: string;
  /** Whether the app is in dark mode */
  isDarkMode: boolean;
}

/**
 * Props for the BackButton component
 */
export interface BackButtonProps extends BasePressableProps {
  /**
   * Optional button text, defaults to "Back to home"
   */
  text?: string;
}

/**
 * Props for the Toggle component
 */
export interface ToggleProps {
  /** Current state of the toggle (true = on, false = off) */
  value: boolean;
  /** Callback function when the toggle state changes */
  onValueChange: (value: boolean) => void;
  /** Optional label for the toggle */
  label?: string;
}

/**
 * Props for the StatCard component
 */
export interface StatCardProps extends BaseThemedProps {
  /** Label text to display below the value */
  label: string;
  /** Numerical value to display */
  value: number;
  /** Icon name from Ionicons */
  icon: string;
  /** Whether to animate the value with a pulse effect (useful for changes) */
  animateValue?: boolean;
}

/**
 * Props for the WordTooltip component
 */
export interface WordTooltipProps {
  /**
   * Whether the tooltip is visible
   */
  visible: boolean;

  /**
   * Text to display in the tooltip
   */
  text: string;

  /**
   * Layout information for positioning the tooltip
   */
  layout: LayoutRectangle | null;

  /**
   * Callback when the tooltip is closed
   */
  onClose: () => void;
}

/**
 * Props for the DailyPickSection component
 */
export interface DailyPickSectionProps {
  /**
   * The daily pick article to display
   */
  article: Article | null;

  /**
   * Callback when the article is pressed
   */
  onPress: (article: Article) => void;

  /**
   * Animation delay in milliseconds
   */
  delay?: number;

  /**
   * Whether to show the section title
   * @default true
   */
  showTitle?: boolean;
}

/**
 * Props for the FilterNotice component
 */
export interface FilterNoticeProps {
  /**
   * Type of filter being applied
   */
  type: 'author' | 'category';

  /**
   * Name of the selected filter
   */
  name: string;
}

/**
 * Props for the SignInRequired component
 */
export interface SignInRequiredProps extends BaseThemedProps {
  /**
   * Title text to display
   */
  title?: string;

  /**
   * Message text to display
   */
  message?: string;

  /**
   * Benefit title text
   */
  benefitTitle?: string;

  /**
   * Benefit description text
   */
  benefitDescription?: string;

  /**
   * Header title text
   */
  headerTitle?: string;
}

/**
 * Props for the ArticleHeader component
 */
export interface ArticleHeaderProps extends BaseThemedProps {
  /**
   * Article to display in the header
   */
  article: Article;

  /**
   * Whether the app is in dark mode
   */
  isDarkMode: boolean;
}

/**
 * Props for the CategoryPills component
 */
export interface CategoryPillsProps {
  /**
   * List of categories to display
   */
  categories: Category[];

  /**
   * Currently selected category
   */
  selectedCategory: Category | null;

  /**
   * Callback when a category is selected
   */
  onSelectCategory: (category: Category | null) => void;

  /**
   * Visibility control value
   */
  visible: SharedValue<number>;
}

/**
 * Props for the EntranceAnimation component
 */
export interface EntranceAnimationProps
  extends BaseChildrenProps,
    BaseAnimationProps,
    BaseStyleProps {}

/**
 * Props for the CustomSlider component
 */
export interface CustomSliderProps extends BaseStyleProps {
  /**
   * Current value of the slider
   */
  value: number;

  /**
   * Callback when the value changes
   */
  onValueChange: (value: number) => void;

  /**
   * Minimum possible value
   * @default 0
   */
  minimumValue?: number;

  /**
   * Maximum possible value
   * @default 1
   */
  maximumValue?: number;

  /**
   * Step size for value changes
   * @default 0.1
   */
  step?: number;
}

/**
 * Props for the ArabicWord component
 */
export interface ArabicWordProps {
  /**
   * Word data to display
   */
  word: import('./vocabulary.types').SentenceWord;

  /**
   * Whether the word is currently selected
   */
  isSelected: boolean;

  /**
   * Callback when the word is pressed
   */
  onPress: (word: import('./vocabulary.types').SentenceWord) => void;

  /**
   * Scale factor for the word size
   * @default 1
   */
  scale?: number;

  /**
   * Base font size for the word
   * @default 32
   */
  baseSize?: number;
}

/**
 * Props for the AnimatedSection component
 */
export interface AnimatedSectionProps
  extends BaseChildrenProps,
    BaseAnimationProps,
    BaseStyleProps {
  /**
   * Title to display at the top of the section
   */
  title?: string;

  /**
   * Whether to show the section title
   */
  showTitle?: boolean;

  /**
   * Whether to add horizontal padding to the content
   */
  paddingHorizontal?: boolean;
}

/**
 * Props for the ArticleSentence component
 */
export interface ArticleSentenceProps {
  /**
   * Sentence data from the database
   */
  sentence: import('./database.types').Tables<'article_sentences'>;

  /**
   * Processed words in the sentence
   */
  words: import('./vocabulary.types').SentenceWord[];

  /**
   * Function to render each word in the sentence
   */
  renderWord: (word: import('./vocabulary.types').SentenceWord) => React.ReactNode;

  /**
   * Display settings for the sentence
   */
  settings: {
    /**
     * Whether to show the English translation
     */
    showEnglish: boolean;

    /**
     * Font scale factor
     */
    fontScale: number;

    /**
     * Additional settings
     */
    [key: string]: any;
  };

  /**
   * Theme colors
   */
  colors: {
    /**
     * Color for English text
     */
    englishText: string;

    /**
     * Color for author text
     */
    authorText: string;

    /**
     * Additional colors
     */
    [key: string]: any;
  };

  /**
   * Additional styles for the container
   */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Props for the RelatedArticlesFooter component
 */
export interface RelatedArticlesFooterProps {
  /**
   * List of recommended articles
   */
  otherArticles: Article[];

  /**
   * List of articles from the same category
   */
  otherCategoryArticles: Article[];

  /**
   * Current article being viewed
   */
  article: Article | null;

  /**
   * Function to render an article card
   */
  renderArticleCard: (article: Article) => React.ReactNode;
}

/**
 * Props for the RelatedArticlesSection component
 */
export interface RelatedArticlesSectionProps {
  /**
   * Section title text
   */
  title: string;

  /**
   * List of related articles to display
   */
  articles: Article[];

  /**
   * Function to render an article card
   */
  renderArticleCard: (article: Article) => React.ReactNode;
}

/**
 * Props for the CloseButton component
 */
export interface CloseButtonProps extends BasePressableProps, BaseStyleProps {
  /**
   * Size of the button container
   * @default 32
   */
  size?: number;

  /**
   * Size of the icon
   * @default 20
   */
  iconSize?: number;

  /**
   * Color of the icon
   */
  color?: string;

  /**
   * Whether to use haptic feedback when pressed
   * @default true
   */
  hapticFeedback?: boolean;
}

/**
 * Props for the AnimatedItem component
 */
export interface AnimatedItemProps extends BaseChildrenProps, BaseAnimationProps, BaseStyleProps {}

/**
 * Props for the ReadingListButton component
 */
export interface ReadingListButtonProps extends BaseStyleProps {
  /**
   * ID of the article to add/remove from reading list
   */
  articleId: number;
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
}

/**
 * Props for the ErrorMessage component in the vocabulary context
 */
export interface ErrorMessageProps {
  /**
   * Name of the screen where the error occurred
   * @default 'vocabulary'
   */
  screenName?: string;

  /**
   * Custom error message to display
   * @default 'Error loading your vocabulary data. Please try again later.'
   */
  customMessage?: string;
}

/**
 * Props for the vocabulary ReviewButton component
 */
export interface ReviewButtonProps extends BasePressableProps {
  /**
   * Number of words due for review
   */
  dueWords: number;
}

/**
 * Props for the MeaningOverlay component in review mode
 */
export interface MeaningOverlayProps {
  /**
   * Whether the overlay is visible
   */
  visible: boolean;

  /**
   * The meaning text to display
   */
  meaning: string;

  /**
   * Whether to display in warning style
   * @default false
   */
  isWarning?: boolean;
}

/**
 * Props for the WordDisplay component
 */
export interface WordDisplayProps extends BaseStyleProps {
  /**
   * Word text to display
   */
  word: string;

  /**
   * Font size for the word
   */
  fontSize: number;
}

/**
 * Props for the InstructionFooter component
 */
export interface InstructionFooterProps extends BaseStyleProps {}

/**
 * Props for the VocabularyStats component
 */
export interface VocabularyStatsProps
  extends Pick<VocabularyStatsType, 'totalWords' | 'dueWords' | 'masteredWords' | 'learningWords'> {
  /** Whether the component is in a loading state */
  isLoading?: boolean;
}

/**
 * Transition type for animations
 */
export type TransitionType = 'fade' | 'slide';

/**
 * Props for the WordReviewCard component
 *
 * This component uses Reanimated 3's built-in animations for optimal performance.
 */
export interface WordReviewCardProps {
  /** The word to be displayed */
  word?: StudyWord;
  /** The type of transition animation to use */
  transitionType?: TransitionType;
  /** Whether the card is visible */
  isVisible: boolean;
}

/**
 * Variant types for ThemedCard
 */
export type CardVariant = 'article' | 'compact';

/**
 * Props for article variant of ThemedCard
 */
export interface ArticleCardProps extends BaseCardProps, BaseOptionalPressableProps {
  /** Variant of the card */
  variant: 'article';
  /** URL of the image to display in the card */
  imageUrl?: string;
  /** Title text to display in the card */
  title?: string;
  /** Category text to display in a pill on the card */
  category?: string;
  /** Author name to display in the card */
  author?: string;
  /** Summary text to display in the card */
  summary?: string;
}

/**
 * Props for compact variant of ThemedCard
 */
export interface CompactCardProps extends BaseCardProps, BaseOptionalPressableProps {
  /** Variant of the card */
  variant: 'compact';
  /** Children to render inside the card */
  children?: React.ReactNode;
}

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 */
export type ThemedCardProps =
  | ArticleCardProps
  | CompactCardProps
  | (BaseCardProps &
      BaseOptionalPressableProps & {
        /** URL of the image to display in the card (for article variant) */
        imageUrl?: string;
        /** Title text to display in the card (for article variant) */
        title?: string;
        /** Category text to display in a pill on the card (for article variant) */
        category?: string;
        /** Author name to display in the card (for article variant) */
        author?: string;
        /** Summary text to display in the card (for article variant) */
        summary?: string;
        /** Children to render inside the card (for compact variant) */
        children?: React.ReactNode;
        /** Variant of the card */
        variant?: CardVariant;
      });
