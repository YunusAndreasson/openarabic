import React, { useEffect, useRef } from 'react';
import { StyleSheet, RefreshControl, View } from 'react-native';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { CopyrightFooter } from './CopyrightFooter';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';
import { Tables } from '../types/database.types';
import { capitalizeFirstLetter } from '../utils/stringUtils';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import PageHeader from './PageHeader';

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Whether the view is in a loading state
   */
  isLoading?: boolean;

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
  onArticlePress?: (article: Article) => void;

  /**
   * Selected author (if filtering by author)
   */
  selectedAuthor?: Tables<'authors'> | null;

  /**
   * Selected category (if filtering by category)
   */
  selectedCategory?: Tables<'categories'> | null;

  /**
   * Callback to clear the current filter
   */
  onClearFilter?: () => void;
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
  selectedAuthor,
  selectedCategory,
  onClearFilter,
}) => {
  const colors = useColors();
  const isFirstRender = useRef(true);

  // Add the endMessageAnimatedStyle
  const { animatedStyle: endMessageAnimatedStyle, startAnimation: startEndMessageAnimation } =
    useFadeInAnimation(800, 400);

  // Add header animation
  const { animatedStyle: headerAnimatedStyle, startAnimation: startHeaderAnimation } =
    useFadeInAnimation(300, 300);

  // Determine the header title based on selected filters
  const headerTitle = selectedAuthor
    ? selectedAuthor.name
    : selectedCategory
      ? capitalizeFirstLetter(selectedCategory.name.toLowerCase())
      : 'Filtered Articles';

  // Start animations when the component mounts
  useEffect(() => {
    startEndMessageAnimation();
    startHeaderAnimation();
  }, [startEndMessageAnimation, startHeaderAnimation]);

  // Handle cleanup when component unmounts
  useEffect(() => {
    isFirstRender.current = false;
    // No cleanup needed
  }, []);

  return (
    <Animated.View
      style={styles.animatedContainer}
      entering={FadeIn.duration(300).springify().damping(14).stiffness(100)}
    >
      <ThemedView
        style={styles.container}
        useSafeArea={true}
        safeAreaEdges={['top', 'left', 'right']}
      >
        {/* Standard Page Header with back button */}
        <Animated.View style={headerAnimatedStyle as any}>
          <PageHeader title={headerTitle} onBackPress={onClearFilter} />
        </Animated.View>

        {/* Scrollable content */}
        <ThemedView
          style={styles.scrollContainer}
          scrollable={true}
          contentContainerStyle={styles.contentContainer}
          useSafeArea={false}
          scrollViewProps={{
            showsVerticalScrollIndicator: false,
            accessibilityLabel: 'Filtered articles list',
            refreshControl: (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[colors.tint]}
                tintColor={colors.tint}
              />
            ),
          }}
        >
          {/* Articles */}
          {articles.map((article, index) => (
            <Animated.View
              key={`filtered-article-${article.id}`}
              style={styles.articleContainer}
              entering={FadeIn.delay(50 + index * 30).duration(200)}
            >
              <ThemedCard
                imageUrl={article.image_url || ''}
                title={article.title}
                category={
                  article.category?.name
                    ? capitalizeFirstLetter(article.category.name.toLowerCase())
                    : 'Uncategorized'
                }
                author={article.author?.name || 'Anonymous'}
                onPress={() => onArticlePress?.(article)}
                isLoading={isLoading}
              />
            </Animated.View>
          ))}

          {/* No results message */}
          {articles.length === 0 && !isLoading && (
            <View style={styles.noResultsContainer}>
              <ThemedText
                style={styles.noResultsText}
                accessibilityLabel="No articles found with the current filter"
              >
                No articles found
              </ThemedText>
            </View>
          )}

          {/* Footer */}
          {articles.length > 0 && (
            <>
              <Animated.View style={[styles.endMessageContainer, endMessageAnimatedStyle as any]} />
              <CopyrightFooter />
            </>
          )}
        </ThemedView>
      </ThemedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  endMessageContainer: {
    height: LAYOUT.SPACING.MEDIUM,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FilteredArticleView;
