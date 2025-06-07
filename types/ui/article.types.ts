import type { StyleProp, ViewStyle } from 'react-native';

import type { Article } from '../articles.types';

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
