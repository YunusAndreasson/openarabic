import React, { useRef, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  // Track if component has been mounted before to prevent flickering animations
  const hasBeenMounted = useRef(false);
  const shouldAnimate = isFirstRender && !hasBeenMounted.current;

  // Track header opacity with regular state to avoid type issues
  const [headerOpacity] = useState(shouldAnimate ? 0 : 1);

  // Set mounted flag after first render
  useEffect(() => {
    hasBeenMounted.current = true;
  }, []);

  // Determine the header title based on selected filters
  const headerTitle = useMemo(() => {
    if (selectedAuthor) {
      return selectedAuthor.name;
    } else if (selectedCategory) {
      return capitalizeFirstLetter(selectedCategory.name.toLowerCase());
    } else if (isLoading) {
      // Show a loading message while data is being fetched
      return 'Loading...';
    } else {
      // Fallback
      return 'Articles';
    }
  }, [selectedAuthor, selectedCategory, isLoading]);

  // Calculate header height for content padding
  const headerHeight = useMemo(() => {
    return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.MEDIUM;
  }, [insets.top]);

  // Memoize the content padding for better performance
  const contentPaddingStyle = useMemo(() => {
    return { paddingTop: headerHeight + LAYOUT.SPACING.MEDIUM };
  }, [headerHeight]);

  // Create simple style objects to avoid type errors
  const headerStyle = {
    ...styles.headerContainer,
    // When animating, start with opacity from state (0)
    // Otherwise use the default style opacity (1)
    opacity: shouldAnimate ? headerOpacity : styles.headerContainer.opacity,
  };

  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      {/* Standard Page Header with back button */}
      <Animated.View
        style={headerStyle}
        entering={shouldAnimate ? FadeIn.duration(300) : undefined}
      >
        <PageHeader title={headerTitle} onBackPress={onClearFilter} />
      </Animated.View>

      {/* Scrollable content */}
      <ThemedView
        style={styles.scrollContainer}
        scrollable={true}
        contentContainerStyle={[styles.contentContainer, contentPaddingStyle]}
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
        {/* Articles with staggered animations */}
        {articles.map((article, index) => (
          <Animated.View
            key={`filtered-article-${article.id}`}
            style={styles.articleContainer}
            entering={shouldAnimate ? FadeIn.duration(200).delay(index * 50) : undefined}
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
              style={styles.endMessageContainer}
              entering={shouldAnimate ? FadeIn.duration(400) : undefined}
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
    opacity: 1,
    zIndex: 2000, // Higher than PageHeader's z-index (1000)
  },
  scrollContainer: {
    flex: 1,
    zIndex: 1, // Lower than header z-index
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
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
