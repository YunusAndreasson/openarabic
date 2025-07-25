import { memo, useCallback, useRef, type FC } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import ArticleCard from '@/components/ArticleCard';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { lightFeedback } from '@/utils/haptics';

interface HorizontalArticleSliderProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
}

// Calculate card width based on screen width and spacing
const CARD_SPACING = LAYOUT.SPACING.MEDIUM;
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width for better visibility
// Calculate height based on content needs while reducing excessive bottom padding
// Analysis: ArticleCard contains image (~40% of height) + title (2 lines) + author (1 line) + summary + padding
// Original: XXXLARGE * 8 (192px content space) - often too much bottom padding for summaries
// New: XXXLARGE * 7 (168px content space) - sufficient for 3-4 lines of summary text + proper padding
const BASE_CONTENT_HEIGHT = LAYOUT.SPACING.XXXLARGE * 7; // Conservative reduction ensures no text cutoff
const BASE_CARD_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM + BASE_CONTENT_HEIGHT;

/**
 * Helper function to estimate if content might need extra height (could be enhanced in future)
 */
const getContentAwareHeight = (summary: string): number => {
  // For very long summaries (>200 chars), add a bit more space
  const isLongSummary = summary.length > 200;
  const extraHeight = isLongSummary ? LAYOUT.SPACING.MEDIUM : 0;
  return BASE_CARD_HEIGHT + extraHeight;
};

/**
 * Horizontal slider displaying multiple articles in a swipeable ScrollView
 */
const HorizontalArticleSlider: FC<HorizontalArticleSliderProps> = ({
  articles,
  onArticlePress,
}) => {
  const colors = useColors();
  const lastVisibleCardIndex = useRef<number>(-1);

  // Limit to 5 articles for the slider
  const displayArticles = articles.slice(0, 5);

  /**
   * Handle scroll events to detect when cards come into view
   */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const scrollX = contentOffset.x;

      // Calculate which card is currently most visible
      const currentCardIndex = Math.round(scrollX / (CARD_WIDTH + CARD_SPACING));

      // Ensure index is within bounds
      const clampedIndex = Math.max(0, Math.min(currentCardIndex, displayArticles.length - 1));

      // Trigger haptic feedback when a new card comes into view
      if (clampedIndex !== lastVisibleCardIndex.current && lastVisibleCardIndex.current !== -1) {
        lightFeedback();
      }

      lastVisibleCardIndex.current = clampedIndex;
    },
    [displayArticles.length]
  );

  // Skip rendering if no articles
  if (!articles.length) return null;

  return (
    <View style={styles.container}>
      {/* Horizontal scroll view */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {displayArticles.map((article, index) => (
          <View
            key={article.id}
            style={[
              styles.cardContainer,
              {
                height: getContentAwareHeight(String(article.summary)), // Dynamic height based on content
                marginLeft: index === 0 ? 0 : CARD_SPACING, // No extra padding on first card - parent provides padding
              },
            ]}
          >
            <ArticleCard
              author={article.author.name}
              category={article.category.name}
              categoryForDisplay={article.category.name}
              imageUrl={String(article.image_url)}
              style={[
                styles.card,
                { backgroundColor: colors.card }, // Use consistent card background
                // Override with very subtle shadow for large featured cards
                {
                  ...Platform.select({
                    ios: {
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.12,
                      shadowRadius: 3,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                  shadowColor: colors.shadow,
                },
              ]}
              summary={String(article.summary)}
              title={article.title}
              onPress={() => onArticlePress(article)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Removed marginBottom to match consistent spacing pattern used in Practice screen
    // FilterSection provides its own marginTop for proper section spacing
  },
  scrollContainer: {
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  cardContainer: {
    width: CARD_WIDTH,
    // height is set dynamically based on content
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

HorizontalArticleSlider.displayName = 'HorizontalArticleSlider';

export default memo(HorizontalArticleSlider);
