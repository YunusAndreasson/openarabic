import type { StyleProp, ViewStyle } from 'react-native';

import type { Article } from '../articles.types';
import type { Tables } from '../database.types';

import type { BaseThemedProps } from './base.types';

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
  ListHeaderComponent?: React.ComponentType<object> | React.ReactElement | null;
  /** Optional component to render at the bottom of the list */
  ListFooterComponent?: React.ComponentType<object> | React.ReactElement | null;
  /** Optional component to render when the list is empty */
  ListEmptyComponent?: React.ComponentType<object> | React.ReactElement | null;
  /** Optional style for the list content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to hide the main list of articles and only show header sections */
  hideMainList?: boolean;
  /** Whether to hide all content while refreshing */
  hideWhileRefreshing?: boolean;
  /** Offset for the pull-to-refresh indicator (lower = more sensitive) */
  progressViewOffset?: number;
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

  style?: StyleProp<ViewStyle>;
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

  onAuthorPress?: (author: Tables<'authors'>) => void;
  onCategoryPress?: (category: Tables<'categories'>) => void;
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

  onAuthorPress?: (author: Tables<'authors'>) => void;
  onCategoryPress?: (category: Tables<'categories'>) => void;
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

  style?: StyleProp<ViewStyle>;
}

/**
 * Props for the ArticleItem component
 */
export interface ArticleItemProps {
  article: Article;
  onPress: (article: Article) => void;
  showTimeAgo?: boolean;
  hideDifficulty?: boolean;
  style?: StyleProp<ViewStyle>;
}
