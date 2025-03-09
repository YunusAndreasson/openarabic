import { ViewStyle, TextStyle } from 'react-native';
import { useColors } from '../hooks/useColors';
import { SharedValue } from 'react-native-reanimated';
import { Category, Article } from './articles.types';

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
 * Props for horizontal category pills
 */
export interface HorizontalCategoryPillProps {
  category: Category | null;
  isSelected: boolean;
  onPress: () => void;
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
export interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onArticlePress: (article: Article) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: any;
}

/**
 * Props for compact article card component
 */
export interface CompactArticleCardProps {
  article: Article;
  onPress?: () => void;
  showTimeAgo?: boolean;
  style?: ViewStyle;
}
