import React, { useRef, useEffect } from 'react';
import { StyleSheet, RefreshControl, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { CopyrightFooter } from './CopyrightFooter';
import { Tables } from '../types/database.types';
import { capitalizeFirstLetter } from '../utils/stringUtils';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import PageHeader from './PageHeader';

// Animation hooks
import { useFadeInAnimation } from '../hooks/animations';

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

  /**
   * Whether this is the first render of the component
   * Used to control animations
   */
  isFirstRender?: boolean;
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
  isFirstRender = false,
}) => {
  const colors = useColors();

  // Using fade in animation for the footer - only animate on first render
  const { animatedStyle: footerAnimatedStyle, startAnimation: startFooterAnimation } =
    useFadeInAnimation(800, 400);

  // Use fade animation for the header - only animate on first render
  const { animatedStyle: headerAnimatedStyle, startAnimation: startHeaderAnimation } =
    useFadeInAnimation(300, 300);

  // Start animations only if this is the first render
  useEffect(() => {
    if (isFirstRender) {
      startFooterAnimation();
      startHeaderAnimation();
    }
  }, [isFirstRender, startFooterAnimation, startHeaderAnimation]);

  // Determine the header title based on selected filters
  const headerTitle = selectedAuthor
    ? selectedAuthor.name
    : selectedCategory
      ? capitalizeFirstLetter(selectedCategory.name.toLowerCase())
      : 'Filtered Articles';

  return (
    <ThemedView
      style={styles.container}
      useSafeArea={true}
      safeAreaEdges={['top', 'left', 'right']}
    >
      {/* Standard Page Header with back button */}
      <Animated.View
        style={[isFirstRender ? headerAnimatedStyle : null, styles.headerContainer] as any}
      >
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
            entering={isFirstRender ? FadeIn.duration(200) : undefined}
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
              summary={article.summary || undefined}
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
            <Animated.View
              style={
                [styles.endMessageContainer, isFirstRender ? footerAnimatedStyle : null] as any
              }
            />
            <CopyrightFooter />
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    // Add styles that would otherwise be in the animated style
    opacity: 1,
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
    opacity: 1, // Ensure visibility even without animation
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
