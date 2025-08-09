import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useRef, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

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
const BASE_CONTENT_HEIGHT = LAYOUT.SPACING.XXXLARGE * 7;
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

  // Memoize the article press handler to prevent inline function creation
  const handleArticlePress = useCallback(
    (article: Article) => {
      onArticlePress(article);
    },
    [onArticlePress]
  );

  // Memoize the article cards to prevent unnecessary re-renders
  // Note: precomputed JSX list removed to avoid unused variable

  const keyExtractor = useCallback((item: Article) => `featured-${item.id}`, []);

  // getItemLayout is not supported by FlashList types; rely on estimatedItemSize and snap props

  const renderItem = useCallback(
    (info: { item: Article; index: number }) => (
      <View
        style={[
          styles.cardContainer,
          {
            height: getContentAwareHeight(String(info.item.summary)),
            marginLeft: info.index === 0 ? 0 : CARD_SPACING,
          },
        ]}
      >
        <ArticleCard
          author={info.item.author.name}
          category={info.item.category.name}
          categoryForDisplay={info.item.category.name}
          imageUrl={String(info.item.image_url)}
          style={[
            styles.card,
            { backgroundColor: colors.card },
            { shadowColor: colors.shadow, ...LAYOUT.ELEVATION.SUBTLE },
          ]}
          summary={String(info.item.summary)}
          title={info.item.title}
          onPress={() => handleArticlePress(info.item)}
        />
      </View>
    ),
    [colors.card, colors.shadow, handleArticlePress]
  );

  // Skip rendering if no articles
  if (!articles.length) return null;

  return (
    <View style={styles.container}>
      <FlashList
        horizontal
        data={displayArticles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        estimatedItemSize={CARD_WIDTH}
        // Rely on FlashList defaults for render/window sizes
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        bounces={false}
        overScrollMode="never"
        onViewableItemsChanged={({ viewableItems }) => {
          const first = viewableItems[0]?.index ?? -1;
          if (
            first !== -1 &&
            first !== lastVisibleCardIndex.current &&
            lastVisibleCardIndex.current !== -1
          ) {
            lightFeedback();
          }
          lastVisibleCardIndex.current = first;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
