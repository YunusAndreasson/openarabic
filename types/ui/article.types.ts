import { Article } from '../articles.types';
import { BaseThemedProps } from './base.types';
import { StyleProp, ViewStyle } from 'react-native';

/**
 * Props for the ArticleList component
 */
export interface ArticleListProps {
  /** List of articles to display */
  articles: Article[];
  /** Whether the list is in a loading state */
  isLoading?: boolean;
  /** Whether the list is refreshing */
  isRefreshing?: boolean;
  /** Callback when the refresh action is triggered */
  onRefresh?: () => void;
  /** Callback when an article is pressed */
  onArticlePress: (article: Article) => void;
  /** Optional component to render at the top of the list */
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Optional component to render when the list is empty */
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Optional style for the list content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to hide the main list of articles and only show header sections */
  hideMainList?: boolean;
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
