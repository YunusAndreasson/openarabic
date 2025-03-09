import React from 'react';
import { ScrollView, StyleSheet, RefreshControl, View } from 'react-native';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import EndMessage from './EndMessage';
import { CopyrightFooter } from './CopyrightFooter';

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Whether the view is in a loading state
   */
  isLoading: boolean;

  /**
   * Whether the view is in a refreshing state
   */
  isRefreshing: boolean;

  /**
   * Callback when the view is refreshed
   */
  onRefresh: () => void;

  /**
   * Callback when an article is pressed
   */
  onArticlePress: (article: Article) => void;

  /**
   * Header component to display at the top of the view
   */
  ListHeaderComponent: React.ReactNode;
}

/**
 * A specialized component for displaying filtered articles
 * Uses a simple ScrollView instead of FlatList to avoid recycling issues
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  isLoading,
  isRefreshing,
  onRefresh,
  onArticlePress,
  ListHeaderComponent,
}) => {
  const colors = useColors();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.tint]}
          tintColor={colors.tint}
        />
      }
    >
      {/* Header Component */}
      {ListHeaderComponent}

      {/* Articles */}
      {articles.map(article => (
        <View key={`filtered-article-${article.id}`} style={styles.articleContainer}>
          <ThemedCard
            imageUrl={article.image_url || ''}
            title={article.title}
            category={article.category?.name || 'Uncategorized'}
            author={article.author?.name || 'Anonymous'}
            onPress={() => onArticlePress(article)}
            isLoading={isLoading}
          />
        </View>
      ))}

      {/* Footer */}
      {articles.length > 0 && (
        <>
          <EndMessage />
          <CopyrightFooter />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});

export default FilteredArticleView;
